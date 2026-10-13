import { ArrowLeft, CheckCircle2, LoaderCircle, Trophy, XCircle, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type useGame from "../game/useGame";
import type { SoundCue } from "../game/useSound";
import { Button } from "../theme";
import cn from "../utils/classnames";
import { averageScore, formatPoints, pointsForAttempt } from "../utils/scoring";
import { visibleWhitespace } from "../utils/tokens";
import CardDeck from "./CardDeck";
import ExplanationModal from "./ExplanationModal";
import MissionControl from "./MissionControl";
import VictoryScreen from "./VictoryScreen";

interface GameScreenProps {
  game: ReturnType<typeof useGame>;
  prompt: string;
  constraint: string;
  challenge: string;
  play: (cue: SoundCue) => void;
  onBack: () => void;
  onReplay: () => void;
  className?: string;
}

export default function GameScreen({
  game,
  prompt,
  constraint,
  challenge,
  play,
  onBack,
  onReplay,
  className = "",
}: GameScreenProps) {
  const [victory, setVictory] = useState(false);
  useEffect(() => {
    if (game.feedback) play(game.feedback.correct ? "correct" : "wrong");
  }, [game.feedback, play]);
  useEffect(() => {
    if (game.phase !== "complete") return;
    const timer = setTimeout(() => {
      setVictory(true);
      play("win");
    }, 1400);
    return () => clearTimeout(timer);
  }, [game.phase, play]);
  const correct = game.feedback?.correct;
  return (
    <main className={cn("screen-enter mx-auto max-w-6xl px-4 py-6 sm:px-8", className)}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={15} />
          Leave round
        </Button>
        <div className="flex items-center gap-4 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm">
          <span className="flex items-center gap-2">
            <Trophy size={15} className="text-lime-300" />
            <strong className="font-mono">
              {formatPoints(averageScore(game.totalPoints, game.tokenCount))}
            </strong>
            <span className="text-slate-500">/ 100</span>
          </span>
          <span className="h-4 w-px bg-slate-700" />
          <span className="text-slate-400">{game.tokenCount} tokens</span>
        </div>
      </div>
      <MissionControl
        prompt={prompt}
        constraint={constraint}
        text={game.text}
        complete={game.phase === "complete"}
      />
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="arcade-label text-violet-300">
            Token {game.tokenCount + (game.phase === "complete" ? 0 : 1)} · pick your possibility
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            Which card keeps the story valid?
          </h1>
        </div>
        <span
          key={game.rejected.size}
          className="reward-pop flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-4 py-2 font-mono text-sm font-bold text-lime-300"
        >
          <Zap size={16} />
          {formatPoints(pointsForAttempt(game.rejected.size + 1))} pts up for grabs
        </span>
      </div>
      {game.phase === "error" ? (
        <div role="alert" className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-6">
          <h2 className="font-bold text-rose-300">Round interrupted</h2>
          <p className="mt-2 text-sm text-slate-300">{game.status}</p>
          <Button className="mt-4" onClick={onBack}>
            Back to setup
          </Button>
        </div>
      ) : (
        game.step && <CardDeck key={game.step.tokenCount} game={game} play={play} />
      )}
      <div
        aria-live="polite"
        className={cn("mt-5 rounded-2xl border p-5", {
          "border-slate-700 bg-slate-900": !game.feedback,
          "border-lime-300/30 bg-lime-300/10": correct === true,
          "border-rose-400/40 bg-rose-400/10": correct === false,
        })}
      >
        {game.feedback ? (
          <>
            <div className="flex items-center gap-2 text-sm font-bold">
              {correct ? (
                <CheckCircle2 size={18} className="text-lime-300" />
              ) : (
                <XCircle size={18} className="text-rose-300" />
              )}
              <span className={correct ? "text-lime-300" : "text-rose-300"}>
                {correct
                  ? `Fits like a charm! +${formatPoints(game.feedback.points)} points`
                  : "A tempting token. A broken rule."}
              </span>
            </div>
            {!correct && (
              <>
                <p className="arcade-label mt-4 text-rose-300">
                  The response this choice would produce
                </p>
                <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950/60 p-3 font-mono text-sm text-rose-200">
                  {visibleWhitespace(game.feedback.candidateText)}
                </pre>
              </>
            )}
            <p className="mt-3 text-sm leading-6 text-slate-400">{game.feedback.explanation}</p>
          </>
        ) : (
          <p className="text-sm leading-6 text-slate-400">
            Every card is a possibility. Flip one to test the rules.{" "}
            <span className="text-slate-200">A high probability does not mean it fits.</span>
          </p>
        )}
        {game.phase === "loading" && (
          <p role="status" className="mt-3 flex items-center gap-2 text-xs text-violet-300">
            <LoaderCircle size={13} className="animate-spin" />
            Dealing the next hand…
          </p>
        )}
      </div>
      <p className="mt-5 pb-6 text-center text-xs text-slate-600">
        Wrong cards stay flipped. Your response doesn’t change. Each new miss halves the reward.
      </p>
      {game.explanation && (
        <ExplanationModal
          key={game.explanation.requestId}
          explanation={game.explanation}
          label={game.labels[game.explanation.tokenId] ?? `[token ${game.explanation.tokenId}]`}
          constraint={constraint}
          onClose={game.closeExplanation}
          onRetry={() => {
            const tokenId = game.explanation!.tokenId;
            game.closeExplanation();
            game.explainToken(tokenId);
          }}
        />
      )}
      {victory && (
        <VictoryScreen
          points={game.totalPoints}
          tokens={game.tokenCount}
          text={game.text}
          challenge={challenge}
          onReplay={() => {
            setVictory(false);
            onReplay();
          }}
          onSetup={onBack}
        />
      )}
    </main>
  );
}
