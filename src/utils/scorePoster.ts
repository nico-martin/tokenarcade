import { GAME_URL } from "../constants";
import type { ScoreImageData } from "./scoreImage";
import { averageScore, formatPoints } from "./scoring";

export const POSTER_THEMES = [
  {
    id: "arcade",
    name: "Arcade",
    accent: "#bef264",
    secondary: "#a78bfa",
    background: "#070915",
    panel: "#10172c",
  },
  {
    id: "afterglow",
    name: "Afterglow",
    accent: "#f9a8d4",
    secondary: "#67e8f9",
    background: "#150a23",
    panel: "#24132f",
  },
  {
    id: "gold",
    name: "Gold rush",
    accent: "#fcd34d",
    secondary: "#fb923c",
    background: "#100d09",
    panel: "#211b13",
  },
] as const;

export type PosterTheme = (typeof POSTER_THEMES)[number]["id"];
type Palette = (typeof POSTER_THEMES)[number];

export function scoreRank(score: number): string {
  if (score === 100) return "PERFECT RUN";
  if (score >= 90) return "TOKEN WIZARD";
  if (score >= 70) return "CONSTRAINT CRUSHER";
  return "TOKEN EXPLORER";
}

function tokenDecoration(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  token: string,
  palette: Palette
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.shadowColor = palette.secondary + "33";
  ctx.shadowBlur = 32;
  ctx.fillStyle = palette.panel;
  ctx.strokeStyle = palette.secondary + "88";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-72, -92, 144, 184, 22);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
  ctx.font = "bold 14px monospace";
  ctx.fillStyle = palette.secondary;
  ctx.fillText("TOKEN", -48, -54);
  ctx.font = "bold 40px monospace";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(token, -48, 10);
  ctx.fillStyle = palette.accent;
  ctx.font = "bold 17px monospace";
  ctx.fillText("IT FITS ✓", -48, 60);
  ctx.restore();
}

/** A square social poster; long responses extend the artboard instead of clipping. */
export function drawScorePoster(
  ctx: CanvasRenderingContext2D,
  data: ScoreImageData,
  lines: string[],
  codeSize: number,
  lineHeight: number,
  theme: PosterTheme
): void {
  const palette = POSTER_THEMES.find((item) => item.id === theme) ?? POSTER_THEMES[0];
  const { width, height } = ctx.canvas;
  const score = averageScore(data.points, data.tokens);
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(600, 495, 20, 600, 495, 580);
  glow.addColorStop(0, palette.secondary + "40");
  glow.addColorStop(0.6, palette.secondary + "14");
  glow.addColorStop(1, palette.secondary + "00");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = palette.secondary + "0c";
  ctx.lineWidth = 1;
  for (let x = 32; x < width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 32; y < height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = palette.accent + "88";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(24, 24, width - 48, height - 48, 38);
  ctx.stroke();
  for (let i = 0; i < 34; i++) {
    ctx.save();
    const right = i % 2 === 0;
    ctx.translate(right ? 1030 + ((i * 23) % 110) : 55 + ((i * 19) % 110), 180 + ((i * 71) % 520));
    ctx.rotate(i * 0.8);
    ctx.fillStyle = i % 3 === 0 ? palette.accent : palette.secondary;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, 0, i % 3 === 0 ? 5 : 9, 4);
    ctx.restore();
  }

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.roundRect(70, 68, 58, 58, 17);
  ctx.fill();
  ctx.font = "bold 29px monospace";
  ctx.fillStyle = palette.background;
  ctx.textAlign = "left";
  ctx.fillText("{}", 80, 106);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 33px system-ui, sans-serif";
  ctx.fillText("tokenarcade", 145, 107);
  ctx.textAlign = "right";
  ctx.fillStyle = palette.secondary;
  ctx.font = "bold 16px monospace";
  ctx.fillText("PLAYER-BUILT. CONSTRAINT-APPROVED.", 1128, 103);

  ctx.textAlign = "center";
  ctx.font = "900 68px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("CONSTRAINTS?", 600, 228);
  ctx.fillStyle = palette.accent;
  ctx.fillText("CONQUERED.", 600, 299);
  const rank = scoreRank(score);
  ctx.font = "bold 19px monospace";
  const badgeWidth = ctx.measureText(rank).width + 48;
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.roundRect(600 - badgeWidth / 2, 326, badgeWidth, 42, 21);
  ctx.fill();
  ctx.fillStyle = palette.background;
  ctx.fillText(rank, 600, 354);

  ctx.strokeStyle = palette.accent + "25";
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 13]);
  ctx.beginPath();
  ctx.arc(600, 528, 170, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  tokenDecoration(ctx, 170, 530, -0.2, "{ }", palette);
  tokenDecoration(ctx, 1030, 545, 0.2, ">_", palette);
  const scoreText = formatPoints(score);
  let scoreSize = 256;
  ctx.font = `900 ${scoreSize}px system-ui, sans-serif`;
  while (ctx.measureText(scoreText).width > 730 && scoreSize > 160) {
    scoreSize -= 4;
    ctx.font = `900 ${scoreSize}px system-ui, sans-serif`;
  }
  ctx.textAlign = "center";
  ctx.fillStyle = palette.accent;
  ctx.shadowColor = palette.accent + "44";
  ctx.shadowBlur = 46;
  ctx.fillText(scoreText, 600, 625);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 24px monospace";
  ctx.fillText("OUT OF 100", 600, 678);
  ctx.fillStyle = "#a5adbf";
  ctx.font = "22px system-ui, sans-serif";
  ctx.fillText(
    `${formatPoints(data.points)} points  ·  ${data.tokens} picks  ·  end token included`,
    600,
    736
  );

  const responseHeight = Math.max(184, lines.length * lineHeight + 100);
  ctx.fillStyle = palette.panel;
  ctx.strokeStyle = palette.secondary + "66";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(70, 785, 1060, responseHeight, 26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.secondary;
  ctx.textAlign = "left";
  ctx.font = "bold 18px monospace";
  ctx.fillText(`${(data.challenge ?? "TOKEN CHALLENGE").toUpperCase()} / MY RESPONSE`, 102, 826);
  ctx.font = `${codeSize}px "SFMono-Regular", Consolas, monospace`;
  ctx.fillStyle = "#f8fafc";
  lines.forEach((line, index) => ctx.fillText(line, 102, 830 + codeSize + index * lineHeight));

  ctx.textAlign = "center";
  ctx.fillStyle = palette.accent;
  ctx.font = "900 48px system-ui, sans-serif";
  ctx.fillText("YOUR TURN.", 600, height - 123);
  ctx.fillStyle = "#ffffff";
  ctx.font = "26px system-ui, sans-serif";
  ctx.fillText(
    score === 100 ? "Can you match my perfect run?" : `Can you beat ${formatPoints(score)}/100?`,
    600,
    height - 78
  );
  ctx.fillStyle = palette.secondary;
  ctx.font = "18px monospace";
  ctx.fillText(GAME_URL.replace("https://", ""), 600, height - 43);
}
