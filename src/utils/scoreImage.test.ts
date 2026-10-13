import { afterEach, expect, it, vi } from "vitest";
import { GAME_URL } from "../constants";
import { copyScoreImage, scoreImageFilename, scoreShareCaption, wrapScoreText } from "./scoreImage";
import { POSTER_THEMES, scoreRank } from "./scorePoster";

afterEach(() => vi.unstubAllGlobals());

it("wraps a full response without truncating long strings or removing spaces", () => {
  const text = '  {"answer":"abcdefghijk"}  ';
  const lines = wrapScoreText(text, 5, (value) => value.length);
  expect(lines.every((line) => line.length <= 5)).toBe(true);
  expect(lines.join("")).toBe(text);
});

it("retains explicit blank lines, unicode code points, and empty results", () => {
  expect(wrapScoreText("a\n\nb", 10, (value) => value.length)).toEqual(["a", "", "b"]);
  expect(wrapScoreText("😀😀", 2, (value) => value.length)).toEqual(["😀", "😀"]);
  expect(wrapScoreText("", 10, (value) => value.length)).toEqual([""]);
});

it("names the PNG from the final average score", () => {
  expect(scoreImageFilename({ points: 950, tokens: 11, response: "2026-11-30" })).toBe(
    "token-arcade-86-36.png"
  );
});

it("earns ranks from the actual score, not from the chosen poster colors", () => {
  expect([100, 95, 86.36, 50].map(scoreRank)).toEqual([
    "PERFECT RUN",
    "TOKEN WIZARD",
    "CONSTRAINT CRUSHER",
    "TOKEN EXPLORER",
  ]);
  expect(POSTER_THEMES).toHaveLength(3);
  expect(
    scoreShareCaption({ points: 200, tokens: 2, response: "heads", challenge: "Heads or tails" })
  ).toContain("Can you match my perfect run?");
  expect(
    scoreShareCaption({
      points: 950,
      tokens: 11,
      response: "2026-11-30",
      challenge: "A calendar date",
    })
  ).toContain("86.36/100");
  expect(scoreShareCaption({ points: 200, tokens: 2, response: "heads" })).toContain(GAME_URL);
});

it("copies a PNG to the clipboard without invoking native social sharing", async () => {
  let clipboardData: Record<string, Blob> | undefined;
  vi.stubGlobal(
    "ClipboardItem",
    class {
      constructor(data: Record<string, Blob>) {
        clipboardData = data;
      }
    }
  );
  const write = vi.fn(async () => {});
  vi.stubGlobal("navigator", { clipboard: { write } });
  const png = new Blob(["poster"], { type: "image/png" });
  await copyScoreImage(png);
  expect(write).toHaveBeenCalledOnce();
  expect(clipboardData?.["image/png"]).toBe(png);
});

it("explains the download fallback if clipboard image support is missing", async () => {
  vi.stubGlobal("navigator", {});
  await expect(copyScoreImage(new Blob())).rejects.toThrow("Save the PNG");
});
