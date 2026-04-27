import Link from "next/link";
import { updateAccessRequestStatusAction } from "@/app/workspace/pipeline/actions";
import { WorkspacePageHero } from "@/components/workspace/workspace-page-hero";
import { requireSession } from "@/data/auth";
import { listAccessRequests } from "@/data/repository";

export const metadata = {
  title: "Pipeline",
};

const statuses = ["new", "contacted", "qualified", "declined"] as const;

const stageCopy = {
  new: "Fresh demand captured from the public site.",
  contacted: "Someone has reached out and started the conversation.",
  qualified: "A strong early customer worth active founder attention.",
  declined: "Not a fit right now, but still part of the launch history.",
} as const;

export default async function PipelinePage() {
  await requireSession();
  const requests = await listAccessRequests();
  const grouped = statuses.map((status) => ({
    status,
    requests: requests.filter((request) => request.status === status),
  }));

  return (
    <main className="relative flex-1 overflow-hidden px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <WorkspacePageHero
          current="pipeline"
          eyebrow="Launch pipeline"
          title="Turn public demand into a readable founder queue."
          body="Requests from the public site land here so the operator team can qualify, contact, and track early customers without leaving mission control. This page is the bridge between the marketing surface and the private operator console."
          actions={
            <>
              <Link
                href="/request-access"
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Public form
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
              label="What this page is"
              title="Inbound demand, not internal ops"
              text="These records come from the launch funnel. They show who is interested, what agent stack they already run, and how quickly they want access."
            />
            <HeroCard
              label="How to use it"
              title="Move requests through clear stages"
              text="The goal is not a giant CRM. It is a simple launch board that helps the team stay aligned during early rollout."
            />
          </div>
        </WorkspacePageHero>

        <section className="grid gap-4 lg:grid-cols-4">
          {grouped.map((group) => (
            <StageMetric
              key={group.status}
              label={group.status}
              value={String(group.requests.length)}
            />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {grouped.map((group) => (
            <article key={group.status} className="panel rounded-[2rem] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow text-[11px] font-medium text-muted">
                    {group.status}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-ink">
                    {group.requests.length} request
                    {group.requests.length === 1 ? "" : "s"}
                  </p>
                </div>
                <StageBadge status={group.status} />
              </div>
              <p className="mt-3 text-sm leading-7 text-muted">
                {stageCopy[group.status]}
              </p>

              <div className="mt-5 grid gap-4">
                {group.requests.length > 0 ? (
                  group.requests.map((request) => (
                    <article
                      key={request.id}
                      className="soft-card rounded-[1.45rem] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-ink">
                            {request.companyName}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            {request.contactName} / {request.email}
                          </p>
                        </div>
                        <span className="rounded-full border border-line bg-white px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted">
                          {request.teamSize}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <InfoBlock
                          label="Launch window"
                          value={request.desiredLaunchWindow}
                        />
                        <InfoBlock
                          label="Current stack"
                          value={request.currentAgentStack}
                        />
                        <InfoBlock label="Notes" value={request.notes} />
                        <InfoBlock
                          label="Company URL"
                          value={request.companyUrl || "Not provided"}
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {statuses
                          .filter((status) => status !== request.status)
                          .map((status) => (
                            <form action={updateAccessRequestStatusAction} key={status}>
                              <input type="hidden" name="requestId" value={request.id} />
                              <button
                                type="submit"
                                name="status"
                                value={status}
                                className="rounded-full border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-white"
                              >
                                Move to {status}
                              </button>
                            </form>
                          ))}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.4rem] border border-dashed border-line bg-white/72 p-4 text-sm leading-7 text-muted">
                    No requests in this stage yet.
                  </div>
                )}
              </div>
            </article>
          ))}
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

function StageMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="soft-card-strong rounded-[1.6rem] p-5">
      <p className="field-label">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </article>
  );
}

function StageBadge({
  status,
}: {
  status: (typeof statuses)[number];
}) {
  const styles =
    status === "qualified"
      ? "border-success/18 bg-green-50 text-success"
      : status === "declined"
        ? "border-danger/18 bg-red-50 text-danger"
        : status === "contacted"
          ? "border-accent/20 bg-accent-soft text-ink"
          : "border-line bg-white text-muted";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${styles}`}
    >
      {status}
    </span>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-line bg-white/92 px-4 py-4">
      <p className="field-label">{label}</p>
      <p className="mt-2 text-sm leading-7 text-muted">{value}</p>
    </div>
  );
}
