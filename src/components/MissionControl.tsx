import { MessageSquare, ShieldCheck, Terminal } from "lucide-react";
import cn from "../utils/classnames";

interface MissionControlProps {
  prompt: string;
  constraint: string;
  text: string;
  complete: boolean;
  className?: string;
}

export default function MissionControl({
  prompt,
  constraint,
  text,
  complete,
  className = "",
}: MissionControlProps) {
  return (
    <div className={cn("rounded-2xl border border-slate-700 bg-slate-900", className)}>
      <div className="grid gap-4 border-b border-slate-700 p-5 lg:grid-cols-2">
        <div>
          <h2 className="arcade-label flex items-center gap-2 text-violet-300">
            <MessageSquare size={13} /> The prompt
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{prompt}</p>
        </div>
        <details open className="min-w-0">
          <summary className="arcade-label flex cursor-pointer items-center gap-2 text-lime-300">
            <ShieldCheck size={13} /> The constraints{" "}
            <span className="ml-auto text-xs font-normal tracking-normal text-slate-500">
              show / hide
            </span>
          </summary>
          <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-6 text-slate-300">
            {constraint}
          </pre>
        </details>
      </div>
      <div className="p-5">
        <h2 className="arcade-label flex items-center gap-2 text-slate-500">
          <Terminal size={13} /> Response so far{" "}
          {complete && <span className="ml-auto text-lime-300">COMPLETE ✓</span>}
        </h2>
        <pre
          aria-live="polite"
          className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-lg leading-8 text-white"
        >
          {text || <span className="text-slate-600">Your first token goes here…</span>}
          {!complete && (
            <span className="ml-1 inline-block h-5 w-2 animate-pulse bg-lime-300 align-middle" />
          )}
        </pre>
      </div>
    </div>
  );
}
