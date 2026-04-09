import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import os from "node:os";
import path from "node:path";
/** Railway/Docker: Vite-Cache nicht unter node_modules (vermeidet EBUSY beim Build). */
var tmpViteCache = Boolean(process.env.CI) ||
    Boolean(process.env.RAILWAY_GIT_COMMIT_SHA) ||
    Boolean(process.env.RAILWAY_ENVIRONMENT);
export default defineConfig({
    plugins: [react()],
    cacheDir: tmpViteCache ? path.join(os.tmpdir(), "neonlink-vite-cache") : undefined,
    resolve: {
        /** TS/TSX vor JS: verhindert, dass alte Kompilat-*.js die echten .tsx-Quellen überschatten (sonst schwarze Seite / alter Code). */
        extensions: [".mjs", ".mts", ".ts", ".tsx", ".jsx", ".js", ".json"],
        alias: {
            "@": path.resolve(process.cwd(), "src"),
        },
    },
    server: {
        proxy: {
            "/api": {
                target: "http://127.0.0.1:4000",
                changeOrigin: true,
                rewrite: function (p) { return p.replace(/^\/api/, ""); },
                ws: true,
            },
        },
    },
});
