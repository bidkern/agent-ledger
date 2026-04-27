import { getSession } from "@/data/auth";
import { RequestAccessForm } from "@/components/public/request-access-form";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export const metadata = {
  title: "Request Access",
  description:
    "Request access to Agent Ledger and describe the workflows, approvals, and risks your team needs to govern.",
};

const steps = [
  {
    title: "Map the agent surface",
    body:
      "We identify which agents or workflows already touch money, vendors, customer data, or external tools.",
  },
  {
    title: "Define governance rules",
    body:
      "We turn that operating model into identity, policy, approval, and logging rules inside the console.",
  },
  {
    title: "Launch with control",
    body:
      "You start with a governed mission-control layer instead of discovering the guardrails only after something breaks.",
  },
] as const;

export default async function RequestAccessPage() {
  const session = await getSession();

  return (
    <main className="relative overflow-hidden grain">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-6 md:px-10 md:py-8">
        <SiteHeader session={session} />

        <section className="grid gap-6 lg:grid-cols-[0.96fr_1.04fr]">
          <article className="panel-strong rounded-[2rem] p-6 md:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted">
              Public launch
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink md:text-5xl">
              Request access to the founder control plane for AI operators
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
              Agent Ledger is best when it mirrors the real operational risk in your
              company. Share what your agents already touch and what should never run
              without review.
            </p>

            <div className="mt-8 grid gap-4">
              {steps.map((step) => (
                <article
                  key={step.title}
                  className="rounded-[1.5rem] border border-line bg-white/82 p-5"
                >
                  <p className="text-sm font-semibold text-ink">{step.title}</p>
                  <p className="mt-3 text-sm leading-7 text-muted">{step.body}</p>
                </article>
              ))}
            </div>
          </article>

          <RequestAccessForm />
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
