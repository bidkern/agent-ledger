import { existsSync } from "node:fs";
import { mkdir, rm, copyFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const projectRoot = process.cwd();
const screenshotDir = path.join(projectRoot, "docs", "screenshots");
const videoDir = path.join(projectRoot, "docs", "demo-videos");
const tempVideoDir = path.join(projectRoot, ".launcher", "proof-videos-temp");
const viewport = { width: 1600, height: 1200 };
const videoSize = { width: 1280, height: 900 };
const browserPathCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

function getArgument(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((value) => value.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function resolveBaseUrl() {
  return (
    getArgument("base-url") ||
    process.env.CAPTURE_BASE_URL ||
    process.env.APP_URL ||
    "http://localhost:3260"
  );
}

function resolveBrowserPath() {
  const explicit = getArgument("browser-path") || process.env.CAPTURE_BROWSER_PATH;

  if (explicit) {
    return explicit;
  }

  const found = browserPathCandidates.find((candidate) => {
    return Boolean(candidate && existsSync(candidate));
  });

  if (!found) {
    throw new Error("No supported Chromium browser executable was found.");
  }

  return found;
}

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function resetDirectory(targetPath) {
  await rm(targetPath, { force: true, recursive: true });
  await mkdir(targetPath, { recursive: true });
}

async function preparePage(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await pause(1200);
}

async function runStep(page, step) {
  switch (step.type) {
    case "pause":
      await pause(step.ms);
      return;
    case "scroll":
      await page.evaluate((top) => {
        window.scrollTo({ top, behavior: "auto" });
      }, step.top);
      await pause(step.afterMs ?? 1200);
      return;
    case "click": {
      const locator = page.locator(step.selector).first();
      await locator.waitFor({ state: "visible", timeout: 10000 });

      if (step.waitForUrl) {
        await Promise.all([
          page.waitForURL(step.waitForUrl, { timeout: 10000 }),
          locator.click(),
        ]);
      } else {
        await locator.click();
      }

      await page.waitForLoadState("networkidle").catch(() => {});
      await pause(step.afterMs ?? 1200);
      return;
    }
    default:
      throw new Error(`Unsupported step type: ${step.type}`);
  }
}

async function captureScreenshots(browser, baseUrl) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    colorScheme: "light",
  });

  const shots = [
    { path: "/", file: "landing.png" },
    { path: "/workspace", file: "workspace.png" },
    { path: "/workspace/agents", file: "agents.png" },
    { path: "/workspace/approvals", file: "approvals.png" },
    { path: "/workspace/implementation-guide", file: "implementation-guide.png" },
  ];

  for (const shot of shots) {
    const page = await context.newPage();
    await preparePage(page, new URL(shot.path, baseUrl).toString());
    await page.screenshot({
      path: path.join(screenshotDir, shot.file),
      type: "png",
    });
    await page.close();
  }

  await context.close();
}

async function captureVideo(browser, baseUrl, scenario) {
  const context = await browser.newContext({
    viewport: videoSize,
    recordVideo: {
      dir: tempVideoDir,
      size: videoSize,
    },
    colorScheme: "light",
  });

  const page = await context.newPage();
  await preparePage(page, new URL(scenario.startPath, baseUrl).toString());

  for (const step of scenario.steps) {
    await runStep(page, step);
  }

  const video = page.video();
  await page.close();
  await context.close();

  if (!video) {
    throw new Error(`No video handle returned for ${scenario.file}`);
  }

  const sourcePath = await video.path();
  const targetPath = path.join(videoDir, scenario.file);
  await copyFile(sourcePath, targetPath);
}

async function main() {
  const baseUrl = resolveBaseUrl();
  const browserPath = resolveBrowserPath();

  await resetDirectory(screenshotDir);
  await resetDirectory(videoDir);
  await resetDirectory(tempVideoDir);

  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: [
      "--disable-extensions",
      "--disable-gpu",
      "--no-first-run",
    ],
  });

  try {
    await captureScreenshots(browser, baseUrl);

    const videos = [
      {
        file: "landing-to-workspace.webm",
        startPath: "/",
        steps: [
          { type: "pause", ms: 1600 },
          { type: "scroll", top: 280, afterMs: 1200 },
          { type: "scroll", top: 0, afterMs: 1200 },
          {
            type: "click",
            selector: 'a[href="/workspace"]',
            waitForUrl: "**/workspace",
            afterMs: 1800,
          },
          { type: "scroll", top: 260, afterMs: 1600 },
        ],
      },
      {
        file: "workspace-tour.webm",
        startPath: "/workspace",
        steps: [
          { type: "pause", ms: 1200 },
          {
            type: "click",
            selector: 'a[href="/workspace/agents"]',
            waitForUrl: "**/workspace/agents",
            afterMs: 1800,
          },
          { type: "scroll", top: 320, afterMs: 1400 },
          {
            type: "click",
            selector: 'a[href="/workspace/approvals"]',
            waitForUrl: "**/workspace/approvals",
            afterMs: 1800,
          },
          { type: "scroll", top: 320, afterMs: 1400 },
          {
            type: "click",
            selector: 'a[href="/workspace/implementation-guide"]',
            waitForUrl: "**/workspace/implementation-guide",
            afterMs: 1800,
          },
          { type: "scroll", top: 360, afterMs: 1600 },
        ],
      },
    ];

    for (const scenario of videos) {
      await captureVideo(browser, baseUrl, scenario);
    }
  } finally {
    await browser.close();
  }

  console.log(`Proof assets captured from ${baseUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
