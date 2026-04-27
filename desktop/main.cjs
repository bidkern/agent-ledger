/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const defaultPort = 3260;
const maxPort = 3399;
let serverProcess = null;
let mainWindow = null;

function getEnvFileValue(key) {
  const envPath = path.join(projectRoot, ".env.local");

  if (!fs.existsSync(envPath)) {
    return null;
  }

  const raw = fs.readFileSync(envPath, "utf8");
  const line = raw
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));

  if (!line) {
    return null;
  }

  return line.slice(line.indexOf("=") + 1).trim();
}

function getPreferredPort() {
  const appUrl = getEnvFileValue("APP_URL");

  if (!appUrl) {
    return defaultPort;
  }

  try {
    const parsed = new URL(appUrl);
    return parsed.port ? Number(parsed.port) : defaultPort;
  } catch {
    return defaultPort;
  }
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function findFreePort() {
  const preferred = getPreferredPort();

  for (let port = preferred; port <= maxPort; port += 1) {
    if (await isPortFree(port)) {
      return port;
    }
  }

  throw new Error(`No free local port found between ${preferred} and ${maxPort}.`);
}

async function waitForHealth(appUrl) {
  const healthUrl = `${appUrl}/api/health`;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(healthUrl);

      if (response.ok) {
        const body = await response.json();

        if (body.status === "ok") {
          return;
        }
      }
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  throw new Error("Agent Ledger did not become healthy in time.");
}

function getNextBinary() {
  return path.join(
    projectRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "next.cmd" : "next",
  );
}

function startNextServer(port) {
  const hasProductionBuild = fs.existsSync(path.join(projectRoot, ".next", "BUILD_ID"));
  const forceDev = process.argv.includes("--dev");
  const mode = hasProductionBuild && !forceDev ? "start" : "dev";
  const appUrl = `http://localhost:${port}`;
  const env = {
    ...process.env,
    APP_URL: appUrl,
    SERVER_ACTIONS_ALLOWED_ORIGINS: `localhost:${port},127.0.0.1:${port}`,
  };

  serverProcess = spawn(getNextBinary(), [mode, "--port", String(port)], {
    cwd: projectRoot,
    env,
    shell: process.platform === "win32",
    windowsHide: true,
    stdio: "ignore",
  });

  serverProcess.on("exit", () => {
    serverProcess = null;
  });

  return appUrl;
}

function createWindow(appUrl) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: "Agent Ledger",
    backgroundColor: "#101417",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const parsed = new URL(url);

    if (parsed.origin === appUrl) {
      return { action: "allow" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const parsed = new URL(url);

    if (parsed.origin !== appUrl) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL(`${appUrl}/login`);
}

async function boot() {
  const port = await findFreePort();
  const appUrl = startNextServer(port);
  await waitForHealth(appUrl);
  createWindow(appUrl);
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    boot().catch((error) => {
      console.error(error);
      app.quit();
    });
  });

  app.on("window-all-closed", () => {
    if (serverProcess) {
      serverProcess.kill();
    }

    app.quit();
  });

  app.on("before-quit", () => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });
}
