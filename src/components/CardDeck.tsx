import { ArrowLeft, ArrowRight, Layers, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type useGame from "../game/useGame";
import type { SoundCue } from "../game/useSound";
import { Button } from "../theme";
import cn from "../utils/classnames";
import { CARDS_PER_HAND } from "../utils/deck";
import { readableToken, tokenText } from "../utils/tokens";
import TokenCard from "./TokenCard";

interface CardDeckProps {
  game: ReturnType<typeof useGame>;
  play: (cue: SoundCue) => void;
  className?: string;
}

export default function CardDeck({ game, play, className = "" }: CardDeckProps) {
  const [allTokens, setAllTokens] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const step = game.step!;
  const ids = useMemo(() => {
    if (!allTokens && !search) {
      return Array.from(step.deck);
    }
    const query = search.toLowerCase();
    return Array.from(step.order).filter(
      (id) =>
        !query ||
        String(id) === query ||
        tokenText(game.labels[id] ?? "")
          .toLowerCase()
          .includes(query) ||
        readableToken(game.labels[id] ?? `[token ${id}]`)
          .toLowerCase()
          .includes(query)
    );
  }, [step, allTokens, search, game.labels]);
  const pages = Math.max(1, Math.ceil(ids.length / CARDS_PER_HAND));
  const currentPage = Math.min(page, pages - 1);
  const cards = ids.slice(currentPage * CARDS_PER_HAND, (currentPage + 1) * CARDS_PER_HAND);
  return (
    <div className={cn("mt-6", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            variant={allTokens ? "ghost" : "secondary"}
            onClick={() => {
              setAllTokens(false);
              setSearch("");
              setPage(0);
            }}
          >
            <Layers size={15} />
            Your hand
          </Button>
          <Button
            variant={allTokens ? "secondary" : "ghost"}
            onClick={() => {
              setAllTokens(true);
              setPage(0);
            }}
          >
            All {step.order.length.toLocaleString()} tokens
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
            <Search size={14} className="text-slate-500" />
            <input
              aria-label="Search all tokens or exact token ID"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Find a token…"
              className="w-32 bg-transparent text-sm outline-none sm:w-40"
            />
          </label>
        </div>
      </div>
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        key={`${currentPage}-${search}`}
      >
        {cards.map((id, index) => {
          const reveal = game.reveals.get(id);
          return (
            <TokenCard
              key={id}
              id={id}
              label={game.labels[id] ?? `[token ${id}]`}
              probability={step.probabilities[id]}
              isTermination={game.terminationTokenIds.includes(id)}
              verdict={reveal ? (reveal.correct ? "correct" : "wrong") : undefined}
              candidateText={reveal?.candidateText}
              disabled={game.phase !== "playing" || game.pendingGuess}
              index={index}
              onClick={() => {
                play("tap");
                game.guess(id);
              }}
              onExplain={() => {
                play("tap");
                game.explainToken(id);
              }}
            />
          );
        })}
      </div>
      {cards.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-400">
          No matching cards. Try a token ID or another search.
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <p>
          {allTokens || search
            ? "All tokens, ranked by unconstrained probability."
            : "Highest-probability candidates first. At least one fits."}{" "}
          Percentages are the model’s guesses, not hints.
          <span className="mt-2 block font-mono text-slate-400">
            ␠ = space (including leading / trailing) · \n = newline · \t = tab
          </span>
        </p>
        {(allTokens || !!search) && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              aria-label="Previous cards"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              <ArrowLeft size={14} />
            </Button>
            <span className="font-mono">
              {currentPage + 1} / {pages}
            </span>
            <Button
              variant="ghost"
              aria-label="Next cards"
              disabled={currentPage + 1 === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              <ArrowRight size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
