import Link from "next/link";
import { ActionStatusLegend } from "@/components/workspace/action-status-legend";
import { PolicyForm } from "@/components/workspace/policy-form";
import { WorkspacePageHero } from "@/components/workspace/workspace-page-hero";
import { requireSession } from "@/data/auth";
import { listPolicies } from "@/data/repository";

export const metadata = {
  title: "Policies",
};

export default async function PoliciesPage() {
  await requireSession();
  const policies = await listPolicies();
  const blockingPolicies = policies.filter(
    (policy) => policy.enforcement === "block" && policy.enabled,
  ).length;
  const reviewPolicies = policies.filter(
    (policy) => policy.enforcement === "review" && policy.enabled,
  ).length;

  return (
    <main className="relative flex-1 overflow-hidden px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <WorkspacePageHero
          current="policies"
          eyebrow="Policy engine"
          title="Define what agents may finish, what must be reviewed, and what stops."
          body="This is the heart of the product. Identity is table stakes. The durable value is the rule layer that decides how autonomous work resolves when it touches money, tools, vendors, or data."
          actions={
            <>
              <Link
                href="/workspace/logs"
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Open logs
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
          <div className="grid gap-4 lg:grid-cols-[0.96fr_1.04fr]">
            <div className="rounded-[1.55rem] border border-white/10 bg-white/6 p-5">
              <p className="eyebrow text-[11px] font-medium text-white/68">
                Why this page matters
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <HeroFact
                  title="Specific rules"
                  text="Narrow policies make the product easy to reason about."
                />
                <HeroFact
                  title="Readable decisions"
                  text="Descriptions appear in logs and approvals, so good policy copy explains the system."
                />
                <HeroFact
                  title="Safer autonomy"
                  text="The point is not to stop agents from acting. It is to stop them from acting in the dark."
                />
              </div>
            </div>
            <div className="rounded-[1.55rem] border border-white/10 bg-white/6 p-5">
              <p className="eyebrow text-[11px] font-medium text-white/68">
                Enforcement outcomes
              </p>
              <div className="mt-4">
                <ActionStatusLegend />
              </div>
            </div>
          </div>
        </WorkspacePageHero>

        <section className="grid gap-4 lg:grid-cols-3">
          <MetricCard label="Total rules" value={String(policies.length)} />
          <MetricCard label="Blocking rules" value={String(blockingPolicies)} />
          <MetricCard label="Review rules" value={String(reviewPolicies)} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <PolicyForm />

          <section className="panel-strong rounded-[2rem] p-6 md:p-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-xs font-medium text-muted">
                  Active policy set
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                  Rules the control plane is enforcing right now
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {policies.length > 0 ? (
                policies.map((policy) => (
                  <article
                    key={policy.id}
                    className="soft-card rounded-[1.6rem] p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-ink">{policy.name}</p>
                        <p className="mt-2 text-sm text-muted">
                          {policy.category} / {policy.enforcement}
                        </p>
                      </div>
                      <EnabledBadge enabled={policy.enabled} />
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <FactCard label="Category" value={policy.category} />
                      <FactCard
                        label="Threshold"
                        value={
                          typeof policy.thresholdUsd === "number"
                            ? `$${policy.thresholdUsd}`
                            : "No threshold"
                        }
                      />
                      <FactCard
                        label="Applies to"
                        value={
                          policy.appliesTo.length > 0
                            ? policy.appliesTo.join(", ")
                            : "Global rule"
                        }
                      />
                    </div>

                    <div className="mt-5 rounded-[1.35rem] border border-line bg-white/92 px-4 py-4">
                      <p className="field-label">Rule intent</p>
                      <p className="mt-3 text-sm leading-7 text-muted">
                        {policy.description}
                      </p>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-line bg-white/72 p-5 text-sm leading-7 text-muted">
                  No policy rules exist yet. Seed the demo workspace or create the
                  first rule on the left.
                </div>
              )}
            </div>
          </section>
        </div>
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
    <div className="rounded-[1.2rem] border border-line bg-white/92 px-4 py-4">
      <p className="field-label">{label}</p>
      <p className="mt-2 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function EnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
        enabled
          ? "border-success/18 bg-green-50 text-success"
          : "border-line bg-white text-muted"
      }`}
    >
      {enabled ? "enabled" : "disabled"}
    </span>
  );
}
