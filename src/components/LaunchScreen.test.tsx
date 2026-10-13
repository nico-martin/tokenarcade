import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type useGame from "../game/useGame";
import LaunchScreen from "./LaunchScreen";

function renderLaunch(phase: "loading" | "playing" | "error") {
  const game: ReturnType<typeof useGame> = {
    phase,
    modelLoaded: phase === "playing",
    status: "Preparing model files",
    progress: 40,
    labels: [],
    terminationTokenIds: [],
    step: null,
    feedback: null,
    reveals: new Map(),
    rejected: new Set(),
    pendingGuess: false,
    totalPoints: 0,
    tokenCount: 0,
    text: "",
    start: vi.fn(),
    reset: vi.fn(),
    guess: vi.fn(),
    explanation: null,
    explainToken: vi.fn(),
    closeExplanation: vi.fn(),
  };
  return renderToStaticMarkup(
    <LaunchScreen game={game} onReady={vi.fn()} onBack={vi.fn()} play={vi.fn()} />
  );
}

it("shows the briefing and aggregate progress together during loading", () => {
  const html = renderLaunch("loading");
  expect(html).toContain("Your pre-game briefing");
  expect(html).toContain("Preparing model files");
  expect(html).toContain('value="40"');
  expect(html).toContain("Continue");
  expect(html).toContain("Skip briefing");
});

it("does not skip the briefing when a cached model is already ready", () => {
  const html = renderLaunch("playing");
  expect(html).toContain("Your pre-game briefing");
  expect(html).toContain("Finish the briefing to play.");
  expect(html).toContain('value="100"');
  expect(html).not.toContain("Eyes on the cards");
});

it("still surfaces preparation failures and a route back to setup", () => {
  const html = renderLaunch("error");
  expect(html).toContain("Launch interrupted.");
  expect(html).toContain("Back to setup");
});
