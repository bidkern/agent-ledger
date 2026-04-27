import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const loop = process.argv.includes("--loop");

function loadEnvFile(filename) {
  const target = path.join(cwd, filename);

  if (!existsSync(target)) {
    return;
  }

  const raw = readFileSync(target, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getServiceToken() {
  const rawTokens =
    process.env.SERVICE_ACCOUNT_TOKENS ||
    (process.env.NODE_ENV !== "production"
      ? "demo-agent:agentledger-local-service-token-change-me"
      : "");
  const configured = rawTokens.split(",")
    .map((entry) => entry.trim())
    .find(Boolean);
  const separatorIndex = configured?.indexOf(":") ?? -1;

  if (!configured || separatorIndex <= 0) {
    throw new Error(
      "SERVICE_ACCOUNT_TOKENS must contain at least one service-id:token entry.",
    );
  }

  return configured.slice(separatorIndex + 1).trim();
}

function getAppUrl() {
  return (process.env.APP_URL || "http://localhost:3260").replace(/[\\/]+$/, "");
}

async function runTick() {
  const response = await fetch(`${getAppUrl()}/api/v1/agents/autonomous/tick`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getServiceToken()}`,
    },
    body: JSON.stringify({ limit: 25 }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error || `Autonomous tick failed with HTTP ${response.status}.`,
    );
  }

  const queued = Array.isArray(payload?.queued) ? payload.queued.length : 0;
  console.log(
    `[${new Date().toISOString()}] Autonomous tick complete. Queued ${queued} cycle${queued === 1 ? "" : "s"}.`,
  );

  return payload;
}

function getLoopIntervalMs() {
  const seconds = Number(process.env.AGENT_LEDGER_AUTONOMOUS_TICK_SECONDS || 60);
  return Math.max(10, seconds) * 1000;
}

loadEnvFile(".env.local");
loadEnvFile(".env");

if (!loop) {
  runTick().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
} else {
  const intervalMs = getLoopIntervalMs();
  console.log(
    `Starting Agent Ledger autonomous tick loop against ${getAppUrl()} every ${intervalMs / 1000}s.`,
  );

  const runAndReport = () => {
    runTick().catch((error) => {
      console.error(
        `[${new Date().toISOString()}] ${
          error instanceof Error ? error.message : error
        }`,
      );
    });
  };

  runAndReport();
  setInterval(runAndReport, intervalMs);
}
