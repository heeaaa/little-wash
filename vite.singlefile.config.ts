import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

// Produces one self-contained index.html (JS + CSS + SVGs inlined) for a
// shareable, clickable prototype preview. Fonts still load from Google Fonts.
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    outDir: "dist-single",
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
});
