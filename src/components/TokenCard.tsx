import { Check, CircleHelp, MousePointer2, X } from "lucide-react";
import cn from "../utils/classnames";
import { formatProbability } from "../utils/scoring";
import { readableToken, visibleWhitespace } from "../utils/tokens";

interface TokenCardProps {
  id: number;
  label: string;
  probability: number;
  verdict?: "correct" | "wrong";
  disabled: boolean;
  index: number;
  onClick: () => void;
  onExplain: () => void;
  candidateText?: string;
  isTermination?: boolean;
  className?: string;
}

export default function TokenCard({
  id,
  label,
  probability,
  verdict,
  disabled,
  index,
  onClick,
  onExplain,
  candidateText = "",
  isTermination = false,
  className = "",
}: TokenCardProps) {
  return (
    <div
      className={cn(
        "token-card deal-in group relative h-40 min-w-0 rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300 sm:h-44",
        {
          "is-flipped": !!verdict,
          "is-correct": verdict === "correct",
          "is-wrong": verdict === "wrong",
        },
        className
      )}
      style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}
    >
      <div className="card-rotator">
        <button
          onClick={onClick}
          disabled={disabled || !!verdict}
          tabIndex={verdict ? -1 : 0}
          aria-hidden={!!verdict}
          aria-label={`Token ${id}: ${readableToken(label)}`}
          className="card-face card-front flex w-full flex-col justify-between rounded-2xl border border-slate-600 bg-slate-800 p-4 text-left transition-colors group-hover:border-violet-400 group-hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300"
        >
          <span className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-slate-500">#{id}</span>
            <span className="font-mono text-xs text-violet-300">
              {formatProbability(probability)}
            </span>
          </span>
          <span
            title={label}
            className="block truncate whitespace-pre font-mono text-lg font-bold text-white sm:text-xl"
          >
            {readableToken(label)}
          </span>
          <span className="flex items-center justify-between text-xs text-slate-400">
            <span>{isTermination ? "End the response" : "Flip to find out"}</span>
            <MousePointer2 size={14} className="text-violet-300" />
          </span>
        </button>
        <div
          aria-hidden={!verdict}
          className={cn(
            "card-face card-back flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center",
            {
              "border-lime-300 bg-lime-300 text-slate-950": verdict === "correct",
              "border-rose-400 bg-rose-950 text-rose-200": verdict !== "correct",
            }
          )}
        >
          {verdict === "correct" ? (
            <Check size={32} strokeWidth={3} />
          ) : (
            <X size={24} strokeWidth={3} />
          )}
          <span className="text-lg font-black">{verdict === "correct" ? "IT FITS!" : "NOPE!"}</span>
          <span title={candidateText} className="line-clamp-2 w-full break-all font-mono text-xs">
            {candidateText ? visibleWhitespace(candidateText) : readableToken(label)}
          </span>
          <span className="text-xs opacity-70">
            {verdict === "correct" ? "Valid continuation" : "This continuation is blocked"}
          </span>
          {verdict === "wrong" && (
            <button
              onClick={onExplain}
              disabled={disabled}
              className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-rose-300/40 bg-rose-900 px-3 py-1.5 text-xs font-bold text-rose-100 transition hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 disabled:opacity-50"
            >
              <CircleHelp size={13} />
              Explain why
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
