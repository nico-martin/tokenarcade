import {
  GenerationConfig,
  InterruptableStoppingCriteria,
  LogitsProcessor,
  LogitsProcessorList,
  PretrainedConfig,
  Tensor,
  TextStreamer,
  env,
  pipeline,
} from "@huggingface/transformers";
import type { DynamicCache, TextGenerationPipeline } from "@huggingface/transformers";
import { useEffect, useRef, useState } from "react";
import { buildDeck } from "../utils/deck";
import { pointsForAttempt } from "../utils/scoring";
import StructuredOutputProcessorGame from "./StructuredOutputProcessorGame";
import { explanationMessages } from "./explanationPrompt";
import { MAX_TOKENS, MODEL_ID } from "./types";
import type { GameSettings, GuessFeedback, TokenExplanation, TokenStep } from "./types";

env.experimental_useCrossOriginStorage = true;
env.allowLocalModels = false;
const CHAT_TEMPLATE_OPTIONS = {
  tokenize: false,
  add_generation_prompt: true,
  enable_thinking: false,
} as const;
export type GamePhase = "idle" | "loading" | "playing" | "complete" | "error";

interface Round {
  id: number;
  settings: GameSettings;
  processor: StructuredOutputProcessorGame;
  inputIds: bigint[];
  generated: number[];
  cache?: DynamicCache;
  points: number;
  tokens: number;
  rejected: Set<number>;
  ready: boolean;
}

interface ExplanationControl {
  requestId: number;
  stop: InterruptableStoppingCriteria;
  cancelled: boolean;
}

class CaptureProcessor extends LogitsProcessor {
  constructor(
    private readonly capture: (ids: bigint[][], logits: Tensor) => void,
    private readonly eos: number
  ) {
    super();
  }
  _call(ids: bigint[][], logits: Tensor) {
    this.capture(ids, logits);
    // Return the prefix's KV cache after one forward pass. The forced token is
    // discarded: only the player's chosen token ever enters the game response.
    (logits.data as Float32Array).fill(-Infinity);
    (logits.data as Float32Array)[this.eos] = 0;
    return logits;
  }
}

export default function useGame() {
  const generator = useRef<TextGenerationPipeline | null>(null);
  const round = useRef<Round | null>(null);
  const queue = useRef(Promise.resolve());
  const mounted = useRef(true);
  const active = useRef(false);
  const sequence = useRef(0);
  const vocabulary = useRef(new Set<number>());
  const gameStop = useRef<InterruptableStoppingCriteria | null>(null);
  const explanationControl = useRef<ExplanationControl | null>(null);
  const explanationSequence = useRef(0);
  const revealUntil = useRef(0);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [modelLoaded, setModelLoaded] = useState(false);
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

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current = false;
      clearTimeout(revealTimer.current);
      gameStop.current?.interrupt();
      if (explanationControl.current) {
        explanationControl.current.cancelled = true;
        explanationControl.current.stop.interrupt();
      }
      const previous = round.current;
      round.current = null;
      // Wait for active GPU work before disposing tensors or the shared pipeline.
      void queue.current
        .then(async () => {
          if (mounted.current) return;
          await previous?.cache?.dispose();
          await generator.current?.dispose();
          generator.current = null;
        })
        .catch(console.error);
    };
  }, []);

  function enqueue(task: () => Promise<void>) {
    queue.current = queue.current
      .then(task)
      .catch((error: unknown) => console.error("Inference cleanup failed:", error));
  }

  function current(item: Round): boolean {
    return (
      mounted.current && active.current && round.current === item && sequence.current === item.id
    );
  }

  async function disposeCache(item: Round | null) {
    const cache = item?.cache;
    if (item) item.cache = undefined;
    await cache?.dispose();
  }

  function showError(error: unknown) {
    setStatus(error instanceof Error ? error.message : String(error));
    setProgress(undefined);
    setPendingGuess(false);
    setPhase("error");
  }

  async function loadPipeline(): Promise<TextGenerationPipeline> {
    if (generator.current) return generator.current;
    const result = await pipeline("text-generation", MODEL_ID, {
      device: "webgpu",
      dtype: "q4f16",
      progress_callback: (event) => {
        if (event.status === "progress_total" && mounted.current && active.current) {
          setStatus("Downloading Gemma 4 E2B · total progress across all files");
          setProgress(event.progress);
        }
      },
    });
    generator.current = result;
    if (mounted.current) setModelLoaded(true);
    return result;
  }

  function responseText(item: Round): string {
    return item.generated.length
      ? generator.current!.tokenizer.decode(item.generated, { skip_special_tokens: true })
      : "";
  }

  function tokenLabel(tokenId: number): string {
    const tokenizer = generator.current!.tokenizer;
    if (tokenId === tokenizer.eos_token_id) return "[EOS]";
    return vocabulary.current.has(tokenId)
      ? tokenizer.decode([tokenId], {
          skip_special_tokens: false,
          clean_up_tokenization_spaces: false,
        })
      : `[token ${tokenId}]`;
  }

  async function nextStep(item: Round) {
    if (!current(item)) return;
    item.ready = false;
    setStatus("Computing next-token probabilities…");
    const pipe = generator.current!;
    const stop = new InterruptableStoppingCriteria();
    gameStop.current = stop;
    let next: TokenStep | undefined;
    const capture = new LogitsProcessorList();
    capture.push(
      new CaptureProcessor((ids, logits) => {
        if (!current(item)) return;
        const inspection = item.processor.inspect(ids, logits);
        next = {
          ...inspection,
          deck: buildDeck(inspection.order, (id) => item.processor.isAllowed(id)),
          text: responseText(item),
          tokenCount: item.tokens,
        };
      }, pipe.tokenizer.eos_token_id)
    );
    try {
      // Let React paint the flipped card before preparing the next GPU pass.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (!current(item)) return;
      const output = await pipe.model.generate({
        input_ids: new Tensor("int64", BigInt64Array.from(item.inputIds), [
          1,
          item.inputIds.length,
        ]),
        attention_mask: new Tensor("int64", new BigInt64Array(item.inputIds.length).fill(1n), [
          1,
          item.inputIds.length,
        ]),
        past_key_values: item.cache ?? null,
        stopping_criteria: stop,
        logits_processor: capture,
        generation_config: new GenerationConfig(
          new PretrainedConfig({
            max_new_tokens: 1,
            do_sample: false,
            return_dict_in_generate: true,
            eos_token_id: pipe.tokenizer.eos_token_id,
            pad_token_id: pipe.tokenizer.pad_token_id,
          })
        ),
      });
      if (output instanceof Tensor || !("past_key_values" in output))
        throw new Error("Model did not return a token inspection and KV cache.");
      item.cache = output.past_key_values as DynamicCache;
      if (!current(item)) {
        await disposeCache(item);
        return;
      }
      if (!next) throw new Error("Model did not return next-token scores.");
      const nextHand = next;
      const publish = () => {
        if (!current(item)) return;
        item.rejected.clear();
        item.ready = true;
        setStep(nextHand);
        setRejected(new Set());
        setFeedback(null);
        setReveals(new Map());
        setProgress(undefined);
        setPendingGuess(false);
        setPhase("playing");
      };
      const delay = Math.max(0, revealUntil.current - Date.now());
      clearTimeout(revealTimer.current);
      if (delay) revealTimer.current = setTimeout(publish, delay);
      else publish();
    } catch (error: unknown) {
      await disposeCache(item);
      if (current(item)) showError(error);
    } finally {
      if (gameStop.current === stop) gameStop.current = null;
    }
  }

  function closeExplanation() {
    const control = explanationControl.current;
    if (control) {
      control.cancelled = true;
      control.stop.interrupt();
    }
    explanationControl.current = null;
    setExplanation(null);
  }

  function reset() {
    closeExplanation();
    active.current = false;
    sequence.current++;
    gameStop.current?.interrupt();
    clearTimeout(revealTimer.current);
    revealUntil.current = 0;
    const previous = round.current;
    round.current = null;
    enqueue(() => disposeCache(previous));
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

  function start(settings: GameSettings): boolean {
    reset();
    const reuseModel = generator.current !== null;
    active.current = true;
    const id = ++sequence.current;
    setPhase("loading");
    setStatus(reuseModel ? "Preparing your challenge…" : "Loading the Gemma 4 E2B pipeline…");
    enqueue(async () => {
      if (!active.current || sequence.current !== id) return;
      try {
        const pipe = await loadPipeline();
        if (!mounted.current || !active.current || sequence.current !== id) return;
        setStatus("Preparing vocabulary and constraints…");
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        if (!active.current || sequence.current !== id) return;
        const processor = new StructuredOutputProcessorGame(
          pipe.tokenizer,
          settings.format,
          pipe.model.generation_config?.eos_token_id ?? pipe.tokenizer.eos_token_id
        );
        const prompt = pipe.tokenizer.apply_chat_template(
          [
            {
              role: "system",
              content:
                "Follow the user's request. Respond only with the requested structured output, without explanations or markdown.",
            },
            { role: "user", content: settings.prompt },
          ],
          CHAT_TEMPLATE_OPTIONS
        );
        const inputs = pipe.tokenizer(prompt, { add_special_tokens: false });
        const inputIds = Array.from(inputs.input_ids.data as BigInt64Array);
        if (inputIds.length > 2048)
          throw new Error("Prompt is too long. Please keep it below 2,048 tokens.");
        const vocab = pipe.tokenizer.get_vocab();
        vocabulary.current = new Set(vocab.values());
        let maxId = 0;
        for (const tokenId of vocab.values()) maxId = Math.max(maxId, tokenId);
        const tokenLabels = Array.from({ length: maxId + 1 }, (_, tokenId) => `[token ${tokenId}]`);
        for (const [label, tokenId] of vocab) tokenLabels[tokenId] = label;
        tokenLabels[pipe.tokenizer.eos_token_id] = "[EOS]";
        setLabels(tokenLabels);
        setTerminationTokenIds([...processor.terminationTokenIds]);
        const item: Round = {
          id,
          settings,
          processor,
          inputIds,
          generated: [],
          points: 0,
          tokens: 0,
          rejected: new Set(),
          ready: false,
        };
        round.current = item;
        await nextStep(item);
      } catch (error: unknown) {
        if (mounted.current && active.current && sequence.current === id) showError(error);
      }
    });
    return reuseModel;
  }

  function guess(tokenId: number) {
    const item = round.current;
    if (
      !item ||
      !current(item) ||
      !item.ready ||
      item.rejected.has(tokenId) ||
      explanationControl.current
    )
      return;
    const correct = item.processor.isAllowed(tokenId);
    const end = item.processor.isTerminationToken(tokenId);
    const candidateText = end
      ? `${responseText(item)} [end: ${tokenLabel(tokenId)}]`
      : vocabulary.current.has(tokenId)
        ? generator.current!.tokenizer.decode([...item.generated, tokenId], {
            skip_special_tokens: false,
          })
        : `${responseText(item)} [token ${tokenId}]`;
    const points = correct ? pointsForAttempt(item.rejected.size + 1) : 0;
    const result: GuessFeedback = {
      tokenId,
      correct,
      points,
      candidateText,
      explanation: correct
        ? end
          ? "The response satisfies the constraint. This termination token can safely end the round!"
          : "This continuation is allowed. The prefix can still satisfy the constraint; it doesn't need to be a complete response yet."
        : end
          ? "Too early to stop! The response hasn't satisfied the constraint, so this termination token is blocked."
          : "This token is forbidden at this prefix by the constraint processor. The proposed continuation cannot proceed under its grammar or repeated-whitespace policy. Your actual response stays unchanged.",
    };
    setFeedback(result);
    setReveals((previous) => new Map(previous).set(tokenId, result));
    if (!correct) {
      item.rejected.add(tokenId);
      setRejected(new Set(item.rejected));
      return;
    }
    item.ready = false;
    item.points += points;
    item.tokens++;
    if (!end) {
      item.generated.push(tokenId);
      item.inputIds.push(BigInt(tokenId));
    }
    setTotalPoints(item.points);
    setTokenCount(item.tokens);
    setText(responseText(item));
    setPendingGuess(true);
    revealUntil.current = Date.now() + 1400;
    setPhase(end ? "complete" : "loading");
    enqueue(async () => {
      if (end) {
        await disposeCache(item);
        return;
      }
      if (!current(item)) return;
      if (item.tokens >= MAX_TOKENS) {
        await disposeCache(item);
        showError(
          `Reached the ${MAX_TOKENS}-token safety limit before an end token. Choose a shorter challenge.`
        );
        return;
      }
      await nextStep(item);
    });
  }

  function explainToken(tokenId: number) {
    const item = round.current;
    const reveal = reveals.get(tokenId);
    if (
      !item ||
      !current(item) ||
      !item.ready ||
      !reveal ||
      reveal.correct ||
      explanationControl.current
    )
      return;
    const control: ExplanationControl = {
      requestId: ++explanationSequence.current,
      stop: new InterruptableStoppingCriteria(),
      cancelled: false,
    };
    explanationControl.current = control;
    setExplanation({
      requestId: control.requestId,
      tokenId,
      candidateText: reveal.candidateText,
      text: "",
      loading: true,
    });
    const messages = explanationMessages(
      item.settings,
      tokenId,
      responseText(item),
      tokenLabel(tokenId),
      reveal.candidateText,
      item.processor.isTerminationToken(tokenId),
      item.processor.canEndResponse()
    );
    enqueue(async () => {
      if (control.cancelled || !current(item)) return;
      try {
        const pipe = generator.current!;
        const prompt = pipe.tokenizer.apply_chat_template(messages, CHAT_TEMPLATE_OPTIONS);
        if (pipe.tokenizer(prompt, { add_special_tokens: false }).input_ids.dims.at(-1)! > 4096)
          throw new Error("The explanation context is too long for this demo.");
        let streamed = "";
        const visible = () =>
          !control.cancelled && current(item) && explanationControl.current === control;
        const streamer = new TextStreamer(pipe.tokenizer, {
          skip_prompt: true,
          skip_special_tokens: true,
          callback_function: (chunk) => {
            streamed += chunk;
            if (visible())
              setExplanation((previous) => (previous ? { ...previous, text: streamed } : null));
          },
        });
        // Normal pipeline generation: a fresh cache is automatically disposed
        // by generate(). Never pass the gameplay cache or its grammar processor.
        const output = await pipe(prompt, {
          max_new_tokens: 192,
          do_sample: false,
          add_special_tokens: false,
          return_full_text: false,
          streamer,
          stopping_criteria: control.stop,
          generation_config: new GenerationConfig(
            new PretrainedConfig({
              do_sample: false,
              return_dict_in_generate: false,
              eos_token_id:
                pipe.model.generation_config?.eos_token_id ?? pipe.tokenizer.eos_token_id,
              pad_token_id: pipe.tokenizer.pad_token_id,
            })
          ),
        });
        const answer = (output[0]?.generated_text || streamed).trim();
        if (visible())
          setExplanation((previous) =>
            previous
              ? {
                  ...previous,
                  text: answer,
                  loading: false,
                  ...(!answer
                    ? { error: "The model returned no explanation. You can try again." }
                    : {}),
                }
              : null
          );
      } catch (error: unknown) {
        if (!control.cancelled && current(item) && explanationControl.current === control)
          setExplanation((previous) =>
            previous
              ? {
                  ...previous,
                  loading: false,
                  error: error instanceof Error ? error.message : String(error),
                }
              : null
          );
      }
    });
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
