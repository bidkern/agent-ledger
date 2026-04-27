import "server-only";

import {
  createActionLog,
  createAgentRun,
  listAgents,
  listPermissionBindingsForAgent,
  logAuditEvent,
  updateAgentAutonomousSchedule,
} from "@/data/repository";
import type { AgentPermissionBinding, AgentRun, RegisteredAgent } from "@/data/types";

type AutonomousTickInput = {
  actorEmail: string;
  limit?: number;
  force?: boolean;
};

type QueuedAutonomousCycle = {
  agentId: string;
  agentName: string;
  run: AgentRun;
  actionLogId: string;
  nextRunAt?: string;
};

const DEFAULT_CADENCE_MINUTES = 60;

const riskyScopes = new Set(["send", "spend", "trade", "admin"]);

function getCadenceMinutes(agent: RegisteredAgent) {
  const configured = agent.cadenceMinutes ?? DEFAULT_CADENCE_MINUTES;
  return Math.max(5, configured);
}

function getStandingPrompt(agent: RegisteredAgent) {
  return agent.standingPrompt?.trim() || agent.mission.trim();
}

function isAutonomousAgentDue(
  agent: RegisteredAgent,
  nowMs: number,
  force = false,
) {
  if ((agent.operatingMode ?? "autonomous") !== "autonomous" || agent.status !== "active") {
    return false;
  }

  if (!getStandingPrompt(agent)) {
    return false;
  }

  if (force) {
    return true;
  }

  if (!agent.nextRunAt) {
    return true;
  }

  const parsed = Date.parse(agent.nextRunAt);
  return Number.isFinite(parsed) ? parsed <= nowMs : true;
}

function describeRiskPosture(permissions: AgentPermissionBinding[]) {
  const riskyPermissionCount = permissions.filter(
    (permission) =>
      permission.requiresApproval || riskyScopes.has(permission.scope),
  ).length;

  if (riskyPermissionCount === 0) {
    return "No approval-gated permissions are bound for this cycle.";
  }

  return `${riskyPermissionCount} permission${riskyPermissionCount === 1 ? "" : "s"} must still pass approval or policy checks before external action.`;
}

export async function runAutonomousEngineTick({
  actorEmail,
  limit = 25,
  force = false,
}: AutonomousTickInput) {
  const nowDate = new Date();
  const nowIso = nowDate.toISOString();
  const nowMs = nowDate.getTime();
  const agents = await listAgents();
  const dueAgents = agents
    .filter((agent) => isAutonomousAgentDue(agent, nowMs, force))
    .slice(0, Math.max(1, limit));
  const queued: QueuedAutonomousCycle[] = [];

  for (const agent of dueAgents) {
    const permissions = await listPermissionBindingsForAgent(agent.id);
    const cadenceMinutes = getCadenceMinutes(agent);
    const nextRunAt = new Date(
      nowMs + cadenceMinutes * 60 * 1000,
    ).toISOString();
    const prompt = getStandingPrompt(agent);
    const steps = [
      `Loaded standing prompt: ${prompt.slice(0, 140)}${prompt.length > 140 ? "..." : ""}`,
      `Applied customer guidelines: ${agent.maxActionsPerDay ?? 25} actions/day, ${agent.maxEmailsPerDay ?? 10} emails/day, $${agent.dailyBudgetUsd}/day.`,
      `Checked ${permissions.length} bound permission${permissions.length === 1 ? "" : "s"}.`,
      describeRiskPosture(permissions),
      "Queued the cycle for the external worker. The worker must call propose_action before sensitive execution.",
    ];

    const run = await createAgentRun({
      agentId: agent.id,
      agentName: agent.name,
      task: prompt,
      launchMode: "autopilot",
      status: "queued",
      maxSpendUsd: agent.dailyBudgetUsd,
      summary:
        "Autonomous cycle queued from the standing prompt. No manual launch was required.",
      steps,
    });

    const log = await createActionLog({
      agentId: agent.id,
      agentName: agent.name,
      scenario: "manual",
      actionType: "autonomous-cycle",
      target: prompt.slice(0, 120),
      tool: "autonomous-engine",
      amountUsd: 0,
      status: "allowed",
      summary: `Queued an autonomous cycle for ${agent.name}.`,
      reasoning:
        "The autonomous engine found the agent due by cadence and queued the next standing-prompt cycle. External tools are still governed by action proposals.",
      policyHits: [],
      source: "api",
      requestedBy: actorEmail,
      externalReferenceId: run.id,
      resultDetail: `Next autonomous cycle is scheduled for ${nextRunAt}.`,
    });

    await updateAgentAutonomousSchedule({
      agentId: agent.id,
      lastAutonomousRunAt: nowIso,
      nextRunAt,
    });

    await logAuditEvent({
      actorEmail,
      action: "agent.autonomous.queued",
      entityType: "agent-run",
      entityId: run.id,
      detail: `${agent.name} was queued by the autonomous engine.`,
    });

    queued.push({
      agentId: agent.id,
      agentName: agent.name,
      run,
      actionLogId: log.id,
      nextRunAt,
    });
  }

  return {
    checkedAt: nowIso,
    dueAgentCount: dueAgents.length,
    queued,
  };
}
