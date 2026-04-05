import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";
import type { Database, SqlJsStatic } from "sql.js";
import type { AuthPersistV1 } from "./auth.js";
import { captureAuthState, restoreAuthState } from "./auth.js";
import { captureStoreSnapshot, restoreStoreSnapshot } from "./store.js";

let sqlModule: SqlJsStatic | null = null;
let db: Database | null = null;
let dbFilePath = "";
let saveTimer: ReturnType<typeof setInterval> | null = null;
let persistenceStarted = false;

/** Ohne gesetzte Variable: `<cwd>/data` (bei `npm run dev` im Ordner `server` → `server/data`). */
export function getDataDir(): string {
  const fromEnv = process.env.NEONLINK_DATA_DIR?.trim();
  if (fromEnv) return fromEnv;
  return path.join(process.cwd(), "data");
}

function writeDbFile(): void {
  if (!db || !dbFilePath) return;
  const data = db.export();
  fs.writeFileSync(dbFilePath, Buffer.from(data));
}

export async function initPersistenceAsync(): Promise<void> {
  if (persistenceStarted) return;
  persistenceStarted = true;

  const dir = getDataDir();
  fs.mkdirSync(dir, { recursive: true });
  dbFilePath = path.join(dir, "neonlink.db");

  const distDir = path.dirname(fileURLToPath(import.meta.url));
  const wasmDir = path.join(distDir, "..", "node_modules", "sql.js", "dist");

  sqlModule = await initSqlJs({
    locateFile: (file) => path.join(wasmDir, file),
  });

  if (fs.existsSync(dbFilePath)) {
    const buf = fs.readFileSync(dbFilePath);
    db = new sqlModule.Database(buf);
  } else {
    db = new sqlModule.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const select = db.exec("SELECT payload FROM app_state WHERE id = 1");
  const payloadCell = select[0]?.values[0]?.[0];
  if (typeof payloadCell === "string" && payloadCell.length > 0) {
    try {
      const parsed = JSON.parse(payloadCell) as {
        version?: number;
        store?: unknown;
        auth?: AuthPersistV1;
      };
      if (parsed.version === 1 && parsed.store && restoreStoreSnapshot(parsed.store)) {
        restoreAuthState(parsed.auth);
        console.info("[neonlink] Daten geladen aus", dbFilePath);
      } else {
        console.warn("[neonlink] Gespeicherter Stand ungültig oder alte Version — Start mit Seed-Daten.");
      }
    } catch (e) {
      console.warn("[neonlink] Datenbank lesen fehlgeschlagen:", e);
    }
  } else {
    console.info("[neonlink] Neue Datenbank:", dbFilePath);
  }

  saveTimer = setInterval(() => {
    try {
      flushPersistence();
    } catch (e) {
      console.error("[neonlink] Autosave:", e);
    }
  }, 12_000);

  const shutdown = () => {
    if (saveTimer) {
      clearInterval(saveTimer);
      saveTimer = null;
    }
    try {
      flushPersistence();
    } catch {
      /* ignore */
    }
    try {
      db?.close();
    } catch {
      /* ignore */
    }
    db = null;
    sqlModule = null;
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

export function flushPersistence(): void {
  if (!db) return;
  const payload = JSON.stringify({
    version: 1 as const,
    store: captureStoreSnapshot(),
    auth: captureAuthState(),
  });
  const iso = new Date().toISOString();
  db.run("INSERT OR REPLACE INTO app_state (id, payload, updated_at) VALUES (1, ?, ?)", [
    payload,
    iso,
  ]);
  writeDbFile();
}
