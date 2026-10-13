import { ArrowRight, RotateCcw, Trophy } from "lucide-react";
import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "../theme";
import cn from "../utils/classnames";
import { averageScore, formatPoints } from "../utils/scoring";
import ScoreShareActions from "./ScoreShareActions";

interface VictoryScreenProps {
  points: number;
  tokens: number;
  text: string;
  challenge?: string;
  onReplay: () => void;
  onSetup: () => void;
  className?: string;
}

export default function VictoryScreen({
  points,
  tokens,
  text,
  challenge,
  onReplay,
  onSetup,
  className = "",
}: VictoryScreenProps) {
  const score = averageScore(points, tokens);
  const dialog = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    title.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onSetup();
      return;
    }
    if (event.key !== "Tab") return;
    const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
    if (!buttons?.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return createPortal(
    <div
      className={cn(
        "victory-overlay fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/95 p-5",
        className
      )}
      role="dialog"
      ref={dialog}
      onKeyDown={trapFocus}
      aria-modal="true"
      aria-labelledby="victory-title"
    >
      <div
        className="confetti-field pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {Array.from({ length: 36 }, (_, index) => (
          <i
            key={index}
            className={cn("confetti-piece absolute h-3 w-2 rounded-sm", {
              "bg-lime-300": index % 3 === 0,
              "bg-violet-400": index % 3 === 1,
              "bg-amber-300": index % 3 === 2,
            })}
            style={{
              left: `${(index * 37) % 100}%`,
              animationDelay: `${(index % 9) * 0.13}s`,
              animationDuration: `${2.5 + (index % 4) * 0.3}s`,
            }}
          />
        ))}
      </div>
      <div className="screen-enter relative max-h-full w-full max-w-xl overflow-y-auto rounded-3xl border border-lime-300/30 bg-slate-900 p-7 text-center shadow-2xl sm:p-10">
        <Trophy size={48} className="mx-auto text-lime-300" />
        <p className="arcade-label mt-5 text-lime-300">Constraint conquered</p>
        <h1
          id="victory-title"
          ref={title}
          tabIndex={-1}
          className="mt-3 text-4xl font-black tracking-tight outline-none"
        >
          {score === 100
            ? "A flawless run."
            : score >= 70
              ? "You’ve got the instinct."
              : "Every flip taught you something."}
        </h1>
        <div className="my-7">
          <span className="text-7xl font-black tracking-tighter text-lime-300">
            {formatPoints(score)}
          </span>
          <span className="ml-2 text-xl text-slate-500">/ 100</span>
        </div>
        <p className="text-sm text-slate-400">
          {formatPoints(points)} points ÷ {tokens} tokens · end token included
        </p>
        <pre className="my-6 max-h-44 overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-4 text-left font-mono text-sm whitespace-pre-wrap break-all text-slate-300">
          {text || "(empty response)"}
        </pre>
        <ScoreShareActions points={points} tokens={tokens} response={text} challenge={challenge} />
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={onReplay}>
            <RotateCcw size={16} />
            Play again
          </Button>
          <Button variant="secondary" onClick={onSetup}>
            New challenge <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
