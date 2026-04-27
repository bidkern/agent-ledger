import Link from "next/link";
import { ActionStatusLegend } from "@/components/workspace/action-status-legend";
import { WorkspacePageHero } from "@/components/workspace/workspace-page-hero";
import { requireSession } from "@/data/auth";
import { listActionLogs } from "@/data/repository";

export const metadata = {
  title: "Logs",
};

export default async function LogsPage() {
  await requireSession();
  const logs = await listActionLogs();
  const blockedLogs = logs.filter((log) => log.status === "blocked").length;
  const reviewLogs = logs.filter(
    (log) => log.status === "pending-approval" || Boolean(log.approvalRequestId),
  ).length;
  const observedSpend = logs.reduce(
    (total, log) => total + (typeof log.amountUsd === "number" ? log.amountUsd : 0),
    0,
  );

  return (
    <main className="relative flex-1 overflow-hidden px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <WorkspacePageHero
          current="logs"
          eyebrow="Action ledger"
          title="Read the company through what the agents actually attempted."
          body="The log is the factual system of record. If you are wondering what the product does, this page answers it: each row shows who acted, what they tried, what policy fired, and how the system resolved it."
          actions={
            <>
              <Link
                href="/workspace/approvals"
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Open approvals
              </Link>
              <Link
                href="/workspace"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/92"
              >
                Overview
              </Link>
            </>
          }
        >
          <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="rounded-[1.55rem] border border-white/10 bg-white/6 p-5">
              <p className="eyebrow text-[11px] font-medium text-white/68">
                How to read a log
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <HeroFact
                  title="Who acted"
                  text="Every entry names the agent so responsibility stays attached to the action."
                />
                <HeroFact
                  title="What happened"
                  text="Action type, tool, target, and dollar impact explain what the agent tried to do."
                />
                <HeroFact
                  title="Why it resolved that way"
                  text="Policy hits and reasoning explain whether the system allowed, reviewed, or blocked it."
                />
                <HeroFact
                  title="Where to go next"
                  text="If a row is pending approval, move to the approvals queue. If it is blocked, inspect the policy set."
                />
              </div>
            </div>

            <div className="rounded-[1.55rem] border border-white/10 bg-white/6 p-5">
              <p className="eyebrow text-[11px] font-medium text-white/68">
                Outcome legend
              </p>
              <div className="mt-4">
                <ActionStatusLegend />
              </div>
            </div>
          </div>
        </WorkspacePageHero>

        <section className="grid gap-4 lg:grid-cols-4">
          <MetricCard label="Total log entries" value={String(logs.length)} />
          <MetricCard label="Review-related" value={String(reviewLogs)} />
          <MetricCard label="Blocked" value={String(blockedLogs)} />
          <MetricCard label="Observed spend" value={`$${observedSpend}`} />
        </section>

        <section className="panel rounded-[2rem] p-6 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow text-xs font-medium text-muted">Ledger feed</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                Every governed action in one place
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {logs.length > 0 ? (
              logs.map((log) => (
                <article
                  key={log.id}
                  className="soft-card rounded-[1.6rem] p-5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold text-ink">{log.summary}</p>
                        <StatusBadge status={log.status} />
                      </div>
                      <p className="mt-2 text-sm leading-7 text-muted">
                        {log.agentName} acted on {formatDateTime(log.createdAt)}.
                      </p>
                    </div>
                    <span className="rounded-full border border-line bg-white px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted">
                      {log.scenario}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <FactCard label="Action" value={log.actionType} />
                    <FactCard label="Target" value={log.target} />
                    <FactCard label="Tool / vendor" value={formatTool(log.tool, log.vendor)} />
                    <FactCard
                      label="Commercial impact"
                      value={
                        typeof log.amountUsd === "number"
                          ? `$${log.amountUsd}`
                          : "No direct spend"
                      }
                    />
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
                    <div className="rounded-[1.35rem] border border-line bg-white/92 px-4 py-4">
                      <p className="field-label">Why the agent tried it</p>
                      <p className="mt-3 text-sm leading-7 text-muted">
                        {log.reasoning}
                      </p>
                    </div>
                    <div className="rounded-[1.35rem] border border-line bg-white/92 px-4 py-4">
                      <p className="field-label">Policy hits</p>
                      {log.policyHits.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {log.policyHits.map((hit) => (
                            <span
                              key={hit}
                              className="rounded-full border border-line bg-white px-3 py-1 text-xs text-muted"
                            >
                              {hit}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm leading-7 text-muted">
                          No explicit policy matched. The action completed inside the
                          current control boundary.
                        </p>
                      )}

                      {log.approvalRequestId ? (
                        <p className="mt-4 text-sm leading-7 text-muted">
                          Approval request linked:{" "}
                          <span className="font-semibold text-ink">
                            {log.approvalRequestId}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-line bg-white/72 p-5 text-sm leading-7 text-muted">
                No action logs yet. Run a guided simulation from the Agents page to
                populate the ledger with a completed, reviewed, or blocked action.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function HeroFact({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-7 text-white/78">{text}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="soft-card-strong rounded-[1.6rem] p-5">
      <p className="field-label">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </article>
  );
}

function FactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-line bg-white/92 px-4 py-4">
      <p className="field-label">{label}</p>
      <p className="mt-2 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    | "allowed"
    | "completed"
    | "blocked"
    | "pending-approval"
    | "approved"
    | "rejected"
    | "failed";
}) {
  const styles =
    status === "allowed"
      ? "border-accent/25 bg-accent-soft text-ink"
      : status === "completed" || status === "approved"
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

function formatTool(tool: string, vendor?: string) {
  return vendor ? `${tool} / ${vendor}` : tool;
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
