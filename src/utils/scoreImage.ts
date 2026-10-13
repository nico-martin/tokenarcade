import { GAME_URL } from "../constants";
import { drawScorePoster, scoreRank } from "./scorePoster";
import type { PosterTheme } from "./scorePoster";
import { averageScore, formatPoints } from "./scoring";

export interface ScoreImageData {
  points: number;
  tokens: number;
  response: string;
  challenge?: string;
}

/** Wrap without dropping whitespace, long words, or explicit blank lines. */
export function wrapScoreText(
  text: string,
  maxWidth: number,
  measure: (text: string) => number
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replaceAll("\t", "    ").split(/\r\n|\r|\n/)) {
    let line = "";
    for (const character of paragraph) {
      if (line && measure(line + character) > maxWidth) {
        lines.push(line);
        line = "";
      }
      line += character;
    }
    lines.push(line);
  }
  return lines;
}

export function scoreImageFilename(data: ScoreImageData): string {
  return `token-arcade-${averageScore(data.points, data.tokens).toFixed(2).replace(".", "-")}.png`;
}

export function scoreShareCaption(data: ScoreImageData): string {
  const score = averageScore(data.points, data.tokens);
  return `${scoreRank(score)} ✨ I scored ${formatPoints(score)}/100 in Token Arcade${data.challenge ? ` — ${data.challenge}` : ""}. I picked the tokens. The constraints made the rules. ${score === 100 ? "Can you match my perfect run?" : "Can you beat my score?"}\n${GAME_URL}\n#TokenArcade #TransformersJS`;
}

export async function createScoreImage(
  data: ScoreImageData,
  theme: PosterTheme = "arcade"
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't create a score image.");
  const width = 1200;
  const codeSize = data.response.length <= 24 && !/[\r\n\t]/.test(data.response) ? 60 : 28;
  const lineHeight = codeSize === 60 ? 76 : 42;
  const codeFont = `${codeSize}px "SFMono-Regular", Consolas, monospace`;
  ctx.font = codeFont;
  const lines = wrapScoreText(
    data.response || "(empty response)",
    990,
    (text) => ctx.measureText(text).width
  );
  const responseHeight = Math.max(184, lines.length * lineHeight + 100);
  canvas.width = width;
  canvas.height = Math.max(1200, 785 + responseHeight + 215);
  drawScorePoster(ctx, data, lines, codeSize, lineHeight, theme);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't export the score image."))),
      "image/png"
    )
  );
}

export function downloadScoreImage(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyScoreImage(image: Blob): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error(
      "Image copying isn't supported in this browser. Save the PNG and upload it instead."
    );
  }
  await navigator.clipboard.write([new ClipboardItem({ "image/png": image })]);
}
