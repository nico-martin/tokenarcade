# Project guidelines

- Use React, TypeScript, Vite, Tailwind CSS v4, and lucide-react. Follow the `react-spa` skill's component and theme organization.
- Prefer standard Tailwind utilities. Avoid bracket-value classes when standard spacing, typography, grids, or shadows can express the layout.
- Extract duplicated generic UI into `src/theme` and import it through `src/theme/index.ts`. Reuse the shared modal, panel, code block, disclosure, loading, form, and button primitives; keep game-specific behavior in `src/components`.
- Run inference only on WebGPU. Do not add a WASM/CPU fallback or a device picker.
- Use `onnx-community/gemma-4-E2B-it-ONNX` (q4f16) for both gameplay and explanations, and `progress_total` events for aggregate download progress. Create one shared `text-generation` pipeline, which loads only text-generation sessions; do not load unused audio/vision encoders.
- Keep this demo simple: **do not add unit tests, integration tests, browser end-to-end tests, test frameworks, or their configuration** unless the user explicitly requests them. Verify with TypeScript, ESLint, and the production build instead.
- Run inference directly in `src/game/useGame.ts`, not in a Web Worker. Use the shared pipeline for explanations and its `.model.generate()` for gameplay logits/KV-cache access. Keep the allowed-token mask private in the adapter; reveal a token's validity only after the player clicks it.
- Until upstream supports multiple termination tokens, use the demo adapter's EOS-permission overlay with the model's generation-config termination IDs. Never append accepted end-of-turn/EOS control tokens to the response or change their original probabilities.
- Do not modify the Transformers.js repository to implement demo-specific functionality.
