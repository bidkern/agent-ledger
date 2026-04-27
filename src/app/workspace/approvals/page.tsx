import Link from "next/link";
import { processApprovalAction } from "@/app/workspace/approvals/actions";
import { WorkspacePageHero } from "@/components/workspace/workspace-page-hero";
import { requireSession } from "@/data/auth";
import { listApprovals } from "@/data/repository";

export const metadata = {
  title: "Approvals",
};

export default async function ApprovalsPage() {
  await requireSession();
  const approvals = await listApprovals();
  const pending = approvals.filter((approval) => approval.status === "pending");
  const decided = approvals.filter((approval) => approval.status !== "pending");
  const approvedCount = approvals.filter(
    (approval) => approval.status === "approved",
  ).length;
  const rejectedCount = approvals.filter(
    (approval) => approval.status === "rejected",
  ).length;

  return (
    <main className="relative flex-1 overflow-hidden px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <WorkspacePageHero
          current="approvals"
          eyebrow="Approval queue"
          title="Make human override rare, visible, and fast."
          body="Only the actions that need judgment should land here. This page is where the product proves it is not blind automation: policy explains why the system stopped, and the operator decides whether to allow the action through."
          actions={
            <>
              <Link
                href="/workspace/policies"
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Open policies
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
          <div className="grid gap-4 lg:grid-cols-2">
            <HeroCard
              label="What belongs here"
              title="Only exceptions"
              text="Approvals should represent the narrow slice of actions where money, data, or vendor risk still needs human judgment."
            />
            <HeroCard
              label="How to decide"
              title="Read policy reason first"
              text="If the policy reason makes sense and the justification is sound, approve. If the boundary is correct or the reasoning is weak, reject."
            />
          </div>
        </WorkspacePageHero>

        <section className="grid gap-4 lg:grid-cols-3">
          <MetricCard label="Pending decisions" value={String(pending.length)} />
          <MetricCard label="Approved" value={String(approvedCount)} />
          <MetricCard label="Rejected" value={String(rejectedCount)} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <article className="panel rounded-[2rem] p-6 md:p-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-xs font-medium text-muted">
                  Pending decisions
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                  What still needs operator judgment
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {pending.length > 0 ? (
                pending.map((approval) => (
                  <article
                    key={approval.id}
                    className="soft-card rounded-[1.6rem] p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-ink">{approval.title}</p>
                        <p className="mt-2 text-sm text-muted">
                          {approval.agentName} wants to {approval.requestedAction} on{" "}
                          {approval.target}.
                        </p>
                      </div>
                      <span className="rounded-full border border-[#edd89b] bg-[#fff7e2] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8d6200]">
                        pending
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <InfoBlock
                        label="Why the system stopped it"
                        value={approval.policyReason}
                      />
                      <InfoBlock
                        label="Why the agent wants it"
                        value={approval.justification}
                      />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <FactPill label="Action" value={approval.requestedAction} />
                      <FactPill label="Target" value={approval.target} />
                      <FactPill
                        label="Amount"
                        value={
                          typeof approval.amountUsd === "number"
                            ? `$${approval.amountUsd}`
                            : "No direct spend"
                        }
                      />
                    </div>

                    <form action={processApprovalAction} className="mt-5 space-y-3">
                      <input type="hidden" name="approvalId" value={approval.id} />
                      <label className="block">
                        <span className="field-label">Decision note</span>
                        <textarea
                          name="decisionNote"
                          rows={3}
                          className="textarea-surface mt-2"
                          placeholder="Optional note explaining why this decision was made."
                        />
                      </label>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          name="decision"
                          value="approved"
                          className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
                        >
                          Approve action
                        </button>
                        <button
                          type="submit"
                          name="decision"
                          value="rejected"
                          className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white"
                        >
                          Reject action
                        </button>
                      </div>
                    </form>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-line bg-white/72 p-5 text-sm leading-7 text-muted">
                  No approvals are waiting. Run simulations from the Agents page or
                  tighten the policy set if you want more actions to escalate.
                </div>
              )}
            </div>
          </article>

          <div className="grid gap-6">
            <article className="panel-strong rounded-[2rem] p-6 md:p-7">
              <p className="eyebrow text-xs font-medium text-muted">
                Decision guide
              </p>
              <div className="mt-5 grid gap-3">
                <GuideStep
                  title="Approve when the exception is justified"
                  text="The action can proceed if the business case is sound and the policy boundary is still doing the right thing."
                />
                <GuideStep
                  title="Reject when the rule is correct"
                  text="If the policy caught something you would not want to allow today, reject and leave the control boundary intact."
                />
                <GuideStep
                  title="Use notes to preserve intent"
                  text="Decision notes explain why a human overrode the system and keep future operators from guessing."
                />
              </div>
            </article>

            <article className="panel rounded-[2rem] p-6 md:p-7">
              <p className="eyebrow text-xs font-medium text-muted">
                Recent decisions
              </p>
              <div className="mt-5 grid gap-4">
                {decided.length > 0 ? (
                  decided.map((approval) => (
                    <article
                      key={approval.id}
                      className="soft-card rounded-[1.45rem] p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">
                          {approval.title}
                        </p>
                        <DecisionBadge status={approval.status} />
                      </div>
                      <p className="mt-3 text-sm leading-7 text-muted">
                        {approval.decisionNote || approval.policyReason}
                      </p>
                      {approval.decidedAt ? (
                        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted">
                          {approval.decidedBy || "operator"} /{" "}
                          {formatDateTime(approval.decidedAt)}
                        </p>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-line bg-white/72 p-5 text-sm leading-7 text-muted">
                    No approval decisions yet.
                  </div>
                )}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

function HeroCard({
  label,
  title,
  text,
}: {
  label: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.55rem] border border-white/10 bg-white/6 p-5">
      <p className="eyebrow text-[11px] font-medium text-white/68">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{title}</p>
      <p className="mt-3 text-sm leading-7 text-white/78">{text}</p>
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

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-line bg-white/92 px-4 py-4">
      <p className="field-label">{label}</p>
      <p className="mt-3 text-sm leading-7 text-muted">{value}</p>
    </div>
  );
}

function FactPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-line bg-white/92 px-4 py-4">
      <p className="field-label">{label}</p>
      <p className="mt-2 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function GuideStep({ title, text }: { title: string; text: string }) {
  return (
    <div className="soft-card rounded-[1.4rem] p-5">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-7 text-muted">{text}</p>
    </div>
  );
}

function DecisionBadge({
  status,
}: {
  status: "pending" | "approved" | "rejected";
}) {
  const styles =
    status === "approved"
      ? "border-success/18 bg-green-50 text-success"
      : status === "rejected"
        ? "border-danger/18 bg-red-50 text-danger"
        : "border-[#edd89b] bg-[#fff7e2] text-[#8d6200]";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${styles}`}
    >
      {status}
    </span>
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
