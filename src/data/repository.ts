import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import {
  appendToCollection,
  mutateCollection,
  readCollection,
  sortNewestFirst,
} from "@/data/store";
import type {
  ActionLog,
  ActionLogStatus,
  ActionRequestSource,
  AgentLaunchMode,
  AgentPermissionBinding,
  AgentPermissionScope,
  AgentRuntimeAuthMethod,
  AgentRuntimeConnection,
  AgentRuntimeProvider,
  AgentRun,
  AgentRunStatus,
  AccessRequest,
  AccessRequestStatus,
  ApprovalRequest,
  ApprovalStatus,
  AuditEvent,
  BillingConfig,
  ModelUsageRecord,
  PolicyRule,
  RegisteredAgent,
  VaultItem,
  VaultItemKind,
  VaultRiskLevel,
} from "@/data/types";

function now() {
  return new Date().toISOString();
}

const REDACTED = "[redacted]";
const HIGH_RISK_SECRET_KINDS = new Set<VaultItemKind>([
  "wallet",
  "payment-card",
  "bank-reference",
]);

export function redactSensitiveText(value?: string | null) {
  if (!value) {
    return value ?? undefined;
  }

  return value
    .replace(
      /-----BEGIN[\s\S]{0,80}PRIVATE KEY-----[\s\S]*?-----END[\s\S]{0,80}PRIVATE KEY-----/g,
      REDACTED,
    )
    .replace(/\bsk-(?:proj-)?[A-Za-z0-9_-]{12,}\b/g, REDACTED)
    .replace(/\bsk-ant-[A-Za-z0-9_-]{12,}\b/g, REDACTED)
    .replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{12,}\b/g, REDACTED)
    .replace(/\bgithub_pat_[A-Za-z0-9_]{12,}\b/g, REDACTED)
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{12,}\b/g, REDACTED)
    .replace(/\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{12,}\b/g, REDACTED)
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, REDACTED)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/gi, `Bearer ${REDACTED}`)
    .replace(/(https?:\/\/)([^/\s:@]+):([^/\s@]+)@/gi, `$1${REDACTED}@`)
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, REDACTED)
    .replace(
      /\b(password|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*["']?[^"',;\s]{6,}/gi,
      `$1=${REDACTED}`,
    )
    .replace(
      /\b(seed phrase|recovery phrase|mnemonic)\s*[:=]\s*["']?[^"']{12,}/gi,
      `$1=${REDACTED}`,
    );
}

function sanitizeText(value?: string) {
  return redactSensitiveText(value)?.trim() || undefined;
}

function containsBlockedVaultSecret(kind: VaultItemKind, secret?: string) {
  const value = secret?.trim();

  if (!value) {
    return false;
  }

  if (HIGH_RISK_SECRET_KINDS.has(kind)) {
    return true;
  }

  return (
    /-----BEGIN[\s\S]{0,80}PRIVATE KEY-----/i.test(value) ||
    /\b(seed phrase|recovery phrase|mnemonic)\b/i.test(value)
  );
}

function assertVaultSecretAllowed(kind: VaultItemKind, secret?: string) {
  if (!containsBlockedVaultSecret(kind, secret)) {
    return;
  }

  throw new Error(
    "Agent Ledger does not store wallet private keys, seed phrases, bank credentials, or payment-card secrets. Store a reference only and use a guarded adapter.",
  );
}

function assertVaultMetadataAllowed(input: {
  kind: VaultItemKind;
  handle?: string;
  notes?: string;
}) {
  const combined = [input.handle, input.notes].filter(Boolean).join("\n");

  if (!containsBlockedVaultSecret(input.kind, combined)) {
    return;
  }

  throw new Error(
    "Agent Ledger only stores references for wallets, bank accounts, and payment cards. Put public handles, aliases, or adapter names here, not private credentials.",
  );
}

function getVaultEncryptionKey() {
  const configured =
    process.env.AGENT_LEDGER_VAULT_KEY?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    process.env.APP_ACCESS_CODE?.trim();

  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error(
      "Configure AGENT_LEDGER_VAULT_KEY before storing local vault secrets in production.",
    );
  }

  return createHash("sha256")
    .update(configured || "agent-ledger-local-dev-vault-key-change-me")
    .digest();
}

function encryptVaultSecret(secret?: string) {
  const value = secret?.trim();

  if (!value) {
    return undefined;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getVaultEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

function decryptVaultSecret(encryptedSecret?: string) {
  if (!encryptedSecret) {
    return null;
  }

  const [version, ivValue, tagValue, encryptedValue] = encryptedSecret.split(":");

  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Vault secret uses an unsupported encryption format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getVaultEncryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function maskVaultSecret(secret?: string) {
  const value = secret?.trim();

  if (!value) {
    return undefined;
  }

  return "stored";
}

function normalizeStripeMode(value: unknown): BillingConfig["stripeMode"] {
  return value === "test" || value === "live" ? value : "manual";
}

function normalizeBillingStatus(
  mode: BillingConfig["stripeMode"],
  value: unknown,
): BillingConfig["stripeSubscriptionStatus"] {
  switch (value) {
    case "checkout-required":
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "paused":
      return value;
    case "manual":
      return "manual";
    default:
      return mode === "manual" ? "manual" : "checkout-required";
  }
}

function normalizeBillingConfig(record?: Partial<BillingConfig> | null): BillingConfig {
  const stripeMode = normalizeStripeMode(record?.stripeMode);

  return {
    ...DEFAULT_BILLING_CONFIG,
    ...record,
    companyName: record?.companyName?.trim() || DEFAULT_BILLING_CONFIG.companyName,
    stripeMode,
    stripeSubscriptionStatus: normalizeBillingStatus(
      stripeMode,
      record?.stripeSubscriptionStatus,
    ),
    billingEmail:
      record?.billingEmail?.trim().toLowerCase() ||
      DEFAULT_BILLING_CONFIG.billingEmail,
    notes: record?.notes?.trim() || DEFAULT_BILLING_CONFIG.notes,
  };
}

export async function listAgents() {
  return sortNewestFirst(await readCollection<RegisteredAgent>("agents"));
}

export async function getAgentById(id: string) {
  const agents = await readCollection<RegisteredAgent>("agents");
  return agents.find((agent) => agent.id === id) ?? null;
}

export async function createAgent(input: {
  templateId?: string;
  runtimeConnectionId?: string;
  runtimeProvider?: AgentRuntimeProvider;
  runtimeLabel?: string;
  name: string;
  mission: string;
  model: string;
  autonomy: RegisteredAgent["autonomy"];
  operatingMode?: RegisteredAgent["operatingMode"];
  standingPrompt?: string;
  cadenceMinutes?: number;
  maxActionsPerDay?: number;
  maxEmailsPerDay?: number;
  requireApprovalForRiskyActions?: boolean;
  status?: RegisteredAgent["status"];
  ownerEmail: string;
  allowedTools: string[];
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
}) {
  const timestamp = now();
  const operatingMode = input.operatingMode ?? "autonomous";
  const agent: RegisteredAgent = {
    id: randomUUID(),
    templateId: input.templateId,
    runtimeConnectionId: input.runtimeConnectionId,
    runtimeProvider: input.runtimeProvider,
    runtimeLabel: input.runtimeLabel,
    name: input.name,
    mission: input.mission,
    model: input.model,
    autonomy: input.autonomy,
    operatingMode,
    standingPrompt: input.standingPrompt?.trim() || input.mission.trim(),
    cadenceMinutes: input.cadenceMinutes ?? 60,
    maxActionsPerDay: input.maxActionsPerDay ?? 25,
    maxEmailsPerDay: input.maxEmailsPerDay ?? 10,
    requireApprovalForRiskyActions:
      input.requireApprovalForRiskyActions ?? true,
    nextRunAt:
      operatingMode === "autonomous"
        ? new Date(Date.now() + (input.cadenceMinutes ?? 60) * 60 * 1000).toISOString()
        : undefined,
    status: input.status ?? "active",
    ownerEmail: input.ownerEmail.toLowerCase(),
    allowedTools: input.allowedTools.map((tool) => sanitizeText(tool) ?? "tool"),
    dailyBudgetUsd: input.dailyBudgetUsd,
    monthlyBudgetUsd: input.monthlyBudgetUsd,
    lastHeartbeatAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  agent.name = sanitizeText(agent.name) ?? "Agent";
  agent.mission = sanitizeText(agent.mission) ?? "No mission stored.";
  agent.model = sanitizeText(agent.model) ?? agent.model;
  agent.runtimeLabel = sanitizeText(agent.runtimeLabel);
  agent.standingPrompt = sanitizeText(agent.standingPrompt);

  return appendToCollection("agents", agent);
}

export async function listAgentRuntimeConnections() {
  return sortNewestFirst(
    await readCollection<AgentRuntimeConnection>("runtime-connections"),
  );
}

export async function getAgentRuntimeConnectionById(id: string) {
  const connections = await readCollection<AgentRuntimeConnection>(
    "runtime-connections",
  );
  return connections.find((connection) => connection.id === id) ?? null;
}

export async function createAgentRuntimeConnection(input: {
  label: string;
  provider: AgentRuntimeProvider;
  authMethod: AgentRuntimeAuthMethod;
  status: AgentRuntimeConnection["status"];
  vaultItemId?: string;
  tokenVaultItemId?: string;
  endpointUrl?: string;
  oauthAuthorizeUrl?: string;
  oauthTokenUrl?: string;
  oauthClientId?: string;
  oauthScopes?: string;
  oauthConnectedAt?: string;
  oauthExpiresAt?: string;
  notes?: string;
}) {
  const timestamp = now();
  const connection: AgentRuntimeConnection = {
    id: randomUUID(),
    label: sanitizeText(input.label) ?? "Runtime connection",
    provider: input.provider,
    authMethod: input.authMethod,
    status: input.status,
    vaultItemId: input.vaultItemId,
    tokenVaultItemId: input.tokenVaultItemId,
    endpointUrl: sanitizeText(input.endpointUrl),
    oauthAuthorizeUrl: sanitizeText(input.oauthAuthorizeUrl),
    oauthTokenUrl: sanitizeText(input.oauthTokenUrl),
    oauthClientId: sanitizeText(input.oauthClientId),
    oauthScopes: sanitizeText(input.oauthScopes),
    oauthConnectedAt: input.oauthConnectedAt,
    oauthExpiresAt: input.oauthExpiresAt,
    notes: sanitizeText(input.notes),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return appendToCollection("runtime-connections", connection);
}

export async function updateAgentRuntimeConnection(input: {
  id: string;
  status?: AgentRuntimeConnection["status"];
  vaultItemId?: string;
  tokenVaultItemId?: string;
  endpointUrl?: string;
  oauthAuthorizeUrl?: string;
  oauthTokenUrl?: string;
  oauthClientId?: string;
  oauthScopes?: string;
  oauthConnectedAt?: string;
  oauthExpiresAt?: string;
  notes?: string;
}) {
  return mutateCollection<AgentRuntimeConnection, AgentRuntimeConnection | null>(
    "runtime-connections",
    (connections) => {
      const timestamp = now();
      const next = connections.map((connection) =>
        connection.id === input.id
          ? {
              ...connection,
              ...(input.status ? { status: input.status } : {}),
              ...(input.vaultItemId ? { vaultItemId: input.vaultItemId } : {}),
              ...(input.tokenVaultItemId
                ? { tokenVaultItemId: input.tokenVaultItemId }
                : {}),
              ...(input.endpointUrl
                ? { endpointUrl: sanitizeText(input.endpointUrl) }
                : {}),
              ...(input.oauthAuthorizeUrl
                ? { oauthAuthorizeUrl: sanitizeText(input.oauthAuthorizeUrl) }
                : {}),
              ...(input.oauthTokenUrl
                ? { oauthTokenUrl: sanitizeText(input.oauthTokenUrl) }
                : {}),
              ...(input.oauthClientId
                ? { oauthClientId: sanitizeText(input.oauthClientId) }
                : {}),
              ...(input.oauthScopes
                ? { oauthScopes: sanitizeText(input.oauthScopes) }
                : {}),
              ...(input.oauthConnectedAt
                ? { oauthConnectedAt: input.oauthConnectedAt }
                : {}),
              ...(input.oauthExpiresAt
                ? { oauthExpiresAt: input.oauthExpiresAt }
                : {}),
              ...(input.notes ? { notes: sanitizeText(input.notes) } : {}),
              updatedAt: timestamp,
            }
          : connection,
      );

      return {
        next,
        result: next.find((connection) => connection.id === input.id) ?? null,
      };
    },
  );
}

export async function updateAgentAutomation(input: {
  agentId: string;
  operatingMode: RegisteredAgent["operatingMode"];
  standingPrompt: string;
  cadenceMinutes: number;
  maxActionsPerDay: number;
  maxEmailsPerDay: number;
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  requireApprovalForRiskyActions: boolean;
}) {
  return mutateCollection<RegisteredAgent, RegisteredAgent | null>(
    "agents",
    (agents) => {
      const timestamp = now();
      const next = agents.map((agent) => {
        if (agent.id !== input.agentId) {
          return agent;
        }

        const nextRunAt =
          input.operatingMode === "autonomous"
            ? agent.nextRunAt ??
              new Date(Date.now() + input.cadenceMinutes * 60 * 1000).toISOString()
            : undefined;

        return {
          ...agent,
          operatingMode: input.operatingMode,
          standingPrompt: sanitizeText(input.standingPrompt) ?? "",
          cadenceMinutes: input.cadenceMinutes,
          maxActionsPerDay: input.maxActionsPerDay,
          maxEmailsPerDay: input.maxEmailsPerDay,
          dailyBudgetUsd: input.dailyBudgetUsd,
          monthlyBudgetUsd: input.monthlyBudgetUsd,
          requireApprovalForRiskyActions: input.requireApprovalForRiskyActions,
          nextRunAt,
          updatedAt: timestamp,
        };
      });

      return {
        next,
        result: next.find((agent) => agent.id === input.agentId) ?? null,
      };
    },
  );
}

export async function updateAgentAutonomousSchedule(input: {
  agentId: string;
  lastAutonomousRunAt: string;
  nextRunAt?: string;
}) {
  return mutateCollection<RegisteredAgent, RegisteredAgent | null>(
    "agents",
    (agents) => {
      const timestamp = now();
      const next = agents.map((agent) =>
        agent.id === input.agentId
          ? {
              ...agent,
              lastAutonomousRunAt: input.lastAutonomousRunAt,
              nextRunAt: input.nextRunAt,
              lastHeartbeatAt: timestamp,
              updatedAt: timestamp,
            }
          : agent,
      );

      return {
        next,
        result: next.find((agent) => agent.id === input.agentId) ?? null,
      };
    },
  );
}

export async function listVaultItems() {
  return sortNewestFirst(await readCollection<VaultItem>("vault-items"));
}

export async function getVaultItemById(id: string) {
  const items = await readCollection<VaultItem>("vault-items");
  return items.find((item) => item.id === id) ?? null;
}

export async function getVaultItemSecret(id: string) {
  const item = await getVaultItemById(id);

  if (!item) {
    return null;
  }

  return decryptVaultSecret(item.encryptedSecret);
}

export async function createVaultItem(input: {
  label: string;
  kind: VaultItemKind;
  provider?: string;
  handle?: string;
  secretValue?: string;
  riskLevel: VaultRiskLevel;
  notes?: string;
}) {
  assertVaultSecretAllowed(input.kind, input.secretValue);
  assertVaultMetadataAllowed(input);

  const timestamp = now();
  const encryptedSecret = encryptVaultSecret(input.secretValue);
  const item: VaultItem = {
    id: randomUUID(),
    label: sanitizeText(input.label) ?? "Vault item",
    kind: input.kind,
    provider: sanitizeText(input.provider),
    handle: sanitizeText(input.handle),
    maskedSecret: maskVaultSecret(input.secretValue),
    encryptedSecret,
    hasSecret: Boolean(encryptedSecret),
    riskLevel: input.riskLevel,
    notes: sanitizeText(input.notes),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return appendToCollection("vault-items", item);
}

export async function listAgentPermissionBindings() {
  return sortNewestFirst(
    await readCollection<AgentPermissionBinding>("agent-permissions"),
  );
}

export async function listPermissionBindingsForAgent(agentId: string) {
  const permissions = await listAgentPermissionBindings();
  return permissions.filter((permission) => permission.agentId === agentId);
}

export async function createAgentPermissionBinding(input: {
  agentId: string;
  vaultItemId: string;
  scope: AgentPermissionScope;
  requiresApproval: boolean;
  dailyLimitUsd?: number;
  notes?: string;
}) {
  const permission: AgentPermissionBinding = {
    id: randomUUID(),
    agentId: input.agentId,
    vaultItemId: input.vaultItemId,
    scope: input.scope,
    requiresApproval: input.requiresApproval,
    dailyLimitUsd: input.dailyLimitUsd,
    notes: sanitizeText(input.notes),
    createdAt: now(),
  };

  return appendToCollection("agent-permissions", permission);
}

export async function listAgentRuns(limit?: number) {
  const runs = sortNewestFirst(await readCollection<AgentRun>("agent-runs"));
  return typeof limit === "number" ? runs.slice(0, limit) : runs;
}

export async function getAgentRunById(id: string) {
  const runs = await readCollection<AgentRun>("agent-runs");
  return runs.find((run) => run.id === id) ?? null;
}

export async function listAgentRunsByStatus(
  status: AgentRunStatus,
  limit?: number,
) {
  const runs = sortNewestFirst(await readCollection<AgentRun>("agent-runs")).filter(
    (run) => run.status === status,
  );
  return typeof limit === "number" ? runs.slice(0, limit) : runs;
}

export async function createAgentRun(input: {
  agentId: string;
  agentName: string;
  task: string;
  launchMode: AgentLaunchMode;
  status: AgentRunStatus;
  maxSpendUsd?: number;
  summary: string;
  steps: string[];
}) {
  const completedAt =
    input.status === "completed" || input.status === "failed" ? now() : undefined;
  const run: AgentRun = {
    id: randomUUID(),
    agentId: input.agentId,
    agentName: input.agentName,
    task: sanitizeText(input.task) ?? "Task redacted.",
    launchMode: input.launchMode,
    status: input.status,
    maxSpendUsd: input.maxSpendUsd,
    summary: sanitizeText(input.summary) ?? "Summary redacted.",
    steps: input.steps.map((step) => sanitizeText(step) ?? "Step redacted."),
    createdAt: now(),
    completedAt,
  };

  return appendToCollection("agent-runs", run);
}

export async function updateAgentRun(input: {
  id: string;
  status: AgentRunStatus;
  summary?: string;
  steps?: string[];
}) {
  return mutateCollection<AgentRun, AgentRun | null>("agent-runs", (runs) => {
    const timestamp = now();
    const next = runs.map((run) =>
      run.id === input.id
        ? {
            ...run,
            status: input.status,
            ...(input.summary ? { summary: sanitizeText(input.summary) } : {}),
            ...(input.steps
              ? { steps: input.steps.map((step) => sanitizeText(step) ?? "Step redacted.") }
              : {}),
            ...(input.status === "completed" || input.status === "failed"
              ? { completedAt: timestamp }
              : { completedAt: undefined }),
          }
        : run,
    );

    return {
      next,
      result: next.find((run) => run.id === input.id) ?? null,
    };
  });
}

export async function updateAgentHeartbeat(id: string) {
  return mutateCollection<RegisteredAgent, RegisteredAgent | null>(
    "agents",
    (agents) => {
      const timestamp = now();
      const next = agents.map((agent) =>
        agent.id === id
          ? { ...agent, lastHeartbeatAt: timestamp, updatedAt: timestamp }
          : agent,
      );

      return {
        next,
        result: next.find((agent) => agent.id === id) ?? null,
      };
    },
  );
}

export async function listPolicies() {
  return sortNewestFirst(await readCollection<PolicyRule>("policies"));
}

export async function createPolicy(input: {
  name: string;
  category: PolicyRule["category"];
  enforcement: PolicyRule["enforcement"];
  thresholdUsd?: number;
  appliesTo: string[];
  description: string;
  enabled?: boolean;
}) {
  const timestamp = now();
  const policy: PolicyRule = {
    id: randomUUID(),
    name: sanitizeText(input.name) ?? "Policy",
    category: input.category,
    enforcement: input.enforcement,
    thresholdUsd: input.thresholdUsd,
    appliesTo: input.appliesTo.map((item) => sanitizeText(item) ?? "all agents"),
    description: sanitizeText(input.description) ?? "Policy description redacted.",
    enabled: input.enabled ?? true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return appendToCollection("policies", policy);
}

export async function listActionLogs() {
  return sortNewestFirst(await readCollection<ActionLog>("action-logs"));
}

export async function getActionLogById(id: string) {
  const logs = await readCollection<ActionLog>("action-logs");
  return logs.find((log) => log.id === id) ?? null;
}

export async function createActionLog(input: {
  agentId: string;
  agentName: string;
  scenario: ActionLog["scenario"];
  actionType: string;
  target: string;
  tool: string;
  vendor?: string;
  amountUsd?: number;
  status: ActionLogStatus;
  summary: string;
  reasoning: string;
  policyHits: string[];
  source?: ActionRequestSource;
  requestedBy?: string;
  externalReferenceId?: string;
  resultDetail?: string;
}) {
  const log: ActionLog = {
    id: randomUUID(),
    agentId: input.agentId,
    agentName: input.agentName,
    scenario: input.scenario,
    actionType: sanitizeText(input.actionType) ?? "action",
    target: sanitizeText(input.target) ?? "target redacted",
    tool: sanitizeText(input.tool) ?? "tool",
    vendor: sanitizeText(input.vendor),
    amountUsd: input.amountUsd,
    status: input.status,
    summary: sanitizeText(input.summary) ?? "Summary redacted.",
    reasoning: sanitizeText(input.reasoning) ?? "Reasoning redacted.",
    policyHits: input.policyHits.map((hit) => sanitizeText(hit) ?? "Policy hit redacted."),
    source: input.source,
    requestedBy: sanitizeText(input.requestedBy),
    externalReferenceId: sanitizeText(input.externalReferenceId),
    resultDetail: sanitizeText(input.resultDetail),
    createdAt: now(),
  };

  return appendToCollection("action-logs", log);
}

export async function updateActionLog(input: {
  id: string;
  status?: ActionLogStatus;
  approvalRequestId?: string;
  externalReferenceId?: string | null;
  resultDetail?: string | null;
}) {
  return mutateCollection<ActionLog, ActionLog | null>("action-logs", (logs) => {
    const next = logs.map((log) =>
      log.id === input.id
        ? {
            ...log,
            ...(input.status ? { status: input.status } : {}),
            ...(input.approvalRequestId
              ? { approvalRequestId: input.approvalRequestId }
              : {}),
            ...("externalReferenceId" in input
              ? { externalReferenceId: sanitizeText(input.externalReferenceId || undefined) }
              : {}),
            ...("resultDetail" in input
              ? { resultDetail: sanitizeText(input.resultDetail || undefined) }
              : {}),
          }
        : log,
    );

    return {
      next,
      result: next.find((log) => log.id === input.id) ?? null,
    };
  });
}

export async function listApprovals() {
  return sortNewestFirst(await readCollection<ApprovalRequest>("approvals"));
}

export async function getApprovalById(id: string) {
  const approvals = await readCollection<ApprovalRequest>("approvals");
  return approvals.find((approval) => approval.id === id) ?? null;
}

export async function createApprovalRequest(input: {
  actionLogId: string;
  agentId: string;
  agentName: string;
  title: string;
  requestedAction: string;
  target: string;
  amountUsd?: number;
  policyReason: string;
  justification: string;
}) {
  const approval: ApprovalRequest = {
    id: randomUUID(),
    actionLogId: input.actionLogId,
    agentId: input.agentId,
    agentName: input.agentName,
    title: sanitizeText(input.title) ?? "Approval request",
    requestedAction: sanitizeText(input.requestedAction) ?? "action",
    target: sanitizeText(input.target) ?? "target redacted",
    amountUsd: input.amountUsd,
    policyReason: sanitizeText(input.policyReason) ?? "Policy reason redacted.",
    justification: sanitizeText(input.justification) ?? "Justification redacted.",
    status: "pending",
    createdAt: now(),
  };

  return appendToCollection("approvals", approval);
}

export async function updateApprovalDecision(input: {
  id: string;
  status: ApprovalStatus;
  decidedBy: string;
  decisionNote?: string;
}) {
  return mutateCollection<ApprovalRequest, ApprovalRequest | null>(
    "approvals",
    (approvals) => {
      const timestamp = now();
      const next = approvals.map((approval) =>
        approval.id === input.id
          ? {
              ...approval,
              status: input.status,
              decidedAt: timestamp,
              decidedBy: input.decidedBy.toLowerCase(),
              decisionNote: sanitizeText(input.decisionNote),
            }
          : approval,
      );

      return {
        next,
        result: next.find((approval) => approval.id === input.id) ?? null,
      };
    },
  );
}

export async function listAccessRequests() {
  return sortNewestFirst(await readCollection<AccessRequest>("access-requests"));
}

export async function createAccessRequest(input: {
  contactName: string;
  email: string;
  companyName: string;
  companyUrl?: string;
  teamSize: AccessRequest["teamSize"];
  currentAgentStack: string;
  desiredLaunchWindow: AccessRequest["desiredLaunchWindow"];
  notes: string;
}) {
  const timestamp = now();
  const request: AccessRequest = {
    id: randomUUID(),
    contactName: sanitizeText(input.contactName) ?? "Contact",
    email: input.email.toLowerCase(),
    companyName: sanitizeText(input.companyName) ?? "Company",
    companyUrl: sanitizeText(input.companyUrl),
    teamSize: input.teamSize,
    currentAgentStack: sanitizeText(input.currentAgentStack) ?? "",
    desiredLaunchWindow: input.desiredLaunchWindow,
    notes: sanitizeText(input.notes) ?? "",
    status: "new",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return appendToCollection("access-requests", request);
}

export async function updateAccessRequestStatus(input: {
  id: string;
  status: AccessRequestStatus;
}) {
  return mutateCollection<AccessRequest, AccessRequest | null>(
    "access-requests",
    (requests) => {
      const timestamp = now();
      const next = requests.map((request) =>
        request.id === input.id
          ? {
              ...request,
              status: input.status,
              updatedAt: timestamp,
            }
          : request,
      );

      return {
        next,
        result: next.find((request) => request.id === input.id) ?? null,
      };
    },
  );
}

const DEFAULT_BILLING_CONFIG: BillingConfig = {
  id: "default",
  companyName: "Agent Ledger",
  plan: "growth",
  stripeMode: "manual",
  stripeSubscriptionStatus: "manual",
  billingEmail: "finance@agentledger.ai",
  baseFeeUsd: 399,
  perAgentUsd: 49,
  perThousandActionsUsd: 12,
  notes:
    "Enterprise billing can stay manual during procurement, or switch to Stripe test/live for subscription management and webhooks.",
  updatedAt: new Date().toISOString(),
};

export async function getBillingConfig() {
  const records = await readCollection<BillingConfig>("billing-config");
  return normalizeBillingConfig(records[0]);
}

export async function upsertBillingConfig(input: {
  companyName: string;
  plan: BillingConfig["plan"];
  stripeMode: BillingConfig["stripeMode"];
  stripePriceId?: string;
  billingEmail: string;
  baseFeeUsd: number;
  perAgentUsd: number;
  perThousandActionsUsd: number;
  notes: string;
}) {
  return mutateCollection<BillingConfig, BillingConfig>("billing-config", (records) => {
    const existing = normalizeBillingConfig(records[0]);
    const record: BillingConfig = {
      ...existing,
      id: "default",
      companyName: sanitizeText(input.companyName) ?? "Agent Ledger",
      plan: input.plan,
      stripeMode: input.stripeMode,
      stripePriceId: sanitizeText(input.stripePriceId),
      stripeSubscriptionStatus:
        input.stripeMode === "manual"
          ? "manual"
          : existing.stripeSubscriptionStatus === "manual"
            ? "checkout-required"
            : existing.stripeSubscriptionStatus,
      billingEmail: input.billingEmail.toLowerCase(),
      baseFeeUsd: input.baseFeeUsd,
      perAgentUsd: input.perAgentUsd,
      perThousandActionsUsd: input.perThousandActionsUsd,
      notes: sanitizeText(input.notes) ?? "",
      updatedAt: now(),
    };

    return {
      next: [record],
      result: record,
    };
  });
}

export async function updateBillingStripeState(input: {
  stripePriceId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeSubscriptionStatus?: BillingConfig["stripeSubscriptionStatus"];
  stripeSubscriptionAmountUsd?: number | null;
  stripeCurrentPeriodEnd?: string | null;
  lastSyncedAt?: string;
}) {
  return mutateCollection<BillingConfig, BillingConfig>("billing-config", (records) => {
    const existing = normalizeBillingConfig(records[0]);
    const record: BillingConfig = {
      ...existing,
      updatedAt: now(),
      lastSyncedAt: input.lastSyncedAt ?? now(),
    };

    if ("stripePriceId" in input) {
      record.stripePriceId = input.stripePriceId || undefined;
    }

    if ("stripeCustomerId" in input) {
      record.stripeCustomerId = input.stripeCustomerId || undefined;
    }

    if ("stripeSubscriptionId" in input) {
      record.stripeSubscriptionId = input.stripeSubscriptionId || undefined;
    }

    if ("stripeSubscriptionStatus" in input && input.stripeSubscriptionStatus) {
      record.stripeSubscriptionStatus = input.stripeSubscriptionStatus;
    }

    if ("stripeSubscriptionAmountUsd" in input) {
      record.stripeSubscriptionAmountUsd =
        typeof input.stripeSubscriptionAmountUsd === "number"
          ? input.stripeSubscriptionAmountUsd
          : undefined;
    }

    if ("stripeCurrentPeriodEnd" in input) {
      record.stripeCurrentPeriodEnd = input.stripeCurrentPeriodEnd || undefined;
    }

    return {
      next: [record],
      result: record,
    };
  });
}

export async function listAuditEvents(limit?: number) {
  const events = sortNewestFirst(await readCollection<AuditEvent>("audit-events"));
  return typeof limit === "number" ? events.slice(0, limit) : events;
}

export async function listModelUsageRecords(limit?: number) {
  const records = sortNewestFirst(
    await readCollection<ModelUsageRecord>("model-usage"),
  );
  return typeof limit === "number" ? records.slice(0, limit) : records;
}

export async function createModelUsageRecord(input: {
  provider: ModelUsageRecord["provider"];
  runtimeLabel: string;
  source: ModelUsageRecord["source"];
  amountUsd: number;
  agentId?: string;
  agentName?: string;
  runId?: string;
  detail: string;
}) {
  const record: ModelUsageRecord = {
    id: randomUUID(),
    provider: input.provider,
    runtimeLabel: sanitizeText(input.runtimeLabel) ?? "Runtime",
    source: input.source,
    amountUsd: Math.max(0, input.amountUsd),
    agentId: input.agentId,
    agentName: sanitizeText(input.agentName),
    runId: input.runId,
    detail: sanitizeText(input.detail) ?? "Model usage recorded.",
    createdAt: now(),
  };

  return appendToCollection("model-usage", record);
}

export async function logAuditEvent(input: {
  actorEmail: string;
  action: string;
  entityType: AuditEvent["entityType"];
  entityId: string;
  detail: string;
}) {
  const event: AuditEvent = {
    id: randomUUID(),
    actorEmail: input.actorEmail.toLowerCase(),
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    detail: sanitizeText(input.detail) ?? "Event detail redacted.",
    createdAt: now(),
  };

  return appendToCollection("audit-events", event);
}
