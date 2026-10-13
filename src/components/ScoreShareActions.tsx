import { Check, Copy, Download, Image, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Disclosure, Spinner } from "../theme";
import cn from "../utils/classnames";
import {
  copyScoreImage,
  createScoreImage,
  downloadScoreImage,
  scoreImageFilename,
  scoreShareCaption,
} from "../utils/scoreImage";
import { POSTER_THEMES } from "../utils/scorePoster";
import type { PosterTheme } from "../utils/scorePoster";

interface ScoreShareActionsProps {
  points: number;
  tokens: number;
  response: string;
  challenge?: string;
  className?: string;
}

interface PosterAsset {
  file: File;
  preview: string;
  theme: PosterTheme;
}

export default function ScoreShareActions({
  points,
  tokens,
  response,
  challenge,
  className = "",
}: ScoreShareActionsProps) {
  const [theme, setTheme] = useState<PosterTheme>("arcade");
  const [asset, setAsset] = useState<PosterAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const ready = asset?.theme === theme;
  const caption = scoreShareCaption({ points, tokens, response, challenge });

  useEffect(() => {
    let active = true;
    let preview: string | undefined;
    const data = { points, tokens, response, challenge };
    // Render before the click so copying stays within the user-activation window.
    void createScoreImage(data, theme)
      .then((blob) => {
        if (!active) return;
        preview = URL.createObjectURL(blob);
        setAsset({
          file: new File([blob], scoreImageFilename(data), { type: "image/png" }),
          preview,
          theme,
        });
      })
      .catch((reason: unknown) => {
        if (active)
          setError(reason instanceof Error ? reason.message : "Couldn't prepare your poster.");
      });
    return () => {
      active = false;
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [points, tokens, response, challenge, theme]);

  async function copyImage() {
    if (!ready || !asset || busy) return;
    setBusy(true);
    setError("");
    try {
      await copyScoreImage(asset.file);
      setCopied(true);
      setMessage("Poster copied! Paste it into your post, story, or group chat.");
    } catch (reason: unknown) {
      setError(
        reason instanceof Error && reason.message.includes("isn't supported")
          ? reason.message
          : "Clipboard access was blocked. Save the PNG below and upload it instead."
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyCaption() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(caption);
      setCopied(false);
      setMessage("Caption copied. Paste it into your post, then copy your image.");
      setError("");
    } catch {
      setError("Couldn't copy the caption. You can select and copy it below.");
    }
  }

  return (
    <section
      className={cn(
        "mb-6 rounded-2xl border border-violet-400/30 bg-linear-to-br from-violet-400/10 via-slate-950/60 to-lime-300/5 p-4 text-left",
        className
      )}
      aria-label="Make your victory poster"
    >
      <div className="flex items-center gap-2">
        <Sparkles size={17} className="text-lime-300" />
        <h2 className="text-base font-black">Make it a victory lap.</h2>
      </div>
      <p className="mt-1 text-xs leading-6 text-slate-400">
        Pick your colors. Copy your trophy. Challenge the group chat.
      </p>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Poster colors">
        {POSTER_THEMES.map((item) => (
          <button
            key={item.id}
            disabled={busy}
            aria-pressed={theme === item.id}
            onClick={() => {
              setTheme(item.id);
              setCopied(false);
              setError("");
              setMessage("");
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-violet-300 disabled:opacity-50",
              {
                "border-white/50 bg-white/10 text-white": theme === item.id,
                "border-slate-700 text-slate-400 hover:border-slate-500": theme !== item.id,
              }
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.accent }} />
            {item.name}
            {theme === item.id && <Check size={12} />}
          </button>
        ))}
      </div>
      <div className="mt-4 grid min-h-48 place-items-center overflow-hidden rounded-xl border border-slate-700 bg-slate-950 p-3">
        {ready && asset ? (
          <img
            src={asset.preview}
            alt={`Your ${theme} victory poster, showing the score and complete response`}
            className="max-h-64 w-full rounded-lg object-contain"
          />
        ) : (
          <div role="status" className="flex flex-col items-center gap-3 text-xs text-violet-300">
            {error ? <Image size={24} /> : <Spinner size={24} />}
            {error ? "Poster couldn't be prepared" : "Making your trophy…"}
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => void copyImage()} disabled={!ready || busy} className="flex-1">
          {busy ? <Spinner size={16} /> : copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Image copied!" : "Copy image"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (!ready || !asset) return;
            downloadScoreImage(asset.file);
            setMessage("PNG saved. Your next post is ready.");
            setError("");
          }}
          disabled={!ready || busy}
        >
          <Download size={16} />
          Save PNG
        </Button>
      </div>
      <Disclosure
        title="Need a caption? Borrow this one."
        className="mt-4"
        summaryClassName="text-violet-300"
      >
        <p className="mt-3 select-text whitespace-pre-wrap break-words text-xs leading-6 text-slate-300">
          {caption}
        </p>
        <Button
          variant="ghost"
          onClick={() => void copyCaption()}
          className="mt-2 px-0 py-1 text-xs"
        >
          <Copy size={13} />
          Copy caption
        </Button>
      </Disclosure>
      <p
        aria-live="polite"
        className={cn("mt-3 text-xs leading-5", {
          "text-rose-300": !!error,
          "text-lime-300": !error && !!message,
          "text-slate-500": !error && !message,
        })}
      >
        {error || message || "Copied locally as a PNG. You choose where to post it."}
      </p>
    </section>
  );
}
