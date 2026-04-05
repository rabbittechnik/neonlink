function stripTrailingSlash(url) {
    return url.replace(/\/$/, "");
}
const envApi = import.meta.env.VITE_API_BASE_URL;
const fromEnv = typeof envApi === "string" ? stripTrailingSlash(envApi.trim()) : "";
/** Desktop/Electron: gleiche Origin wie die ausgelieferte SPA (Server liefert UI + API). */
const embedDesktop = import.meta.env.VITE_EMBED_DESKTOP === "true";
/** In DEV ohne VITE_API_BASE_URL: REST über Vite-Proxy `/api` → Backend */
const devUsesProxy = import.meta.env.DEV && !fromEnv;
/** Basis für fetch() (leer = gleiche Origin; Production nie localhost-Fallback) */
export const API_BASE_URL = devUsesProxy
    ? "/api"
    : fromEnv
        ? fromEnv
        : embedDesktop
            ? ""
            : import.meta.env.PROD
                ? ""
                : "http://localhost:4000";
const envSocket = import.meta.env.VITE_SOCKET_URL;
const socketFromEnv = typeof envSocket === "string" ? stripTrailingSlash(envSocket.trim()) : "";
/**
 * Socket.IO verbindet direkt mit dem Backend-Port, wenn REST den Vite-Proxy nutzt
 * (WS über denselben Proxy ist fehleranfälliger).
 */
export const SOCKET_ORIGIN = embedDesktop
    ? typeof window !== "undefined"
        ? window.location.origin
        : "http://127.0.0.1:4000"
    : socketFromEnv
        ? socketFromEnv
        : devUsesProxy
            ? "http://localhost:4000"
            : API_BASE_URL
                ? API_BASE_URL
                : typeof window !== "undefined"
                    ? window.location.origin
                    : "http://127.0.0.1:4000";
