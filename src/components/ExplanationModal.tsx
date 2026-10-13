import { BrainCircuit, RotateCcw, X } from "lucide-react";
import { useRef } from "react";
import type { TokenExplanation } from "../game/types";
import { Button, CodeBlock, Disclosure, LoadingStatus, Modal, Panel } from "../theme";
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
  const closeButton = useRef<HTMLButtonElement>(null);
  return (
    <Modal
      titleId="explanation-title"
      onClose={onClose}
      size="lg"
      initialFocusRef={closeButton}
      overlayClassName={className}
      className="border-violet-400/30"
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
        <Button
          size="icon"
          variant="ghost"
          ref={closeButton}
          onClick={onClose}
          aria-label="Close explanation"
          className="rounded-lg focus-visible:outline-violet-300"
        >
          <X size={20} />
        </Button>
      </div>
      <Disclosure title="The constraint" className="mt-5">
        <CodeBlock bare size="xs" className="mt-3 max-h-36">
          {constraint}
        </CodeBlock>
      </Disclosure>
      <p className="arcade-label mt-5 text-slate-500">Proposed response · ␠ marks spaces</p>
      <CodeBlock tone="danger" className="mt-2 max-h-36">
        {visibleWhitespace(explanation.candidateText)}
      </CodeBlock>
      <Panel tone="accent" className="mt-5 min-h-28 rounded-xl p-4" aria-busy={explanation.loading}>
        {explanation.text && (
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{explanation.text}</p>
        )}
        {explanation.error && (
          <p role="alert" className="text-sm leading-6 text-rose-300">
            {explanation.error}
          </p>
        )}
        {explanation.loading && (
          <LoadingStatus>
            {explanation.text ? "Still thinking…" : "Generating an explanation with Gemma 4 E2B…"}
          </LoadingStatus>
        )}
      </Panel>
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
        <Button onClick={onClose}>{explanation.loading ? "Close & stop" : "Back to cards"}</Button>
      </div>
    </Modal>
  );
}
