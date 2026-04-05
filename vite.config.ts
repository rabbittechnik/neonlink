import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import os from "node:os";
import path from "node:path";

/** Railway/Docker: Vite-Cache nicht unter node_modules (vermeidet EBUSY beim Build). */
const tmpViteCache =
  Boolean(process.env.CI) ||
  Boolean(process.env.RAILWAY_GIT_COMMIT_SHA) ||
  Boolean(process.env.RAILWAY_ENVIRONMENT);

export default defineConfig({
  plugins: [react()],
  cacheDir: tmpViteCache ? path.join(os.tmpdir(), "neonlink-vite-cache") : undefined,
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
        ws: true,
      },
    },
  },
});
