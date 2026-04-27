"use client";

import { useActionState, useState, type ReactNode } from "react";
import { registerAgentAction } from "@/app/workspace/agents/actions";
import type {
  AgentAutonomy,
  AgentOperatingMode,
  AgentRuntimeConnection,
  AgentTemplate,
} from "@/data/types";

const initialState = {
  error: "",
  success: "",
  savedAgentId: "",
};

export function AgentForm({
  templates,
  runtimeConnections,
}: {
  templates: AgentTemplate[];
  runtimeConnections: AgentRuntimeConnection[];
}) {
  const [state, formAction, pending] = useActionState(
    registerAgentAction,
    initialState,
  );
  const firstTemplate = templates[0];
  const [templateId, setTemplateId] = useState(firstTemplate?.id ?? "custom");
  const selectedTemplate =
    templates.find((template) => template.id === templateId) ?? null;
  const [name, setName] = useState(firstTemplate?.name ?? "");
  const [mission, setMission] = useState(firstTemplate?.starterTask ?? "");
  const [model, setModel] = useState(firstTemplate?.defaultModel ?? "gpt-5.4-mini");
  const [autonomy, setAutonomy] = useState<AgentAutonomy>(
    firstTemplate?.defaultAutonomy ?? "execute",
  );
  const [operatingMode, setOperatingMode] =
    useState<AgentOperatingMode>("autonomous");
  const [cadenceMinutes, setCadenceMinutes] = useState("60");
  const [maxActionsPerDay, setMaxActionsPerDay] = useState("25");
  const [maxEmailsPerDay, setMaxEmailsPerDay] = useState("5");
  const [requireApprovalForRiskyActions, setRequireApprovalForRiskyActions] =
    useState(true);
  const [dailyBudgetUsd, setDailyBudgetUsd] = useState(
    String(firstTemplate?.defaultDailyBudgetUsd ?? 0),
  );
  const [monthlyBudgetUsd, setMonthlyBudgetUsd] = useState(
    String(firstTemplate?.defaultMonthlyBudgetUsd ?? 0),
  );
  const [allowedTools, setAllowedTools] = useState(
    firstTemplate?.defaultTools.join(", ") ?? "browser",
  );

  function applyTemplate(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    const template = templates.find((item) => item.id === nextTemplateId);

    if (!template) {
      return;
    }

    setName(template.name);
    setMission(template.starterTask);
    setModel(template.defaultModel);
    setAutonomy(template.defaultAutonomy);
    setOperatingMode("autonomous");
    setCadenceMinutes("60");
    setMaxActionsPerDay("25");
    setMaxEmailsPerDay(
      template.defaultTools.some((tool) => tool.includes("email") || tool.includes("gmail"))
        ? "5"
        : "0",
    );
    setRequireApprovalForRiskyActions(true);
    setDailyBudgetUsd(String(template.defaultDailyBudgetUsd));
    setMonthlyBudgetUsd(String(template.defaultMonthlyBudgetUsd));
    setAllowedTools(template.defaultTools.join(", "));
  }

  return (
    <form action={formAction} className="panel rounded-lg p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="field-label">Step 2</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            Make an agent
          </h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            Give it one job. Keep it narrow.
          </p>
        </div>
        {selectedTemplate ? (
          <span className="rounded-md border border-line bg-[#f7f9fc] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {selectedTemplate.category}
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Brain" hint="What powers this agent.">
          <select name="runtimeConnectionId" className="select-surface">
            <option value="none">No runtime yet</option>
            {runtimeConnections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.label} / {connection.provider}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Template" hint="A shortcut. You can change it.">
          <select
            name="templateId"
            value={templateId}
            onChange={(event) => applyTemplate(event.target.value)}
            className="select-surface"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
            <option value="custom">Custom agent</option>
          </select>
        </Field>

        <Field label="Name" hint="Short names are easiest to manage.">
          <input
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input-surface"
            placeholder="Inbox Agent"
          />
        </Field>

        <Field label="Owner" hint="Who watches it?">
          <input
            name="ownerEmail"
            type="email"
            required
            className="input-surface"
            placeholder="you@example.com"
          />
        </Field>
      </div>

      <Field label="Job" hint="Write the task like you are texting a helper.">
        <textarea
          name="standingPrompt"
          rows={4}
          required
          value={mission}
          onChange={(event) => setMission(event.target.value)}
          className="textarea-surface"
          placeholder="Check my inbox every hour, draft replies, and ask before sending anything."
        />
      </Field>
      <input type="hidden" name="mission" value={mission} />

      <details className="mt-5 rounded-md border border-line bg-[#f7f9fc] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          Safety limits
        </summary>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Model" hint="Default is fine.">
            <input
              name="model"
              required
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="input-surface"
              placeholder="gpt-5.4-mini"
            />
          </Field>
          <Field label="Autonomy" hint="Start supervised if unsure.">
            <select
              name="autonomy"
              value={autonomy}
              onChange={(event) => setAutonomy(event.target.value as AgentAutonomy)}
              className="select-surface"
            >
              <option value="suggest">Suggest only</option>
              <option value="execute">Supervised</option>
              <option value="autopilot">Autopilot</option>
            </select>
          </Field>
          <Field label="Mode" hint="Schedule or manual.">
            <select
              name="operatingMode"
              value={operatingMode}
              onChange={(event) =>
                setOperatingMode(event.target.value as AgentOperatingMode)
              }
              className="select-surface"
            >
              <option value="autonomous">Autonomous</option>
              <option value="manual">Manual only</option>
            </select>
          </Field>
          <Field label="Cadence" hint="How often it wakes up.">
            <select
              name="cadenceMinutes"
              value={cadenceMinutes}
              onChange={(event) => setCadenceMinutes(event.target.value)}
              className="select-surface"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">Hourly</option>
              <option value="360">6 hours</option>
              <option value="1440">Daily</option>
            </select>
          </Field>
          <Field label="Actions/day" hint="0 means no cap.">
            <input
              name="maxActionsPerDay"
              type="number"
              min="0"
              step="1"
              value={maxActionsPerDay}
              onChange={(event) => setMaxActionsPerDay(event.target.value)}
              className="input-surface"
            />
          </Field>
          <Field label="Emails/day" hint="0 means no sends.">
            <input
              name="maxEmailsPerDay"
              type="number"
              min="0"
              step="1"
              value={maxEmailsPerDay}
              onChange={(event) => setMaxEmailsPerDay(event.target.value)}
              className="input-surface"
            />
          </Field>
          <Field label="Daily spend" hint="Hard stop for spend proposals.">
            <input
              name="dailyBudgetUsd"
              type="number"
              min="0"
              step="1"
              value={dailyBudgetUsd}
              onChange={(event) => setDailyBudgetUsd(event.target.value)}
              className="input-surface"
            />
          </Field>
          <Field label="Monthly spend" hint="Hard monthly cap.">
            <input
              name="monthlyBudgetUsd"
              type="number"
              min="0"
              step="1"
              value={monthlyBudgetUsd}
              onChange={(event) => setMonthlyBudgetUsd(event.target.value)}
              className="input-surface"
            />
          </Field>
          <Field label="Tools" hint="Only tools listed here.">
            <input
              name="allowedTools"
              value={allowedTools}
              onChange={(event) => setAllowedTools(event.target.value)}
              className="input-surface"
              placeholder="browser, gmail, github"
            />
          </Field>
        </div>

        <label className="mt-4 flex items-start gap-3 rounded-md border border-line bg-white p-4">
          <input
            name="requireApprovalForRiskyActions"
            type="checkbox"
            checked={requireApprovalForRiskyActions}
            onChange={(event) =>
              setRequireApprovalForRiskyActions(event.target.checked)
            }
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-semibold text-ink">
              Ask before risky actions
            </span>
            <span className="mt-1 block text-sm leading-6 text-muted">
              Sends, spends, trades, refunds, deletes, deploys, and exports pause.
            </span>
          </span>
        </label>
      </details>

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
        disabled={pending}
        className="mt-5 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Creating..." : "Create agent"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="field-label">{label}</span>
      <div className="mt-2">{children}</div>
      <p className="field-note">{hint}</p>
    </label>
  );
}
