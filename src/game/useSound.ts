import { useCallback, useEffect, useRef, useState } from "react";

export type SoundCue = "tap" | "count" | "go" | "correct" | "wrong" | "win";
const NOTES: Record<SoundCue, number[]> = {
  tap: [520],
  count: [330],
  go: [440, 660, 880],
  correct: [523, 659, 784],
  wrong: [180, 120],
  win: [523, 659, 784, 1047, 784, 1047],
};

export default function useSound() {
  const context = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem("token-arcade-muted") === "true";
    } catch {
      return false;
    }
  });
  const mutedRef = useRef(muted);
  useEffect(
    () => () => {
      void context.current?.close();
    },
    []
  );
  const play = useCallback((cue: SoundCue) => {
    if (mutedRef.current) return;
    try {
      context.current ??= new AudioContext();
      const audio = context.current;
      void audio.resume().catch(() => {});
      NOTES[cue].forEach((frequency, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const start = audio.currentTime + index * 0.09;
        oscillator.type = cue === "wrong" ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.07, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(start + 0.24);
      });
    } catch {
      /* Audio is optional on browsers/devices without Web Audio. */
    }
  }, []);
  function toggle() {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    try {
      localStorage.setItem("token-arcade-muted", String(next));
    } catch {
      /* Private storage can be unavailable. */
    }
  }
  return { muted, toggle, play };
}
