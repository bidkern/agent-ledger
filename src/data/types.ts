export type AgentStatus = "active" | "paused" | "attention";

export type AgentAutonomy = "suggest" | "execute" | "autopilot";

export type AgentOperatingMode = "manual" | "autonomous";

export type AuthStrategy = "access-code" | "oidc";

export type RegisteredAgent = {
  id: string;
  templateId?: string;
  runtimeConnectionId?: string;
  runtimeProvider?: AgentRuntimeProvider;
  runtimeLabel?: string;
  name: string;
  mission: string;
  model: string;
  autonomy: AgentAutonomy;
  operatingMode?: AgentOperatingMode;
  standingPrompt?: string;
  cadenceMinutes?: number;
  maxActionsPerDay?: number;
  maxEmailsPerDay?: number;
  requireApprovalForRiskyActions?: boolean;
  lastAutonomousRunAt?: string;
  nextRunAt?: string;
  status: AgentStatus;
  ownerEmail: string;
  allowedTools: string[];
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  lastHeartbeatAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AgentRuntimeProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "mistral"
  | "perplexity"
  | "github"
  | "microsoft"
  | "slack"
  | "notion"
  | "local-mcp"
  | "browser-agent"
  | "custom";

export type AgentRuntimeAuthMethod =
  | "api-key"
  | "oauth"
  | "mcp"
  | "local-app"
  | "custom";

export type AgentRuntimeStatus =
  | "connected"
  | "oauth-connected"
  | "needs-secret"
  | "oauth-ready"
  | "bridge-ready"
  | "needs-setup";

export type AgentRuntimeConnection = {
  id: string;
  label: string;
  provider: AgentRuntimeProvider;
  authMethod: AgentRuntimeAuthMethod;
  status: AgentRuntimeStatus;
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
  createdAt: string;
  updatedAt: string;
};

export type AgentTemplateCategory =
  | "operations"
  | "research"
  | "communications"
  | "finance"
  | "commerce"
  | "engineering"
  | "custom";

export type AgentTemplate = {
  id: string;
  name: string;
  category: AgentTemplateCategory;
  description: string;
  defaultMission: string;
  defaultModel: string;
  defaultAutonomy: AgentAutonomy;
  defaultTools: string[];
  defaultDailyBudgetUsd: number;
  defaultMonthlyBudgetUsd: number;
  recommendedVaultKinds: VaultItemKind[];
  starterTask: string;
  riskNote: string;
};

export type VaultItemKind =
  | "email"
  | "payment-card"
  | "bank-reference"
  | "wallet"
  | "api-key"
  | "file-folder"
  | "browser-profile"
  | "environment"
  | "custom";

export type VaultRiskLevel = "low" | "medium" | "high";

export type VaultItem = {
  id: string;
  label: string;
  kind: VaultItemKind;
  provider?: string;
  handle?: string;
  maskedSecret?: string;
  encryptedSecret?: string;
  hasSecret: boolean;
  riskLevel: VaultRiskLevel;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type AgentPermissionScope =
  | "read"
  | "draft"
  | "send"
  | "spend"
  | "trade"
  | "admin"
  | "use";

export type AgentPermissionBinding = {
  id: string;
  agentId: string;
  vaultItemId: string;
  scope: AgentPermissionScope;
  requiresApproval: boolean;
  dailyLimitUsd?: number;
  notes?: string;
  createdAt: string;
};

export type AgentRunStatus =
  | "queued"
  | "running"
  | "needs-approval"
  | "completed"
  | "failed"
  | "paused";

export type AgentLaunchMode = "dry-run" | "supervised" | "autopilot";

export type AgentRun = {
  id: string;
  agentId: string;
  agentName: string;
  task: string;
  launchMode: AgentLaunchMode;
  status: AgentRunStatus;
  maxSpendUsd?: number;
  summary: string;
  steps: string[];
  createdAt: string;
  completedAt?: string;
};

export type PolicyCategory =
  | "spend"
  | "tool"
  | "vendor"
  | "data"
  | "approval";

export type PolicyEnforcement = "block" | "review" | "log";

export type PolicyRule = {
  id: string;
  name: string;
  category: PolicyCategory;
  enforcement: PolicyEnforcement;
  thresholdUsd?: number;
  appliesTo: string[];
  description: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SimulationScenario =
  | "software-purchase"
  | "customer-refund"
  | "data-export"
  | "vendor-signup"
  | "campaign-launch"
  | "unapproved-tool";

export type ActionLogStatus =
  | "allowed"
  | "completed"
  | "blocked"
  | "pending-approval"
  | "approved"
  | "rejected"
  | "failed";

export type ActionRequestSource =
  | "workspace"
  | "simulation"
  | "api"
  | "mcp"
  | "stripe-adapter";

export type ActionLog = {
  id: string;
  agentId: string;
  agentName: string;
  scenario: SimulationScenario | "manual";
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
  approvalRequestId?: string;
  externalReferenceId?: string;
  resultDetail?: string;
  createdAt: string;
};

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ApprovalRequest = {
  id: string;
  actionLogId: string;
  agentId: string;
  agentName: string;
  title: string;
  requestedAction: string;
  target: string;
  amountUsd?: number;
  policyReason: string;
  justification: string;
  status: ApprovalStatus;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
};

export type BillingPlan = "starter" | "team" | "growth" | "enterprise";

export type StripeMode = "manual" | "test" | "live";

export type BillingStatus =
  | "manual"
  | "checkout-required"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type BillingConfig = {
  id: string;
  companyName: string;
  plan: BillingPlan;
  stripeMode: StripeMode;
  stripePriceId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionStatus: BillingStatus;
  stripeSubscriptionAmountUsd?: number;
  stripeCurrentPeriodEnd?: string;
  billingEmail: string;
  baseFeeUsd: number;
  perAgentUsd: number;
  perThousandActionsUsd: number;
  notes: string;
  updatedAt: string;
  lastSyncedAt?: string;
};

export type AccessRequestStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "declined";

export type AccessRequest = {
  id: string;
  contactName: string;
  email: string;
  companyName: string;
  companyUrl?: string;
  teamSize: "1-5" | "6-20" | "21-50" | "51+";
  currentAgentStack: string;
  desiredLaunchWindow: "immediately" | "this-quarter" | "next-quarter" | "exploring";
  notes: string;
  status: AccessRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type AuditEntityType =
  | "agent"
  | "agent-run"
  | "runtime-connection"
  | "policy"
  | "action-log"
  | "approval"
  | "billing"
  | "auth"
  | "export"
  | "demo"
  | "vault-item"
  | "permission-binding"
  | "access-request";

export type AuditEvent = {
  id: string;
  actorEmail: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  detail: string;
  createdAt: string;
};

export type RateLimitScope =
  | "login"
  | "public.access-request"
  | "agent.create"
  | "policy.create"
  | "simulation.run"
  | "vault.create"
  | "vault.connection.test"
  | "runtime.connection.create"
  | "agent.permission.bind"
  | "agent.launch"
  | "agent.automation.update"
  | "agent.worker.run"
  | "service.autonomous.tick"
  | "approval.decide"
  | "access-request.update"
  | "billing.update"
  | "billing.checkout"
  | "billing.portal"
  | "billing.sync"
  | "service.actions.propose"
  | "service.actions.result"
  | "service.agent-runs.read"
  | "service.agent-runs.result"
  | "service.approvals.read"
  | "service.stripe.refund"
  | "mcp.call"
  | "demo.seed"
  | "private.export";

export type RateLimitRecord = {
  key: string;
  scope: RateLimitScope;
  count: number;
  windowStartedAt: string;
  updatedAt: string;
};

export type ModelUsageRecord = {
  id: string;
  provider: "openai" | "anthropic" | "local" | "custom";
  runtimeLabel: string;
  source: "local-cli" | "api" | "vault" | "environment";
  amountUsd: number;
  agentId?: string;
  agentName?: string;
  runId?: string;
  detail: string;
  createdAt: string;
};
