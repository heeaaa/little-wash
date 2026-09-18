import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// base: "./" keeps asset paths relative so the production build can be opened
// from any sub-path or static host (used for the previewable prototype build).
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    assetsInlineLimit: 4096,
  },
});
