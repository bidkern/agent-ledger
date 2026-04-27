import "server-only";

import { createGovernedActionRecord } from "@/data/governance";
import {
  createAgent,
  createPolicy,
  getAgentById,
  getApprovalById,
  listActionLogs,
  listAgents,
  listPolicies,
  updateActionLog,
  updateApprovalDecision,
  upsertBillingConfig,
  logAuditEvent,
} from "@/data/repository";
import type { RegisteredAgent, SimulationScenario } from "@/data/types";

type ScenarioTemplate = {
  scenario: SimulationScenario;
  title: string;
  actionType: string;
  target: string;
  tool: string;
  vendor?: string;
  amountUsd?: number;
  summary: string;
  reasoning: string;
};

const scenarioTemplates: ScenarioTemplate[] = [
  {
    scenario: "software-purchase",
    title: "Buy a new SaaS seat",
    actionType: "purchase",
    target: "Linear enterprise seat expansion",
    tool: "browser",
    vendor: "Linear",
    amountUsd: 180,
    summary:
      "Agent attempted to purchase additional Linear seats after detecting rising engineering queue volume.",
    reasoning:
      "The operating agent concluded the extra seats would unblock team throughput, but the purchase touches vendor spend and contract governance.",
  },
  {
    scenario: "customer-refund",
    title: "Issue a customer refund",
    actionType: "refund",
    target: "Acme renewal credit",
    tool: "stripe",
    vendor: "Stripe",
    amountUsd: 850,
    summary:
      "Agent initiated a goodwill refund after a failed onboarding sequence triggered churn risk heuristics.",
    reasoning:
      "The agent determined the refund could protect account health, but revenue-impacting actions should usually pass through policy review.",
  },
  {
    scenario: "data-export",
    title: "Export customer data",
    actionType: "data-export",
    target: "HubSpot contact export for retargeting sync",
    tool: "hubspot",
    vendor: "HubSpot",
    amountUsd: 0,
    summary:
      "Agent attempted to export CRM contact data for a downstream enrichment and retargeting workflow.",
    reasoning:
      "The export is operationally useful, but customer data egress is a classic high-sensitivity action that should be visible and reviewable.",
  },
  {
    scenario: "vendor-signup",
    title: "Create a new vendor account",
    actionType: "vendor-signup",
    target: "Apollo outbound workspace",
    tool: "browser",
    vendor: "Apollo",
    amountUsd: 99,
    summary:
      "Agent attempted to create a new Apollo workspace to accelerate outbound sequence setup.",
    reasoning:
      "New vendors create budget, security, and legal surface area, so the control plane should decide whether this happens automatically.",
  },
  {
    scenario: "campaign-launch",
    title: "Launch a paid campaign",
    actionType: "campaign-launch",
    target: "Meta founder-test campaign",
    tool: "meta",
    vendor: "Meta",
    amountUsd: 600,
    summary:
      "Agent prepared to launch a paid acquisition experiment after traffic dipped below the plan baseline.",
    reasoning:
      "Campaign launch could be useful, but it combines cash outlay with brand risk and usually deserves explicit spend policy coverage.",
  },
  {
    scenario: "unapproved-tool",
    title: "Use an unapproved tool",
    actionType: "expense-export",
    target: "NetSuite ledger export",
    tool: "netsuite",
    vendor: "NetSuite",
    amountUsd: 0,
    summary:
      "Agent attempted to push a ledger export through an unapproved finance tool and was blocked immediately.",
    reasoning:
      "The action would expose sensitive financial records through a tool that is outside the declared fleet allowlist.",
  },
];

async function createSimulationArtifacts(input: {
  agent: RegisteredAgent;
  template: ScenarioTemplate;
  actorEmail: string;
  logAuditEventForSimulation?: boolean;
}) {
  const created = await createGovernedActionRecord({
    agentId: input.agent.id,
    scenario: input.template.scenario,
    actionType: input.template.actionType,
    target: input.template.target,
    tool: input.template.tool,
    vendor: input.template.vendor,
    amountUsd: input.template.amountUsd,
    summary: input.template.summary,
    reasoning: input.template.reasoning,
    actorEmail: input.actorEmail,
    source: "simulation",
    requestedBy: input.agent.id,
    allowStatus: "completed",
    logAuditEventForProposal: false,
  });

  if (input.logAuditEventForSimulation ?? true) {
    await logAuditEvent({
      actorEmail: input.actorEmail,
      action: "simulation.executed",
      entityType: "action-log",
      entityId: created.log.id,
      detail: `Simulated ${input.template.actionType} for ${input.agent.name}`,
    });
  }

  return {
    log: created.log,
    approval: created.approval,
  };
}

export function listScenarioTemplates() {
  return scenarioTemplates;
}

export async function simulateAgentRun(input: {
  agentId: string;
  scenario: SimulationScenario;
  actorEmail: string;
}) {
  const agent = await getAgentById(input.agentId);

  if (!agent) {
    throw new Error("Agent not found.");
  }

  const template = scenarioTemplates.find(
    (scenario) => scenario.scenario === input.scenario,
  );

  if (!template) {
    throw new Error("Scenario not found.");
  }

  return createSimulationArtifacts({
    agent,
    template,
    actorEmail: input.actorEmail,
  });
}

export async function decideApproval(input: {
  approvalId: string;
  status: "approved" | "rejected";
  decidedBy: string;
  decisionNote?: string;
}) {
  const approval = await getApprovalById(input.approvalId);

  if (!approval) {
    throw new Error("Approval request not found.");
  }

  const updatedApproval = await updateApprovalDecision({
    id: approval.id,
    status: input.status,
    decidedBy: input.decidedBy,
    decisionNote: input.decisionNote,
  });

  await updateActionLog({
    id: approval.actionLogId,
    status: input.status === "approved" ? "approved" : "rejected",
  });

  await logAuditEvent({
    actorEmail: input.decidedBy,
    action: `approval.${input.status}`,
    entityType: "approval",
    entityId: approval.id,
    detail: `${input.status} ${approval.requestedAction} for ${approval.agentName}`,
  });

  return updatedApproval;
}

const demoAgents = [
  {
    name: "Revenue Agent",
    mission:
      "Own outbound experiments, renewals, and follow-up actions that directly affect revenue throughput.",
    model: "gpt-5.4-mini",
    autonomy: "execute" as const,
    ownerEmail: "ops@agentledger.ai",
    allowedTools: ["gmail", "hubspot", "stripe", "calendar", "browser"],
    dailyBudgetUsd: 300,
    monthlyBudgetUsd: 3000,
  },
  {
    name: "Research Agent",
    mission:
      "Find leads, vendor options, and market intelligence while keeping source quality and compliance visible.",
    model: "gpt-5.4-mini",
    autonomy: "autopilot" as const,
    ownerEmail: "research@agentledger.ai",
    allowedTools: ["browser", "apollo", "hubspot", "notion"],
    dailyBudgetUsd: 150,
    monthlyBudgetUsd: 1800,
  },
  {
    name: "Finance Agent",
    mission:
      "Monitor refunds, vendor spend, and billing exceptions so money-moving actions stay within policy.",
    model: "gpt-5.4-mini",
    autonomy: "execute" as const,
    ownerEmail: "finance@agentledger.ai",
    allowedTools: ["stripe", "quickbooks", "browser", "slack"],
    dailyBudgetUsd: 500,
    monthlyBudgetUsd: 5000,
  },
] as const;

const demoPolicies = [
  {
    name: "Review spend over $250",
    category: "spend" as const,
    enforcement: "review" as const,
    thresholdUsd: 250,
    appliesTo: [],
    description:
      "Any action above $250 should route through approval before money leaves the account.",
  },
  {
    name: "Block tools outside the declared allowlist",
    category: "tool" as const,
    enforcement: "block" as const,
    thresholdUsd: undefined,
    appliesTo: ["gmail", "hubspot", "stripe", "calendar", "browser", "apollo", "notion", "quickbooks", "slack", "meta"],
    description:
      "Agents must stay inside explicitly approved tools unless a human changes policy first.",
  },
  {
    name: "Review all customer data exports",
    category: "data" as const,
    enforcement: "review" as const,
    thresholdUsd: undefined,
    appliesTo: ["aggregated analytics export"],
    description:
      "Customer data egress should be visible and reviewable even when the business case looks strong.",
  },
  {
    name: "Review unapproved vendors",
    category: "vendor" as const,
    enforcement: "review" as const,
    thresholdUsd: undefined,
    appliesTo: ["stripe", "hubspot", "openai", "slack", "linear", "meta"],
    description:
      "New vendor relationships should not be created without explicit review.",
  },
] as const;

export async function seedDemoCompany(actorEmail: string) {
  const [agents, policies, logs] = await Promise.all([
    listAgents(),
    listPolicies(),
    listActionLogs(),
  ]);

  if (agents.length > 0 || policies.length > 0 || logs.length > 0) {
    return {
      created: false,
      message:
        "Demo company was not seeded because the workspace already has live records.",
    };
  }

  const createdAgents = [];

  for (const agent of demoAgents) {
    createdAgents.push(
      await createAgent({
        ...agent,
        allowedTools: [...agent.allowedTools],
      }),
    );
  }

  for (const policy of demoPolicies) {
    await createPolicy({
      ...policy,
      appliesTo: [...policy.appliesTo],
      enabled: true,
    });
  }

  await upsertBillingConfig({
    companyName: "Agent Ledger Demo Co",
    plan: "growth",
    stripeMode: "manual",
    billingEmail: "finance@agentledger.ai",
    baseFeeUsd: 399,
    perAgentUsd: 49,
    perThousandActionsUsd: 12,
    notes:
      "Seeded demo billing config. Switch this workspace to Stripe test or live billing before charging a real customer.",
  });

  await createSimulationArtifacts({
    agent: createdAgents[0],
    template: scenarioTemplates.find(
      (scenario) => scenario.scenario === "software-purchase",
    )!,
    actorEmail,
    logAuditEventForSimulation: false,
  });
  await createSimulationArtifacts({
    agent: createdAgents[2],
    template: scenarioTemplates.find(
      (scenario) => scenario.scenario === "customer-refund",
    )!,
    actorEmail,
    logAuditEventForSimulation: false,
  });
  await createSimulationArtifacts({
    agent: createdAgents[1],
    template: scenarioTemplates.find(
      (scenario) => scenario.scenario === "data-export",
    )!,
    actorEmail,
    logAuditEventForSimulation: false,
  });
  await createSimulationArtifacts({
    agent: createdAgents[0],
    template: scenarioTemplates.find(
      (scenario) => scenario.scenario === "vendor-signup",
    )!,
    actorEmail,
    logAuditEventForSimulation: false,
  });
  await createSimulationArtifacts({
    agent: createdAgents[2],
    template: scenarioTemplates.find(
      (scenario) => scenario.scenario === "unapproved-tool",
    )!,
    actorEmail,
    logAuditEventForSimulation: false,
  });

  await logAuditEvent({
    actorEmail,
    action: "demo.seed",
    entityType: "demo",
    entityId: "default-demo-company",
    detail: "Seeded the Agent Ledger demo fleet, policies, billing config, and starter activity.",
  });

  return {
    created: true,
    message: "Seeded the Agent Ledger demo company.",
  };
}
