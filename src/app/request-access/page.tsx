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
    <main className="retro-page grain">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-6 md:px-10 md:py-8">
        <SiteHeader session={session} />

        <section className="grid gap-6 lg:grid-cols-[0.96fr_1.04fr]">
          <article className="retro-window">
            <div className="retro-titlebar">
              <span>Public launch</span>
              <span>Access request intake</span>
            </div>
            <div className="retro-window-body">
              <h1 className="text-4xl font-semibold tracking-tight text-ink md:text-5xl">
                Request access to the founder control plane for AI operators
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
                Agent Ledger is best when it mirrors the real operational risk in your
                company. Share what your agents already touch and what should never run
                without review.
              </p>

              <div className="retro-banner mt-6">
                Tell us the risky jobs first, then the fun jobs.
              </div>

              <div className="mt-8 grid gap-4">
                {steps.map((step) => (
                  <article key={step.title} className="retro-inset p-5">
                    <p className="text-sm font-semibold text-ink">{step.title}</p>
                    <p className="mt-3 text-sm leading-7 text-muted">{step.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </article>

          <RequestAccessForm />
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
