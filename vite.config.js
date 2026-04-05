import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
    plugins: [react()],
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
                rewrite: function (p) { return p.replace(/^\/api/, ""); },
                ws: true,
            },
        },
    },
});
