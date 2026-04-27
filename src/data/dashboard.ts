import "server-only";

import { getBillingSnapshot } from "@/data/billing";
import { getLaunchReadinessReport } from "@/data/readiness";
import {
  listActionLogs,
  listAccessRequests,
  listAgents,
  listApprovals,
  listAuditEvents,
  listPolicies,
} from "@/data/repository";

const operatingModel = [
  "Register every autonomous worker as a named agent with tools, budgets, and operating mode.",
  "Use policy rules to decide which actions are auto-approved, blocked, or escalated.",
  "Keep every spend event, tool call, and export in a searchable action log.",
  "Feed live usage into billing so the control plane becomes the revenue meter too.",
] as const;

const founderPrinciples = [
  "Sell the governance layer for agents, not another thin wrapper around a model.",
  "Price against risk, spend control, and operational visibility instead of token count.",
  "Assume agent capability improves every quarter and position the product as the safety layer that becomes more necessary, not less.",
  "Keep the legal shell human for now, but optimize every day-to-day operating motion for agent autonomy.",
] as const;

export async function getWorkspaceSnapshot() {
  const [agents, policies, logs, approvals, accessRequests, auditTrail, billing] =
    await Promise.all([
      listAgents(),
      listPolicies(),
      listActionLogs(),
      listApprovals(),
      listAccessRequests(),
      listAuditEvents(6),
      getBillingSnapshot(),
    ]);

  const pendingApprovals = approvals.filter(
    (approval) => approval.status === "pending",
  ).length;
  const blockedActions = logs.filter((log) => log.status === "blocked").length;
  const autonomousAgents = agents.filter(
    (agent) => (agent.operatingMode ?? "autonomous") === "autonomous",
  ).length;

  return {
    metrics: [
      {
        label: "Autonomous agents",
        value: `${autonomousAgents}/${agents.length}`,
        note: "Named workers with standing prompts, cadence, budgets, tools, and operating mode tracked in the control plane.",
      },
      {
        label: "Pending approvals",
        value: String(pendingApprovals),
        note: "Actions the system escalated because policy demanded human review.",
      },
      {
        label: "Protected spend",
        value: `$${billing.protectedSpendUsd.toFixed(0)}`,
        note: "Dollar amount already observed inside the action log for completed or approved actions.",
      },
      {
        label: "Blocked actions",
        value: String(blockedActions),
        note: "Events stopped by policy before an agent could complete them.",
      },
    ],
    agents: agents.slice(0, 4),
    pendingApprovals: approvals.filter((item) => item.status === "pending").slice(0, 4),
    accessRequests: accessRequests.slice(0, 4),
    recentLogs: logs.slice(0, 5),
    policyCount: policies.length,
    billing,
    operatingModel,
    founderPrinciples,
    auditTrail,
    launchReadiness: getLaunchReadinessReport(),
  };
}
