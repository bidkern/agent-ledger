import "server-only";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { runAutonomousEngineTick } from "@/data/autonomous-engine";
import { createGovernedActionRecord } from "@/data/governance";
import {
  createModelUsageRecord,
  getAgentRuntimeConnectionById,
  getVaultItemSecret,
  listAgentRuntimeConnections,
  listAgentRunsByStatus,
  listAgents,
  listModelUsageRecords,
  listVaultItems,
  updateAgentRun,
} from "@/data/repository";
import type { AgentRun, RegisteredAgent, VaultItem } from "@/data/types";

type LocalWorkerInput = {
  actorEmail: string;
  limit?: number;
  queueDue?: boolean;
  forceQueue?: boolean;
};

type ProposedWorkerAction = {
  actionType: string;
  target: string;
  tool: string;
  vendor?: string;
  amountUsd?: number;
  summary: string;
  reasoning: string;
};

type WorkerOutput = {
  summary: string;
  steps: string[];
  proposedActions: ProposedWorkerAction[];
};

type RuntimeCredential = {
  apiKey: string;
  source: "environment" | "vault";
  label: string;
};

type CliCommandResult = {
  stdout: string;
  stderr: string;
};

const DEFAULT_MODEL_MONTHLY_BUDGET_USD = 0.25;
const DEFAULT_MODEL_RUN_BUDGET_USD = 0.06;

function chooseTool(agent: RegisteredAgent, preferredTools: string[]) {
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

function isMeteredApiAllowed() {
  return process.env.AGENT_LEDGER_ALLOW_METERED_API === "true";
}

function getPositiveUsdLimit(name: string, fallback: number) {
  const value = Number(process.env[name]);

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, value);
}

function getMonthlyModelBudgetUsd() {
  return getPositiveUsdLimit(
    "AGENT_LEDGER_MODEL_MONTHLY_BUDGET_USD",
    DEFAULT_MODEL_MONTHLY_BUDGET_USD,
  );
}

function getRunModelBudgetUsd() {
  return getPositiveUsdLimit(
    "AGENT_LEDGER_MODEL_RUN_BUDGET_USD",
    DEFAULT_MODEL_RUN_BUDGET_USD,
  );
}

function getMonthKey(value = new Date()) {
  return value.toISOString().slice(0, 7);
}

function formatUsd(value: number) {
  return `$${value.toFixed(4)}`;
}

async function getModelUsageThisMonthUsd() {
  const monthKey = getMonthKey();
  const records = await listModelUsageRecords();

  return records.reduce((total, record) => {
    if (record.createdAt.slice(0, 7) !== monthKey) {
      return total;
    }

    return total + record.amountUsd;
  }, 0);
}

async function assertModelUsageBudget() {
  const limitUsd = getMonthlyModelBudgetUsd();
  const usedUsd = await getModelUsageThisMonthUsd();

  if (usedUsd >= limitUsd) {
    throw new Error(
      `Model worker budget is exhausted for ${getMonthKey()}: ${formatUsd(usedUsd)} used of ${formatUsd(limitUsd)}. Raise AGENT_LEDGER_MODEL_MONTHLY_BUDGET_USD only if you want more model calls.`,
    );
  }
}

function getClaudeCliCostUsd(stdout: string) {
  try {
    const envelope = parseJsonFromText(stdout) as { total_cost_usd?: unknown };
    const cost = Number(envelope.total_cost_usd);

    return Number.isFinite(cost) ? Math.max(0, cost) : 0;
  } catch {
    return 0;
  }
}

async function recordLocalModelUsage(input: {
  agent: RegisteredAgent;
  run: AgentRun;
  amountUsd: number;
  runtimeLabel: string;
}) {
  await createModelUsageRecord({
    provider: "anthropic",
    runtimeLabel: input.runtimeLabel,
    source: "local-cli",
    amountUsd: input.amountUsd,
    agentId: input.agent.id,
    agentName: input.agent.name,
    runId: input.run.id,
    detail:
      "Claude Code local CLI reported estimated usage. Agent Ledger stores no Claude password or token.",
  });

  const runLimitUsd = getRunModelBudgetUsd();

  if (input.amountUsd > runLimitUsd) {
    throw new Error(
      `Local model run cost ${formatUsd(input.amountUsd)} exceeded the per-run cap of ${formatUsd(runLimitUsd)}. The run was stopped before proposing external actions.`,
    );
  }
}

function isWalletTransactionDrill(run: AgentRun, agent: RegisteredAgent) {
  const text = `${run.task}\n${agent.standingPrompt ?? ""}\n${agent.mission}`.toLowerCase();

  return (
    text.includes("transaction drill") ||
    text.includes("try a wallet transaction") ||
    text.includes("try and make transactions") ||
    text.includes("wallet transaction test")
  );
}

function buildWalletTransactionDrillOutput(run: AgentRun, agent: RegisteredAgent): WorkerOutput {
  const riskTool = chooseTool(agent, ["risk-review", "wallet-watch", "crypto-research"]);
  const walletTool = chooseTool(agent, ["wallet-watch", "risk-review", "crypto-research"]);

  return {
    summary:
      "Transaction drill generated wallet-execution-shaped proposals without using a model call, private key, signer, RPC broadcaster, or wallet adapter.",
    steps: [
      "Started a zero-API wallet transaction drill.",
      "Prepared transaction-shaped proposals instead of signing or broadcasting.",
      "Sent each proposal through Agent Ledger governance.",
      "No private key, wallet signature, RPC send, swap, bridge, or transfer was attempted.",
    ],
    proposedActions: [
      {
        actionType: "sign-wallet-transaction",
        target: "Ethereum test wallet signature request",
        tool: riskTool,
        amountUsd: 0,
        summary:
          "Attempt to sign an Ethereum wallet transaction for the test wallet.",
        reasoning:
          "This intentionally simulates the moment where a real agent would need a signer. Agent Ledger should block it before any private key or wallet adapter is touched.",
      },
      {
        actionType: "swap-eth",
        target: "Swap the test wallet ETH balance into another token",
        tool: walletTool,
        amountUsd: 4,
        summary:
          "Attempt to swap the wallet's ETH balance into another asset.",
        reasoning:
          "This intentionally simulates a value-moving crypto trade. The local dry-run policy should block it before any transaction is built or broadcast.",
      },
      {
        actionType: "transfer-eth",
        target: "Transfer ETH out of the test wallet",
        tool: walletTool,
        amountUsd: 4,
        summary:
          "Attempt to transfer ETH out of the test wallet.",
        reasoning:
          "This intentionally simulates a funds-moving transfer. Agent Ledger should block it without using private keys or touching the wallet.",
      },
    ],
  };
}

function normalize(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function getWorkerPrompt(run: AgentRun, agent: RegisteredAgent) {
  return JSON.stringify({
    instruction:
      "Return only valid JSON. Do not claim external actions were executed. Suggest at most 3 action proposals that Agent Ledger must check before sensitive execution.",
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
          actionType: "short action",
          target: "target",
          tool: "one of allowedTools",
          vendor: "optional vendor",
          amountUsd: 0,
          summary: "what would happen",
          reasoning: "why this is within or needs checking against guidelines",
        },
      ],
    },
  });
}

function getCliWorkerPrompt(run: AgentRun, agent: RegisteredAgent) {
  return [
    "You are Agent Ledger's local model worker.",
    "",
    "Do not execute external actions. Do not claim that you executed anything. Your job is to propose safe next actions that Agent Ledger can govern first.",
    "",
    `Agent: ${agent.name}`,
    `Mission: ${agent.mission}`,
    `Task: ${run.task}`,
    `Allowed tools: ${agent.allowedTools.join(", ") || "none"}`,
    `Daily budget: $${agent.dailyBudgetUsd}`,
    `Monthly budget: $${agent.monthlyBudgetUsd}`,
    `Max actions per day: ${agent.maxActionsPerDay}`,
    `Max emails per day: ${agent.maxEmailsPerDay}`,
    `Risky actions require approval: ${agent.requireApprovalForRiskyActions ? "yes" : "no"}`,
    "",
    "Return only valid JSON. Do not use markdown fences. The top-level JSON object must contain exactly these keys: summary, steps, proposedActions.",
    "steps must be an array of short strings.",
    "proposedActions must be an array with at most 3 objects. Each object must include actionType, target, tool, amountUsd, summary, and reasoning. Use one of the allowed tools exactly.",
    "Use amountUsd: 0 unless the action truly spends money. If an action could move funds, sign data, trade, swap, bridge, approve tokens, or transfer assets, make it a review proposal instead of execution.",
    "",
    "Example shape:",
    "{\"summary\":\"one sentence\",\"steps\":[\"short step\"],\"proposedActions\":[{\"actionType\":\"crypto-research\",\"target\":\"read-only Ethereum test wallet\",\"tool\":\"crypto-research\",\"amountUsd\":0,\"summary\":\"Research only.\",\"reasoning\":\"This stays inside dry-run rules.\"}]}",
  ].join("\n");
}

function stringifyStep(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function sanitizeWorkerError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unable to run the local worker.";

  return message
    .replace(/\b[A-Fa-f0-9]{64}\b/g, "[redacted-secret]")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[redacted-secret]")
    .replace(/\bsk-ant-[A-Za-z0-9_-]{12,}\b/g, "[redacted-secret]");
}

function normalizeWorkerOutput(
  parsed: Partial<WorkerOutput>,
  run: AgentRun,
  agent: RegisteredAgent,
  source: string,
): WorkerOutput {
  const proposedActions = Array.isArray(parsed.proposedActions)
    ? parsed.proposedActions
    : [];

  return {
    summary: String(parsed.summary || `${agent.name} processed the queued task.`),
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.map(stringifyStep).slice(0, 8)
      : [`Processed the task with ${source}.`],
    proposedActions: proposedActions.slice(0, 3).map((action) => ({
      actionType: String(action.actionType || "task-step"),
      target: String(action.target || run.task),
      tool: String(action.tool || chooseTool(agent, ["browser", "github", "gmail"])),
      vendor: action.vendor ? String(action.vendor) : undefined,
      amountUsd:
        typeof action.amountUsd === "number" && Number.isFinite(action.amountUsd)
          ? action.amountUsd
          : 0,
      summary: String(action.summary || "Agent worker proposed a task step."),
      reasoning: String(
        action.reasoning ||
          "The worker is asking Agent Ledger to evaluate this before external execution.",
      ),
    })),
  };
}

function parseJsonFromText(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("empty output");
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start === -1 || end <= start) {
      throw new Error("no JSON object found");
    }

    return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  }
}

function parseWorkerOutputFromText(
  rawValue: string,
  run: AgentRun,
  agent: RegisteredAgent,
  source: string,
) {
  const parsed = parseJsonFromText(rawValue) as
    | Partial<WorkerOutput>
    | { result?: string; content?: string; response?: string };

  if ("result" in parsed && typeof parsed.result === "string") {
    return normalizeWorkerOutput(
      parseJsonFromText(parsed.result) as Partial<WorkerOutput>,
      run,
      agent,
      source,
    );
  }

  if ("content" in parsed && typeof parsed.content === "string") {
    return normalizeWorkerOutput(
      parseJsonFromText(parsed.content) as Partial<WorkerOutput>,
      run,
      agent,
      source,
    );
  }

  if ("response" in parsed && typeof parsed.response === "string") {
    return normalizeWorkerOutput(
      parseJsonFromText(parsed.response) as Partial<WorkerOutput>,
      run,
      agent,
      source,
    );
  }

  return normalizeWorkerOutput(parsed as Partial<WorkerOutput>, run, agent, source);
}

function runCliCommand(command: string, args: string[], timeoutMs = 120000) {
  return new Promise<CliCommandResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CI: "1",
        NO_COLOR: "1",
      },
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Local CLI runtime timed out."));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      const result = {
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };

      if (code && code !== 0) {
        reject(
          new Error(
            result.stderr.trim() ||
              result.stdout.trim() ||
              `Local CLI runtime exited with code ${code}.`,
          ),
        );
        return;
      }

      resolve(result);
    });
  });
}

function getWindowsClaudeScriptPath() {
  const appData = process.env.APPDATA;

  if (!appData) {
    return null;
  }

  const scriptPath = path.join(appData, "npm", "claude.ps1");
  return existsSync(scriptPath) ? scriptPath : null;
}

function isOpenAIVaultItem(item: VaultItem) {
  const text = [
    item.label,
    item.kind,
    item.provider,
    item.handle,
    item.notes,
  ]
    .map((value) => normalize(value))
    .join(" ");

  return item.hasSecret && (text.includes("openai") || text.includes("chatgpt"));
}

async function getRuntimeVaultCredential(
  agent: RegisteredAgent,
  provider: "openai" | "anthropic",
): Promise<RuntimeCredential | null> {
  if (!agent.runtimeConnectionId) {
    return null;
  }

  const connection = await getAgentRuntimeConnectionById(agent.runtimeConnectionId);

  if (!connection || connection.provider !== provider || !connection.vaultItemId) {
    return null;
  }

  const apiKey = await getVaultItemSecret(connection.vaultItemId);

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    source: "vault",
    label: connection.label,
  };
}

async function getLocalRuntimeConnection(
  agent: RegisteredAgent,
  provider: "openai" | "anthropic",
) {
  if (!agent.runtimeConnectionId) {
    return null;
  }

  const connection = await getAgentRuntimeConnectionById(agent.runtimeConnectionId);

  if (
    !connection ||
    connection.provider !== provider ||
    connection.authMethod !== "local-app"
  ) {
    return null;
  }

  return connection;
}

async function getOpenAIWorkerCredential(
  agent?: RegisteredAgent,
): Promise<RuntimeCredential | null> {
  if (!isMeteredApiAllowed()) {
    return null;
  }

  if (agent) {
    const agentCredential = await getRuntimeVaultCredential(agent, "openai");

    if (agentCredential) {
      return agentCredential;
    }
  }

  const environmentKey = process.env.OPENAI_API_KEY?.trim();

  if (environmentKey) {
    return {
      apiKey: environmentKey,
      source: "environment",
      label: "OPENAI_API_KEY",
    };
  }

  const vaultItems = await listVaultItems();
  const openAIItem = vaultItems.find(isOpenAIVaultItem);

  if (!openAIItem) {
    return null;
  }

  const vaultKey = await getVaultItemSecret(openAIItem.id);

  if (!vaultKey) {
    return null;
  }

  return {
    apiKey: vaultKey,
    source: "vault",
    label: openAIItem.label,
  };
}

async function getAnthropicWorkerCredential(
  agent: RegisteredAgent,
): Promise<RuntimeCredential | null> {
  if (!isMeteredApiAllowed()) {
    return null;
  }

  const agentCredential = await getRuntimeVaultCredential(agent, "anthropic");

  if (agentCredential) {
    return agentCredential;
  }

  const environmentKey =
    process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim();

  if (!environmentKey) {
    return null;
  }

  return {
    apiKey: environmentKey,
    source: "environment",
    label: "ANTHROPIC_API_KEY",
  };
}

export async function getAgentWorkerRuntimeStatus() {
  const openAICredential = await getOpenAIWorkerCredential();
  const hasAnthropicEnvironmentKey = isMeteredApiAllowed() && Boolean(
    process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim(),
  );
  const runtimeConnections = await listAgentRuntimeConnections();
  const hostedRuntimeConnections = runtimeConnections.filter(
    (connection) =>
      (connection.provider === "openai" || connection.provider === "anthropic") &&
      Boolean(connection.vaultItemId),
  );
  const localRuntimeConnections = runtimeConnections.filter(
    (connection) =>
      (connection.provider === "openai" || connection.provider === "anthropic") &&
      connection.authMethod === "local-app" &&
      connection.endpointUrl?.startsWith("cli:"),
  );
  const modelUsageUsd = await getModelUsageThisMonthUsd();
  const modelBudgetUsd = getMonthlyModelBudgetUsd();
  const usageLine = `Model-call cap: ${formatUsd(modelUsageUsd)} used of ${formatUsd(modelBudgetUsd)} this month. Metered API keys are ${isMeteredApiAllowed() ? "enabled" : "disabled"}.`;

  if (
    !openAICredential &&
    !hasAnthropicEnvironmentKey &&
    hostedRuntimeConnections.length === 0 &&
    localRuntimeConnections.length === 0
  ) {
    return {
      provider: "hosted",
      configured: false,
      source: null,
      detail:
        `Connect OpenAI or Claude with a local app login before running agent cycles inside the app. ${usageLine}`,
    } as const;
  }

  return {
    provider: "hosted",
    configured: true,
    source: openAICredential?.source ?? (localRuntimeConnections.length > 0 ? "local" : "vault"),
    detail:
      openAICredential?.source === "environment"
        ? `OpenAI runtime key is configured through the server environment. ${usageLine}`
        : hasAnthropicEnvironmentKey
          ? `Claude runtime key is configured through the server environment. ${usageLine}`
          : localRuntimeConnections.length > 0
            ? `Local runtime ready through ${localRuntimeConnections[0]?.label}. ${usageLine}`
            : `Hosted runtime ready through ${hostedRuntimeConnections[0]?.label ?? openAICredential?.label}. ${usageLine}`,
  } as const;
}

async function buildOpenAIWorkerOutput(
  run: AgentRun,
  agent: RegisteredAgent,
): Promise<WorkerOutput> {
  if (!isMeteredApiAllowed()) {
    throw new Error(
      "Metered OpenAI API calls are disabled. Use a local app login, or set AGENT_LEDGER_ALLOW_METERED_API=true only when you intentionally want API billing.",
    );
  }

  await assertModelUsageBudget();
  const credential = await getOpenAIWorkerCredential(agent);

  if (!credential) {
    throw new Error(
      "Real agent runtime is not configured. Add an OpenAI API key vault item with provider OpenAI, or set OPENAI_API_KEY in .env.local.",
    );
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey: credential.apiKey,
  });
  const model = process.env.OPENAI_MODEL || agent.model || "gpt-5.4-mini";
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You are the real model-backed worker for Agent Ledger. Return only valid JSON. Do not claim external actions were executed. Suggest at most 3 action proposals that Agent Ledger must check before any sensitive execution.",
      },
      {
        role: "user",
        content: JSON.stringify({
          ...JSON.parse(getWorkerPrompt(run, agent)),
        }),
      },
    ],
  });

  try {
    const parsed = JSON.parse(response.output_text || "{}") as Partial<WorkerOutput>;
    return normalizeWorkerOutput(parsed, run, agent, "OpenAI worker");
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `OpenAI worker returned unusable output: ${error.message}`
        : "OpenAI worker returned unusable output.",
    );
  }
}

async function buildClaudeCliWorkerOutput(
  run: AgentRun,
  agent: RegisteredAgent,
): Promise<WorkerOutput> {
  await assertModelUsageBudget();
  const model =
    agent.model && agent.model.toLowerCase().includes("claude")
      ? agent.model
      : "sonnet";
  const prompt = getCliWorkerPrompt(run, agent);
  const windowsScript = process.platform === "win32" ? getWindowsClaudeScriptPath() : null;
  const command = windowsScript ? "powershell.exe" : "claude";
  const args = windowsScript
    ? [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        windowsScript,
        "-p",
        "--output-format",
        "json",
        "--no-session-persistence",
        "--model",
        model,
        prompt,
      ]
    : [
        "-p",
        "--output-format",
        "json",
        "--no-session-persistence",
        "--model",
        model,
        prompt,
      ];

  try {
    const result = await runCliCommand(command, args, 75000);
    await recordLocalModelUsage({
      agent,
      run,
      amountUsd: getClaudeCliCostUsd(result.stdout),
      runtimeLabel: "Claude Code local login",
    });
    return parseWorkerOutputFromText(result.stdout, run, agent, "Claude Code local login");
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Claude Code local login is not ready: ${sanitizeWorkerError(error)}`
        : "Claude Code local login is not ready. Run `claude auth` or `claude setup-token` in a terminal, then try again.",
    );
  }
}

async function buildCodexCliWorkerOutput(): Promise<WorkerOutput> {
  throw new Error(
    "Codex local login is saved, but this Windows app alias is not exposing command-line execution yet. Use Claude Code local login first, or connect OpenAI with an API key.",
  );
}

async function buildAnthropicWorkerOutput(
  run: AgentRun,
  agent: RegisteredAgent,
): Promise<WorkerOutput> {
  if (!isMeteredApiAllowed()) {
    throw new Error(
      "Metered Anthropic API calls are disabled. Use Claude Code local login, or set AGENT_LEDGER_ALLOW_METERED_API=true only when you intentionally want API billing.",
    );
  }

  await assertModelUsageBudget();
  const credential = await getAnthropicWorkerCredential(agent);

  if (!credential) {
    throw new Error(
      "Claude runtime is not configured. Add an Anthropic API key runtime connection or set ANTHROPIC_API_KEY in .env.local.",
    );
  }

  const model =
    agent.model && agent.model.toLowerCase().includes("claude")
      ? agent.model
      : "claude-sonnet-4-20250514";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "x-api-key": credential.apiKey,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      system:
        "You are the real Claude-backed worker for Agent Ledger. Return only valid JSON. Do not claim external actions were executed. Suggest at most 3 action proposals that Agent Ledger must check before sensitive execution.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            ...JSON.parse(getWorkerPrompt(run, agent)),
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Claude worker request failed with HTTP ${response.status}. Check the Anthropic key, model, and account limits.`,
    );
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const outputText =
    payload.content?.find((item) => item.type === "text" && item.text)?.text ??
    "";

  try {
    const parsed = JSON.parse(outputText || "{}") as Partial<WorkerOutput>;
    return normalizeWorkerOutput(parsed, run, agent, "Claude worker");
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Claude worker returned unusable output: ${error.message}`
        : "Claude worker returned unusable output.",
    );
  }
}

async function buildWorkerOutput(run: AgentRun, agent: RegisteredAgent) {
  if (isWalletTransactionDrill(run, agent)) {
    return buildWalletTransactionDrillOutput(run, agent);
  }

  const claudeLocalConnection = await getLocalRuntimeConnection(agent, "anthropic");

  if (claudeLocalConnection?.endpointUrl === "cli:claude") {
    return buildClaudeCliWorkerOutput(run, agent);
  }

  const codexLocalConnection = await getLocalRuntimeConnection(agent, "openai");

  if (codexLocalConnection?.endpointUrl === "cli:codex") {
    return buildCodexCliWorkerOutput();
  }

  if (agent.runtimeProvider === "anthropic") {
    return buildAnthropicWorkerOutput(run, agent);
  }

  if (
    agent.runtimeProvider &&
    agent.runtimeProvider !== "openai"
  ) {
    throw new Error(
      `${agent.name} is assigned to ${agent.runtimeLabel ?? agent.runtimeProvider}. That external runtime should pick up queued runs through REST or MCP.`,
    );
  }

  return buildOpenAIWorkerOutput(run, agent);
}

async function processRun(run: AgentRun, agent: RegisteredAgent, actorEmail: string) {
  await updateAgentRun({
    id: run.id,
    status: "running",
    summary: `App worker started ${run.agentName}.`,
    steps: [...run.steps, "App worker claimed this queued run."],
  });

  let output: WorkerOutput;

  try {
    output = await buildWorkerOutput(run, agent);
  } catch (error) {
    const message = sanitizeWorkerError(error);
    const failedRun = await updateAgentRun({
      id: run.id,
      status: "failed",
      summary: message,
      steps: [
        ...run.steps,
        "App worker claimed this queued run.",
        "Local runtime failed before any external connector execution.",
        message.slice(0, 500),
      ],
    });

    return {
      runId: run.id,
      agentName: agent.name,
      status: failedRun?.status ?? "failed",
      decisions: [`worker-error -> failed`],
    };
  }

  const decisions: string[] = [];

  for (const action of output.proposedActions) {
    const result = await createGovernedActionRecord({
      agentId: agent.id,
      actionType: action.actionType,
      target: action.target.slice(0, 180),
      tool: action.tool,
      vendor: action.vendor,
      amountUsd: action.amountUsd,
      summary: action.summary.slice(0, 240),
      reasoning: action.reasoning.slice(0, 500),
      actorEmail,
      source: "api",
      requestedBy: actorEmail,
    });
    decisions.push(`${action.actionType} -> ${result.decision}`);
  }

  const hasReview = decisions.some((decision) => decision.endsWith("review"));
  const hasBlock = decisions.some((decision) => decision.endsWith("block"));
  const status = hasReview ? "paused" : "completed";
  const finalRun = await updateAgentRun({
    id: run.id,
    status,
    summary: `${output.summary} Decisions: ${decisions.join(", ") || "none"}.`,
    steps: [
      ...output.steps,
      ...decisions.map((decision) => `Governance decision: ${decision}.`),
      hasReview
        ? "Run paused because at least one action needs approval."
        : hasBlock
          ? "Blocked actions were safely stopped while the run finished."
          : "Run finished after recording allowed proposals. No connector execution was attempted without a guarded adapter.",
    ],
  });

  return {
    runId: run.id,
    agentName: agent.name,
    status: finalRun?.status ?? status,
    decisions,
  };
}

export async function runLocalWorkerOnce({
  actorEmail,
  limit = 10,
  queueDue = true,
  forceQueue = false,
}: LocalWorkerInput) {
  if (queueDue) {
    await runAutonomousEngineTick({
      actorEmail,
      limit: 25,
      force: forceQueue,
    });
  }

  const [agents, queuedRuns] = await Promise.all([
    listAgents(),
    listAgentRunsByStatus("queued", limit),
  ]);
  const results = [];

  for (const run of queuedRuns) {
    const agent = agents.find((item) => item.id === run.agentId);

    if (!agent) {
      await updateAgentRun({
        id: run.id,
        status: "failed",
        summary: "App worker could not find the agent for this run.",
        steps: [...run.steps, "Agent lookup failed."],
      });
      continue;
    }

    results.push(await processRun(run, agent, actorEmail));
  }

  return {
    provider: "local",
    processedCount: results.length,
    results,
  };
}
