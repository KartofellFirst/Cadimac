const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, nativeImage, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const devUrl = process.env.SKETCHFORGE_DESKTOP_DEV_URL?.trim() || "";
// Keep the desktop origin stable. localStorage and IndexedDB are scoped to the
// full origin (including the port), so a random port made projects appear to
// vanish after every restart.
const DESKTOP_PORT = Number.parseInt(process.env.SKETCHFORGE_DESKTOP_PORT || "62158", 10);

let mainWindow = null;
let tray = null;
let webServer = null;
let webServerOutput = "";
let isQuitting = false;
let desktopIpcConfigured = false;
let downloadedUpdateReady = false;

function appendServerOutput(chunk) {
  webServerOutput += String(chunk);
  if (webServerOutput.length > 12_000) {
    webServerOutput = webServerOutput.slice(-12_000);
  }
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    if (webServer && webServer.exitCode !== null) {
      throw new Error(`Web process exited with code ${webServer.exitCode}.`);
    }

    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) return;
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 180));
  }

  const detail = lastError instanceof Error ? ` ${lastError.message}` : "";
  throw new Error(`Cadimac did not start its local web process in time.${detail}`);
}

async function startPackagedWebServer() {
  const webRoot = path.join(process.resourcesPath, "web");
  const serverPath = path.join(webRoot, "apps", "web", "server.js");
  if (!fs.existsSync(serverPath)) {
    throw new Error(`Desktop web bundle is missing: ${serverPath}`);
  }

  const port = DESKTOP_PORT;
  const packagedNodeModules = path.join(process.resourcesPath, "app.asar", "node_modules");

  webServer = spawn(process.execPath, [serverPath], {
    cwd: path.dirname(serverPath),
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_PATH: [packagedNodeModules, process.env.NODE_PATH].filter(Boolean).join(path.delimiter),
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      SKETCHFORGE_DESKTOP: "1",
      SKETCHFORGE_DESKTOP_VERSION: app.getVersion(),
      SKETCHFORGE_SHARED_PROJECTS_DIR: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });

  webServer.stdout?.on("data", appendServerOutput);
  webServer.stderr?.on("data", appendServerOutput);

  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url);
  return url;
}

function stopPackagedWebServer() {
  if (!webServer || webServer.exitCode !== null) return;
  try {
    webServer.kill();
  } catch {
    // The process may already be gone while Electron is shutting down.
  }
}

function appIconPath() {
  return devUrl
    ? path.join(__dirname, "..", "web", "public", "assets", "cadimac", "cadimac-logo.png")
    : path.join(process.resourcesPath, "web", "apps", "web", "public", "assets", "cadimac", "cadimac-logo.png");
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function setupDesktopIpc() {
  if (desktopIpcConfigured) return;
  desktopIpcConfigured = true;

  ipcMain.handle("sketchforge:get-version", () => app.getVersion());
}

function createTray() {
  if (tray) return;

  const icon = nativeImage.createFromPath(appIconPath()).resize({ width: 20, height: 20 });
  tray = new Tray(icon);
  tray.setToolTip("Cadimac");
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: "Open Cadimac",
      click: showMainWindow,
    },
    { type: "separator" },
    {
      label: "Quit Cadimac",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));
  tray.on("click", showMainWindow);
}

function createMainWindow(url) {
  const appOrigin = new URL(url).origin;
  const iconPath = appIconPath();

  mainWindow = new BrowserWindow({
    width: 1500,
    height: 960,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    title: "Cadimac",
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.removeMenu();

  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    try {
      const target = new URL(targetUrl);
      if (target.origin === appOrigin) return { action: "allow" };
      if (target.protocol === "http:" || target.protocol === "https:") {
        void shell.openExternal(targetUrl);
      }
    } catch {
      // Ignore malformed URLs instead of handing them to the OS.
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    try {
      const target = new URL(targetUrl);
      if (target.origin === appOrigin) return;
      event.preventDefault();
      if (target.protocol === "http:" || target.protocol === "https:") {
        void shell.openExternal(targetUrl);
      }
    } catch {
      event.preventDefault();
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  void mainWindow.loadURL(url);
}

async function startDesktop() {
  Menu.setApplicationMenu(null);

  try {
    const url = devUrl || await startPackagedWebServer();
    setupDesktopIpc();
    createTray();
    createMainWindow(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const detail = webServerOutput.trim();
    dialog.showErrorBox(
      "Cadimac could not start",
      detail ? `${message}\n\n${detail}` : message,
    );
    app.quit();
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", showMainWindow);

  app.whenReady().then(() => {
    if (process.platform === "win32") app.setAppUserModelId("com.cadimac.desktop");
    void startDesktop();

    app.on("activate", () => {
      if (mainWindow) {
        showMainWindow();
      } else if (BrowserWindow.getAllWindows().length === 0) {
        void startDesktop();
      }
    });
  });
}

app.on("before-quit", () => {
  isQuitting = true;
  stopPackagedWebServer();
});

app.on("window-all-closed", () => {
  // Keep Cadimac available from the system tray. Use Quit Cadimac
  // from the tray menu when the user wants to fully stop the application.
});
