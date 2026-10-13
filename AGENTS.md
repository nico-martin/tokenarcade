# Project guidelines

- Use React, TypeScript, Vite, Tailwind CSS v4, and lucide-react. Follow the `react-spa` skill's component and theme organization.
- Prefer standard Tailwind utilities. Avoid bracket-value classes when standard spacing, typography, grids, or shadows can express the layout.
- Run inference only on WebGPU. Do not add a WASM/CPU fallback or a device picker.
- Use `onnx-community/gemma-4-E2B-it-ONNX` (q4f16) for both gameplay and explanations, and `progress_total` events for aggregate download progress. Load through `AutoModelForCausalLM` to use only its text-generation sessions; do not load unused audio/vision encoders.
- Keep this demo simple: **do not add Playwright, browser end-to-end tests, or their configuration** unless the user explicitly requests them. Verify with the existing unit tests, TypeScript, ESLint, and the production build instead.
- Keep the allowed-token mask in the inference worker. Reveal a token's validity only after the player clicks it.
- Until upstream supports multiple termination tokens, use the demo adapter's EOS-permission overlay with the model's generation-config termination IDs. Never append accepted end-of-turn/EOS control tokens to the response or change their original probabilities.
- Do not modify the Transformers.js repository to implement demo-specific functionality.
