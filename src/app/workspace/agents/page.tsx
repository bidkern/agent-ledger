import Link from "next/link";
import { AgentForm } from "@/components/workspace/agent-form";
import { AgentLaunchForm } from "@/components/workspace/agent-launch-form";
import { AutonomousAgentForm } from "@/components/workspace/autonomous-agent-form";
import { BrowserEnvironmentForm } from "@/components/workspace/browser-environment-form";
import { PermissionBindingForm } from "@/components/workspace/permission-binding-form";
import { RuntimeConnectionForm } from "@/components/workspace/runtime-connection-form";
import { VaultConnectionTestForm } from "@/components/workspace/vault-connection-test-form";
import { VaultForm } from "@/components/workspace/vault-form";
import { WalletHandoffLab } from "@/components/workspace/wallet-handoff-lab";
import { WorkspacePageHero } from "@/components/workspace/workspace-page-hero";
import { listAgentTemplates } from "@/data/agent-templates";
import { requireSession } from "@/data/auth";
import { getAgentWorkerRuntimeStatus } from "@/data/local-worker";
import {
  listAgentPermissionBindings,
  listAgentRuntimeConnections,
  listAgentRuns,
  listAgents,
  listVaultItems,
} from "@/data/repository";
import type {
  AgentPermissionBinding,
  AgentTemplate,
  RegisteredAgent,
  VaultItem,
} from "@/data/types";

export const metadata = {
  title: "Agent Hub",
};

export default async function AgentsPage() {
  await requireSession();
  const [agents, templates, vaultItems, permissions, runs, workerRuntime] =
    await Promise.all([
      listAgents(),
      Promise.resolve(listAgentTemplates()),
      listVaultItems(),
      listAgentPermissionBindings(),
      listAgentRuns(8),
      getAgentWorkerRuntimeStatus(),
    ]);
  const runtimeConnections = await listAgentRuntimeConnections();
  return (
    <main className="relative flex-1 overflow-hidden px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <WorkspacePageHero
          current="agents"
          eyebrow="Agent Hub"
          title="Make a safe agent in five steps."
          body="Connect the brain, create the agent, add one resource, give one permission, then run a dry test."
          actions={
            <>
              <Link
                href="/workspace/implementation-guide"
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Setup guide
              </Link>
              <Link
                href="/workspace/logs"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/92"
              >
                Logs
              </Link>
            </>
          }
        >
          <SetupPath />
        </WorkspacePageHero>

        <section className="grid gap-4 md:grid-cols-4">
          <StatusCard label="Brains connected" value={String(runtimeConnections.length)} />
          <StatusCard label="Agents made" value={String(agents.length)} />
          <StatusCard label="Resources added" value={String(vaultItems.length)} />
          <StatusCard label="Permissions set" value={String(permissions.length)} />
        </section>

        <RuntimeConnectionForm connections={runtimeConnections} />

        <details className="panel-strong rounded-lg p-5 md:p-6">
          <summary className="cursor-pointer text-base font-semibold text-ink">
            Need to use a website account instead of an API key?
          </summary>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            Use this only when a provider does not give you a clean API key.
            You sign into a fresh browser profile yourself; Agent Ledger stores
            the profile name, not the password.
          </p>
          <div className="mt-5">
            <BrowserEnvironmentForm />
          </div>
        </details>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <AgentForm
            templates={templates}
            runtimeConnections={runtimeConnections}
          />
          <VaultForm />
        </section>

        <AutonomousAgentForm agents={agents} workerRuntime={workerRuntime} />

        <WalletHandoffLab agents={agents} />

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <PermissionBindingForm agents={agents} vaultItems={vaultItems} />
          <AgentLaunchForm
            agents={agents}
            vaultItems={vaultItems}
            permissions={permissions}
            runs={runs}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <article className="panel rounded-lg p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="field-label">Agent registry</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  Specialists available to launch
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {agents.length > 0 ? (
                agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    template={templates.find(
                      (template) => template.id === agent.templateId,
                    )}
                    permissions={permissions.filter(
                      (permission) => permission.agentId === agent.id,
                    )}
                  />
                ))
              ) : (
                <EmptySurface text="No agents yet. Start with Step 2: make an agent." />
              )}
            </div>
          </article>

          <article className="panel-strong rounded-lg p-5 md:p-6">
            <p className="field-label">Resources</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              What agents can touch
            </h2>
            <div className="mt-5 grid gap-4">
              {vaultItems.length > 0 ? (
                vaultItems.map((item) => <VaultItemCard key={item.id} item={item} />)
              ) : (
                <EmptySurface text="No resources yet. Add one safe test resource in Step 3." />
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

function SetupPath() {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      <StepPill number="1" label="Connect brain" />
      <StepPill number="2" label="Make agent" />
      <StepPill number="3" label="Add resource" />
      <StepPill number="4" label="Give permission" />
      <StepPill number="5" label="Run test" />
    </div>
  );
}

function StepPill({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/6 px-3 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-semibold text-ink">
        {number}
      </span>
      <span className="text-sm font-semibold text-white">{label}</span>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="soft-card-strong rounded-lg p-5">
      <p className="field-label">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
    </article>
  );
}

function AgentCard({
  agent,
  template,
  permissions,
}: {
  agent: RegisteredAgent;
  template?: AgentTemplate;
  permissions: AgentPermissionBinding[];
}) {
  return (
    <article className="rounded-md border border-line bg-white/84 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-ink">{agent.name}</p>
          <p className="mt-1 text-sm text-muted">
            {template?.name ?? "Custom"} / {agent.model}
          </p>
          <p className="mt-1 text-sm text-muted">
            Runtime: {agent.runtimeLabel ?? agent.runtimeProvider ?? "not assigned"}
          </p>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      <p className="mt-3 text-sm leading-7 text-muted">{agent.mission}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InfoRow label="Owner" value={agent.ownerEmail} />
        <InfoRow
          label="Budget"
          value={`$${agent.dailyBudgetUsd}/day`}
        />
        <InfoRow label="Autonomy" value={agent.autonomy} />
        <InfoRow label="Mode" value={agent.operatingMode ?? "autonomous"} />
        <InfoRow
          label="Permissions"
          value={String(permissions.length)}
        />
        <InfoRow
          label="Cadence"
          value={
            (agent.operatingMode ?? "autonomous") === "autonomous"
              ? everyMinutes(agent.cadenceMinutes ?? 60)
              : "manual only"
          }
        />
      </div>

      <div className="mt-4 rounded-md border border-line bg-[#f7f9fc] px-3 py-3">
        <p className="field-label">Customer guidelines</p>
        <p className="mt-2 text-sm leading-7 text-muted">
          {agent.maxActionsPerDay ?? 25} actions/day, {agent.maxEmailsPerDay ?? 10} emails/day, ${agent.dailyBudgetUsd}/day.
          {agent.requireApprovalForRiskyActions !== false
            ? " Risky actions still pause for approval."
            : " Risky actions can proceed if they stay inside policies and caps."}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {agent.allowedTools.length > 0 ? (
          agent.allowedTools.map((tool) => (
            <span
              key={tool}
              className="rounded-full border border-line bg-white px-3 py-1 text-xs text-muted"
            >
              {tool}
            </span>
          ))
        ) : (
          <span className="rounded-full border border-line bg-white px-3 py-1 text-xs text-muted">
            no explicit tools
          </span>
        )}
      </div>

      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted">
        Last heartbeat {formatDateTime(agent.lastHeartbeatAt)}
      </p>
    </article>
  );
}

function VaultItemCard({ item }: { item: VaultItem }) {
  return (
    <article className="rounded-md border border-line bg-white/84 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-ink">{item.label}</p>
          <p className="mt-1 text-sm text-muted">
            {item.provider || item.kind}
            {item.handle ? ` / ${item.handle}` : ""}
          </p>
        </div>
        <RiskBadge risk={item.riskLevel} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InfoRow label="Kind" value={item.kind} />
        <InfoRow label="Secret" value={item.hasSecret ? item.maskedSecret ?? "stored" : "not stored"} />
      </div>
      {item.notes ? (
        <p className="mt-4 rounded-md border border-line bg-[#f7f9fc] px-3 py-3 text-sm leading-7 text-muted">
          {item.notes}
        </p>
      ) : null}
      <VaultConnectionTestForm vaultItemId={item.id} />
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white/92 px-3 py-3">
      <p className="field-label">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "active" | "paused" | "attention";
}) {
  const styles =
    status === "active"
      ? "border-success/18 bg-green-50 text-success"
      : status === "attention"
        ? "border-[#edd89b] bg-[#fff7e2] text-[#8d6200]"
        : "border-line bg-white text-muted";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${styles}`}
    >
      {status}
    </span>
  );
}

function RiskBadge({ risk }: { risk: VaultItem["riskLevel"] }) {
  const styles =
    risk === "low"
      ? "border-success/18 bg-green-50 text-success"
      : risk === "medium"
        ? "border-[#edd89b] bg-[#fff7e2] text-[#8d6200]"
        : "border-danger/18 bg-red-50 text-danger";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${styles}`}
    >
      {risk}
    </span>
  );
}

function EmptySurface({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-line bg-white/72 p-4 text-sm leading-7 text-muted">
      {text}
    </div>
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

function everyMinutes(value: number) {
  if (value === 1440) {
    return "daily";
  }

  if (value % 60 === 0) {
    const hours = value / 60;
    return `every ${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `every ${value} minutes`;
}
