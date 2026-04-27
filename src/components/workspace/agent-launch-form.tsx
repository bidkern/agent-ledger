"use client";

import { useActionState, useMemo, useState, type ReactNode } from "react";
import { launchAgentAction } from "@/app/workspace/agents/actions";
import type {
  AgentPermissionBinding,
  AgentRun,
  RegisteredAgent,
  VaultItem,
} from "@/data/types";

const initialState = {
  error: "",
  success: "",
  runId: "",
  actionLogId: "",
};

export function AgentLaunchForm({
  agents,
  vaultItems,
  permissions,
  runs,
}: {
  agents: RegisteredAgent[];
  vaultItems: VaultItem[];
  permissions: AgentPermissionBinding[];
  runs: AgentRun[];
}) {
  const [state, formAction, pending] = useActionState(
    launchAgentAction,
    initialState,
  );
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const selectedAgent =
    agents.find((agent) => agent.id === agentId) ?? agents[0] ?? null;
  const boundPermissions = useMemo(
    () =>
      selectedAgent
        ? permissions.filter((permission) => permission.agentId === selectedAgent.id)
        : [],
    [permissions, selectedAgent],
  );
  const vaultMap = useMemo(
    () => new Map(vaultItems.map((item) => [item.id, item])),
    [vaultItems],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <form action={formAction} className="panel rounded-lg p-5 md:p-6">
        <p className="field-label">Step 5</p>
        <h2 className="mt-2 text-xl font-semibold text-ink">
          Run a test
        </h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          Start with dry run. Nothing external happens.
        </p>

        <div className="mt-5 grid gap-4">
          <FieldBlock label="Agent" hint="Who runs.">
            <select
              name="agentId"
              required
              value={agentId}
              onChange={(event) => setAgentId(event.target.value)}
              className="select-surface"
              disabled={agents.length === 0}
            >
              {agents.length === 0 ? <option value="">Create an agent first</option> : null}
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} / {agent.autonomy}
                </option>
              ))}
            </select>
          </FieldBlock>

          <FieldBlock label="Task" hint="What should it try?">
            <textarea
              name="task"
              rows={4}
              required
              className="textarea-surface"
              placeholder="Prepare a test purchase plan using the $1 virtual card, but stop before checkout."
            />
          </FieldBlock>

          <div className="grid gap-4 md:grid-cols-2">
            <FieldBlock label="Mode" hint="Dry run first.">
              <select name="launchMode" defaultValue="dry-run" className="select-surface">
                <option value="dry-run">Dry run</option>
                <option value="supervised">Supervised</option>
                <option value="autopilot">Autopilot</option>
              </select>
            </FieldBlock>
            <FieldBlock label="Max spend" hint="Optional cap.">
              <input
                name="maxSpendUsd"
                type="number"
                min="0"
                step="1"
                className="input-surface"
                placeholder="1"
              />
            </FieldBlock>
          </div>
        </div>

        {selectedAgent ? (
          <div className="mt-5 rounded-md border border-line bg-white/82 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">{selectedAgent.name}</p>
              <span className="rounded-full border border-line bg-white px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted">
                {boundPermissions.length} permission{boundPermissions.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-7 text-muted">
              {selectedAgent.mission}
            </p>
          </div>
        ) : null}

        {state.error ? (
          <p className="mt-4 rounded-md border border-danger/15 bg-red-50 px-4 py-3 text-sm text-danger">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <div className="mt-4 rounded-md border border-success/15 bg-green-50 px-4 py-3 text-sm text-success">
            <p>{state.success}</p>
            <p className="mt-1">Run ID: {state.runId}</p>
            <p className="mt-1">Action log ID: {state.actionLogId}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending || agents.length === 0}
          className="mt-5 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Running test..." : "Run manual test"}
        </button>
      </form>

      <div className="panel-strong rounded-lg p-5 md:p-6">
        <p className="field-label">Recent tests</p>
        <h2 className="mt-2 text-xl font-semibold text-ink">
          What happened
        </h2>
        <div className="mt-5 grid gap-4">
          {runs.length > 0 ? (
            runs.slice(0, 6).map((run) => (
              <article key={run.id} className="rounded-md border border-line bg-white/86 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink">{run.agentName}</p>
                    <p className="mt-2 text-sm leading-7 text-muted">{run.task}</p>
                  </div>
                  <RunBadge status={run.status} />
                </div>
                <p className="mt-3 text-sm leading-7 text-muted">{run.summary}</p>
                <div className="mt-3 grid gap-2">
                  {run.steps.map((step) => (
                    <div
                      key={step}
                      className="rounded-md border border-line bg-[#f7f9fc] px-3 py-2 text-sm text-muted"
                    >
                      {step}
                    </div>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-line bg-white/72 p-4 text-sm leading-7 text-muted">
              No launches yet. Create an agent, bind at least one permission, and
              run a dry launch.
            </div>
          )}
        </div>

        <div className="mt-6">
          <p className="field-label">Permissions for selected agent</p>
          <div className="mt-3 grid gap-3">
            {boundPermissions.length > 0 ? (
              boundPermissions.map((permission) => {
                const item = vaultMap.get(permission.vaultItemId);

                return (
                  <div
                    key={permission.id}
                    className="rounded-md border border-line bg-white/86 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">
                        {item?.label ?? "Unknown vault item"}
                      </p>
                      <span className="rounded-full border border-line bg-white px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted">
                        {permission.scope}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-muted">
                      {item?.kind ?? "unknown"}{" "}
                      {permission.requiresApproval
                        ? "requires approval before external execution."
                        : "can be used without an approval stop."}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-md border border-dashed border-line bg-white/72 p-4 text-sm leading-7 text-muted">
                No permission bindings yet for this agent.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RunBadge({ status }: { status: AgentRun["status"] }) {
  const styles =
    status === "completed"
      ? "border-success/18 bg-green-50 text-success"
      : status === "needs-approval" || status === "queued" || status === "running"
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
