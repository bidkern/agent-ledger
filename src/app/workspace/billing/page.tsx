import Link from "next/link";
import { BillingForm } from "@/components/workspace/billing-form";
import { BillingQuickActions } from "@/components/workspace/billing-quick-actions";
import { WorkspacePageHero } from "@/components/workspace/workspace-page-hero";
import { requireSession } from "@/data/auth";
import { getBillingSnapshot } from "@/data/billing";

export const metadata = {
  title: "Billing",
};

export default async function BillingPage() {
  await requireSession();
  const billing = await getBillingSnapshot();

  return (
    <main className="relative flex-1 overflow-hidden px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <WorkspacePageHero
          current="billing"
          eyebrow="Billing control"
          title="Run monetization from the same surface that governs execution."
          body="Billing is where the control plane turns into a business. This page ties pricing, Stripe state, protected spend, and customer operations into one operator workflow instead of scattering them across spreadsheets and dashboards."
          actions={
            <>
              <Link
                href="/workspace/pipeline"
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Open pipeline
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
              label="What this page proves"
              title="Governance can be revenue infrastructure"
              text="Instead of charging for raw model usage, the product can charge for governed workers, protected spend, and controlled action volume."
            />
            <HeroCard
              label="How to use it"
              title="Save config first, then operate Stripe"
              text="Configuration defines the commercial model. Quick actions then handle sync, checkout, and portal access for the current account."
            />
          </div>
        </WorkspacePageHero>

        <section className="grid gap-4 lg:grid-cols-4">
          <MetricCard label="Plan" value={billing.config.plan} />
          <MetricCard label="Billing mode" value={billing.config.stripeMode} />
          <MetricCard
            label="Projected MRR"
            value={`$${billing.projectedMrrUsd.toFixed(0)}`}
          />
          <MetricCard
            label="Protected spend"
            value={`$${billing.protectedSpendUsd.toFixed(0)}`}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <BillingForm config={billing.config} />

          <div className="grid gap-6">
            <article className="panel-strong rounded-[2rem] p-6 md:p-7">
              <p className="eyebrow text-xs font-medium text-muted">
                Billing snapshot
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                Current account and subscription posture
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <InfoCard label="Company" value={billing.config.companyName} />
                <InfoCard
                  label="Subscription status"
                  value={billing.config.stripeSubscriptionStatus}
                />
                <InfoCard
                  label="Live subscription MRR"
                  value={
                    billing.liveSubscriptionMrrUsd === null
                      ? "Not synced"
                      : `$${billing.liveSubscriptionMrrUsd.toFixed(0)}`
                  }
                />
                <InfoCard
                  label="Metered actions"
                  value={String(billing.meteredActions)}
                />
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-line bg-white/82 p-5">
                <p className="text-sm font-semibold text-ink">Stripe record</p>
                <div className="mt-4 grid gap-3">
                  <InfoRow
                    label="Billing email"
                    value={billing.config.billingEmail}
                  />
                  <InfoRow
                    label="Stripe customer"
                    value={billing.config.stripeCustomerId ?? "Not linked yet"}
                  />
                  <InfoRow
                    label="Stripe subscription"
                    value={billing.config.stripeSubscriptionId ?? "Not linked yet"}
                  />
                  <InfoRow
                    label="Stripe price"
                    value={billing.config.stripePriceId ?? "Not configured yet"}
                  />
                  <InfoRow
                    label="Current period end"
                    value={
                      billing.config.stripeCurrentPeriodEnd
                        ? formatDateTime(billing.config.stripeCurrentPeriodEnd)
                        : "Not available yet"
                    }
                  />
                  <InfoRow
                    label="Last synced"
                    value={
                      billing.config.lastSyncedAt
                        ? formatDateTime(billing.config.lastSyncedAt)
                        : "Never"
                    }
                  />
                </div>
              </div>
            </article>

            <article className="panel rounded-[2rem] p-6 md:p-7">
              <p className="eyebrow text-xs font-medium text-muted">
                Stripe actions
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                Operate the billing lifecycle
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                These controls handle the operational steps after the commercial
                model is configured.
              </p>
              <div className="mt-6">
                <BillingQuickActions config={billing.config} />
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="soft-card rounded-[1.45rem] p-5">
      <p className="field-label">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-line bg-white px-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="max-w-[18rem] truncate text-right text-sm font-medium text-ink">
        {value}
      </span>
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
