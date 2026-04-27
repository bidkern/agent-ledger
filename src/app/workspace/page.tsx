import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { resetLocalDemoWorkspaceAction } from "@/app/workspace/actions";
import { ActionStatusLegend } from "@/components/workspace/action-status-legend";
import { WorkspacePageHero } from "@/components/workspace/workspace-page-hero";
import { requireSession } from "@/data/auth";
import { getWorkspaceSnapshot } from "@/data/dashboard";
import { DEMO_OPERATOR_EMAIL, isLocalDemoEnabled } from "@/data/local-demo";
import type { ActionLogStatus } from "@/data/types";

export const metadata = {
  title: "Mission Control",
};

const workspaceLinks = [
  {
    label: "Agent Hub",
    href: "/workspace/agents",
    summary: "Create specialist agents, bind permissions, and launch local runs.",
  },
  {
    label: "Implementation Guide",
    href: "/workspace/implementation-guide",
    summary: "Give customers a plain setup path for safe tests and real agent connections.",
  },
  {
    label: "Policies",
    href: "/workspace/policies",
    summary: "Edit the rules behind every allow, review, and block decision.",
  },
  {
    label: "Approvals",
    href: "/workspace/approvals",
    summary: "Handle the actions that need human judgment.",
  },
  {
    label: "Logs",
    href: "/workspace/logs",
    summary: "Read the record of what agents tried and what happened.",
  },
  {
    label: "Billing",
    href: "/workspace/billing",
    summary: "Manage pricing, subscription state, and protected spend.",
  },
  {
    label: "Founder Map",
    href: "/workspace/founder-map",
    summary: "Review the business model, moat, and build sequence.",
  },
] as const;

export default async function WorkspacePage() {
  const session = await requireSession();
  const snapshot = await getWorkspaceSnapshot();
  const localDemoSession =
    isLocalDemoEnabled() && session.email === DEMO_OPERATOR_EMAIL;
  const visibleApprovalCount = snapshot.pendingApprovals.length;
  const visibleRequestCount = snapshot.accessRequests.length;
  const visibleAgentCount = snapshot.agents.length;
  const visibleLogCount = snapshot.recentLogs.length;

  return (
    <main className="relative flex-1 overflow-hidden px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <WorkspacePageHero
          current="overview"
          eyebrow="Workspace overview"
          title="Start with approvals and recent actions."
          body="This workspace is the operator home screen. Use it to see what needs a decision, what agents did recently, and where to drill in next."
          actions={
            <>
              <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78">
                Signed in as{" "}
                <span className="font-medium text-white">{session.email}</span>
              </div>
              {localDemoSession ? (
                <form action={resetLocalDemoWorkspaceAction}>
                  <button
                    type="submit"
                    className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Reset demo
                  </button>
                </form>
              ) : null}
              <Link
                href="/"
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Public site
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/92"
                >
                  Sign out
                </button>
              </form>
            </>
          }
        >
          {localDemoSession ? (
            <div className="grid gap-3 lg:grid-cols-3">
              <QuickStartCard
                href="/workspace/approvals"
                title="Open approvals first"
                text="This is the fastest way to understand the product boundary."
              />
              <QuickStartCard
                href="/workspace/logs"
                title="Check the action log"
                text="See what agents attempted, why they did it, and how policy handled it."
              />
              <QuickStartCard
                href="/workspace/agents"
                title="Run a simulation"
                text="Create fresh activity so the rest of the workspace becomes easier to read."
              />
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              <QuickSummary
                label="Open approvals"
                value={`${visibleApprovalCount} waiting`}
                text="These are the actions still waiting for a decision."
              />
              <QuickSummary
                label="Recent actions"
                value={`${visibleLogCount} visible`}
                text="Use the log to understand what the system has done lately."
              />
              <QuickSummary
                label="Workspace scope"
                value={`${visibleAgentCount} agents`}
                text="Each agent has its own owner, budget, and tool list."
              />
            </div>
          )}
        </WorkspacePageHero>

        <section className="grid gap-4 lg:grid-cols-4">
          {snapshot.metrics.map((metric) => (
            <article key={metric.label} className="soft-card-strong rounded-[1.55rem] p-5">
              <p className="field-label">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold text-ink">{metric.value}</p>
              <p className="mt-3 text-sm leading-7 text-muted">{metric.note}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
          <article className="panel rounded-[1.9rem] p-6 md:p-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-xs font-medium text-muted">Needs attention</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                  Approvals waiting now
                </h2>
              </div>
              <Link
                href="/workspace/approvals"
                className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-white"
              >
                Open approvals
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <SummaryPill
                label="Pending approvals"
                value={`${visibleApprovalCount}`}
              />
              <SummaryPill
                label="Agents in view"
                value={`${visibleAgentCount}`}
              />
              <SummaryPill
                label="Access requests"
                value={`${visibleRequestCount}`}
              />
            </div>

            <div className="mt-6 grid gap-4">
              {snapshot.pendingApprovals.length > 0 ? (
                snapshot.pendingApprovals.map((approval) => (
                  <article
                    key={approval.id}
                    className="soft-card rounded-[1.45rem] p-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-base font-semibold text-ink">{approval.title}</p>
                        <p className="mt-2 text-sm leading-7 text-muted">
                          {approval.agentName} wants to {approval.requestedAction} on{" "}
                          {approval.target}.
                        </p>
                      </div>
                      <span className="rounded-full border border-[#edd89b] bg-[#fff7e2] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8d6200]">
                        review
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <InfoBlurb label="Why it paused" value={approval.policyReason} />
                      <InfoBlurb label="Agent reasoning" value={approval.justification} />
                    </div>
                  </article>
                ))
              ) : (
                <EmptySurface text="No approvals are waiting right now. If you are in demo mode, run a simulation from the Agents page to create reviewable activity." />
              )}
            </div>
          </article>

          <article className="panel-strong rounded-[1.9rem] p-6 md:p-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-xs font-medium text-muted">Recent actions</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                  What the agents did most recently
                </h2>
              </div>
              <Link
                href="/workspace/logs"
                className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-white"
              >
                Open log
              </Link>
            </div>

            <div className="mt-6 grid gap-4">
              {snapshot.recentLogs.length > 0 ? (
                snapshot.recentLogs.map((log) => (
                  <article
                    key={log.id}
                    className="soft-card rounded-[1.45rem] p-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-base font-semibold text-ink">{log.summary}</p>
                        <p className="mt-2 text-sm leading-7 text-muted">
                          {log.agentName} used {log.tool} for {log.actionType} on{" "}
                          {log.target}.
                        </p>
                      </div>
                      <StatusBadge status={log.status} />
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <InfoBlurb label="Reasoning" value={log.reasoning} />
                      <InfoBlurb
                        label="Policy hits"
                        value={
                          log.policyHits.length > 0
                            ? log.policyHits.join(", ")
                            : "No policy rule was triggered."
                        }
                      />
                    </div>
                  </article>
                ))
              ) : (
                <EmptySurface text="No recent actions yet. When the log is empty, the workspace is much harder to understand. Run a simulation to create sample activity." />
              )}
            </div>

            <div className="mt-6">
              <p className="field-label">How to read statuses</p>
              <div className="mt-3">
                <ActionStatusLegend />
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <article className="panel rounded-[1.9rem] p-6 md:p-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-xs font-medium text-muted">Workspace links</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                  Go where the work is
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {workspaceLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="soft-card rounded-[1.5rem] p-5 transition hover:bg-white"
                >
                  <p className="text-base font-semibold text-ink">{item.label}</p>
                  <p className="mt-3 text-sm leading-7 text-muted">{item.summary}</p>
                </Link>
              ))}
            </div>
          </article>

          {localDemoSession ? (
            <article className="panel-strong rounded-[1.9rem] p-6 md:p-7">
              <p className="eyebrow text-xs font-medium text-muted">Demo guide</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                A simple order that makes the demo easier to follow
              </h2>
              <div className="mt-6 grid gap-3">
                <GuideTip
                  title="1. Open approvals"
                  text="This shows the line between automatic work and work that needs a human decision."
                />
                <GuideTip
                  title="2. Open logs"
                  text="This is the factual record. It tells you what happened without marketing language."
                />
                <GuideTip
                  title="3. Open agents"
                  text="Run a simulation if you want new activity to appear in the queue and log."
                />
                <GuideTip
                  title="4. Reset when needed"
                  text="Use the reset button in the header if you want to restart the demo story."
                />
              </div>
            </article>
          ) : (
            <article className="panel rounded-[1.9rem] p-6 md:p-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow text-xs font-medium text-muted">Launch readiness</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                    Deployment posture
                  </h2>
                </div>
                <ReadinessBadge status={snapshot.launchReadiness.status} />
              </div>
              <div className="mt-6 grid gap-4">
                {snapshot.launchReadiness.checks.map((check) => (
                  <div
                    key={check.label}
                    className="soft-card rounded-[1.45rem] p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">{check.label}</p>
                      <ReadinessStatusPill status={check.status} />
                    </div>
                    <p className="mt-3 text-sm leading-7 text-muted">{check.detail}</p>
                  </div>
                ))}
              </div>
            </article>
          )}
        </section>

        <section className="tech-panel-muted signal-grid rounded-[1.9rem] p-6 md:p-7">
          <div className="relative z-10">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="eyebrow text-xs font-medium text-white/72">Recent changes</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  Latest audit events
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {snapshot.auditTrail.length > 0 ? (
                snapshot.auditTrail.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4"
                  >
                    <p className="text-sm font-semibold text-white">
                      {event.action} / {event.entityType}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/80">
                      {event.detail}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/58">
                      {event.actorEmail}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-white/78">No audit events yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function QuickStartCard({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4 transition hover:bg-white/10"
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/76">{text}</p>
    </Link>
  );
}

function QuickSummary({
  label,
  value,
  text,
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4">
      <p className="eyebrow text-[11px] font-medium text-white/62">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-white/74">{text}</p>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-line bg-white/88 px-4 py-4">
      <p className="field-label">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function InfoBlurb({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-line bg-white/92 px-4 py-4">
      <p className="field-label">{label}</p>
      <p className="mt-2 text-sm leading-7 text-muted">{value}</p>
    </div>
  );
}

function GuideTip({ title, text }: { title: string; text: string }) {
  return (
    <div className="soft-card rounded-[1.45rem] p-5">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-7 text-muted">{text}</p>
    </div>
  );
}

function EmptySurface({ text }: { text: string }) {
  return (
    <div className="rounded-[1.45rem] border border-dashed border-line bg-white/78 p-5 text-sm leading-7 text-muted">
      {text}
    </div>
  );
}

function StatusBadge({ status }: { status: ActionLogStatus }) {
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

function ReadinessStatusPill({
  status,
}: {
  status: "pass" | "warning" | "blocked";
}) {
  const styles =
    status === "pass"
      ? "border-success/18 bg-green-50 text-success"
      : status === "warning"
        ? "border-[#edd89b] bg-[#fff7e2] text-[#8d6200]"
        : "border-danger/18 bg-red-50 text-danger";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${styles}`}
    >
      {status}
    </span>
  );
}

function ReadinessBadge({
  status,
}: {
  status: "pass" | "warning" | "blocked";
}) {
  const styles =
    status === "pass"
      ? "border-success/18 bg-green-50 text-success"
      : status === "warning"
        ? "border-[#edd89b] bg-[#fff7e2] text-[#8d6200]"
        : "border-danger/18 bg-red-50 text-danger";

  return (
    <div
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${styles}`}
    >
      {status === "pass"
        ? "ready"
        : status === "warning"
          ? "needs attention"
          : "launch blocked"}
    </div>
  );
}
