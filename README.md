# Token Arcade

A browser-only game explaining constrained generation in Transformers.js. Built with React, TypeScript, Vite, Tailwind CSS v4, and lucide-react.

## Run

```sh
npm install
npm run dev
```

Open the Vite URL (normally http://localhost:5173). Choose a preset challenge; its prompt, constraint, and format are fixed, with read-only mission and rules fields. On the first model initialization, a five-card briefing explains original model probabilities, the constraint gate, token anatomy/whitespace, gameplay, and scoring/EOS while loading continues below. Use Continue or Skip briefing. Once the briefing is completed/skipped and the first hand is ready, a 3–2–1 countdown starts. If the model is already instantiated, later challenges and replays go directly to the game: no loading screen, briefing, or countdown. Each new round still resets its response, score, and grammar; round identifiers prevent old inference results from appearing in a new challenge.

The first run downloads `onnx-community/gemma-4-E2B-it-ONNX` q4f16 text weights (approximately 3.1 GB); subsequent page visits use the browser cache but still need to instantiate the model. Only the text embedding and decoder sessions are loaded, not the audio/vision encoders. The download bar uses the aggregate `progress_total` event across all files. **WebGPU is required**; there is no CPU fallback. Use a WebGPU-enabled browser on HTTPS or localhost with enough GPU memory for the model and generation caches. Prompts and inference stay in your browser; model files are fetched from Hugging Face.

## Play

- Each turn deals 48 likely token cards (12 rows of four on desktop), ordered from highest to lowest probability and guaranteed to contain at least one allowed choice. The inference hook selects the hand without exposing which card is allowed; if needed, it replaces the last card with the highest-ranked allowed token outside the hand, preserving probability order. All vocabulary tokens remain accessible through the searchable **All tokens** view, paginated in groups of 48 with the same descending probability order.
- Probabilities are the full-vocabulary softmax, not renormalized over allowed tokens. Token labels show tokenizer pieces; common whitespace markers are displayed as escaped whitespace. Byte-fallback pieces can look unusual.
- Click to flip a card: green means an allowed continuation, red means rejected. Rejected cards show the proposed response prefix; the explanation below the board describes the constraint check. This is a preview of appending that token, **not** an invented full completion. An incorrect token does not change the real response or trigger inference. Rejected cards stay flipped for the current turn.
- Rejected cards have an **Explain why** button. A modal streams an explanation from the already-loaded Gemma 4 E2B model, using the actual constraint, current prefix, rejected token, and proposed continuation. This is an AI interpretation, not another validator. Explanation generation uses a fresh, separate KV cache and no grammar mask; it does not change the game’s score, response, mask, or cache. Closing the modal interrupts generation and ignores stale responses. Errors and regeneration stay inside the modal.
- The first valid pick earns 100 points, the second 50, the third 25, and so on, without rounding intermediate scores.
- Select an allowed termination token to finish: `[EOS]` or a model-specific ending such as Gemma’s `<turn|>`. These cards say “End the response” and do not append their control markers to the output. Final score = total points / accepted token selections, including the end token. A 256-token safety limit interrupts unfinished rounds rather than marking them complete.
- Correct cards remain visible for 1.4 seconds while the next hand is computed. Choose an allowed end token for a confetti finish, then replay or pick a new challenge.
- The success screen includes a victory-poster studio: choose Arcade, Afterglow, or Gold rush colors and see a live preview. The social-ready PNG features a giant score, earned rank, decorative token cards, challenge name, full response, and a “your turn” callout. **Copy image** puts the actual PNG on the clipboard for pasting into your own social apps; **Save PNG** is the fallback when clipboard image support or permission is unavailable. There’s also a copyable challenge caption. Long responses wrap and expand the image rather than being cut off. Nothing is posted or uploaded automatically, and exporting needs no additional model call or screenshot dependency.
- Synthesized Web Audio effects accompany picks, verdicts, countdowns, and wins. The header's mute preference persists locally. Animations respect `prefers-reduced-motion`; cards work with keyboard activation and victory-dialog focus is contained.
- Leaving a round returns to setup and invalidates its pending results. The shared pipeline remains loaded between rounds. If you cancel during model initialization, that initialization may finish in the background and be reused; cancelling the round does not abort the library’s model downloads.

JSON Schema, full-string regex, and JSON-object constraints use the upstream package's supported feature set. Unsupported constraints surface as errors. Allowed means permitted by the processor, not factually correct. The effective mask includes its anti-repetition policy for JSON whitespace.

## How it works

`src/game/StructuredOutputProcessorGame.ts` wraps the existing public processor. It probes with zero logits to obtain the allowed-token mask independently from model scores, while preserving raw logits and probabilities. The mask remains private in the adapter; the UI receives validity only for clicked tokens.

Until the structured-output package supports multiple termination IDs, the adapter uses a demo-local compatibility shim. The upstream tokenizer-EOS bit determines whether the current response satisfies the grammar; the adapter mirrors that permission onto all IDs from `model.generation_config.eos_token_id` (Gemma: 1, 106, 50). They are all blocked before completion and treated as control tokens rather than grammar text. The overlay modifies only the local mask, never model scores or upstream shared caches. An explicit termination set is authoritative; omission defaults to tokenizer EOS. This shim can be replaced with the native API when available.

Inference runs directly in `src/game/useGame.ts`, with no application Web Worker. It creates one `pipeline("text-generation", MODEL_ID, { device: "webgpu", dtype: "q4f16" })` and reuses its model and tokenizer. Explanations use the pipeline’s normal callable API with streaming and cancellation; those generations get a fresh cache that Transformers.js automatically disposes.

Gameplay uses `pipeline.model.generate()` rather than the normal pipeline call because it needs raw full-vocabulary logits and a reusable KV cache, and must wait for a human choice between tokens. One single-token call per turn captures logits with a clean generation configuration, then forces a dummy EOS so the call returns immediately with the prefix’s cache. That dummy is discarded, never committed to the grammar, and never cached as part of the response. The next call supplies the full prefix plus the player-selected token alongside the previous cache, so only that new token requires evaluation. This preserves upstream model-specific input preparation without copying private generation internals or making logits processors asynchronous.

The hook serializes GPU operations, rejects stale round/explanation results, disposes game caches on completion/reset/error, and keeps weights loaded between rounds. On unmount, it interrupts active generation, waits for pending GPU work, then disposes the pipeline. No changes to the Transformers.js repository are required.

## Deploy

```sh
pnpm run deploy
```

`scripts/deploy.mjs` builds the app, clones the [Hugging Face Space](https://huggingface.co/spaces/nico-martin/tokenarcade) into a temporary directory, replaces its deployed assets, and commits/pushes changed builds to `main`. It configures Git Xet and Git LFS for WASM assets, preserves existing Space metadata while setting `sdk: static` and `app_file: index.html`, and adds a link to the [GitHub repository](https://github.com/nico-martin/tokenarcade). The temporary clone is removed afterward; the local repository is untouched. Identical builds do not create another commit.

Requires an existing Space, pnpm, Git, Git Xet, Git LFS, a configured Git commit identity, and SSH push access to `git@hf.co:spaces/nico-martin/tokenarcade`.

## Checks

Generic UI is shared through `src/theme/index.ts`: buttons, panels, modals, code blocks, disclosures, text areas, spinners, and loading status. Modal portals, scroll locking, keyboard dismissal, and focus trapping/restoration are implemented once. Game-specific cards, countdowns, tutorials, and sharing behavior stay in `src/components`.

```sh
npm run lint
npm run build
npm run format
```

TypeScript is pinned to the latest compatible 6.x line because typescript-eslint currently rejects TypeScript 7. Transformers.js and the structured-output package are pinned to matching 4.3.1 releases.

This is a simple demo application without unit, integration, or browser end-to-end tests. Verification uses TypeScript, ESLint, and the production build.
