import { BrainCircuit, LoaderCircle, RotateCcw, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { TokenExplanation } from "../game/types";
import { Button } from "../theme";
import cn from "../utils/classnames";
import { readableToken, visibleWhitespace } from "../utils/tokens";

interface ExplanationModalProps {
  explanation: TokenExplanation;
  label: string;
  constraint: string;
  onClose: () => void;
  onRetry: () => void;
  className?: string;
}

export default function ExplanationModal({
  explanation,
  label,
  constraint,
  onClose,
  onRetry,
  className = "",
}: ExplanationModalProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = dialog.current?.querySelectorAll<HTMLElement>(
      "button:not(:disabled), summary"
    );
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
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
        "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4",
        className
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="explanation-title"
        onKeyDown={handleKey}
        className="screen-enter max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl border border-violet-400/30 bg-slate-900 p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="arcade-label flex items-center gap-2 text-violet-300">
              <BrainCircuit size={15} />
              Ask the model
            </p>
            <h2 id="explanation-title" className="mt-3 text-2xl font-black">
              Why was this token blocked?
            </h2>
            <p className="mt-2 font-mono text-sm text-rose-300">
              #{explanation.tokenId} · {readableToken(label)}
            </p>
          </div>
          <button
            ref={closeButton}
            onClick={onClose}
            aria-label="Close explanation"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-violet-300"
          >
            <X size={20} />
          </button>
        </div>
        <details className="mt-5 rounded-xl border border-slate-700 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-lime-300">
            The constraint
          </summary>
          <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-6 text-slate-300">
            {constraint}
          </pre>
        </details>
        <p className="arcade-label mt-5 text-slate-500">Proposed response · ␠ marks spaces</p>
        <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-rose-400/20 bg-slate-950 p-3 font-mono text-sm text-rose-200">
          {visibleWhitespace(explanation.candidateText)}
        </pre>
        <div
          className="mt-5 min-h-28 rounded-xl border border-violet-400/20 bg-violet-400/5 p-4"
          aria-busy={explanation.loading}
        >
          {explanation.text && (
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
              {explanation.text}
            </p>
          )}
          {explanation.error && (
            <p role="alert" className="text-sm leading-6 text-rose-300">
              {explanation.error}
            </p>
          )}
          {explanation.loading && (
            <p role="status" className="flex items-center gap-2 text-sm text-violet-300">
              <LoaderCircle size={15} className="animate-spin" />
              {explanation.text ? "Still thinking…" : "Generating an explanation with Gemma 4 E2B…"}
            </p>
          )}
        </div>
        <p className="mt-4 text-xs leading-6 text-slate-500">
          AI-generated explanation, not a validator. The constraint processor’s rejection is
          authoritative; this small model may misinterpret the reason. Asking does not change your
          response, points, or token probabilities.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          {!explanation.loading && (
            <Button variant="secondary" onClick={onRetry}>
              <RotateCcw size={14} />
              Try again
            </Button>
          )}
          <Button onClick={onClose}>
            {explanation.loading ? "Close & stop" : "Back to cards"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
