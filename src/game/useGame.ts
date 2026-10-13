import { useEffect, useRef, useState } from "react";
import type {
  GameSettings,
  GuessFeedback,
  TokenStep,
  TokenExplanation,
  WorkerRequest,
  WorkerResponse,
} from "./types";

export type GamePhase = "idle" | "loading" | "playing" | "complete" | "error";

export default function useGame() {
  const worker = useRef<Worker | null>(null);
  const active = useRef(false);
  const activeRound = useRef(0);
  const loadedModel = useRef(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const revealUntil = useRef(0);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<number | undefined>();
  const [labels, setLabels] = useState<string[]>([]);
  const [terminationTokenIds, setTerminationTokenIds] = useState<number[]>([]);
  const [step, setStep] = useState<TokenStep | null>(null);
  const [feedback, setFeedback] = useState<GuessFeedback | null>(null);
  const [reveals, setReveals] = useState<Map<number, GuessFeedback>>(new Map());
  const [rejected, setRejected] = useState<Set<number>>(new Set());
  const [pendingGuess, setPendingGuess] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState<TokenExplanation | null>(null);
  const explanationSequence = useRef(0);
  const activeExplanation = useRef<number | null>(null);

  useEffect(
    () => () => {
      worker.current?.terminate();
      clearTimeout(revealTimer.current);
    },
    []
  );

  function getWorker() {
    if (worker.current) return worker.current;
    const instance = new Worker(new URL("./game.worker.ts", import.meta.url), { type: "module" });
    instance.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (worker.current !== instance) return;
      const message = event.data;
      if (message.type === "model_loaded") {
        loadedModel.current = true;
        setModelLoaded(true);
        return;
      }
      if (!active.current || message.roundId !== activeRound.current) return;
      if (message.type === "status") {
        setStatus(message.message);
        setProgress(message.progress);
      } else if (message.type === "vocabulary") {
        setLabels(message.labels);
        setTerminationTokenIds(message.terminationTokenIds);
      } else if (message.type === "step") {
        clearTimeout(revealTimer.current);
        const revealStep = () => {
          if (!active.current) return;
          setStep(message.step);
          setRejected(new Set());
          setFeedback(null);
          setReveals(new Map());
          setPendingGuess(false);
          setProgress(undefined);
          setPhase("playing");
        };
        const delay = Math.max(0, revealUntil.current - Date.now());
        if (delay > 0) revealTimer.current = setTimeout(revealStep, delay);
        else revealStep();
      } else if (message.type === "guess") {
        setFeedback({
          tokenId: message.tokenId,
          correct: message.correct,
          points: message.points,
          candidateText: message.candidateText,
          explanation: message.explanation,
        });
        setReveals((previous) =>
          new Map(previous).set(message.tokenId, {
            tokenId: message.tokenId,
            correct: message.correct,
            points: message.points,
            candidateText: message.candidateText,
            explanation: message.explanation,
          })
        );
        setTotalPoints(message.totalPoints);
        setTokenCount(message.tokenCount);
        setText(message.text);
        if (!message.correct) {
          setRejected((previous) => new Set([...previous, message.tokenId]));
          setPendingGuess(false);
        } else {
          revealUntil.current = Date.now() + 1400;
          setPhase(message.complete ? "complete" : "loading");
        }
      } else if (message.type === "explanation") {
        if (message.requestId !== activeExplanation.current) return;
        setExplanation((previous) =>
          previous
            ? { ...previous, text: message.text, loading: !message.done, error: message.error }
            : null
        );
      } else if (message.type === "error") {
        setStatus(message.message);
        setProgress(undefined);
        setPendingGuess(false);
        setPhase("error");
      }
    };
    instance.onerror = (event) => {
      if (worker.current !== instance) return;
      instance.terminate();
      worker.current = null;
      loadedModel.current = false;
      setModelLoaded(false);
      if (!active.current) return;
      setStatus(
        event.message ||
          "The inference worker failed. Please reset and try again in a WebGPU-enabled browser."
      );
      setPhase("error");
      setExplanation((previous) =>
        previous
          ? {
              ...previous,
              loading: false,
              error: "The model worker stopped. Close this dialog and reset the round.",
            }
          : null
      );
      setPendingGuess(false);
    };
    worker.current = instance;
    return instance;
  }

  function post(message: WorkerRequest) {
    getWorker().postMessage(message);
  }

  function reset() {
    closeExplanation();
    clearTimeout(revealTimer.current);
    revealUntil.current = 0;
    active.current = false;
    // Cancel an unfinished model download, but preserve instantiated weights
    // even when the worker is computing another hand. Round IDs reject stale results.
    if (phase === "loading" && !loadedModel.current) {
      worker.current?.terminate();
      worker.current = null;
      loadedModel.current = false;
      setModelLoaded(false);
    } else worker.current?.postMessage({ type: "reset" } satisfies WorkerRequest);
    setPhase("idle");
    setStep(null);
    setFeedback(null);
    setReveals(new Map());
    setRejected(new Set());
    setTotalPoints(0);
    setTokenCount(0);
    setText("");
    setProgress(undefined);
    setPendingGuess(false);
  }

  function start(settings: GameSettings) {
    reset();
    const reuseModel = loadedModel.current && worker.current !== null;
    active.current = true;
    const roundId = ++activeRound.current;
    setPhase("loading");
    setStatus("Starting inference worker…");
    post({ type: "start", settings, roundId });
    return reuseModel;
  }

  function guess(tokenId: number) {
    if (
      phase !== "playing" ||
      pendingGuess ||
      rejected.has(tokenId) ||
      activeExplanation.current !== null
    )
      return;
    setPendingGuess(true);
    post({ type: "guess", tokenId });
  }

  function explainToken(tokenId: number) {
    const reveal = reveals.get(tokenId);
    if (
      phase !== "playing" ||
      pendingGuess ||
      !step ||
      !reveal ||
      reveal.correct ||
      activeExplanation.current !== null
    )
      return;
    const requestId = ++explanationSequence.current;
    activeExplanation.current = requestId;
    setExplanation({
      requestId,
      tokenId,
      candidateText: reveal.candidateText,
      text: "",
      loading: true,
    });
    post({ type: "explain", requestId, tokenId, turn: step.tokenCount });
  }

  function closeExplanation() {
    if (activeExplanation.current !== null)
      worker.current?.postMessage({
        type: "cancel_explanation",
        requestId: activeExplanation.current,
      } satisfies WorkerRequest);
    activeExplanation.current = null;
    setExplanation(null);
  }

  return {
    phase,
    modelLoaded,
    status,
    progress,
    labels,
    terminationTokenIds,
    step,
    feedback,
    reveals,
    rejected,
    pendingGuess,
    totalPoints,
    tokenCount,
    text,
    start,
    reset,
    guess,
    explanation,
    explainToken,
    closeExplanation,
  };
}
