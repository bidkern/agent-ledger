"use client";

import { useActionState, useState, type ReactNode } from "react";
import {
  runAutonomousTickAction,
  runLocalWorkerAction,
  updateAgentAutomationAction,
} from "@/app/workspace/agents/actions";
import type { AgentOperatingMode, RegisteredAgent } from "@/data/types";

const automationInitialState = {
  error: "",
  success: "",
  agentId: "",
};

const tickInitialState = {
  error: "",
  success: "",
  queuedCount: 0,
};

const workerInitialState = {
  error: "",
  success: "",
  processedCount: 0,
  decisions: [] as string[],
};

type WorkerRuntimeStatus = {
  provider: "hosted";
  configured: boolean;
  source: "environment" | "vault" | "local" | null;
  detail: string;
};

export function AutonomousAgentForm({
  agents,
  workerRuntime,
}: {
  agents: RegisteredAgent[];
  workerRuntime: WorkerRuntimeStatus;
}) {
  const [state, formAction, pending] = useActionState(
    updateAgentAutomationAction,
    automationInitialState,
  );
  const [tickState, tickAction, tickPending] = useActionState(
    runAutonomousTickAction,
    tickInitialState,
  );
  const [workerState, workerAction, workerPending] = useActionState(
    runLocalWorkerAction,
    workerInitialState,
  );
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const selectedAgent =
    agents.find((agent) => agent.id === agentId) ?? agents[0] ?? null;
  const [operatingMode, setOperatingMode] = useState<AgentOperatingMode>(
    selectedAgent?.operatingMode ?? "autonomous",
  );
  const [standingPrompt, setStandingPrompt] = useState(
    selectedAgent?.standingPrompt ?? selectedAgent?.mission ?? "",
  );
  const [cadenceMinutes, setCadenceMinutes] = useState(
    String(selectedAgent?.cadenceMinutes ?? 60),
  );
  const [maxActionsPerDay, setMaxActionsPerDay] = useState(
    String(selectedAgent?.maxActionsPerDay ?? 25),
  );
  const [maxEmailsPerDay, setMaxEmailsPerDay] = useState(
    String(selectedAgent?.maxEmailsPerDay ?? 10),
  );
  const [dailyBudgetUsd, setDailyBudgetUsd] = useState(
    String(selectedAgent?.dailyBudgetUsd ?? 0),
  );
  const [monthlyBudgetUsd, setMonthlyBudgetUsd] = useState(
    String(selectedAgent?.monthlyBudgetUsd ?? 0),
  );
  const [requireApprovalForRiskyActions, setRequireApprovalForRiskyActions] =
    useState(selectedAgent?.requireApprovalForRiskyActions ?? true);

  function applyAgent(nextAgentId: string) {
    setAgentId(nextAgentId);
    const nextAgent = agents.find((agent) => agent.id === nextAgentId);

    if (!nextAgent) {
      return;
    }

    setOperatingMode(nextAgent.operatingMode ?? "autonomous");
    setStandingPrompt(nextAgent.standingPrompt ?? nextAgent.mission);
    setCadenceMinutes(String(nextAgent.cadenceMinutes ?? 60));
    setMaxActionsPerDay(String(nextAgent.maxActionsPerDay ?? 25));
    setMaxEmailsPerDay(String(nextAgent.maxEmailsPerDay ?? 10));
    setDailyBudgetUsd(String(nextAgent.dailyBudgetUsd));
    setMonthlyBudgetUsd(String(nextAgent.monthlyBudgetUsd));
    setRequireApprovalForRiskyActions(
      nextAgent.requireApprovalForRiskyActions ?? true,
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <form action={formAction} className="panel rounded-lg p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="field-label">Schedule</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">
              Let it run on schedule
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
              Turn an agent into an ongoing worker.
            </p>
          </div>
          {selectedAgent ? <ModeBadge agent={selectedAgent} /> : null}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
        <FieldBlock label="Agent" hint="Choose one.">
            <select
              name="agentId"
              required
              value={agentId}
              onChange={(event) => applyAgent(event.target.value)}
              className="select-surface"
              disabled={agents.length === 0}
            >
              {agents.length === 0 ? <option value="">Create an agent first</option> : null}
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </FieldBlock>
          <FieldBlock label="Mode" hint="On or paused.">
            <select
              name="operatingMode"
              value={operatingMode}
              onChange={(event) =>
                setOperatingMode(event.target.value as AgentOperatingMode)
              }
              className="select-surface"
              disabled={!selectedAgent}
            >
              <option value="autonomous">Autonomous</option>
              <option value="manual">Paused/manual only</option>
            </select>
          </FieldBlock>
        </div>

        <FieldBlock
          label="Standing prompt"
          hint="The repeated job."
          className="mt-4"
        >
          <textarea
            name="standingPrompt"
            rows={4}
            required
            value={standingPrompt}
            onChange={(event) => setStandingPrompt(event.target.value)}
            className="textarea-surface"
            disabled={!selectedAgent}
          />
        </FieldBlock>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <FieldBlock label="Cadence" hint="How often it runs.">
            <select
              name="cadenceMinutes"
              value={cadenceMinutes}
              onChange={(event) => setCadenceMinutes(event.target.value)}
              className="select-surface"
              disabled={!selectedAgent}
            >
              <option value="15">Every 15 minutes</option>
              <option value="30">Every 30 minutes</option>
              <option value="60">Hourly</option>
              <option value="360">Every 6 hours</option>
              <option value="1440">Daily</option>
            </select>
          </FieldBlock>
          <FieldBlock label="Actions/day" hint="0 means no cap.">
            <input
              name="maxActionsPerDay"
              type="number"
              min="0"
              step="1"
              value={maxActionsPerDay}
              onChange={(event) => setMaxActionsPerDay(event.target.value)}
              className="input-surface"
              disabled={!selectedAgent}
            />
          </FieldBlock>
          <FieldBlock label="Emails/day" hint="0 means no sends.">
            <input
              name="maxEmailsPerDay"
              type="number"
              min="0"
              step="1"
              value={maxEmailsPerDay}
              onChange={(event) => setMaxEmailsPerDay(event.target.value)}
              className="input-surface"
              disabled={!selectedAgent}
            />
          </FieldBlock>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FieldBlock label="Daily spend" hint="Hard stop.">
            <input
              name="dailyBudgetUsd"
              type="number"
              min="0"
              step="1"
              value={dailyBudgetUsd}
              onChange={(event) => setDailyBudgetUsd(event.target.value)}
              className="input-surface"
              disabled={!selectedAgent}
            />
          </FieldBlock>
          <FieldBlock label="Monthly spend" hint="Hard stop.">
            <input
              name="monthlyBudgetUsd"
              type="number"
              min="0"
              step="1"
              value={monthlyBudgetUsd}
              onChange={(event) => setMonthlyBudgetUsd(event.target.value)}
              className="input-surface"
              disabled={!selectedAgent}
            />
          </FieldBlock>
        </div>

        <label className="mt-4 flex items-start gap-3 rounded-md border border-line bg-white/78 p-4">
          <input
            name="requireApprovalForRiskyActions"
            type="checkbox"
            checked={requireApprovalForRiskyActions}
            onChange={(event) =>
              setRequireApprovalForRiskyActions(event.target.checked)
            }
            className="mt-1"
            disabled={!selectedAgent}
          />
          <span>
            <span className="block text-sm font-semibold text-ink">
              Ask before risky actions
            </span>
            <span className="mt-1 block text-sm leading-6 text-muted">
              Money, sends, trades, deletes, deploys, and exports pause.
            </span>
          </span>
        </label>

        {state.error ? (
          <p className="mt-4 rounded-md border border-danger/15 bg-red-50 px-4 py-3 text-sm text-danger">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="mt-4 rounded-md border border-success/15 bg-green-50 px-4 py-3 text-sm text-success">
            {state.success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || !selectedAgent}
          className="mt-5 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Saving autonomous rules..." : "Save autonomous rules"}
        </button>
      </form>

      <div className="panel-strong rounded-lg p-5 md:p-6">
        <p className="field-label">Run</p>
        <h2 className="mt-2 text-xl font-semibold text-ink">
          Start a cycle
        </h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          Queue due agents and process their next task.
        </p>

        <div className="mt-5 grid gap-3">
          <EngineStep text="Find due agents." />
          <EngineStep text="Run the standing prompt." />
          <EngineStep text="Check the rules." />
          <EngineStep text="Pause risky actions." />
        </div>

        <div
          className={
            workerRuntime.configured
              ? "mt-5 rounded-md border border-success/15 bg-green-50 px-4 py-3"
              : "mt-5 rounded-md border border-[#edd89b] bg-[#fff7e2] px-4 py-3"
          }
        >
          <p
            className={
              workerRuntime.configured
                ? "text-sm font-semibold text-success"
                : "text-sm font-semibold text-[#8d6200]"
            }
          >
            {workerRuntime.configured
              ? "Real worker runtime is ready"
              : "Real worker runtime needs a key"}
          </p>
          <p
            className={
              workerRuntime.configured
                ? "mt-2 text-sm leading-6 text-success"
                : "mt-2 text-sm leading-6 text-[#8d6200]"
            }
          >
            {workerRuntime.detail}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <form action={workerAction}>
            <button
              type="submit"
              disabled={workerPending || !workerRuntime.configured}
              className="rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
            >
              {workerPending ? "Running agents..." : "Run agent cycle now"}
            </button>
          </form>

          <form action={tickAction}>
            <button
              type="submit"
              disabled={tickPending}
              className="rounded-md border border-line bg-white/90 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {tickPending ? "Queueing..." : "Queue due runs only"}
            </button>
          </form>
        </div>

        {workerState.error ? (
          <p className="mt-4 rounded-md border border-danger/15 bg-red-50 px-4 py-3 text-sm text-danger">
            {workerState.error}
          </p>
        ) : null}

        {workerState.success ? (
          <div className="mt-4 rounded-md border border-success/15 bg-green-50 px-4 py-3 text-sm text-success">
            <p>{workerState.success}</p>
            {workerState.decisions.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {workerState.decisions.slice(0, 8).map((decision) => (
                  <p key={decision} className="text-xs leading-5 text-success">
                    {decision}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {tickState.error ? (
          <p className="mt-4 rounded-md border border-danger/15 bg-red-50 px-4 py-3 text-sm text-danger">
            {tickState.error}
          </p>
        ) : null}

        {tickState.success ? (
          <p className="mt-4 rounded-md border border-success/15 bg-green-50 px-4 py-3 text-sm text-success">
            {tickState.success}
          </p>
        ) : null}

        {selectedAgent ? (
          <div className="mt-6 rounded-md border border-line bg-white/86 p-4">
            <p className="field-label">Selected agent schedule</p>
            <p className="mt-2 text-base font-semibold text-ink">
              {selectedAgent.name}
            </p>
            <div className="mt-3 grid gap-3">
              <InfoRow
                label="Next run"
                value={selectedAgent.nextRunAt ? formatDateTime(selectedAgent.nextRunAt) : "Not scheduled"}
              />
              <InfoRow
                label="Last autonomous run"
                value={
                  selectedAgent.lastAutonomousRunAt
                    ? formatDateTime(selectedAgent.lastAutonomousRunAt)
                    : "No autonomous cycle yet"
                }
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ModeBadge({ agent }: { agent: RegisteredAgent }) {
  const autonomous = agent.operatingMode === "autonomous";

  return (
    <span
      className={
        autonomous
          ? "rounded-full border border-success/18 bg-green-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-success"
          : "rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted"
      }
    >
      {autonomous ? "autonomous" : "manual"}
    </span>
  );
}

function EngineStep({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-line bg-white/86 px-4 py-3 text-sm leading-6 text-muted">
      {text}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white/92 px-3 py-3">
      <p className="field-label">{label}</p>
      <p className="mt-2 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function FieldBlock({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      <div className="mt-2">{children}</div>
      <p className="field-note">{hint}</p>
    </label>
  );
}

function formatDateTime(value: string) {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(parsed));
}
