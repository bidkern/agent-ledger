import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
const reset = process.argv.includes("--reset");

const collectionFiles = {
  agents: "agents.json",
  "agent-runs": "agent-runs.json",
  "runtime-connections": "runtime-connections.json",
  "agent-permissions": "agent-permissions.json",
  "vault-items": "vault-items.json",
  policies: "policies.json",
  "action-logs": "action-logs.json",
  approvals: "approvals.json",
  "access-requests": "access-requests.json",
  "billing-config": "billing-config.json",
  "audit-events": "audit-events.json",
  "rate-limits": "rate-limits.json",
};

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

function getDataDirectory() {
  const configured = process.env.DATA_DIR?.trim();
  return configured && configured.length > 0
    ? path.resolve(cwd, configured.replace(/[\\/]+$/, ""))
    : path.resolve(cwd, ".agentledger-data");
}

async function readCollection(target) {
  try {
    const raw = await readFile(target, "utf8");
    return raw.trim() ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function hasExistingData(dataDir) {
  for (const filename of Object.values(collectionFiles)) {
    const target = path.join(dataDir, filename);
    const records = await readCollection(target);

    if (Array.isArray(records) && records.length > 0) {
      return true;
    }
  }

  return false;
}

function createTimeline() {
  const anchor = Date.now();

  return {
    hoursAgo(hours) {
      return new Date(anchor - hours * 60 * 60 * 1000).toISOString();
    },
    minutesAgo(minutes) {
      return new Date(anchor - minutes * 60 * 1000).toISOString();
    },
    now() {
      return new Date(anchor).toISOString();
    },
  };
}

function buildDemoDataset() {
  const time = createTimeline();

  const revenueAgentId = randomUUID();
  const researchAgentId = randomUUID();
  const financeAgentId = randomUUID();
  const followUpAgentId = randomUUID();

  const completedLogId = randomUUID();
  const blockedLogId = randomUUID();
  const approvalLogOneId = randomUUID();
  const approvalLogTwoId = randomUUID();
  const approvalLogThreeId = randomUUID();
  const launchLogId = randomUUID();

  const approvalOneId = randomUUID();
  const approvalTwoId = randomUUID();
  const approvalThreeId = randomUUID();

  const accessRequestOneId = randomUUID();
  const accessRequestTwoId = randomUUID();
  const accessRequestThreeId = randomUUID();

  const inboxVaultId = randomUUID();
  const cardVaultId = randomUUID();
  const crmVaultId = randomUUID();
  const folderVaultId = randomUUID();
  const browserVaultId = randomUUID();

  const financeRunId = randomUUID();
  const researchRunId = randomUUID();

  const agents = [
    {
      id: revenueAgentId,
      templateId: "operator-generalist",
      name: "Revenue Agent",
      mission:
        "Own outbound experiments, renewals, and follow-up actions that directly affect revenue throughput.",
      model: "gpt-5.4-mini",
      autonomy: "execute",
      operatingMode: "autonomous",
      standingPrompt:
        "Every hour, review revenue follow-ups, draft high-priority replies, and propose only the actions that stay inside customer-defined limits.",
      cadenceMinutes: 60,
      maxActionsPerDay: 30,
      maxEmailsPerDay: 12,
      requireApprovalForRiskyActions: true,
      lastAutonomousRunAt: time.minutesAgo(78),
      nextRunAt: time.minutesAgo(8),
      status: "active",
      ownerEmail: "ops@agentledger.ai",
      allowedTools: ["gmail", "hubspot", "stripe", "calendar", "browser"],
      dailyBudgetUsd: 300,
      monthlyBudgetUsd: 3000,
      lastHeartbeatAt: time.minutesAgo(18),
      createdAt: time.hoursAgo(14),
      updatedAt: time.minutesAgo(18),
    },
    {
      id: researchAgentId,
      templateId: "research-agent",
      name: "Research Agent",
      mission:
        "Find leads, vendor options, and market intelligence while keeping source quality and compliance visible.",
      model: "gpt-5.4-mini",
      autonomy: "autopilot",
      operatingMode: "autonomous",
      standingPrompt:
        "Every two hours, gather public market research, summarize useful findings, and save only source-backed notes.",
      cadenceMinutes: 120,
      maxActionsPerDay: 40,
      maxEmailsPerDay: 0,
      requireApprovalForRiskyActions: false,
      lastAutonomousRunAt: time.minutesAgo(151),
      nextRunAt: time.minutesAgo(31),
      status: "active",
      ownerEmail: "research@agentledger.ai",
      allowedTools: ["browser", "apollo", "hubspot", "notion"],
      dailyBudgetUsd: 150,
      monthlyBudgetUsd: 1800,
      lastHeartbeatAt: time.minutesAgo(31),
      createdAt: time.hoursAgo(14),
      updatedAt: time.minutesAgo(31),
    },
    {
      id: financeAgentId,
      templateId: "finance-ops-agent",
      name: "Finance Agent",
      mission:
        "Monitor refunds, vendor spend, and billing exceptions so money-moving actions stay within policy.",
      model: "gpt-5.4-mini",
      autonomy: "execute",
      operatingMode: "autonomous",
      standingPrompt:
        "Every 30 minutes, inspect billing exceptions and refund candidates. Do not move money unless policy allows it or approval is granted.",
      cadenceMinutes: 30,
      maxActionsPerDay: 20,
      maxEmailsPerDay: 2,
      requireApprovalForRiskyActions: true,
      lastAutonomousRunAt: time.minutesAgo(42),
      nextRunAt: time.minutesAgo(12),
      status: "attention",
      ownerEmail: "finance@agentledger.ai",
      allowedTools: ["stripe", "quickbooks", "browser", "slack"],
      dailyBudgetUsd: 500,
      monthlyBudgetUsd: 5000,
      lastHeartbeatAt: time.minutesAgo(9),
      createdAt: time.hoursAgo(14),
      updatedAt: time.minutesAgo(9),
    },
    {
      id: followUpAgentId,
      templateId: "customer-follow-up-agent",
      name: "Customer Follow-Up Agent",
      mission:
        "Review customer follow-up records, summarize overdue items, and draft next steps for operator review.",
      model: "gpt-5.4-mini",
      autonomy: "suggest",
      operatingMode: "autonomous",
      standingPrompt:
        "Every hour, review open follow-ups, flag overdue customer items, and draft next steps without sending external messages.",
      cadenceMinutes: 60,
      maxActionsPerDay: 12,
      maxEmailsPerDay: 0,
      requireApprovalForRiskyActions: true,
      lastAutonomousRunAt: time.minutesAgo(82),
      nextRunAt: time.minutesAgo(22),
      status: "active",
      ownerEmail: "customer-ops@agentledger.ai",
      allowedTools: ["crm", "email", "calendar"],
      dailyBudgetUsd: 0,
      monthlyBudgetUsd: 0,
      lastHeartbeatAt: time.minutesAgo(12),
      createdAt: time.hoursAgo(10),
      updatedAt: time.minutesAgo(12),
    },
  ];

  const vaultItems = [
    {
      id: inboxVaultId,
      label: "Demo Gmail inbox",
      kind: "email",
      provider: "Gmail",
      handle: "demo@agentledger.ai",
      maskedSecret: "...mail",
      encryptedSecret: undefined,
      hasSecret: false,
      riskLevel: "medium",
      notes: "Draft replies only during demo. External sends require approval.",
      createdAt: time.hoursAgo(9),
      updatedAt: time.hoursAgo(9),
    },
    {
      id: cardVaultId,
      label: "$1 virtual test card",
      kind: "payment-card",
      provider: "Virtual card",
      handle: "ending 0001",
      maskedSecret: "...0001",
      encryptedSecret: undefined,
      hasSecret: false,
      riskLevel: "high",
      notes: "Use for purchase testing only. Limit spend to $1 and stop before checkout unless approved.",
      createdAt: time.hoursAgo(8),
      updatedAt: time.hoursAgo(8),
    },
    {
      id: crmVaultId,
      label: "Demo CRM workspace",
      kind: "api-key",
      provider: "CRM sandbox",
      handle: "customer-follow-up-demo",
      maskedSecret: undefined,
      encryptedSecret: undefined,
      hasSecret: false,
      riskLevel: "medium",
      notes: "Draft-only customer follow-up workflow. External sends require approval.",
      createdAt: time.hoursAgo(8),
      updatedAt: time.hoursAgo(8),
    },
    {
      id: folderVaultId,
      label: "Workspace design folder",
      kind: "file-folder",
      provider: "Local filesystem",
      handle: "design-review",
      maskedSecret: undefined,
      encryptedSecret: undefined,
      hasSecret: false,
      riskLevel: "medium",
      notes: "Read and draft changes only. Destructive filesystem actions require review.",
      createdAt: time.hoursAgo(7),
      updatedAt: time.hoursAgo(7),
    },
    {
      id: browserVaultId,
      label: "Local browser profile",
      kind: "browser-profile",
      provider: "Chrome",
      handle: "agentledger-demo",
      maskedSecret: undefined,
      encryptedSecret: undefined,
      hasSecret: false,
      riskLevel: "medium",
      notes: "Use for research and testing sessions.",
      createdAt: time.hoursAgo(7),
      updatedAt: time.hoursAgo(7),
    },
  ];

  const agentPermissions = [
    {
      id: randomUUID(),
      agentId: revenueAgentId,
      vaultItemId: inboxVaultId,
      scope: "draft",
      requiresApproval: true,
      dailyLimitUsd: undefined,
      notes: "Can draft outbound replies, but sending stays approval-gated.",
      createdAt: time.hoursAgo(6),
    },
    {
      id: randomUUID(),
      agentId: financeAgentId,
      vaultItemId: cardVaultId,
      scope: "spend",
      requiresApproval: true,
      dailyLimitUsd: 1,
      notes: "Use only for $1 purchase tests.",
      createdAt: time.hoursAgo(6),
    },
    {
      id: randomUUID(),
      agentId: followUpAgentId,
      vaultItemId: crmVaultId,
      scope: "draft",
      requiresApproval: true,
      dailyLimitUsd: 0,
      notes: "Can draft follow-ups, but sending stays approval-gated.",
      createdAt: time.hoursAgo(5),
    },
    {
      id: randomUUID(),
      agentId: researchAgentId,
      vaultItemId: browserVaultId,
      scope: "use",
      requiresApproval: false,
      dailyLimitUsd: 0,
      notes: "Allowed for public research runs.",
      createdAt: time.hoursAgo(5),
    },
    {
      id: randomUUID(),
      agentId: researchAgentId,
      vaultItemId: folderVaultId,
      scope: "read",
      requiresApproval: true,
      dailyLimitUsd: 0,
      notes: "Read only unless a user approves file changes.",
      createdAt: time.hoursAgo(4),
    },
  ];

  const agentRuns = [
    {
      id: financeRunId,
      agentId: financeAgentId,
      agentName: "Finance Agent",
      task:
        "Prepare a $1 test purchase plan using the virtual card and stop before checkout.",
      launchMode: "supervised",
      status: "needs-approval",
      maxSpendUsd: 1,
      summary:
        "Launch prepared and waiting for operator approval before external execution.",
      steps: [
        "Loaded Finance Agent with 4 allowed tools.",
        "Checked 1 bound permission.",
        "Prepared a supervised task plan.",
        "Stopped before external execution because this launch touches a guarded permission.",
      ],
      createdAt: time.minutesAgo(41),
    },
    {
      id: researchRunId,
      agentId: researchAgentId,
      agentName: "Research Agent",
      task:
        "Research three customer support automation products and summarize differentiation.",
      launchMode: "dry-run",
      status: "completed",
      maxSpendUsd: 0,
      summary: "Launch completed as a local dry run with no external side effects.",
      steps: [
        "Loaded Research Agent with 4 allowed tools.",
        "Checked 2 bound permissions.",
        "Prepared a dry-run task plan.",
        "Completed the local launch simulation without external side effects.",
      ],
      createdAt: time.minutesAgo(66),
      completedAt: time.minutesAgo(65),
    },
  ];

  const policies = [
    {
      id: randomUUID(),
      name: "Review spend over $250",
      category: "spend",
      enforcement: "review",
      thresholdUsd: 250,
      appliesTo: [],
      description:
        "Any action above $250 should route through approval before money leaves the account.",
      enabled: true,
      createdAt: time.hoursAgo(13),
      updatedAt: time.hoursAgo(13),
    },
    {
      id: randomUUID(),
      name: "Block tools outside the declared allowlist",
      category: "tool",
      enforcement: "block",
      thresholdUsd: undefined,
      appliesTo: [
        "gmail",
        "hubspot",
        "stripe",
        "calendar",
        "browser",
        "apollo",
        "notion",
        "quickbooks",
        "slack",
        "meta",
      ],
      description:
        "Agents must stay inside explicitly approved tools unless a human changes policy first.",
      enabled: true,
      createdAt: time.hoursAgo(13),
      updatedAt: time.hoursAgo(13),
    },
    {
      id: randomUUID(),
      name: "Review all customer data exports",
      category: "data",
      enforcement: "review",
      thresholdUsd: undefined,
      appliesTo: ["aggregated analytics export"],
      description:
        "Customer data egress should be visible and reviewable even when the business case looks strong.",
      enabled: true,
      createdAt: time.hoursAgo(12),
      updatedAt: time.hoursAgo(12),
    },
    {
      id: randomUUID(),
      name: "Review unapproved vendors",
      category: "vendor",
      enforcement: "review",
      thresholdUsd: undefined,
      appliesTo: ["stripe", "hubspot", "openai", "slack", "linear", "meta"],
      description:
        "New vendor relationships should not be created without explicit review.",
      enabled: true,
      createdAt: time.hoursAgo(12),
      updatedAt: time.hoursAgo(12),
    },
  ];

  const actionLogs = [
    {
      id: blockedLogId,
      agentId: financeAgentId,
      agentName: "Finance Agent",
      scenario: "unapproved-tool",
      actionType: "expense-export",
      target: "NetSuite ledger export",
      tool: "netsuite",
      vendor: "NetSuite",
      amountUsd: 0,
      status: "blocked",
      summary:
        "Agent attempted to push a ledger export through an unapproved finance tool and was blocked immediately.",
      reasoning:
        "The system rejected the action because the tool is outside the declared allowlist for the fleet.",
      policyHits: ["Block tools outside the declared allowlist"],
      createdAt: time.minutesAgo(6),
    },
    {
      id: approvalLogTwoId,
      agentId: financeAgentId,
      agentName: "Finance Agent",
      scenario: "customer-refund",
      actionType: "refund",
      target: "Acme renewal credit",
      tool: "stripe",
      vendor: "Stripe",
      amountUsd: 850,
      status: "pending-approval",
      summary:
        "Agent initiated a goodwill refund after a failed onboarding sequence triggered churn risk heuristics.",
      reasoning:
        "The agent determined the refund could protect account health, but revenue-impacting actions should pass through policy review first.",
      policyHits: ["Review spend over $250"],
      approvalRequestId: approvalTwoId,
      createdAt: time.minutesAgo(15),
    },
    {
      id: approvalLogOneId,
      agentId: revenueAgentId,
      agentName: "Revenue Agent",
      scenario: "vendor-signup",
      actionType: "vendor-signup",
      target: "Apollo outbound workspace",
      tool: "browser",
      vendor: "Apollo",
      amountUsd: 99,
      status: "pending-approval",
      summary:
        "Agent attempted to create a new Apollo workspace to accelerate outbound sequence setup.",
      reasoning:
        "The new vendor could accelerate outbound work, but bringing on a net-new tool creates spend, legal, and security surface area.",
      policyHits: ["Review unapproved vendors"],
      approvalRequestId: approvalOneId,
      createdAt: time.minutesAgo(22),
    },
    {
      id: approvalLogThreeId,
      agentId: researchAgentId,
      agentName: "Research Agent",
      scenario: "data-export",
      actionType: "data-export",
      target: "HubSpot contact export for retargeting sync",
      tool: "hubspot",
      vendor: "HubSpot",
      amountUsd: 0,
      status: "pending-approval",
      summary:
        "Agent attempted to export CRM contact data for a downstream enrichment and retargeting workflow.",
      reasoning:
        "The export would help downstream activation, but customer data egress is intentionally review-gated.",
      policyHits: ["Review all customer data exports"],
      approvalRequestId: approvalThreeId,
      createdAt: time.minutesAgo(29),
    },
    {
      id: launchLogId,
      agentId: financeAgentId,
      agentName: "Finance Agent",
      scenario: "manual",
      actionType: "agent-launch",
      target: "Prepare a $1 test purchase plan using the virtual card.",
      tool: "local-runner",
      vendor: undefined,
      amountUsd: 1,
      status: "pending-approval",
      summary:
        "Finance Agent staged a supervised launch using a $1 virtual test card.",
      reasoning:
        "Agent Hub checked bound permissions and paused before external execution.",
      policyHits: ["Bound permission requires approval before external execution"],
      externalReferenceId: financeRunId,
      resultDetail:
        "Launch prepared and waiting for operator approval before external execution.",
      createdAt: time.minutesAgo(41),
    },
    {
      id: completedLogId,
      agentId: revenueAgentId,
      agentName: "Revenue Agent",
      scenario: "software-purchase",
      actionType: "purchase",
      target: "Linear enterprise seat expansion",
      tool: "browser",
      vendor: "Linear",
      amountUsd: 180,
      status: "completed",
      summary:
        "Agent completed an approved Linear seat expansion within policy limits and without approval.",
      reasoning:
        "Vendor and tool were already approved, and the spend stayed below the review threshold.",
      policyHits: [],
      createdAt: time.minutesAgo(54),
    },
  ];

  const approvals = [
    {
      id: approvalTwoId,
      actionLogId: approvalLogTwoId,
      agentId: financeAgentId,
      agentName: "Finance Agent",
      title: "Finance Agent requests approval for issue a customer refund",
      requestedAction: "refund",
      target: "Acme renewal credit",
      amountUsd: 850,
      policyReason:
        "Any action above $250 should route through approval before money leaves the account.",
      justification:
        "The refund is intended to preserve account health after onboarding friction, but it changes recognized revenue.",
      status: "pending",
      createdAt: time.minutesAgo(15),
    },
    {
      id: approvalOneId,
      actionLogId: approvalLogOneId,
      agentId: revenueAgentId,
      agentName: "Revenue Agent",
      title: "Revenue Agent requests approval for create a new vendor account",
      requestedAction: "vendor-signup",
      target: "Apollo outbound workspace",
      amountUsd: 99,
      policyReason:
        "New vendor relationships should not be created without explicit review.",
      justification:
        "The agent thinks Apollo will accelerate outbound setup, but the workspace would create a new vendor relationship.",
      status: "pending",
      createdAt: time.minutesAgo(22),
    },
    {
      id: approvalThreeId,
      actionLogId: approvalLogThreeId,
      agentId: researchAgentId,
      agentName: "Research Agent",
      title: "Research Agent requests approval for export customer data",
      requestedAction: "data-export",
      target: "HubSpot contact export for retargeting sync",
      amountUsd: 0,
      policyReason:
        "Customer data egress should be visible and reviewable even when the business case looks strong.",
      justification:
        "The export would accelerate retargeting workflows, but it crosses a deliberate privacy review boundary.",
      status: "pending",
      createdAt: time.minutesAgo(29),
    },
  ];

  const accessRequests = [
    {
      id: accessRequestOneId,
      contactName: "Maya Chen",
      email: "maya@northstarops.com",
      companyName: "Northstar Ops",
      companyUrl: "https://northstarops.example",
      teamSize: "6-20",
      currentAgentStack: "OpenAI, HubSpot, Slack workflows, and a homegrown browser agent.",
      desiredLaunchWindow: "immediately",
      notes:
        "Wants approval gates and billing visibility before finance lets agents spend directly.",
      status: "new",
      createdAt: time.hoursAgo(3),
      updatedAt: time.hoursAgo(3),
    },
    {
      id: accessRequestTwoId,
      contactName: "Jordan Patel",
      email: "jordan@summitrevenue.ai",
      companyName: "Summit Revenue Systems",
      companyUrl: "https://summitrevenue.example",
      teamSize: "21-50",
      currentAgentStack: "Sales agents in HubSpot plus Gmail and browser automation.",
      desiredLaunchWindow: "this-quarter",
      notes:
        "Already buying agent software and now needs approval queues plus a system-of-record layer.",
      status: "qualified",
      createdAt: time.hoursAgo(11),
      updatedAt: time.hoursAgo(2),
    },
    {
      id: accessRequestThreeId,
      contactName: "Leah Romero",
      email: "leah@foundrystack.co",
      companyName: "Foundry Stack",
      companyUrl: "https://foundrystack.example",
      teamSize: "1-5",
      currentAgentStack: "A tiny founder team using GPT agents for support, research, and ops.",
      desiredLaunchWindow: "exploring",
      notes:
        "Interested in the desktop control plane and wants a lighter rollout before wider team access.",
      status: "contacted",
      createdAt: time.hoursAgo(18),
      updatedAt: time.hoursAgo(6),
    },
  ];

  const billingConfig = [
    {
      id: "default",
      companyName: "Agent Ledger Demo Co",
      plan: "growth",
      stripeMode: "manual",
      stripeSubscriptionStatus: "manual",
      billingEmail: "finance@agentledger.ai",
      baseFeeUsd: 399,
      perAgentUsd: 49,
      perThousandActionsUsd: 12,
      notes:
        "Demo billing config for the seeded workspace. Switch to Stripe test or live before charging a real account.",
      updatedAt: time.hoursAgo(1),
    },
  ];

  const auditEvents = [
    {
      id: randomUUID(),
      actorEmail: "demo@agentledger.ai",
      action: "demo.seed",
      entityType: "demo",
      entityId: "default-demo-company",
      detail:
        "Seeded the Agent Ledger demo fleet, policies, pipeline, billing config, and starter activity.",
      createdAt: time.minutesAgo(5),
    },
    {
      id: randomUUID(),
      actorEmail: "demo@agentledger.ai",
      action: "billing.updated",
      entityType: "billing",
      entityId: "default",
      detail: "Configured the demo workspace for the growth plan in manual billing mode.",
      createdAt: time.minutesAgo(11),
    },
    {
      id: randomUUID(),
      actorEmail: "demo@agentledger.ai",
      action: "simulation.executed",
      entityType: "action-log",
      entityId: approvalLogTwoId,
      detail: "Simulated refund handling for Finance Agent.",
      createdAt: time.minutesAgo(15),
    },
    {
      id: randomUUID(),
      actorEmail: "demo@agentledger.ai",
      action: "simulation.executed",
      entityType: "action-log",
      entityId: approvalLogOneId,
      detail: "Simulated seat expansion request for Revenue Agent.",
      createdAt: time.minutesAgo(22),
    },
    {
      id: randomUUID(),
      actorEmail: "demo@agentledger.ai",
      action: "simulation.executed",
      entityType: "action-log",
      entityId: approvalLogThreeId,
      detail: "Simulated customer data export review for Research Agent.",
      createdAt: time.minutesAgo(29),
    },
    {
      id: randomUUID(),
      actorEmail: "growth@agentledger.ai",
      action: "access-request.captured",
      entityType: "access-request",
      entityId: accessRequestOneId,
      detail: "Captured an inbound request from Northstar Ops.",
      createdAt: time.hoursAgo(3),
    },
  ];

  return {
    agents,
    "agent-runs": agentRuns,
    "agent-permissions": agentPermissions,
    "vault-items": vaultItems,
    policies,
    "action-logs": actionLogs,
    approvals,
    "access-requests": accessRequests,
    "billing-config": billingConfig,
    "audit-events": auditEvents,
    "rate-limits": [],
  };
}

async function writeDataset(dataDir, dataset) {
  await mkdir(dataDir, { recursive: true });

  for (const [collection, filename] of Object.entries(collectionFiles)) {
    const target = path.join(dataDir, filename);
    const payload = dataset[collection] ?? [];
    await writeFile(target, JSON.stringify(payload, null, 2), "utf8");
  }
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const dataDir = getDataDirectory();
  const existingData = await hasExistingData(dataDir);

  if (existingData && !reset) {
    console.log(
      `Existing workspace data found in ${dataDir}. Leaving it in place. Run 'npm run demo:reset' if you want a fresh seeded demo.`,
    );
    return;
  }

  await writeDataset(dataDir, buildDemoDataset());
  console.log(
    `${reset ? "Reset" : "Prepared"} Agent Ledger demo data in ${dataDir}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
