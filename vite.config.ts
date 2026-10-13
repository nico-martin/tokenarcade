import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: "es" },
  // These are imported only by the lazy worker. Prebundle them up front so
  // Vite doesn't discover new dependencies and reload the page on first play.
  optimizeDeps: {
    include: ["@huggingface/transformers", "@huggingface/transformers-structured-output"],
  },
});
