import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Prebundle the inference dependencies to avoid first-use development reloads.
  optimizeDeps: {
    include: ["@huggingface/transformers", "@huggingface/transformers-structured-output"],
  },
});
