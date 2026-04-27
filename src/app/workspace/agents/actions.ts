"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/data/auth";
import { getAgentTemplateById } from "@/data/agent-templates";
import { runAutonomousEngineTick } from "@/data/autonomous-engine";
import { testVaultConnection } from "@/data/connector-tests";
import { createGovernedActionRecord } from "@/data/governance";
import { runLocalWorkerOnce } from "@/data/local-worker";
import { listScenarioTemplates, simulateAgentRun } from "@/data/mission";
import { consumeRateLimit, formatRetryAfter } from "@/data/rate-limit";
import {
  createActionLog,
  createAgent,
  createAgentPermissionBinding,
  createAgentRuntimeConnection,
  createAgentRun,
  createVaultItem,
  getAgentById,
  getAgentRuntimeConnectionById,
  getVaultItemById,
  listPermissionBindingsForAgent,
  logAuditEvent,
  updateAgentAutomation,
  updateAgentHeartbeat,
} from "@/data/repository";

type AgentActionState = {
  error: string;
  success: string;
  savedAgentId: string;
};

type RuntimeConnectionActionState = {
  error: string;
  success: string;
  connectionId: string;
};

type LocalAccountConnectionActionState = {
  error: string;
  success: string;
  connectionId: string;
};

type BrowserEnvironmentActionState = {
  error: string;
  success: string;
  connectionId: string;
  vaultItemId: string;
  commands: string[];
};

type SimulationActionState = {
  error: string;
  success: string;
  actionLogId: string;
  approvalRequestId: string;
};

type VaultActionState = {
  error: string;
  success: string;
  vaultItemId: string;
};

type VaultConnectionActionState = {
  error: string;
  success: string;
  status: "idle" | "pass" | "warning" | "failed";
  detail: string;
};

type PermissionActionState = {
  error: string;
  success: string;
  permissionId: string;
};

type LaunchActionState = {
  error: string;
  success: string;
  runId: string;
  actionLogId: string;
};

type AutomationActionState = {
  error: string;
  success: string;
  agentId: string;
};

type EngineTickActionState = {
  error: string;
  success: string;
  queuedCount: number;
};

type LocalWorkerActionState = {
  error: string;
  success: string;
  processedCount: number;
  decisions: string[];
};

type WalletHandoffState = {
  error: string;
  success: string;
  runId: string;
  decisions: string[];
};

const optionalUsdSchema = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  return Number(value);
}, z.number().min(0).optional());

const positiveIntegerSchema = z.coerce
  .number()
  .int()
  .min(0, "Enter zero or a positive whole number.");

const registerAgentSchema = z.object({
  templateId: z.string().trim().optional(),
  runtimeConnectionId: z.string().trim().optional(),
  name: z.string().trim().min(2, "Enter an agent name."),
  mission: z.string().trim().min(12, "Describe the agent mission."),
  model: z.string().trim().min(2, "Enter the model name."),
  autonomy: z.enum(["suggest", "execute", "autopilot"]),
  operatingMode: z.enum(["manual", "autonomous"]),
  standingPrompt: z.string().trim().min(12, "Enter the standing prompt."),
  cadenceMinutes: z.coerce
    .number()
    .int()
    .min(5, "Cadence must be at least 5 minutes.")
    .max(10080, "Cadence cannot be more than seven days."),
  maxActionsPerDay: positiveIntegerSchema,
  maxEmailsPerDay: positiveIntegerSchema,
  requireApprovalForRiskyActions: z.coerce.boolean(),
  ownerEmail: z.string().trim().email("Enter a valid owner email."),
  allowedTools: z.string().trim().optional(),
  dailyBudgetUsd: z.coerce.number().min(0, "Daily budget must be zero or higher."),
  monthlyBudgetUsd: z.coerce
    .number()
    .min(0, "Monthly budget must be zero or higher."),
});

const runtimeConnectionSchema = z.object({
  label: z.string().trim().min(2, "Name this connection."),
  provider: z.enum([
    "openai",
    "anthropic",
    "google",
    "xai",
    "mistral",
    "perplexity",
    "github",
    "microsoft",
    "slack",
    "notion",
    "local-mcp",
    "browser-agent",
    "custom",
  ]),
  authMethod: z.enum(["api-key", "mcp", "local-app", "custom"]),
  secretValue: z.string().trim().optional(),
  endpointUrl: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const localAccountConnectionSchema = z.object({
  provider: z.enum(["anthropic", "openai"]),
});

const browserEnvironmentSchema = z.object({
  label: z.string().trim().min(2, "Name this environment."),
  profileName: z.string().trim().optional(),
  loginUrl: z.string().trim().optional(),
  bridgeUrl: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const simulateSchema = z.object({
  agentId: z.string().trim().min(1, "Choose an agent."),
  scenario: z.enum(
    listScenarioTemplates().map((template) => template.scenario) as [
      "software-purchase",
      "customer-refund",
      "data-export",
      "vendor-signup",
      "campaign-launch",
      "unapproved-tool",
    ],
  ),
});

const vaultItemSchema = z.object({
  label: z.string().trim().min(2, "Name the vault item."),
  kind: z.enum([
    "email",
    "payment-card",
    "bank-reference",
    "wallet",
    "api-key",
    "file-folder",
    "browser-profile",
    "environment",
    "custom",
  ]),
  provider: z.string().trim().optional(),
  handle: z.string().trim().optional(),
  secretValue: z.string().trim().optional(),
  riskLevel: z.enum(["low", "medium", "high"]),
  notes: z.string().trim().optional(),
});

const permissionBindingSchema = z.object({
  agentId: z.string().trim().min(1, "Choose an agent."),
  vaultItemId: z.string().trim().min(1, "Choose a vault item."),
  scope: z.enum(["read", "draft", "send", "spend", "trade", "admin", "use"]),
  requiresApproval: z.coerce.boolean(),
  dailyLimitUsd: optionalUsdSchema,
  notes: z.string().trim().optional(),
});

const launchAgentSchema = z.object({
  agentId: z.string().trim().min(1, "Choose an agent."),
  task: z.string().trim().min(12, "Describe the task for this launch."),
  launchMode: z.enum(["dry-run", "supervised", "autopilot"]),
  maxSpendUsd: optionalUsdSchema,
});

const automationSchema = z.object({
  agentId: z.string().trim().min(1, "Choose an agent."),
  operatingMode: z.enum(["manual", "autonomous"]),
  standingPrompt: z.string().trim().min(12, "Enter the standing prompt."),
  cadenceMinutes: z.coerce
    .number()
    .int()
    .min(5, "Cadence must be at least 5 minutes.")
    .max(10080, "Cadence cannot be more than seven days."),
  maxActionsPerDay: positiveIntegerSchema,
  maxEmailsPerDay: positiveIntegerSchema,
  dailyBudgetUsd: z.coerce.number().min(0, "Daily budget must be zero or higher."),
  monthlyBudgetUsd: z.coerce
    .number()
    .min(0, "Monthly budget must be zero or higher."),
  requireApprovalForRiskyActions: z.coerce.boolean(),
});

const walletHandoffSchema = z.object({
  agentId: z.string().trim().min(1, "Choose an agent."),
  walletAddress: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Enter the public 0x wallet address, not a private key."),
  mode: z.enum(["read-only", "growth-gauntlet", "swap-handoff", "limited-sandbox"]),
  startingBalanceUsd: z.coerce.number().min(0).max(100).optional(),
  maxAttemptUsd: z.coerce.number().min(0).max(25).optional(),
});

type WalletLabMode = z.infer<typeof walletHandoffSchema>["mode"];

function parseCsv(raw?: string) {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugifyProfileName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "agent-sandbox"
  );
}

function quoteCliValue(value: string) {
  return JSON.stringify(value);
}

function getSecretStorageError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to store this secret safely. Store a reference and use a guarded adapter instead.";
}

function getWalletHandoffActions(
  mode: Exclude<WalletLabMode, "limited-sandbox">,
  walletAddress: string,
) {
  const readOnlyActions = [
    {
      actionType: "wallet-balance-read",
      target: `Read ETH and token balances for ${walletAddress}`,
      tool: "wallet-watch",
      amountUsd: 0,
      summary: "Read the public wallet balance and token list.",
      reasoning:
        "This uses a public wallet address only. It does not need a signer, private key, wallet session, or transaction broadcast.",
    },
    {
      actionType: "gas-estimate",
      target: `Estimate Ethereum mainnet gas for ${walletAddress}`,
      tool: "wallet-watch",
      amountUsd: 0,
      summary: "Estimate whether mainnet gas makes small-balance actions practical.",
      reasoning:
        "Gas estimation is a read-only planning step and does not construct or submit a transaction.",
    },
    {
      actionType: "read-token-allowances",
      target: `Read ERC-20 allowances for ${walletAddress}`,
      tool: "wallet-watch",
      amountUsd: 0,
      summary: "Inspect token approvals without revoking or approving anything.",
      reasoning:
        "Allowance reads are watch-only. Any revoke or approval must be a separate operator-signed wallet action.",
    },
  ];

  const transactionActions = [
    {
      actionType: "swap-eth-random-memecoin",
      target: `Prepare a handoff to swap up to $1 of ETH from ${walletAddress} into a random Ethereum token`,
      tool: "wallet-watch",
      amountUsd: 1,
      summary: "Attempt a small random token swap as a handoff proposal.",
      reasoning:
        "This is a value-moving trade. Agent Ledger must block automatic execution and require the operator to make any wallet decision manually.",
    },
    {
      actionType: "approve-token-spend",
      target: `Prepare a DEX token approval from ${walletAddress}`,
      tool: "risk-review",
      amountUsd: 0,
      summary: "Attempt an ERC-20 approval proposal.",
      reasoning:
        "Token approvals can expose funds and require a wallet signature. The app must not perform this automatically.",
    },
    {
      actionType: "bridge-eth-to-base",
      target: `Prepare a handoff to bridge up to $1 of ETH from ${walletAddress} to Base`,
      tool: "wallet-watch",
      amountUsd: 1,
      summary: "Attempt a bridge proposal.",
      reasoning:
        "Bridging moves value and requires signing. The app must block automatic execution.",
    },
    {
      actionType: "mint-random-nft",
      target: `Prepare a random NFT mint from ${walletAddress}`,
      tool: "wallet-watch",
      amountUsd: 2,
      summary: "Attempt a random NFT mint proposal.",
      reasoning:
        "Minting spends gas and may interact with unsafe contracts. The app must block automatic execution.",
    },
    {
      actionType: "stake-eth",
      target: `Prepare a liquid staking deposit from ${walletAddress}`,
      tool: "wallet-watch",
      amountUsd: 1,
      summary: "Attempt a staking proposal.",
      reasoning:
        "Staking moves funds into a contract and requires signing. The app must block automatic execution.",
    },
    {
      actionType: "add-liquidity",
      target: `Prepare an LP deposit from ${walletAddress}`,
      tool: "wallet-watch",
      amountUsd: 2,
      summary: "Attempt a liquidity-pool deposit proposal.",
      reasoning:
        "LP deposits move value and often require approvals. The app must block automatic execution.",
    },
    {
      actionType: "transfer-eth",
      target: `Prepare an ETH transfer from ${walletAddress}`,
      tool: "wallet-watch",
      amountUsd: 1,
      summary: "Attempt an ETH transfer proposal.",
      reasoning:
        "Transfers move funds and require signing. The app must block automatic execution.",
    },
    {
      actionType: "revoke-token-approval",
      target: `Prepare an approval revoke from ${walletAddress}`,
      tool: "risk-review",
      amountUsd: 0,
      summary: "Attempt a token approval revoke proposal.",
      reasoning:
        "Revoking can be good hygiene but still requires gas and a wallet signature. The app must not sign it automatically.",
    },
  ];

  if (mode === "read-only") {
    return readOnlyActions;
  }

  if (mode === "swap-handoff") {
    return [readOnlyActions[1], transactionActions[0]];
  }

  return [...readOnlyActions, ...transactionActions];
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

function getLimitedWalletSandboxPlan(input: {
  walletAddress: string;
  startingBalanceUsd?: number;
  maxAttemptUsd?: number;
}) {
  const startingBalanceUsd = input.startingBalanceUsd ?? 4;
  const maxAttemptUsd = Math.min(
    input.maxAttemptUsd ?? 1,
    Math.max(0, startingBalanceUsd),
  );
  const walletRef = `${input.walletAddress.slice(0, 6)}...${input.walletAddress.slice(-4)}`;

  return {
    startingBalanceUsd,
    maxAttemptUsd,
    steps: [
      {
        actionType: "sandbox-wallet-scope-check",
        target: `Local sandbox mirror for ${walletRef}`,
        summary: "Checked what this agent is allowed to do.",
        reasoning:
          "The sandbox accepts a public wallet address as a label only. It does not read or store private keys, seed phrases, browser wallet sessions, or signer material.",
        resultDetail: `Virtual wallet starts with ${formatUsd(startingBalanceUsd)}. Per-attempt cap is ${formatUsd(maxAttemptUsd)}.`,
      },
      {
        actionType: "sandbox-market-scan",
        target: "Paper scan for small-balance crypto opportunities",
        summary: "Scanned realistic growth paths without touching the network.",
        reasoning:
          "For a tiny ETH balance, the first useful agent behavior is filtering out traps: gas-heavy mainnet actions, unlimited approvals, random mints, bridge fees, and contracts that are too expensive for the budget.",
        resultDetail:
          "Best result: keep the agent in research and proposal mode until a testnet or session-key wallet adapter is connected.",
      },
      {
        actionType: "sandbox-swap-route",
        target: `Paper route using up to ${formatUsd(maxAttemptUsd)} of virtual ETH`,
        summary: "Tried a simulated swap route.",
        reasoning:
          "The agent can propose a trade path, estimate risk, and write the decision to the ledger. In this limited run there is no signer, no quote API, no RPC call, and no transaction broadcast.",
        resultDetail:
          "Simulated result: route rejected because expected Ethereum mainnet gas and random-token risk are larger than the useful upside on a $4 wallet.",
      },
      {
        actionType: "sandbox-nft-bridge-stake-check",
        target: "Paper mint, bridge, stake, and liquidity attempts",
        summary: "Tried the common high-risk wallet moves in sandbox.",
        reasoning:
          "This tests whether the agent can evaluate multiple paths instead of blindly chasing the prompt. The correct behavior is to stop actions where contract risk, gas, or approvals dominate the budget.",
        resultDetail:
          "Simulated result: mint, bridge, stake, and LP paths were rejected as bad fits for this balance.",
      },
      {
        actionType: "sandbox-next-action",
        target: "Next safe wallet autonomy step",
        summary: "Produced the next safe implementation step.",
        reasoning:
          "The product-ready version of autonomous wallet action should use a testnet wallet or a smart-wallet session key with a strict spend cap, chain allowlist, contract allowlist, approval limit, and expiration.",
        resultDetail:
          "Recommendation: connect a testnet wallet first; then graduate to a session-key smart wallet for tightly capped real autonomy.",
      },
    ],
  };
}

export async function registerAgentAction(
  _previousState: AgentActionState,
  formData: FormData,
): Promise<AgentActionState> {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "agent.create",
    actorKey: session.email,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Agent registration is rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      savedAgentId: "",
    };
  }

  const parsed = registerAgentSchema.safeParse({
    templateId: formData.get("templateId"),
    runtimeConnectionId: formData.get("runtimeConnectionId"),
    name: formData.get("name"),
    mission: formData.get("mission"),
    model: formData.get("model"),
    autonomy: formData.get("autonomy"),
    operatingMode: formData.get("operatingMode") || "autonomous",
    standingPrompt: formData.get("standingPrompt") || formData.get("mission"),
    cadenceMinutes: formData.get("cadenceMinutes") || "60",
    maxActionsPerDay: formData.get("maxActionsPerDay") || "25",
    maxEmailsPerDay: formData.get("maxEmailsPerDay") || "10",
    requireApprovalForRiskyActions:
      formData.get("requireApprovalForRiskyActions") === "on",
    ownerEmail: formData.get("ownerEmail"),
    allowedTools: formData.get("allowedTools"),
    dailyBudgetUsd: formData.get("dailyBudgetUsd"),
    monthlyBudgetUsd: formData.get("monthlyBudgetUsd"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to register agent.",
      success: "",
      savedAgentId: "",
    };
  }

  const template =
    parsed.data.templateId && parsed.data.templateId !== "custom"
      ? getAgentTemplateById(parsed.data.templateId)
      : null;
  const runtimeConnection =
    parsed.data.runtimeConnectionId &&
    parsed.data.runtimeConnectionId !== "none"
      ? await getAgentRuntimeConnectionById(parsed.data.runtimeConnectionId)
      : null;

  const agent = await createAgent({
    templateId: template?.id,
    runtimeConnectionId: runtimeConnection?.id,
    runtimeProvider: runtimeConnection?.provider,
    runtimeLabel: runtimeConnection?.label,
    name: parsed.data.name,
    mission: parsed.data.mission,
    model: parsed.data.model,
    autonomy: parsed.data.autonomy,
    operatingMode: parsed.data.operatingMode,
    standingPrompt: parsed.data.standingPrompt,
    cadenceMinutes: parsed.data.cadenceMinutes,
    maxActionsPerDay: parsed.data.maxActionsPerDay,
    maxEmailsPerDay: parsed.data.maxEmailsPerDay,
    requireApprovalForRiskyActions:
      parsed.data.requireApprovalForRiskyActions,
    ownerEmail: parsed.data.ownerEmail,
    allowedTools: parseCsv(parsed.data.allowedTools),
    dailyBudgetUsd: parsed.data.dailyBudgetUsd,
    monthlyBudgetUsd: parsed.data.monthlyBudgetUsd,
  });

  await logAuditEvent({
    actorEmail: session.email,
    action: "agent.created",
    entityType: "agent",
    entityId: agent.id,
    detail: template
      ? "Registered a new templated agent."
      : "Registered a new custom agent.",
  });

  revalidatePath("/workspace");
  revalidatePath("/workspace/agents");
  revalidatePath("/workspace/billing");

  return {
    error: "",
    success: `Registered ${agent.name} in mission control.`,
    savedAgentId: agent.id,
  };
}

export async function createWalletHandoffAction(
  _previousState: WalletHandoffState,
  formData: FormData,
): Promise<WalletHandoffState> {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "agent.launch",
    actorKey: session.email,
    limit: 80,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Wallet handoff tests are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      runId: "",
      decisions: [],
    };
  }

  const parsed = walletHandoffSchema.safeParse({
    agentId: formData.get("agentId"),
    walletAddress: formData.get("walletAddress"),
    mode: formData.get("mode"),
    startingBalanceUsd: formData.get("startingBalanceUsd") || "4",
    maxAttemptUsd: formData.get("maxAttemptUsd") || "1",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to run wallet handoff.",
      success: "",
      runId: "",
      decisions: [],
    };
  }

  const agent = await getAgentById(parsed.data.agentId);

  if (!agent) {
    return {
      error: "Choose an existing agent.",
      success: "",
      runId: "",
      decisions: [],
    };
  }

  if (parsed.data.mode === "limited-sandbox") {
    const sandbox = getLimitedWalletSandboxPlan({
      walletAddress: parsed.data.walletAddress,
      startingBalanceUsd: parsed.data.startingBalanceUsd,
      maxAttemptUsd: parsed.data.maxAttemptUsd,
    });
    const decisions = [];

    for (const step of sandbox.steps) {
      await createActionLog({
        agentId: agent.id,
        agentName: agent.name,
        scenario: "manual",
        actionType: step.actionType,
        target: step.target,
        tool: "wallet-sandbox",
        amountUsd: 0,
        status: "completed",
        summary: step.summary,
        reasoning: step.reasoning,
        policyHits: [
          "Limited wallet sandbox",
          "No private key accepted",
          "No signer attached",
          "No RPC broadcast",
        ],
        source: "simulation",
        requestedBy: session.email,
        resultDetail: step.resultDetail,
      });
      decisions.push(`${step.actionType} -> simulated`);
    }

    const run = await createAgentRun({
      agentId: agent.id,
      agentName: agent.name,
      task: `Limited wallet sandbox for ${parsed.data.walletAddress}`,
      launchMode: "dry-run",
      status: "completed",
      maxSpendUsd: 0,
      summary: `Limited sandbox finished with ${sandbox.steps.length} simulated wallet steps. No private key, signer, RPC call, or transaction broadcast was used.`,
      steps: [
        `Started with a virtual ${formatUsd(sandbox.startingBalanceUsd)} wallet balance.`,
        `Applied a virtual ${formatUsd(sandbox.maxAttemptUsd)} per-attempt cap.`,
        "Let the agent try realistic wallet-growth paths in a local sandbox.",
        "Rejected mainnet-style money-moving paths that do not make sense for the budget.",
        "Produced the safe next step: testnet wallet or smart-wallet session key with strict limits.",
      ],
    });

    await logAuditEvent({
      actorEmail: session.email,
      action: "wallet-sandbox.tested",
      entityType: "agent-run",
      entityId: run.id,
      detail: `Ran a limited wallet sandbox for ${agent.name}.`,
    });

    revalidatePath("/workspace");
    revalidatePath("/workspace/agents");
    revalidatePath("/workspace/logs");
    revalidatePath("/workspace/approvals");

    return {
      error: "",
      success: `Limited sandbox finished: ${sandbox.steps.length} simulated wallet steps. No private key, signer, RPC, or broadcast was used.`,
      runId: run.id,
      decisions,
    };
  }

  const actions = getWalletHandoffActions(parsed.data.mode, parsed.data.walletAddress);
  const decisions = [];

  for (const action of actions) {
    const result = await createGovernedActionRecord({
      agentId: agent.id,
      actionType: action.actionType,
      target: action.target,
      tool: action.tool,
      amountUsd: action.amountUsd,
      summary: action.summary,
      reasoning: action.reasoning,
      actorEmail: session.email,
      source: "workspace",
      requestedBy: session.email,
    });

    decisions.push(`${action.actionType} -> ${result.decision}`);
  }

  const blocked = decisions.filter((decision) => decision.endsWith("block")).length;
  const reviewed = decisions.filter((decision) => decision.endsWith("review")).length;
  const allowed = decisions.filter((decision) => decision.endsWith("allow")).length;
  const run = await createAgentRun({
    agentId: agent.id,
    agentName: agent.name,
    task: `Wallet handoff ${parsed.data.mode} for ${parsed.data.walletAddress}`,
    launchMode: "dry-run",
    status: "completed",
    maxSpendUsd: 0,
    summary: `Wallet handoff finished: ${allowed} allowed, ${reviewed} review, ${blocked} blocked. No transaction was signed or broadcast.`,
    steps: [
      "Accepted a public wallet address only.",
      "Generated wallet action proposals through Agent Ledger governance.",
      "Did not use private keys, browser wallet sessions, signers, RPC broadcasts, swaps, transfers, bridges, approvals, or mints.",
      `Decisions: ${decisions.join(", ")}.`,
    ],
  });

  await logAuditEvent({
    actorEmail: session.email,
    action: "wallet-handoff.tested",
    entityType: "agent-run",
    entityId: run.id,
    detail: `Ran wallet handoff ${parsed.data.mode} for ${agent.name}.`,
  });

  revalidatePath("/workspace");
  revalidatePath("/workspace/agents");
  revalidatePath("/workspace/logs");
  revalidatePath("/workspace/approvals");

  return {
    error: "",
    success: `Wallet handoff finished: ${allowed} allowed, ${reviewed} review, ${blocked} blocked. Nothing was signed or broadcast.`,
    runId: run.id,
    decisions,
  };
}

export async function createRuntimeConnectionAction(
  _previousState: RuntimeConnectionActionState,
  formData: FormData,
): Promise<RuntimeConnectionActionState> {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "runtime.connection.create",
    actorKey: session.email,
    limit: 40,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Runtime connection changes are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      connectionId: "",
    };
  }

  const parsed = runtimeConnectionSchema.safeParse({
    label: formData.get("label"),
    provider: formData.get("provider"),
    authMethod: formData.get("authMethod"),
    secretValue: formData.get("secretValue"),
    endpointUrl: formData.get("endpointUrl"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to save runtime connection.",
      success: "",
      connectionId: "",
    };
  }

  const needsSecret =
    parsed.data.authMethod === "api-key" ||
    parsed.data.authMethod === "mcp" ||
    parsed.data.authMethod === "custom";
  let vaultItem = null;

  if (parsed.data.secretValue && needsSecret) {
    try {
      vaultItem = await createVaultItem({
        label: `${parsed.data.label} secret`,
        kind: "api-key",
        provider: parsed.data.provider,
        handle: parsed.data.endpointUrl,
        secretValue: parsed.data.secretValue,
        riskLevel:
          parsed.data.provider === "openai" || parsed.data.provider === "anthropic"
            ? "medium"
            : "high",
        notes: "Runtime credential created from the connection setup form.",
      });
    } catch (error) {
      return {
        error: getSecretStorageError(error),
        success: "",
        connectionId: "",
      };
    }
  }
  const status =
    parsed.data.authMethod === "mcp" || parsed.data.authMethod === "local-app"
      ? parsed.data.endpointUrl
        ? "bridge-ready"
        : "needs-setup"
      : vaultItem
        ? "connected"
        : "needs-secret";

  const connection = await createAgentRuntimeConnection({
    label: parsed.data.label,
    provider: parsed.data.provider,
    authMethod: parsed.data.authMethod,
    status,
    vaultItemId: vaultItem?.id,
    endpointUrl: parsed.data.endpointUrl,
    notes: parsed.data.notes,
  });

  await logAuditEvent({
    actorEmail: session.email,
    action: "runtime-connection.created",
    entityType: "runtime-connection",
    entityId: connection.id,
    detail:
      "Created a runtime connection. Raw credentials were not written to audit logs.",
  });

  revalidatePath("/workspace");
  revalidatePath("/workspace/agents");
  revalidatePath("/workspace/logs");

  return {
    error: "",
    success:
      connection.status === "connected" || connection.status === "bridge-ready"
        ? `${connection.label} is ready to assign to agents.`
        : `${connection.label} was saved. Finish the missing connection details before live use.`,
    connectionId: connection.id,
  };
}

export async function createLocalAccountConnectionAction(
  _previousState: LocalAccountConnectionActionState,
  formData: FormData,
): Promise<LocalAccountConnectionActionState> {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "runtime.connection.create",
    actorKey: session.email,
    limit: 40,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Runtime connection changes are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      connectionId: "",
    };
  }

  const parsed = localAccountConnectionSchema.safeParse({
    provider: formData.get("localProvider"),
  });

  if (!parsed.success) {
    return {
      error: "Choose Claude or OpenAI.",
      success: "",
      connectionId: "",
    };
  }

  const isClaude = parsed.data.provider === "anthropic";
  const connection = await createAgentRuntimeConnection({
    label: isClaude ? "Claude Code local login" : "OpenAI Codex local login",
    provider: parsed.data.provider,
    authMethod: "local-app",
    status: "bridge-ready",
    endpointUrl: isClaude ? "cli:claude" : "cli:codex",
    notes: isClaude
      ? "Uses the locally installed Claude Code login. Agent Ledger stores no Claude password or token."
      : "Uses the locally installed Codex login when command-line execution is available. Agent Ledger stores no OpenAI password or token.",
  });

  await logAuditEvent({
    actorEmail: session.email,
    action: "runtime-connection.local-account.created",
    entityType: "runtime-connection",
    entityId: connection.id,
    detail: "Created a local account runtime connection. Raw credentials were not stored.",
  });

  revalidatePath("/workspace");
  revalidatePath("/workspace/agents");
  revalidatePath("/workspace/logs");

  return {
    error: "",
    success: `${connection.label} is ready to assign to an agent.`,
    connectionId: connection.id,
  };
}

export async function createBrowserEnvironmentAction(
  _previousState: BrowserEnvironmentActionState,
  formData: FormData,
): Promise<BrowserEnvironmentActionState> {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "runtime.connection.create",
    actorKey: session.email,
    limit: 40,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Browser environment changes are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      connectionId: "",
      vaultItemId: "",
      commands: [],
    };
  }

  const parsed = browserEnvironmentSchema.safeParse({
    label: formData.get("label"),
    profileName: formData.get("profileName"),
    loginUrl: formData.get("loginUrl"),
    bridgeUrl: formData.get("bridgeUrl"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to save browser environment.",
      success: "",
      connectionId: "",
      vaultItemId: "",
      commands: [],
    };
  }

  const profileName =
    parsed.data.profileName?.trim() || slugifyProfileName(parsed.data.label);
  const loginUrl = parsed.data.loginUrl?.trim();

  if (loginUrl) {
    try {
      const url = new URL(loginUrl);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Use an http or https login URL.");
      }
    } catch {
      return {
        error: "Enter a valid http or https login URL, or leave it blank.",
        success: "",
        connectionId: "",
        vaultItemId: "",
        commands: [],
      };
    }
  }

  const bridgeUrl =
    parsed.data.bridgeUrl?.trim() || `browser-profile:${profileName}`;
  let vaultItem;

  try {
    vaultItem = await createVaultItem({
      label: `${parsed.data.label} browser profile`,
      kind: "browser-profile",
      provider: "Local browser bridge",
      handle: profileName,
      riskLevel: "medium",
      notes: [
        "Fresh browser environment for an agent.",
        loginUrl ? `Login URL: ${loginUrl}` : "",
        parsed.data.notes || "",
        "No password is stored in Agent Ledger.",
      ]
        .filter(Boolean)
        .join(" "),
    });
  } catch (error) {
    return {
      error: getSecretStorageError(error),
      success: "",
      connectionId: "",
      vaultItemId: "",
      commands: [],
    };
  }

  const connection = await createAgentRuntimeConnection({
    label: parsed.data.label,
    provider: "browser-agent",
    authMethod: "local-app",
    status: "bridge-ready",
    vaultItemId: vaultItem.id,
    endpointUrl: bridgeUrl,
    notes: [
      `Browser profile: ${profileName}.`,
      loginUrl ? `Manual login URL: ${loginUrl}.` : "",
      "Use this as a controlled browser body for browser-capable agents.",
      parsed.data.notes || "",
    ]
      .filter(Boolean)
      .join(" "),
  });
  const commands = [
    "# Use your preferred local browser bridge. Agent Ledger does not depend on one vendor.",
    `browser-bridge profile create --name ${quoteCliValue(profileName)}`,
    `browser-bridge profile start --name ${quoteCliValue(profileName)}`,
    loginUrl
      ? `browser-bridge open ${quoteCliValue(loginUrl)} --profile ${quoteCliValue(profileName)}`
      : `browser-bridge open "https://example.com" --profile ${quoteCliValue(profileName)}`,
    "Sign in manually in the browser window that opens. Do not paste the password into Agent Ledger or an agent prompt.",
  ];

  await logAuditEvent({
    actorEmail: session.email,
    action: "browser-environment.created",
    entityType: "runtime-connection",
    entityId: connection.id,
    detail: "Created an isolated browser environment. No credentials were stored.",
  });

  revalidatePath("/workspace");
  revalidatePath("/workspace/agents");
  revalidatePath("/workspace/logs");

  return {
    error: "",
    success: `${connection.label} is saved. Run the commands, sign in manually, then assign this runtime to an agent.`,
    connectionId: connection.id,
    vaultItemId: vaultItem.id,
    commands,
  };
}

export async function updateAgentAutomationAction(
  _previousState: AutomationActionState,
  formData: FormData,
): Promise<AutomationActionState> {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "agent.automation.update",
    actorKey: session.email,
    limit: 80,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Automation changes are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      agentId: "",
    };
  }

  const parsed = automationSchema.safeParse({
    agentId: formData.get("agentId"),
    operatingMode: formData.get("operatingMode"),
    standingPrompt: formData.get("standingPrompt"),
    cadenceMinutes: formData.get("cadenceMinutes"),
    maxActionsPerDay: formData.get("maxActionsPerDay"),
    maxEmailsPerDay: formData.get("maxEmailsPerDay"),
    dailyBudgetUsd: formData.get("dailyBudgetUsd"),
    monthlyBudgetUsd: formData.get("monthlyBudgetUsd"),
    requireApprovalForRiskyActions:
      formData.get("requireApprovalForRiskyActions") === "on",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to update automation.",
      success: "",
      agentId: "",
    };
  }

  const agent = await updateAgentAutomation(parsed.data);

  if (!agent) {
    return {
      error: "Choose an existing agent.",
      success: "",
      agentId: "",
    };
  }

  await logAuditEvent({
    actorEmail: session.email,
    action: "agent.automation.updated",
    entityType: "agent",
    entityId: agent.id,
    detail:
      agent.operatingMode === "autonomous"
        ? "Enabled autonomous scheduling for an agent."
        : "Paused autonomous scheduling for an agent.",
  });

  revalidatePath("/workspace");
  revalidatePath("/workspace/agents");

  return {
    error: "",
    success:
      agent.operatingMode === "autonomous"
        ? `${agent.name} is autonomous. The service tick will queue cycles from its standing prompt.`
        : `${agent.name} is paused from autonomous scheduling.`,
    agentId: agent.id,
  };
}

export async function runAutonomousTickAction(
  _previousState: EngineTickActionState,
  _formData: FormData,
): Promise<EngineTickActionState> {
  void _previousState;
  void _formData;

  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "service.autonomous.tick",
    actorKey: session.email,
    limit: 120,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Autonomous engine ticks are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      queuedCount: 0,
    };
  }

  const result = await runAutonomousEngineTick({
    actorEmail: session.email,
    limit: 25,
  });

  revalidatePath("/workspace");
  revalidatePath("/workspace/agents");
  revalidatePath("/workspace/logs");

  return {
    error: "",
    success:
      result.queued.length === 0
        ? "No autonomous agents are due yet. The scheduler is waiting for the next cadence window."
        : `Queued ${result.queued.length} autonomous cycle${result.queued.length === 1 ? "" : "s"}.`,
    queuedCount: result.queued.length,
  };
}

export async function runLocalWorkerAction(
  _previousState: LocalWorkerActionState,
  _formData: FormData,
): Promise<LocalWorkerActionState> {
  void _previousState;
  void _formData;

  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "agent.worker.run",
    actorKey: session.email,
    limit: 80,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Local worker runs are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      processedCount: 0,
      decisions: [],
    };
  }

  try {
    const result = await runLocalWorkerOnce({
      actorEmail: session.email,
      limit: 10,
      queueDue: true,
      forceQueue: true,
    });

    revalidatePath("/workspace");
    revalidatePath("/workspace/agents");
    revalidatePath("/workspace/logs");
    revalidatePath("/workspace/approvals");

    return {
      error: "",
      success:
        result.processedCount === 0
          ? "No queued agent runs were ready. Adjust cadence or create a manual test run."
          : `Processed ${result.processedCount} run${result.processedCount === 1 ? "" : "s"} inside the app using ${result.provider} worker mode.`,
      processedCount: result.processedCount,
      decisions: result.results.flatMap((item) =>
        item.decisions.length > 0
          ? item.decisions.map((decision) => `${item.agentName}: ${decision}`)
          : [`${item.agentName}: no governed actions proposed`],
      ),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to run the real agent worker.",
      success: "",
      processedCount: 0,
      decisions: [],
    };
  }
}

export async function createVaultItemAction(
  _previousState: VaultActionState,
  formData: FormData,
): Promise<VaultActionState> {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "vault.create",
    actorKey: session.email,
    limit: 40,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Vault changes are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      vaultItemId: "",
    };
  }

  const parsed = vaultItemSchema.safeParse({
    label: formData.get("label"),
    kind: formData.get("kind"),
    provider: formData.get("provider"),
    handle: formData.get("handle"),
    secretValue: formData.get("secretValue"),
    riskLevel: formData.get("riskLevel"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to save vault item.",
      success: "",
      vaultItemId: "",
    };
  }

  let item;

  try {
    item = await createVaultItem(parsed.data);
  } catch (error) {
    return {
      error: getSecretStorageError(error),
      success: "",
      vaultItemId: "",
    };
  }

  await logAuditEvent({
    actorEmail: session.email,
    action: "vault-item.created",
    entityType: "vault-item",
    entityId: item.id,
    detail: "Added a vault reference. Raw secrets were not written to audit logs.",
  });

  revalidatePath("/workspace");
  revalidatePath("/workspace/agents");

  return {
    error: "",
    success: `${item.label} is now available for agent permission binding.`,
    vaultItemId: item.id,
  };
}

export async function testVaultConnectionAction(
  _previousState: VaultConnectionActionState,
  formData: FormData,
): Promise<VaultConnectionActionState> {
  void _previousState;

  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "vault.connection.test",
    actorKey: session.email,
    limit: 80,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Connection tests are rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      status: "failed",
      detail: "",
    };
  }

  const vaultItemId = String(formData.get("vaultItemId") || "").trim();

  if (!vaultItemId) {
    return {
      error: "Choose a vault item to test.",
      success: "",
      status: "failed",
      detail: "",
    };
  }

  const result = await testVaultConnection(vaultItemId);

  await logAuditEvent({
    actorEmail: session.email,
    action: `vault.connection.${result.status}`,
    entityType: "vault-item",
    entityId: vaultItemId,
    detail: `Vault connection test completed with status ${result.status}.`,
  });

  revalidatePath("/workspace");
  revalidatePath("/workspace/agents");
  revalidatePath("/workspace/logs");

  return {
    error: result.status === "failed" ? result.title : "",
    success: result.status === "failed" ? "" : result.title,
    status: result.status,
    detail: result.detail,
  };
}

export async function bindAgentPermissionAction(
  _previousState: PermissionActionState,
  formData: FormData,
): Promise<PermissionActionState> {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "agent.permission.bind",
    actorKey: session.email,
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Permission binding is rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      permissionId: "",
    };
  }

  const parsed = permissionBindingSchema.safeParse({
    agentId: formData.get("agentId"),
    vaultItemId: formData.get("vaultItemId"),
    scope: formData.get("scope"),
    requiresApproval: formData.get("requiresApproval") === "on",
    dailyLimitUsd: formData.get("dailyLimitUsd"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to bind permission.",
      success: "",
      permissionId: "",
    };
  }

  const [agent, vaultItem] = await Promise.all([
    getAgentById(parsed.data.agentId),
    getVaultItemById(parsed.data.vaultItemId),
  ]);

  if (!agent || !vaultItem) {
    return {
      error: "Choose an existing agent and vault item.",
      success: "",
      permissionId: "",
    };
  }

  const permission = await createAgentPermissionBinding(parsed.data);

  await logAuditEvent({
    actorEmail: session.email,
    action: "agent.permission.bound",
    entityType: "permission-binding",
    entityId: permission.id,
    detail: `Bound ${permission.scope} permission to a vault reference.`,
  });

  revalidatePath("/workspace");
  revalidatePath("/workspace/agents");

  return {
    error: "",
    success: `${agent.name} can now ${permission.scope} ${vaultItem.label}.`,
    permissionId: permission.id,
  };
}

export async function launchAgentAction(
  _previousState: LaunchActionState,
  formData: FormData,
): Promise<LaunchActionState> {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "agent.launch",
    actorKey: session.email,
    limit: 80,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Agent launch is rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      runId: "",
      actionLogId: "",
    };
  }

  const parsed = launchAgentSchema.safeParse({
    agentId: formData.get("agentId"),
    task: formData.get("task"),
    launchMode: formData.get("launchMode"),
    maxSpendUsd: formData.get("maxSpendUsd"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to launch agent.",
      success: "",
      runId: "",
      actionLogId: "",
    };
  }

  const agent = await getAgentById(parsed.data.agentId);

  if (!agent) {
    return {
      error: "Choose an existing agent.",
      success: "",
      runId: "",
      actionLogId: "",
    };
  }

  const permissions = await listPermissionBindingsForAgent(agent.id);
  const riskyScopes = new Set(["send", "spend", "trade", "admin"]);
  const hasRiskyPermission = permissions.some(
    (permission) =>
      permission.requiresApproval || riskyScopes.has(permission.scope),
  );
  const requestedSpend =
    typeof parsed.data.maxSpendUsd === "number" ? parsed.data.maxSpendUsd : 0;
  const needsApproval =
    parsed.data.launchMode !== "dry-run" &&
    (hasRiskyPermission || requestedSpend > 0);
  const status = needsApproval ? "needs-approval" : "completed";
  const steps = [
    `Loaded ${agent.name} with ${agent.allowedTools.length} allowed tools.`,
    `Checked ${permissions.length} bound permission${permissions.length === 1 ? "" : "s"}.`,
    `Prepared a ${parsed.data.launchMode} task plan.`,
    needsApproval
      ? "Stopped before external execution because this launch touches a guarded permission."
      : "Completed the local launch planning pass without external side effects.",
  ];

  const run = await createAgentRun({
    agentId: agent.id,
    agentName: agent.name,
    task: parsed.data.task,
    launchMode: parsed.data.launchMode,
    status,
    maxSpendUsd: parsed.data.maxSpendUsd,
    summary: needsApproval
      ? "Launch prepared and waiting for operator approval before external execution."
      : "Launch completed as a local planning run with no external side effects.",
    steps,
  });

  const log = await createActionLog({
    agentId: agent.id,
    agentName: agent.name,
    scenario: "manual",
    actionType: "agent-launch",
    target: parsed.data.task.slice(0, 120),
    tool: "local-runner",
    amountUsd: parsed.data.maxSpendUsd,
    status: needsApproval ? "pending-approval" : "completed",
    summary: `Launched ${agent.name} in ${parsed.data.launchMode} mode.`,
    reasoning:
      "Agent Hub created a local run record and evaluated bound permissions before external execution.",
    policyHits: needsApproval
      ? ["Bound permission requires approval before external execution"]
      : [],
    source: "workspace",
    requestedBy: session.email,
    externalReferenceId: run.id,
    resultDetail: run.summary,
  });

  await updateAgentHeartbeat(agent.id);

  await logAuditEvent({
    actorEmail: session.email,
    action: "agent.launched",
    entityType: "agent-run",
    entityId: run.id,
    detail: "Created an agent run from the workspace launcher.",
  });

  revalidatePath("/workspace");
  revalidatePath("/workspace/agents");
  revalidatePath("/workspace/logs");

  return {
    error: "",
    success: needsApproval
      ? `${agent.name} is staged and waiting for approval before external execution.`
      : `${agent.name} completed a local launch run.`,
    runId: run.id,
    actionLogId: log.id,
  };
}

export async function simulateAgentRunAction(
  _previousState: SimulationActionState,
  formData: FormData,
): Promise<SimulationActionState> {
  const session = await requireSession();
  const rateLimit = await consumeRateLimit({
    scope: "simulation.run",
    actorKey: session.email,
    limit: 80,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: `Simulation is rate limited right now. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
      success: "",
      actionLogId: "",
      approvalRequestId: "",
    };
  }

  const parsed = simulateSchema.safeParse({
    agentId: formData.get("agentId"),
    scenario: formData.get("scenario"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to simulate run.",
      success: "",
      actionLogId: "",
      approvalRequestId: "",
    };
  }

  try {
    const result = await simulateAgentRun({
      agentId: parsed.data.agentId,
      scenario: parsed.data.scenario,
      actorEmail: session.email,
    });

    revalidatePath("/workspace");
    revalidatePath("/workspace/agents");
    revalidatePath("/workspace/logs");
    revalidatePath("/workspace/approvals");
    revalidatePath("/workspace/billing");

    return {
      error: "",
      success:
        result.log.status === "pending-approval"
          ? `${result.log.agentName} hit a review policy and created an approval request.`
          : `${result.log.agentName} created a ${result.log.status} action log.`,
      actionLogId: result.log.id,
      approvalRequestId: result.approval?.id ?? "",
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to simulate agent run.",
      success: "",
      actionLogId: "",
      approvalRequestId: "",
    };
  }
}
