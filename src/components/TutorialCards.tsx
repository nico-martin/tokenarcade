import { ArrowLeft, ArrowRight, Check, CheckCircle2, ShieldCheck, Trophy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SoundCue } from "../game/useSound";
import { Button, Panel } from "../theme";
import cn from "../utils/classnames";

interface TutorialCardsProps {
  onComplete: () => void;
  play: (cue: SoundCue) => void;
  className?: string;
}

const LESSONS = [
  {
    label: "The prediction",
    title: "The model guesses. Every token gets a score.",
    body: "A language model looks at your prompt and the response so far, then scores every possible next token. Those scores become probabilities: how likely the model thinks each token is next. Not how correct it is. Not whether it fits your rules.",
  },
  {
    label: "The constraint",
    title: "Same guesses. A second question: is it allowed?",
    body: "Structured output adds a gate after the model’s prediction. A JSON schema or regex checks which tokens can continue a response that satisfies your rules. The model’s original probabilities stay the same. The gate permits or blocks a token; it doesn’t make the model believe a different answer.",
  },
  {
    label: "Meet your cards",
    title: "Small pieces. Big possibilities.",
    body: "Each card is one token—not necessarily one word. It might add a letter, punctuation, whitespace, or several characters at once. Read exactly what it adds, especially spaces at the edges.",
  },
  {
    label: "Your turn",
    title: "You become the token sampler.",
    body: "Read the prompt, the constraint, and the response so far. Pick a card that can continue that response under the rules. Its probability is a clue about what the model wants—not a clue about whether the constraint allows it.",
  },
  {
    label: "The finish line",
    title: "Build it. End it. Beat your score.",
    body: "A green card adds its token to your response and deals the next hand. Keep going until the response satisfies the constraint, then choose an allowed end token: EOS (end-of-sequence) or the model’s end-of-turn token, such as <turn|>. These end the response without adding text. A valid prefix isn’t always a finished response!",
  },
];

function Predictions({ masked }: { masked: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-xs text-slate-500">
        <span>
          Illustration · constraint: <code className="text-lime-300">(heads|tails)</code>
        </span>
        <span>Original probability</span>
      </div>
      {[
        { token: "heads", probability: 62, allowed: true },
        { token: "␠tails", probability: 30, allowed: false },
        { token: "t", probability: 8, allowed: true },
      ].map(({ token, probability, allowed }) => (
        <div
          key={token}
          className="flex items-center gap-4 border-b border-slate-800 px-4 py-3 last:border-0"
        >
          <code className="w-20 text-lg font-bold">{token}</code>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-violet-400"
              style={{ width: `${probability}%` }}
            />
          </div>
          <span className="w-10 text-right font-mono text-sm text-violet-300">{probability}%</span>
          {masked && (
            <span
              className={cn("flex w-24 items-center gap-1.5 text-xs font-bold", {
                "text-lime-300": allowed,
                "text-rose-300": !allowed,
              })}
            >
              {allowed ? <Check size={14} /> : <X size={14} />}
              {allowed ? "Allowed" : "Blocked"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function Anatomy() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="flex h-44 flex-col justify-between rounded-2xl border border-violet-400 bg-slate-800 p-5">
        <div className="flex items-center justify-between font-mono text-sm">
          <span className="text-slate-400">#50390</span>
          <span className="text-violet-300">30.00%</span>
        </div>
        <code className="text-3xl font-bold">␠tails</code>
        <span className="text-xs text-slate-400">Flip to find out</span>
      </div>
      <ul className="space-y-3 text-sm leading-6 text-slate-400">
        <li>
          <strong className="text-white">␠tails</strong> is the token text. This adds a leading
          space, then <code>tails</code>.
        </li>
        <li>
          <strong className="text-violet-300">30.00%</strong> is the original next-token
          probability, not the chance of being allowed.
        </li>
        <li>
          <strong className="text-white">#50390</strong> is the token ID: its vocabulary identifier,
          not its rank or points.
        </li>
        <li>
          <code className="text-lime-300">␠</code> = a space, <code>\n</code> = newline,{" "}
          <code>\t</code> = tab. Literal quotes and backslashes are part of the token.
        </li>
      </ul>
    </div>
  );
}

function Gameplay() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Panel tone="success" className="rounded-xl p-4">
        <CheckCircle2 size={23} className="text-lime-300" />
        <h3 className="mt-2 font-bold text-lime-300">Green: it fits!</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Add the token. The model scores the next step, and you get a fresh hand. You’re building
          the response one choice at a time.
        </p>
      </Panel>
      <Panel tone="danger" className="rounded-xl p-4">
        <X size={23} className="text-rose-300" />
        <h3 className="mt-2 font-bold text-rose-300">Red: another try.</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          See the proposed response and why the choice is blocked. Your real response stays
          unchanged. The card stays flipped.
        </p>
      </Panel>
      <p className="text-xs leading-6 text-slate-500 sm:col-span-2">
        Every hand has at least one permitted card. Search “All tokens” to explore the full
        vocabulary. Allowed means it fits the processor’s rules—not that it’s factually correct.
      </p>
    </div>
  );
}

export default function TutorialCards({ onComplete, play, className = "" }: TutorialCardsProps) {
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const lesson = LESSONS[step];
  useEffect(() => {
    if (step > 0) heading.current?.focus({ preventScroll: true });
  }, [step]);
  function next() {
    play("tap");
    if (step === LESSONS.length - 1) onComplete();
    else setStep(step + 1);
  }
  return (
    <Panel
      className={cn("w-full rounded-3xl p-5 sm:p-8", className)}
      aria-label="How to play tutorial"
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="arcade-label text-violet-300">Your pre-game briefing</p>
        <span className="font-mono text-xs text-slate-500">
          {step + 1} / {LESSONS.length}
        </span>
      </div>
      <div className="mb-7 flex gap-2" aria-hidden="true">
        {LESSONS.map((item, index) => (
          <span
            key={item.label}
            className={cn("h-1 flex-1 rounded-full transition-colors", {
              "bg-lime-300": index <= step,
              "bg-slate-700": index > step,
            })}
          />
        ))}
      </div>
      <div key={step} className="screen-enter">
        <p className="arcade-label text-lime-300">{lesson.label}</p>
        <h1
          ref={heading}
          tabIndex={-1}
          className="mt-3 text-2xl font-black tracking-tight outline-none sm:text-3xl"
        >
          {lesson.title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">{lesson.body}</p>
        <div className="mt-6">
          {step === 0 ? (
            <Predictions masked={false} />
          ) : step === 1 ? (
            <>
              <Predictions masked />
              <p className="mt-3 flex items-start gap-2 text-xs leading-6 text-slate-500">
                <ShieldCheck size={15} className="mt-1 shrink-0 text-lime-300" />
                <span>
                  <code>␠tails</code> still has 30% original probability, but its leading space
                  breaks the regex. Real constrained sampling masks forbidden choices and
                  renormalizes the remaining probabilities. This game always shows the original,
                  pre-mask probabilities.
                </span>
              </p>
            </>
          ) : step === 2 ? (
            <Anatomy />
          ) : step === 3 ? (
            <Gameplay />
          ) : (
            <Panel tone="warning" className="rounded-xl p-5">
              <h3 className="flex items-center gap-2 font-bold text-amber-300">
                <Trophy size={19} />
                Every guess counts
              </h3>
              <p className="mt-3 font-mono text-xl font-bold text-white">100 → 50 → 25 → 12.5</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                The first correct pick earns 100 points. Each new wrong pick halves that turn’s
                reward. A new token resets it to 100.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                <strong>Final score = total points ÷ accepted tokens</strong>, including the end
                token. Aim for 100/100!
              </p>
            </Panel>
          )}
        </div>
      </div>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 pt-5">
        <Button
          variant="ghost"
          disabled={step === 0}
          onClick={() => {
            play("tap");
            setStep(step - 1);
          }}
        >
          <ArrowLeft size={15} />
          Back
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              play("tap");
              onComplete();
            }}
          >
            Skip briefing
          </Button>
          <Button onClick={next}>
            {step === LESSONS.length - 1 ? "Got it. I’m ready!" : "Continue"}
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </Panel>
  );
}
