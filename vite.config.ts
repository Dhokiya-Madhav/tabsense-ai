import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Builds the popup into dist/. Load the dist/ folder in chrome://extensions.
// Everything in public/ (manifest.json, icons/) is copied to dist/ as-is.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: { input: "popup.html" },
  },
});
