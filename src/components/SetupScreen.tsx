import {
  ArrowRight,
  Braces,
  Coins,
  Flame,
  CalendarDays,
  Dices,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { PRESETS } from "../game/presets";
import { Button } from "../theme";
import cn from "../utils/classnames";

interface SetupScreenProps {
  preset: number;
  error: string;
  onPreset: (index: number) => void;
  onStart: () => void;
  className?: string;
}

const ICONS = [Flame, Coins, CalendarDays, Braces];

export default function SetupScreen({
  preset,
  error,
  onPreset,
  onStart,
  className = "",
}: SetupScreenProps) {
  const { prompt, constraint, type } = PRESETS[preset];
  return (
    <div className={cn("screen-enter mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-16", className)}>
      <div className="mb-10 text-center">
        <span className="arcade-label text-lime-300">A game of probability & possibility</span>
        <h1 className="mt-4 text-5xl font-black tracking-tighter sm:text-7xl">
          Think outside
          <br />
          the <span className="text-lime-300">token.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-slate-400">
          The model deals the cards. The constraints make the rules.
          <br />
          Flip a token. Find a fit. Build your perfect response.
        </p>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {PRESETS.map((item, index) => {
          const Icon = ICONS[index];
          return (
            <button
              key={item.name}
              onClick={() => onPreset(index)}
              aria-pressed={preset === index}
              className={cn(
                "mission-card rounded-2xl border p-5 text-left transition hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-lime-300",
                {
                  "border-lime-300 bg-lime-300/10": preset === index,
                  "border-slate-700 bg-slate-900 hover:border-slate-500": preset !== index,
                }
              )}
            >
              <Icon size={24} className={preset === index ? "text-lime-300" : "text-violet-300"} />
              <span className="mt-5 block text-base font-bold">{item.name}</span>
              <span className="mt-1 block text-xs text-slate-400">
                {index === 1
                  ? "Quick round · warm up"
                  : index === 0
                    ? "JSON quest · get creative"
                    : index === 2
                      ? "Regex puzzle · numbers only"
                      : "Free play · anything JSON"}
              </span>
            </button>
          );
        })}
      </div>
      <div className="grid gap-6 rounded-3xl border border-slate-700 bg-slate-900 p-5 sm:p-8 lg:grid-cols-2">
        <div className="flex flex-col">
          <label className="arcade-label flex items-center gap-2" htmlFor="prompt">
            <MessageSquare size={14} /> Your mission
          </label>
          <textarea
            id="prompt"
            value={prompt}
            readOnly
            className="field mt-3 h-36 shrink-0 resize-none text-base leading-7"
          />
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-lime-300">
              <Dices size={16} /> How to play
            </h3>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
              <li>01. Read the rules. Pick a token card.</li>
              <li>02. Green? It fits. Red? Try another.</li>
              <li>03. Finish with an allowed end token to win.</li>
            </ol>
            <p className="mt-4 text-sm font-semibold text-white">
              100 → 50 → 25 → 12.5 points per try
            </p>
          </div>
        </div>
        <div className="flex flex-col">
          <label className="arcade-label flex items-center gap-2" htmlFor="constraint">
            <ShieldCheck size={14} /> The rules
          </label>
          <textarea
            id="constraint"
            spellCheck={false}
            readOnly
            value={
              type === "json_object"
                ? "{ /* any valid JSON object */ }\n\nNo extra schema. Just a valid JSON object. You choose what goes inside."
                : constraint
            }
            className="field mt-3 min-h-64 flex-1 resize-none font-mono text-sm leading-6"
          />
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-rose-400/40 bg-rose-400/10 p-4 text-sm text-rose-200"
        >
          {error}
        </p>
      )}
      <div className="mt-8 flex flex-col items-center gap-4">
        <Button className="px-10 py-4 text-base" disabled={!prompt.trim()} onClick={onStart}>
          Let’s play <ArrowRight size={20} />
        </Button>
        <p className="text-center text-s text-slate-500">
          Gemma 4 · E2B · q4f16 · WebGPU · entirely in your browser
          <br />
          First visit downloads about 3.1 GB of text weights. Subsequent visits use the cache.
        </p>
      </div>
    </div>
  );
}
