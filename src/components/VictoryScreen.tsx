import { ArrowRight, RotateCcw, Trophy } from "lucide-react";
import { useRef } from "react";
import { Button, CodeBlock, Modal } from "../theme";
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
  const title = useRef<HTMLHeadingElement>(null);
  const confetti = (
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
  );
  return (
    <Modal
      titleId="victory-title"
      onClose={onSetup}
      dismissOnBackdrop={false}
      initialFocusRef={title}
      backdrop={confetti}
      className="border-lime-300/30 p-7 text-center sm:p-10"
      overlayClassName={cn("victory-overlay bg-slate-950/95 p-5", className)}
    >
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
      <CodeBlock className="my-6 max-h-44 p-4">{text || "(empty response)"}</CodeBlock>
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
    </Modal>
  );
}
