const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const windowIconPath = path.join(__dirname, "build", "icon.png");
const windowIcon = fs.existsSync(windowIconPath) ? windowIconPath : undefined;

/** Entwicklung: von außen setzen (z. B. Vite http://localhost:5173). */
const startUrl = process.env.ELECTRON_START_URL?.trim();
const isDevShell = Boolean(startUrl);

let serverProcess = null;
/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;

function waitForHealth(port, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve();
        else schedule();
      });
      req.on("error", schedule);
      req.setTimeout(1500, () => {
        req.destroy();
        schedule();
      });
    };
    const schedule = () => {
      if (Date.now() > deadline) {
        reject(new Error("Backend startet nicht (Timeout /health)."));
        return;
      }
      setTimeout(tryOnce, 250);
    };
    tryOnce();
  });
}

function startEmbeddedServer() {
  const resources = process.resourcesPath;
  const serverRoot = path.join(resources, "app-server");
  const serverScript = path.join(serverRoot, "dist", "index.js");
  const appDist = path.join(resources, "app-dist");
  const port = String(process.env.NEONLINK_PORT || "4000");
  const dataDir = path.join(app.getPath("userData"), "neonlink-data");
  fs.mkdirSync(dataDir, { recursive: true });

  serverProcess = spawn(process.execPath, [serverScript], {
    cwd: serverRoot,
    env: {
      ...process.env,
      NODE_ENV: "production",
      ELECTRON_RUN_AS_NODE: "1",
      PORT: port,
      STATIC_DIST_PATH: appDist,
      FRONTEND_ORIGIN: `http://127.0.0.1:${port}`,
      BIND_ADDRESS: "127.0.0.1",
      NEONLINK_DATA_DIR: dataDir,
    },
    stdio: "pipe",
    windowsHide: true,
  });

  serverProcess.on("error", (err) => {
    console.error("[neonlink-electron] Server-Prozess:", err);
  });
  serverProcess.stderr?.on("data", (d) => {
    console.error(String(d));
  });

  return waitForHealth(Number(port));
}

function createWindow(loadUrl) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    icon: windowIcon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.loadURL(loadUrl);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
    serverProcess = null;
  }
}

app.whenReady().then(async () => {
  try {
    let url;
    if (isDevShell) {
      url = startUrl;
    } else {
      await startEmbeddedServer();
      const port = process.env.NEONLINK_PORT || "4000";
      url = `http://127.0.0.1:${port}`;
    }
    createWindow(url);
  } catch (e) {
    console.error(e);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  stopServer();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopServer();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && isDevShell && startUrl) {
    createWindow(startUrl);
  }
});
