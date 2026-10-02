import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { variablesHoldingSecrets } from "./src/lib/account/secrets";

// base: "./" keeps asset paths relative so the production build can be opened
// from any sub-path or static host (used for the previewable prototype build).
export default defineConfig(({ mode }) => {
  /*
    Refuse to build or serve with a Supabase secret key in any VITE_ variable.
    Everything VITE_ is written into the site's JavaScript, and a secret key
    bypasses row level security: shipping one would publish a master key to
    everyone's data. loadEnv reads the .env files for this mode and the
    process environment (Netlify's variables) alike.
  */
  const leaked = variablesHoldingSecrets(loadEnv(mode, process.cwd(), "VITE_"));
  if (leaked.length > 0) {
    throw new Error(
      `Refusing to build: ${leaked.join(", ")} holds a Supabase secret key. ` +
        "Browser variables are public. Use the publishable key (sb_publishable_...) " +
        "and rotate the exposed secret key in the Supabase dashboard.",
    );
  }

  return {
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
  };
});
