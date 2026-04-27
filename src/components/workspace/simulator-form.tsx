"use client";

import { useActionState, useState, type ReactNode } from "react";
import { simulateAgentRunAction } from "@/app/workspace/agents/actions";
import type { RegisteredAgent, SimulationScenario } from "@/data/types";

const initialState = {
  error: "",
  success: "",
  actionLogId: "",
  approvalRequestId: "",
};

export function SimulatorForm({
  agents,
  scenarios,
}: {
  agents: RegisteredAgent[];
  scenarios: Array<{
    scenario: SimulationScenario;
    title: string;
    actionType: string;
    target: string;
    tool: string;
    vendor?: string;
    amountUsd?: number;
    summary: string;
    demoOutcome: "completed" | "pending-approval" | "blocked";
    demoWhy: string;
  }>;
}) {
  const [state, formAction, pending] = useActionState(
    simulateAgentRunAction,
    initialState,
  );
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [scenario, setScenario] = useState<SimulationScenario>(
    scenarios[0]?.scenario ?? "software-purchase",
  );
  const selectedAgent =
    agents.find((candidate) => candidate.id === agentId) ?? agents[0] ?? null;
  const selectedScenario =
    scenarios.find((candidate) => candidate.scenario === scenario) ??
    scenarios[0] ??
    null;

  return (
    <form action={formAction} className="panel-strong rounded-[2rem] p-6 md:p-7">
      <p className="eyebrow text-xs font-medium text-muted">
        Demo simulator
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-ink">
        Trigger a governed agent action
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
        This is the fastest way to understand the product. Pick an agent, simulate
        a risky action, and watch it land in logs or the approval queue depending on
        policy.
      </p>

      <div className="soft-card mt-6 rounded-[1.55rem] p-5">
        <p className="text-sm font-semibold text-ink">Fastest path through the demo</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <RecipeCard
            title="See a completed action"
            text="Choose Revenue Agent plus Buy a new SaaS seat."
            tone="success"
          />
          <RecipeCard
            title="See an approval request"
            text="Choose Finance Agent plus Issue a customer refund."
            tone="warning"
          />
          <RecipeCard
            title="See a blocked action"
            text="Choose Finance Agent plus Use an unapproved tool."
            tone="danger"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <FieldBlock
          label="Choose the worker"
          hint="Pick the named agent whose action should appear in the ledger."
        >
          <select
            name="agentId"
            required
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
            className="select-surface"
          >
            {agents.length === 0 ? (
              <option value="">No agents available</option>
            ) : null}
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} / {agent.autonomy}
              </option>
            ))}
          </select>
        </FieldBlock>

        <FieldBlock
          label="Choose the action"
          hint="Each scenario is designed to create a clear control-plane outcome."
        >
          <select
            name="scenario"
            required
            value={scenario}
            onChange={(event) =>
              setScenario(event.target.value as SimulationScenario)
            }
            className="select-surface"
          >
            {scenarios.map((scenarioOption) => (
              <option key={scenarioOption.scenario} value={scenarioOption.scenario}>
                {scenarioOption.title}
              </option>
            ))}
          </select>
        </FieldBlock>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="soft-card rounded-[1.5rem] p-5">
          <p className="field-label">Selected worker</p>
          {selectedAgent ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-semibold text-ink">{selectedAgent.name}</p>
                <span className="rounded-full border border-line bg-white px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted">
                  {selectedAgent.autonomy}
                </span>
              </div>
              <p className="text-sm leading-7 text-muted">{selectedAgent.mission}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <InfoPill
                  label="Owner"
                  value={selectedAgent.ownerEmail}
                />
                <InfoPill
                  label="Budget"
                  value={`$${selectedAgent.dailyBudgetUsd}/day`}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedAgent.allowedTools.map((tool) => (
                  <span
                    key={tool}
                    className="rounded-full border border-line bg-white px-3 py-1 text-xs text-muted"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-7 text-muted">
              Register an agent first so the simulator has a worker to run.
            </p>
          )}
        </div>

        <div className="soft-card rounded-[1.5rem] p-5">
          <p className="field-label">Selected scenario</p>
          {selectedScenario ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-lg font-semibold text-ink">{selectedScenario.title}</p>
                <OutcomeBadge status={selectedScenario.demoOutcome} />
              </div>
              <p className="text-sm leading-7 text-muted">{selectedScenario.summary}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <InfoPill
                  label="Action"
                  value={selectedScenario.actionType}
                />
                <InfoPill
                  label="Tool"
                  value={selectedScenario.tool}
                />
                <InfoPill
                  label="Target"
                  value={selectedScenario.target}
                />
                <InfoPill
                  label="Amount"
                  value={formatCurrency(selectedScenario.amountUsd)}
                />
              </div>
              <p className="rounded-[1.2rem] border border-line bg-white/92 px-4 py-4 text-sm leading-7 text-muted">
                <span className="font-semibold text-ink">Default demo outcome:</span>{" "}
                {selectedScenario.demoWhy}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-7 text-muted">
              Choose a scenario to preview what the simulator will generate.
            </p>
          )}
        </div>
      </div>

      {state.error ? (
        <p className="mt-4 rounded-2xl border border-danger/15 bg-red-50 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <div className="mt-4 rounded-2xl border border-success/15 bg-green-50 px-4 py-3 text-sm text-success">
          <p>{state.success}</p>
          <p className="mt-1">Action log ID: {state.actionLogId}</p>
          {state.approvalRequestId ? (
            <p className="mt-1">Approval request ID: {state.approvalRequestId}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <a
              href="/workspace/logs"
              className="rounded-full border border-success/25 bg-white px-3 py-2 font-medium text-success transition hover:bg-white/90"
            >
              Open logs
            </a>
            {state.approvalRequestId ? (
              <a
                href="/workspace/approvals"
                className="rounded-full border border-success/25 bg-white px-3 py-2 font-medium text-success transition hover:bg-white/90"
              >
                Open approvals
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || agents.length === 0}
        className="mt-5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Simulating..." : "Run governed simulation"}
      </button>
    </form>
  );
}

function FieldBlock({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <div className="mt-2">{children}</div>
      <p className="field-note">{hint}</p>
    </label>
  );
}

function RecipeCard({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "success" | "warning" | "danger";
}) {
  const badgeClass =
    tone === "success"
      ? "border-success/18 bg-green-50 text-success"
      : tone === "warning"
        ? "border-[#edd89b] bg-[#fff7e2] text-[#8d6200]"
        : "border-danger/18 bg-red-50 text-danger";

  return (
    <div className="rounded-[1.25rem] border border-line bg-white/92 px-4 py-4">
      <span
        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${badgeClass}`}
      >
        {tone}
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-7 text-muted">{text}</p>
    </div>
  );
}

function OutcomeBadge({
  status,
}: {
  status: "completed" | "pending-approval" | "blocked";
}) {
  const styles =
    status === "completed"
      ? "border-success/18 bg-green-50 text-success"
      : status === "pending-approval"
        ? "border-[#edd89b] bg-[#fff7e2] text-[#8d6200]"
        : "border-danger/18 bg-red-50 text-danger";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${styles}`}
    >
      {status.replace("-", " ")}
    </span>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-line bg-white/92 px-4 py-4">
      <p className="field-label">{label}</p>
      <p className="mt-2 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function formatCurrency(value?: number) {
  if (typeof value !== "number") {
    return "No direct spend";
  }

  return `$${value}`;
}
