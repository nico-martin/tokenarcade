import type { ResponseFormat } from "@huggingface/transformers-structured-output";
import { Braces, Volume2, VolumeX } from "lucide-react";
import { useCallback, useState } from "react";
import GameScreen from "./components/GameScreen";
import LaunchScreen from "./components/LaunchScreen";
import SetupScreen from "./components/SetupScreen";
import { PRESETS } from "./game/presets";
import useGame from "./game/useGame";
import useSound from "./game/useSound";
import { Button } from "./theme";

export default function App() {
  const [scene, setScene] = useState<"setup" | "launch" | "game">("setup");
  const [preset, setPreset] = useState(1);
  const { prompt, constraint, type } = PRESETS[preset];
  const [error, setError] = useState("");
  const game = useGame();
  const sound = useSound();
  const ready = useCallback(() => setScene("game"), []);

  function selectPreset(index: number) {
    sound.play("tap");
    setPreset(index);
    setError("");
  }

  function start() {
    sound.play("tap");
    try {
      if (!("gpu" in navigator))
        throw new Error(
          "This game requires WebGPU. Use a WebGPU-enabled browser on HTTPS or localhost."
        );
      let format: ResponseFormat;
      if (type === "json_schema") {
        const schema: unknown = JSON.parse(constraint);
        if (
          typeof schema !== "boolean" &&
          (schema === null || typeof schema !== "object" || Array.isArray(schema))
        )
          throw new Error("A JSON Schema must be an object or a boolean.");
        format = {
          type,
          json_schema: schema as Extract<ResponseFormat, { type: "json_schema" }>["json_schema"],
        };
      } else if (type === "regex") {
        if (!constraint.trim()) throw new Error("Enter a regular expression first.");
        format = { type, regex: constraint };
      } else format = { type: "json_object" };
      setError("");
      const reuseModel = game.start({ prompt, format });
      setScene(reuseModel ? "game" : "launch");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setScene("setup");
    }
  }

  function back() {
    sound.play("tap");
    game.reset();
    setScene("setup");
  }

  return (
    <div className="arcade-shell min-h-screen">
      <header className="relative z-10 border-b border-white/10 bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <button
            onClick={back}
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-lime-300"
            aria-label="Token Arcade, back to setup"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-300 text-slate-950">
              <Braces size={22} strokeWidth={2.5} />
            </span>
            <span className="text-lg font-black tracking-tight">
              token<span className="text-lime-300">arcade</span>
            </span>
          </button>
          <div className="hidden items-center gap-3 font-mono text-xs sm:flex">
            <span className={scene === "setup" ? "text-lime-300" : "text-slate-600"}>01 SETUP</span>
            <span className="text-slate-700">/</span>
            <span className={scene === "launch" ? "text-lime-300" : "text-slate-600"}>
              02 POWER UP
            </span>
            <span className="text-slate-700">/</span>
            <span className={scene === "game" ? "text-lime-300" : "text-slate-600"}>03 PLAY</span>
          </div>
          <Button
            variant="ghost"
            aria-label={sound.muted ? "Enable sound effects" : "Mute sound effects"}
            aria-pressed={!sound.muted}
            onClick={sound.toggle}
          >
            {sound.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span className="hidden text-xs sm:inline">
              {sound.muted ? "Sound off" : "Sound on"}
            </span>
          </Button>
        </div>
      </header>
      {scene === "setup" ? (
        <SetupScreen preset={preset} error={error} onPreset={selectPreset} onStart={start} />
      ) : scene === "launch" ? (
        <LaunchScreen game={game} onReady={ready} onBack={back} play={sound.play} />
      ) : (
        <GameScreen
          game={game}
          challenge={PRESETS[preset].name}
          prompt={prompt}
          constraint={
            type === "json_object" ? "Any valid JSON object. No additional schema." : constraint
          }
          play={sound.play}
          onBack={back}
          onReplay={start}
        />
      )}
      <footer className="relative mx-auto max-w-6xl px-4 py-6 text-center text-s text-slate-600 sm:px-8">
        Powered by{" "}
        <a
          className="underline hover:text-violet-300"
          href="https://github.com/huggingface/transformers.js/tree/main/packages/transformers-structured-output"
          target="_blank"
          rel="noreferrer"
        >
          Transformers.js Structured Output
        </a>
      </footer>
    </div>
  );
}
