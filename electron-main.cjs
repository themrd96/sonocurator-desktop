const { app, BrowserWindow, dialog, shell } = require("electron");
const path = require("path");
const { spawn, execSync } = require("child_process");
const fs = require("fs");
const net = require("net");
const os = require("os");

// ── Paths ─────────────────────────────────────────────────────────────────────
const isPackaged = app.isPackaged;

// Server bundle location
const serverDir = isPackaged
  ? path.join(process.resourcesPath, "server-bundle")
  : path.join(__dirname, "server-bundle");

const serverEntry = path.join(serverDir, "index.cjs");

// Data directory — persistent, in user's AppData
const userDataPath = app.getPath("userData");
const dataDir = path.join(userDataPath, "data");
const uploadsDir = path.join(dataDir, "uploads");

// Ensure data directories exist
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Config ────────────────────────────────────────────────────────────────────
const PORT = 5123;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "127.0.0.1");
  });
}

// ── ffmpeg detection ──────────────────────────────────────────────────────────
function findFfmpeg() {
  // Bundled ffmpeg
  const bundled = isPackaged
    ? path.join(process.resourcesPath, "ffmpeg", "ffmpeg.exe")
    : null;
  if (bundled && fs.existsSync(bundled)) return bundled;

  // System PATH
  try {
    const cmd = process.platform === "win32" ? "where ffmpeg" : "which ffmpeg";
    const result = execSync(cmd, { encoding: "utf-8", timeout: 5000 });
    if (result.trim()) return result.trim().split(/\r?\n/)[0].trim();
  } catch {}

  // Common Windows locations
  if (process.platform === "win32") {
    const common = [
      "C:\\ffmpeg\\bin\\ffmpeg.exe",
      "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
      "C:\\tools\\ffmpeg\\bin\\ffmpeg.exe",
      path.join(os.homedir(), "ffmpeg", "bin", "ffmpeg.exe"),
    ];
    for (const p of common) {
      if (fs.existsSync(p)) return p;
    }
  }

  return null;
}

// ── Server process ────────────────────────────────────────────────────────────
let serverProcess = null;
let mainWindow = null;

function startServer() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(PORT),
      SONOCURATOR_DATA_DIR: dataDir,
      SONOCURATOR_UPLOADS_DIR: uploadsDir,
    };

    const ffmpegPath = findFfmpeg();
    if (ffmpegPath) {
      env.FFMPEG_PATH = ffmpegPath;
    }

    // Point NODE_PATH to our node_modules so the server can find better-sqlite3
    const appRoot = isPackaged
      ? path.join(process.resourcesPath, "app.asar.unpacked")
      : __dirname;
    const nodeModulesPath = path.join(appRoot, "node_modules");
    env.NODE_PATH = nodeModulesPath;

    console.log("[electron] Starting server at:", serverEntry);
    console.log("[electron] Data dir:", dataDir);
    console.log("[electron] Uploads dir:", uploadsDir);
    console.log("[electron] ffmpeg:", ffmpegPath || "NOT FOUND");
    console.log("[electron] NODE_PATH:", nodeModulesPath);

    serverProcess = spawn(process.execPath, [serverEntry], {
      env,
      cwd: serverDir,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let started = false;
    let output = "";

    serverProcess.stdout.on("data", (data) => {
      const msg = data.toString();
      output += msg;
      console.log("[server]", msg.trim());
      if (!started && msg.includes("serving on port")) {
        started = true;
        resolve();
      }
    });

    serverProcess.stderr.on("data", (data) => {
      const msg = data.toString();
      output += msg;
      console.error("[server]", msg.trim());
    });

    serverProcess.on("error", (err) => {
      console.error("[server] Failed to start:", err);
      if (!started) reject(new Error(`Server failed: ${err.message}\n\nOutput: ${output}`));
    });

    serverProcess.on("exit", (code) => {
      console.log("[server] Exited with code", code);
      if (!started) reject(new Error(`Server exited with code ${code}\n\nOutput: ${output}`));
    });

    setTimeout(() => {
      if (!started) {
        reject(new Error(`Server timed out after 20s\n\nOutput: ${output}`));
      }
    }, 20000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "SonoCurator",
    backgroundColor: "#0a0a08",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── Splash / loading ──────────────────────────────────────────────────────────
function createSplash() {
  const splash = new BrowserWindow({
    width: 400,
    height: 260,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    backgroundColor: "#0a0a08",
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const html = `<!DOCTYPE html>
<html><head><style>
  body { margin:0; background:#0a0a08; color:#fff; font-family:'Segoe UI',sans-serif;
    display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; }
  h1 { font-size:24px; margin:0 0 8px; color:#D4A017; font-weight:600; }
  p { font-size:13px; color:#888; margin:0; }
  .spinner { width:28px; height:28px; border:3px solid #333; border-top-color:#D4A017;
    border-radius:50%; animation:spin .8s linear infinite; margin-top:24px; }
  @keyframes spin { to { transform:rotate(360deg); } }
</style></head><body>
  <h1>SonoCurator</h1>
  <p>Starting up...</p>
  <div class="spinner"></div>
</body></html>`;

  splash.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  return splash;
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  const splash = createSplash();

  try {
    const free = await isPortFree(PORT);
    if (!free) {
      splash.close();
      dialog.showErrorBox(
        "SonoCurator",
        `Port ${PORT} is already in use. Please close any other instance of SonoCurator and try again.`
      );
      app.quit();
      return;
    }

    const ffmpegPath = findFfmpeg();
    if (!ffmpegPath) {
      const result = dialog.showMessageBoxSync({
        type: "warning",
        title: "SonoCurator — ffmpeg Not Found",
        message:
          "ffmpeg was not found on your system.\n\nSonoCurator needs ffmpeg to process MP3, FLAC, OGG, and M4A files. WAV files will still work.\n\nDownload ffmpeg from:\nhttps://www.gyan.dev/ffmpeg/builds/\n\nExtract it and add the bin folder to your system PATH.",
        buttons: ["Continue Anyway", "Open Download Page", "Quit"],
        defaultId: 0,
      });

      if (result === 1) {
        shell.openExternal("https://www.gyan.dev/ffmpeg/builds/");
        splash.close();
        app.quit();
        return;
      } else if (result === 2) {
        splash.close();
        app.quit();
        return;
      }
    }

    await startServer();

    splash.close();
    createWindow();
  } catch (err) {
    splash.close();
    dialog.showErrorBox(
      "SonoCurator — Startup Error",
      `Failed to start:\n\n${err.message}`
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  stopServer();
  app.quit();
});

app.on("before-quit", () => {
  stopServer();
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
