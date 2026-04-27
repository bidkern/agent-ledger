import "server-only";

import {
  createActionLog,
  createApprovalRequest,
  getActionLogById,
  getAgentById,
  listActionLogs,
  listPolicies,
  logAuditEvent,
  updateActionLog,
  updateAgentHeartbeat,
} from "@/data/repository";
import type {
  ActionLog,
  ActionLogStatus,
  ActionRequestSource,
  PolicyEnforcement,
  PolicyRule,
  RegisteredAgent,
} from "@/data/types";

export type GovernedActionInput = {
  agentId: string;
  actionType: string;
  target: string;
  tool: string;
  vendor?: string;
  amountUsd?: number;
  summary: string;
  reasoning: string;
  actorEmail: string;
  scenario?: ActionLog["scenario"];
  source?: ActionRequestSource;
  requestedBy?: string;
};

export type GovernedActionDecision = {
  agent: RegisteredAgent;
  decision: "allow" | "review" | "block";
  policyHits: string[];
  policyReason: string;
  matchedPolicies: PolicyRule[];
  projectedDailySpendUsd: number;
  projectedMonthlySpendUsd: number;
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
};

const enforcementPriority: Record<PolicyEnforcement, number> = {
  log: 1,
  review: 2,
  block: 3,
};

const committedStatuses = new Set<ActionLogStatus>([
  "allowed",
  "approved",
  "completed",
]);

function normalizeList(values: string[]) {
  return values.map((value) => value.trim().toLowerCase()).filter(Boolean);
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

function getUtcDayKey(value: string) {
  return value.slice(0, 10);
}

function getUtcMonthKey(value: string) {
  return value.slice(0, 7);
}

function matchesPolicy(input: GovernedActionInput, policy: PolicyRule) {
  if (!policy.enabled) {
    return false;
  }

  const appliesTo = normalizeList(policy.appliesTo);
  const lowerTarget = normalizeText(input.target);
  const lowerTool = normalizeText(input.tool);
  const lowerVendor = input.vendor ? normalizeText(input.vendor) : undefined;
  const lowerActionType = normalizeText(input.actionType);

  switch (policy.category) {
    case "spend":
      return (
        typeof input.amountUsd === "number" &&
        typeof policy.thresholdUsd === "number" &&
        input.amountUsd > policy.thresholdUsd
      );
    case "tool":
      return appliesTo.length > 0 ? !appliesTo.includes(lowerTool) : true;
    case "vendor":
      if (!lowerVendor) {
        return false;
      }
      return appliesTo.length > 0 ? !appliesTo.includes(lowerVendor) : true;
    case "data":
      if (lowerActionType !== "data-export") {
        return false;
      }
      if (appliesTo.length === 0) {
        return true;
      }
      return !appliesTo.some((entry) => lowerTarget.includes(entry));
    case "approval":
      if (appliesTo.length === 0) {
        return true;
      }
      return appliesTo.some(
        (entry) => lowerTarget.includes(entry) || lowerActionType.includes(entry),
      );
  }
}

function chooseEnforcement(policies: PolicyRule[]) {
  return policies.reduce<PolicyEnforcement | null>((highest, current) => {
    if (!highest) {
      return current.enforcement;
    }

    return enforcementPriority[current.enforcement] >
      enforcementPriority[highest]
      ? current.enforcement
      : highest;
  }, null);
}

function sumCommittedSpend(logs: ActionLog[], agentId: string, amountDateIso: string) {
  const dayKey = getUtcDayKey(amountDateIso);
  const monthKey = getUtcMonthKey(amountDateIso);

  return logs.reduce(
    (totals, log) => {
      if (
        log.agentId !== agentId ||
        !committedStatuses.has(log.status) ||
        typeof log.amountUsd !== "number"
      ) {
        return totals;
      }

      if (getUtcDayKey(log.createdAt) === dayKey) {
        totals.daily += log.amountUsd;
      }

      if (getUtcMonthKey(log.createdAt) === monthKey) {
        totals.monthly += log.amountUsd;
      }

      return totals;
    },
    { daily: 0, monthly: 0 },
  );
}

function countCommittedActions(
  logs: ActionLog[],
  agentId: string,
  amountDateIso: string,
  predicate: (log: ActionLog) => boolean,
) {
  const dayKey = getUtcDayKey(amountDateIso);

  return logs.filter(
    (log) =>
      log.agentId === agentId &&
      getUtcDayKey(log.createdAt) === dayKey &&
      committedStatuses.has(log.status) &&
      log.actionType !== "autonomous-cycle" &&
      predicate(log),
  ).length;
}

function isEmailAction(input: GovernedActionInput | ActionLog) {
  const actionType = normalizeText(input.actionType);
  const tool = normalizeText(input.tool);

  return (
    actionType.includes("email") ||
    actionType.includes("send") ||
    tool.includes("email") ||
    tool.includes("gmail") ||
    tool.includes("outlook")
  );
}

function isRiskyAction(input: GovernedActionInput) {
  const actionType = normalizeText(input.actionType);

  return [
    "ach",
    "bank",
    "bridge",
    "buy",
    "card",
    "charge",
    "checkout",
    "claim",
    "commit-secret",
    "crypto",
    "deploy",
    "dns",
    "env",
    "invoice",
    "liquidity",
    "lp",
    "merge",
    "mint",
    "payment",
    "publish",
    "push",
    "release",
    "sell",
    "send",
    "sign",
    "spend",
    "purchase",
    "revoke",
    "refund",
    "swap",
    "trade",
    "transfer",
    "withdraw",
    "admin",
    "delete",
    "data-export",
  ].some((riskWord) => actionType.includes(riskWord));
}

function isWalletExecutionAction(input: GovernedActionInput) {
  const text = [
    input.actionType,
    input.target,
    input.tool,
    input.vendor,
  ]
    .map((value) => normalizeText(value ?? ""))
    .join(" ");
  const hasWalletContext = [
    "crypto",
    "ethereum",
    "eth",
    "metamask",
    "token",
    "wallet",
  ].some((word) => text.includes(word));
  const hasExecutionIntent = [
    "approve",
    "bridge",
    "broadcast",
    "buy",
    "claim",
    "lend",
    "liquidity",
    "lp",
    "mint",
    "revoke",
    "sell",
    "send",
    "sign",
    "stake",
    "swap",
    "trade",
    "transaction",
    "transfer",
    "tx",
    "withdraw",
  ].some((word) => text.includes(word));

  return hasWalletContext && hasExecutionIntent;
}

function isWalletExecutionEnabled() {
  return process.env.AGENT_LEDGER_ALLOW_WALLET_EXECUTION === "true";
}

export async function assessGovernedAction(
  input: GovernedActionInput,
): Promise<GovernedActionDecision> {
  const [agent, policies, logs] = await Promise.all([
    getAgentById(input.agentId),
    listPolicies(),
    listActionLogs(),
  ]);

  if (!agent) {
    throw new Error("Agent not found.");
  }

  const matchedPolicies = policies.filter((policy) => matchesPolicy(input, policy));
  const policyHits = matchedPolicies.map((policy) => policy.name);
  const policyEnforcement = chooseEnforcement(matchedPolicies);
  const amountNow = new Date().toISOString();
  const currentSpend = sumCommittedSpend(logs, agent.id, amountNow);
  const projectedDailySpendUsd =
    currentSpend.daily + (typeof input.amountUsd === "number" ? input.amountUsd : 0);
  const projectedMonthlySpendUsd =
    currentSpend.monthly + (typeof input.amountUsd === "number" ? input.amountUsd : 0);
  const currentDailyActionCount = countCommittedActions(
    logs,
    agent.id,
    amountNow,
    () => true,
  );
  const currentDailyEmailCount = countCommittedActions(
    logs,
    agent.id,
    amountNow,
    isEmailAction,
  );
  const effectiveMaxActionsPerDay = agent.maxActionsPerDay ?? 25;
  const effectiveMaxEmailsPerDay = agent.maxEmailsPerDay ?? 10;
  const allowedTools = normalizeList(agent.allowedTools);
  const lowerTool = normalizeText(input.tool);
  const blockedByToolAllowlist =
    allowedTools.length > 0 && !allowedTools.includes(lowerTool);

  if (blockedByToolAllowlist) {
    return {
      agent,
      decision: "block",
      policyHits: ["Agent tool allowlist", ...policyHits],
      policyReason: `${agent.name} is not allowed to use ${input.tool}. Add it to the agent allowlist before retrying.`,
      matchedPolicies,
      projectedDailySpendUsd,
      projectedMonthlySpendUsd,
      dailyBudgetUsd: agent.dailyBudgetUsd,
      monthlyBudgetUsd: agent.monthlyBudgetUsd,
    };
  }

  if (!isWalletExecutionEnabled() && isWalletExecutionAction(input)) {
    return {
      agent,
      decision: "block",
      policyHits: ["Wallet execution disabled", ...policyHits],
      policyReason:
        "Live wallet execution is disabled in this build. Agent Ledger can record a transaction attempt, but it will not sign, broadcast, swap, bridge, approve tokens, or move funds without a dedicated guarded adapter.",
      matchedPolicies,
      projectedDailySpendUsd,
      projectedMonthlySpendUsd,
      dailyBudgetUsd: agent.dailyBudgetUsd,
      monthlyBudgetUsd: agent.monthlyBudgetUsd,
    };
  }

  const budgetHits: string[] = [];
  const guidelineBlockHits: string[] = [];
  const guidelineReviewHits: string[] = [];

  if (
    typeof input.amountUsd === "number" &&
    input.amountUsd > 0 &&
    agent.dailyBudgetUsd > 0 &&
    projectedDailySpendUsd > agent.dailyBudgetUsd
  ) {
    budgetHits.push("Agent daily budget threshold");
  }

  if (
    typeof input.amountUsd === "number" &&
    input.amountUsd > 0 &&
    agent.monthlyBudgetUsd > 0 &&
    projectedMonthlySpendUsd > agent.monthlyBudgetUsd
  ) {
    budgetHits.push("Agent monthly budget threshold");
  }

  if (
    effectiveMaxActionsPerDay > 0 &&
    currentDailyActionCount + 1 > effectiveMaxActionsPerDay
  ) {
    guidelineBlockHits.push("Agent daily action limit");
  }

  if (
    effectiveMaxEmailsPerDay >= 0 &&
    isEmailAction(input) &&
    currentDailyEmailCount + 1 > effectiveMaxEmailsPerDay
  ) {
    guidelineBlockHits.push("Agent daily email limit");
  }

  if (agent.requireApprovalForRiskyActions !== false && isRiskyAction(input)) {
    guidelineReviewHits.push("Risky actions require approval");
  }

  const decision =
    guidelineBlockHits.length > 0 || policyEnforcement === "block" || budgetHits.length > 0
      ? "block"
      : policyEnforcement === "review" || guidelineReviewHits.length > 0
        ? "review"
        : "allow";

  const budgetReason =
    budgetHits.length > 0
      ? `This action would move ${agent.name} to ${formatMoney(projectedDailySpendUsd)} today and ${formatMoney(projectedMonthlySpendUsd)} this month, beyond the configured budget guardrails.`
      : null;
  const guidelineReason =
    guidelineBlockHits.length > 0
      ? `${agent.name} would exceed a customer-defined guideline: ${guidelineBlockHits.join(", ")}.`
      : guidelineReviewHits.length > 0
        ? `${agent.name} can keep working autonomously, but this specific action must pause because the customer marked risky actions for approval.`
        : null;

  return {
    agent,
    decision,
    policyHits: [
      ...policyHits,
      ...budgetHits,
      ...guidelineBlockHits,
      ...guidelineReviewHits,
    ],
    policyReason:
      guidelineReason ||
      budgetReason ||
      matchedPolicies[0]?.description ||
      "No policy rule blocked or escalated this action.",
    matchedPolicies,
    projectedDailySpendUsd,
    projectedMonthlySpendUsd,
    dailyBudgetUsd: agent.dailyBudgetUsd,
    monthlyBudgetUsd: agent.monthlyBudgetUsd,
  };
}

export async function createGovernedActionRecord(
  input: GovernedActionInput & {
    allowStatus?: "allowed" | "completed";
    logAuditEventForProposal?: boolean;
  },
) {
  const decision = await assessGovernedAction(input);
  const status: ActionLogStatus =
    decision.decision === "block"
      ? "blocked"
      : decision.decision === "review"
        ? "pending-approval"
        : input.allowStatus ?? "allowed";

  const log = await createActionLog({
    agentId: decision.agent.id,
    agentName: decision.agent.name,
    scenario: input.scenario ?? "manual",
    actionType: input.actionType,
    target: input.target,
    tool: input.tool,
    vendor: input.vendor,
    amountUsd: input.amountUsd,
    status,
    summary: input.summary,
    reasoning:
      `${input.reasoning} Agent autonomy mode is ${decision.agent.autonomy}, and the control-plane decision is ${decision.decision}.`,
    policyHits: decision.policyHits,
    source: input.source ?? "api",
    requestedBy: input.requestedBy,
  });

  let approval = null;

  if (status === "pending-approval") {
    approval = await createApprovalRequest({
      actionLogId: log.id,
      agentId: decision.agent.id,
      agentName: decision.agent.name,
      title: `${decision.agent.name} requests approval for ${input.actionType}`,
      requestedAction: input.actionType,
      target: input.target,
      amountUsd: input.amountUsd,
      policyReason: decision.policyReason,
      justification: input.reasoning,
    });

    await updateActionLog({
      id: log.id,
      approvalRequestId: approval.id,
    });
  }

  await updateAgentHeartbeat(decision.agent.id);

  if (input.logAuditEventForProposal ?? true) {
    await logAuditEvent({
      actorEmail: input.actorEmail,
      action: `action.proposed.${decision.decision}`,
      entityType: "action-log",
      entityId: log.id,
      detail: `${input.source ?? "api"} proposed ${input.actionType} via ${input.tool} for ${decision.agent.name}.`,
    });
  }

  return {
    ...decision,
    log,
    approval,
    status,
  };
}

export async function recordGovernedActionResult(input: {
  actionLogId: string;
  status: "completed" | "failed";
  actorEmail: string;
  externalReferenceId?: string;
  resultDetail?: string;
}) {
  const log = await getActionLogById(input.actionLogId);

  if (!log) {
    throw new Error("Action log not found.");
  }

  if (
    log.status === "blocked" ||
    log.status === "rejected" ||
    log.status === "pending-approval"
  ) {
    throw new Error(
      `Action ${log.id} cannot accept a result while it is ${log.status}.`,
    );
  }

  const updated = await updateActionLog({
    id: log.id,
    status: input.status,
    externalReferenceId: input.externalReferenceId,
    resultDetail: input.resultDetail,
  });

  if (!updated) {
    throw new Error("Unable to update action result.");
  }

  await logAuditEvent({
    actorEmail: input.actorEmail,
    action: `action.result.${input.status}`,
    entityType: "action-log",
    entityId: updated.id,
    detail:
      input.resultDetail ||
      `${updated.actionType} finished with status ${input.status}.`,
  });

  return updated;
}
