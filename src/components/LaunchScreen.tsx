import { Check, CheckCircle2, Cpu, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type useGame from "../game/useGame";
import type { SoundCue } from "../game/useSound";
import { Button, Panel, Spinner } from "../theme";
import cn from "../utils/classnames";
import TutorialCards from "./TutorialCards";

interface LaunchScreenProps {
  game: ReturnType<typeof useGame>;
  onReady: () => void;
  onBack: () => void;
  play: (cue: SoundCue) => void;
  className?: string;
}

function Countdown({ onReady, play }: Pick<LaunchScreenProps, "onReady" | "play">) {
  const [count, setCount] = useState(3);
  useEffect(() => {
    play(count > 0 ? "count" : "go");
    const timer = setTimeout(
      () => {
        if (count > 0) setCount(count - 1);
        else onReady();
      },
      count > 0 ? 850 : 650
    );
    return () => clearTimeout(timer);
  }, [count, onReady, play]);
  return (
    <div aria-live="polite" className="text-center">
      <p className="arcade-label text-lime-300">
        {count > 0 ? "Eyes on the cards" : "You’ve got this"}
      </p>
      <div
        key={count}
        className="countdown-pop my-8 text-9xl font-black tracking-tighter text-lime-300"
      >
        {count || "GO!"}
      </div>
      <p className="text-slate-400">Read. Think. Flip.</p>
    </div>
  );
}

export default function LaunchScreen({
  game,
  onReady,
  onBack,
  play,
  className = "",
}: LaunchScreenProps) {
  const [tutorialDone, setTutorialDone] = useState(false);
  const modelReady = game.phase === "playing";
  return (
    <div
      className={cn(
        "screen-enter mx-auto flex min-h-160 max-w-3xl flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12",
        className
      )}
    >
      {modelReady && tutorialDone ? (
        <Countdown onReady={onReady} play={play} />
      ) : game.phase === "error" ? (
        <div role="alert" className="text-center">
          <XCircle size={48} className="mx-auto text-rose-400" />
          <h1 className="mt-6 text-3xl font-black">Launch interrupted.</h1>
          <p className="mt-4 break-words text-sm leading-7 text-slate-400">{game.status}</p>
          <Button onClick={onBack} className="mt-6">
            Back to setup
          </Button>
        </div>
      ) : (
        <>
          {tutorialDone ? (
            <Panel tone="success" className="w-full rounded-3xl p-8 text-center">
              <CheckCircle2 size={40} className="mx-auto text-lime-300" />
              <h1 className="mt-5 text-3xl font-black">You’re ready. Your deck is catching up.</h1>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Briefing complete! As soon as the model and first hand are ready, we’ll count you
                in.
              </p>
              <Button variant="secondary" className="mt-5" onClick={() => setTutorialDone(false)}>
                Review the briefing
              </Button>
            </Panel>
          ) : (
            <TutorialCards play={play} onComplete={() => setTutorialDone(true)} />
          )}
          <Panel className="mt-8 w-full p-5">
            <div className="flex items-center gap-3 text-sm">
              {modelReady ? (
                <CheckCircle2 size={16} className="shrink-0 text-lime-300" />
              ) : (
                <Spinner size={16} className="text-lime-300" />
              )}
              <span role="status" className="min-w-0 flex-1">
                {modelReady
                  ? "Model & first hand ready. Finish the briefing to play."
                  : game.status}
              </span>
              {(modelReady || game.progress !== undefined) && (
                <span className="font-mono text-lime-300">
                  {modelReady ? 100 : Math.round(game.progress!)}%
                </span>
              )}
            </div>
            <progress
              aria-label="Aggregate model download progress"
              className="mt-4 h-2 w-full overflow-hidden rounded-full accent-lime-300"
              max={100}
              value={modelReady ? 100 : game.progress}
            />
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Cpu size={12} /> WebGPU engine
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={12} /> No server. Just you.
              </span>
            </div>
          </Panel>
          <p className="mt-6 text-center text-xs text-slate-500">
            The model loads in parallel. Play starts only after the briefing and model preparation
            are both complete.
          </p>
          <Button variant="ghost" onClick={onBack} className="mt-5">
            Cancel & return to setup
          </Button>
        </>
      )}
    </div>
  );
}
