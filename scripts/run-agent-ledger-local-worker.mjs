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

function getAppUrl() {
  return (process.env.APP_URL || "http://localhost:3260").replace(/[\\/]+$/, "");
}

function getServiceToken() {
  const rawTokens =
    process.env.SERVICE_ACCOUNT_TOKENS ||
    (process.env.NODE_ENV !== "production"
      ? "demo-agent:agentledger-local-service-token-change-me"
      : "");
  const configured = rawTokens
    .split(",")
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

function getWorkerIntervalMs() {
  const seconds = Number(process.env.AGENT_LEDGER_WORKER_SECONDS || 60);
  return Math.max(10, seconds) * 1000;
}

function getWorkerProvider() {
  const configured = process.env.AGENT_LEDGER_WORKER_PROVIDER?.trim().toLowerCase();

  if (configured === "openai" && process.env.OPENAI_API_KEY?.trim()) {
    return "openai";
  }

  return "mock";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getServiceToken()}`,
  };
}

async function requestJson(pathname, options = {}) {
  const response = await fetch(`${getAppUrl()}${pathname}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error || `${options.method || "GET"} ${pathname} failed with HTTP ${response.status}.`,
    );
  }

  return payload;
}

function includesAny(value, words) {
  const lower = value.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function chooseTool(agent, preferredTools) {
  const allowedTools = Array.isArray(agent.allowedTools) ? agent.allowedTools : [];
  const match = preferredTools.find((preferred) =>
    allowedTools.some((tool) => tool.toLowerCase().includes(preferred)),
  );

  if (match) {
    return (
      allowedTools.find((tool) => tool.toLowerCase().includes(match)) ||
      allowedTools[0]
    );
  }

  return allowedTools[0] || "browser";
}

function buildMockWorkerOutput(run, agent) {
  const task = run.task || agent.standingPrompt || agent.mission || "";
  const actions = [];

  if (includesAny(task, ["email", "inbox", "reply", "outbound", "follow-up"])) {
    const tool = chooseTool(agent, ["gmail", "outlook", "hubspot", "browser"]);
    actions.push({
      actionType: "draft-email",
      target: "personal task inbox",
      tool,
      vendor: tool.includes("gmail") ? "Google Workspace" : "HubSpot",
      amountUsd: 0,
      summary: "Draft a safe email response for operator review.",
      reasoning:
        "The worker can draft communication without sending it. Sending still requires a separate governed action.",
    });
  } else if (includesAny(task, ["github", "frontend", "code", "website", "cloudflare", "deploy"])) {
    actions.push({
      actionType: "frontend-implementation",
      target: "local project workspace",
      tool: chooseTool(agent, ["code-editor", "github", "terminal", "browser"]),
      vendor: "GitHub",
      amountUsd: 0,
      summary: "Prepare a frontend implementation plan and local change checklist.",
      reasoning:
        "The worker can prepare code work and branch instructions, but deploys, DNS changes, pushes, and merges must be separately approved.",
    });
  } else if (includesAny(task, ["wallet", "crypto", "metamask", "rabby", "xverse", "nft"])) {
    actions.push({
      actionType: "wallet-monitor",
      target: "fresh test wallet",
      tool: chooseTool(agent, ["metamask", "wallet", "browser"]),
      vendor: "MetaMask",
      amountUsd: 0,
      summary: "Monitor the wallet and summarize visible risk without signing transactions.",
      reasoning:
        "Monitoring a wallet is safe. Transfers, swaps, bridges, signatures, and purchases require separate approval.",
    });
  } else if (includesAny(task, ["bank", "card", "stripe", "refund", "invoice", "payment"])) {
    actions.push({
      actionType: "bank-balance-read",
      target: "sandbox finance account",
      tool: chooseTool(agent, ["plaid", "bank", "stripe", "quickbooks", "browser"]),
      vendor: "Plaid",
      amountUsd: 0,
      summary: "Read finance state and prepare a non-money-moving recommendation.",
      reasoning:
        "The worker can inspect finance status and propose next steps. Spending, refunds, wires, or charges need separate governed actions.",
    });
  } else {
    actions.push({
      actionType: "research-summary",
      target: "operator task",
      tool: chooseTool(agent, ["browser", "notion", "github"]),
      amountUsd: 0,
      summary: "Prepare a concise task plan and next-step checklist.",
      reasoning:
        "This is a low-risk task planning action that keeps the agent useful without touching external systems.",
    });
  }

  return {
    summary: `${agent.name} processed the queued task in ${getWorkerProvider()} worker mode.`,
    steps: [
      `Read standing task: ${task.slice(0, 180)}${task.length > 180 ? "..." : ""}`,
      `Selected ${actions.length} governed action proposal${actions.length === 1 ? "" : "s"}.`,
      "Submitted action proposals through Agent Ledger before any external execution.",
      "No raw external credentials were used by the local worker.",
    ],
    proposedActions: actions,
  };
}

async function buildOpenAIWorkerOutput(run, agent) {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const model = process.env.OPENAI_MODEL || agent.model || "gpt-5.4-mini";
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You are a safe local worker for Agent Ledger. Return only JSON. Do not claim to execute external actions. Suggest at most 3 action proposals that must be checked by Agent Ledger before execution.",
      },
      {
        role: "user",
        content: JSON.stringify({
          agent: {
            name: agent.name,
            mission: agent.mission,
            allowedTools: agent.allowedTools,
            dailyBudgetUsd: agent.dailyBudgetUsd,
            monthlyBudgetUsd: agent.monthlyBudgetUsd,
            maxActionsPerDay: agent.maxActionsPerDay,
            maxEmailsPerDay: agent.maxEmailsPerDay,
            requireApprovalForRiskyActions: agent.requireApprovalForRiskyActions,
          },
          run: {
            id: run.id,
            task: run.task,
          },
          outputShape: {
            summary: "one sentence",
            steps: ["3-6 short steps"],
            proposedActions: [
              {
                actionType: "short-kebab-or-plain action",
                target: "target",
                tool: "one of allowedTools",
                vendor: "optional vendor",
                amountUsd: 0,
                summary: "what would happen",
                reasoning: "why this is within or needs checking against guidelines",
              },
            ],
          },
        }),
      },
    ],
  });
  const text = response.output_text || "{}";

  try {
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed.proposedActions)) {
      throw new Error("OpenAI worker output missing proposedActions.");
    }

    return {
      summary: String(parsed.summary || `${agent.name} processed the queued task.`),
      steps: Array.isArray(parsed.steps)
        ? parsed.steps.map(String).slice(0, 8)
        : ["Processed the task with the OpenAI worker."],
      proposedActions: parsed.proposedActions.slice(0, 3),
    };
  } catch {
    return buildMockWorkerOutput(run, agent);
  }
}

async function markRun(runId, status, summary, steps) {
  await requestJson(`/api/v1/agent-runs/${runId}/result`, {
    method: "POST",
    body: JSON.stringify({
      status,
      summary,
      steps,
    }),
  });
}

async function proposeAction(action, run, agent) {
  return requestJson("/api/v1/actions/propose", {
    method: "POST",
    body: JSON.stringify({
      agentId: agent.id,
      actionType: String(action.actionType || "task-step"),
      target: String(action.target || run.task).slice(0, 180),
      tool: String(action.tool || agent.allowedTools?.[0] || "browser"),
      vendor: action.vendor ? String(action.vendor) : undefined,
      amountUsd:
        typeof action.amountUsd === "number" && Number.isFinite(action.amountUsd)
          ? action.amountUsd
          : 0,
      summary: String(action.summary || "Agent worker proposed a task step.").slice(0, 240),
      reasoning: String(
        action.reasoning ||
          "The worker is asking Agent Ledger to evaluate this before any external execution.",
      ).slice(0, 500),
    }),
  });
}

async function completeAllowedAction(actionLogId) {
  await requestJson(`/api/v1/actions/${actionLogId}/result`, {
    method: "POST",
    body: JSON.stringify({
      status: "completed",
      externalReferenceId: `local-worker-${Date.now()}`,
      resultDetail:
        "Local worker completed the safe simulated step. No external side effects were performed.",
    }),
  });
}

async function processRun(run, agent) {
  await markRun(run.id, "running", `Local worker started ${run.agentName}.`, [
    ...run.steps,
    "Local worker claimed this queued run.",
  ]);

  const workerOutput =
    getWorkerProvider() === "openai"
      ? await buildOpenAIWorkerOutput(run, agent)
      : buildMockWorkerOutput(run, agent);
  const decisionLines = [];

  for (const action of workerOutput.proposedActions) {
    const decision = await proposeAction(action, run, agent);
    decisionLines.push(
      `${action.actionType || "task-step"} -> ${decision.decision}`,
    );

    if (decision.decision === "allow") {
      await completeAllowedAction(decision.actionLogId);
    }
  }

  const finalSteps = [
    ...workerOutput.steps,
    ...decisionLines.map((line) => `Governance decision: ${line}.`),
  ];
  await markRun(
    run.id,
    "completed",
    `${workerOutput.summary} Decisions: ${decisionLines.join(", ") || "none"}.`,
    finalSteps,
  );

  return {
    runId: run.id,
    agentName: agent.name,
    decisions: decisionLines,
  };
}

async function runWorkerOnce() {
  await requestJson("/api/v1/agents/autonomous/tick", {
    method: "POST",
    body: JSON.stringify({ limit: 25 }),
  });
  const [agentResponse, runResponse] = await Promise.all([
    requestJson("/api/v1/agents"),
    requestJson("/api/v1/agent-runs?status=queued&limit=10"),
  ]);
  const agents = agentResponse.agents || [];
  const results = [];

  for (const run of runResponse.runs || []) {
    const agent = agents.find((item) => item.id === run.agentId);

    if (!agent) {
      await markRun(run.id, "failed", "Local worker could not find the agent.", [
        ...run.steps,
        "Agent lookup failed.",
      ]);
      continue;
    }

    results.push(await processRun(run, agent));
  }

  console.log(
    `[${new Date().toISOString()}] Local worker processed ${results.length} run${results.length === 1 ? "" : "s"} with provider=${getWorkerProvider()}.`,
  );

  for (const result of results) {
    console.log(
      `- ${result.agentName} / ${result.runId}: ${
        result.decisions.join(", ") || "no proposals"
      }`,
    );
  }

  return results;
}

loadEnvFile(".env.local");
loadEnvFile(".env");

if (!loop) {
  runWorkerOnce().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
} else {
  const intervalMs = getWorkerIntervalMs();
  console.log(
    `Starting Agent Ledger local worker against ${getAppUrl()} every ${intervalMs / 1000}s with provider=${getWorkerProvider()}.`,
  );

  const runAndReport = () => {
    runWorkerOnce().catch((error) => {
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
