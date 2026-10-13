import { MessageSquare, ShieldCheck, Terminal } from "lucide-react";
import { CodeBlock, Disclosure, Panel } from "../theme";
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
    <Panel className={cn(className)}>
      <div className="grid gap-4 border-b border-slate-700 p-5 lg:grid-cols-2">
        <div>
          <h2 className="arcade-label flex items-center gap-2 text-violet-300">
            <MessageSquare size={13} /> The prompt
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{prompt}</p>
        </div>
        <Disclosure
          open
          bare
          title="The constraints"
          icon={<ShieldCheck size={13} />}
          hint="show / hide"
          summaryClassName="arcade-label"
        >
          <CodeBlock bare size="xs" className="mt-3 max-h-44">
            {constraint}
          </CodeBlock>
        </Disclosure>
      </div>
      <div className="p-5">
        <h2 className="arcade-label flex items-center gap-2 text-slate-500">
          <Terminal size={13} /> Response so far{" "}
          {complete && <span className="ml-auto text-lime-300">COMPLETE ✓</span>}
        </h2>
        <CodeBlock bare size="lg" aria-live="polite" className="mt-3 max-h-48 text-white">
          {text || <span className="text-slate-600">Your first token goes here…</span>}
          {!complete && (
            <span className="ml-1 inline-block h-5 w-2 animate-pulse bg-lime-300 align-middle" />
          )}
        </CodeBlock>
      </div>
    </Panel>
  );
}
