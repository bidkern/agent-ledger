import Link from "next/link";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { getSession } from "@/data/auth";

const steps = [
  {
    number: "1",
    title: "Make an agent",
    text: "Pick a job for it, like inbox, research, design, or finance prep.",
  },
  {
    number: "2",
    title: "Give it limits",
    text: "Choose what it can use, what it can spend, and when it must ask first.",
  },
  {
    number: "3",
    title: "Launch and watch",
    text: "Start the run, see what happened, and stop risky work before it leaves the app.",
  },
] as const;

const checks = [
  "Agents have names, owners, tools, and budgets.",
  "Cards, wallets, inboxes, folders, and keys stay permission-bound.",
  "Risky actions can pause for approval before anything external happens.",
] as const;

export default async function Home() {
  const session = await getSession();

  return (
    <main className="retro-page min-h-screen px-6 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col gap-6">
        <SiteHeader session={session} />

        <section className="retro-window fade-up">
          <div className="retro-titlebar">
            <span>Agent Ledger Home Page</span>
            <span className="retro-blink">New</span>
          </div>
          <div className="retro-window-body">
            <div className="retro-banner">Create agents. Give permissions. Launch safely.</div>

            <div className="mt-5 grid gap-6 lg:grid-cols-[1.04fr_0.96fr]">
              <div className="max-w-3xl">
                <p className="eyebrow text-[11px] font-medium text-muted">
                  Welcome to the governed agent web
                </p>
                <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-ink md:text-5xl">
                  A simple home base for specialist AI agents.
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-7 text-muted">
                  Agent Ledger helps you set up different agents for different jobs.
                  Each agent only gets the tools and accounts you allow.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={session ? "/workspace/agents" : "/login?demo=1"}
                    className="retro-link-button retro-button-primary"
                  >
                    {session ? "Open Agent Hub" : "Try the demo"}
                  </Link>
                  <Link href="/login" className="retro-link-button">
                    Operator login
                  </Link>
                </div>

                <div className="retro-inset mt-8 grid gap-2 px-3 py-3 text-sm text-muted md:grid-cols-[auto_1fr]">
                  <span className="font-bold text-ink">Operator note:</span>
                  <span>
                    Agent Ledger gives every AI worker a name, a job, a budget, a permission set, and a place to stop before it touches something risky.
                  </span>
                </div>
              </div>

              <div className="retro-window">
                <div className="retro-titlebar retro-titlebar-green">
                  <span>How it works</span>
                  <span>3 easy steps</span>
                </div>
                <div className="retro-window-body">
                  <div className="grid gap-3">
                    {steps.map((step) => (
                      <article key={step.number} className="retro-inset grid grid-cols-[2.35rem_1fr] gap-4 p-4">
                        <div className="retro-window flex h-9 w-9 items-center justify-center text-sm font-bold text-ink">
                          {step.number}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-ink">{step.title}</p>
                          <p className="mt-1 text-sm leading-6 text-muted">
                            {step.text}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="retro-inset mt-5 p-4">
                    <p className="text-sm font-semibold text-ink">What stays protected</p>
                    <div className="mt-3 grid gap-2">
                      {checks.map((item) => (
                        <p key={item} className="text-sm leading-6 text-muted">
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <article id="why" className="retro-window">
            <div className="retro-titlebar retro-titlebar-green">
              <span>Why it matters</span>
              <span>Trust beats chaos</span>
            </div>
            <div className="retro-window-body text-sm leading-7 text-muted">
              If agents can touch money, customer data, or external tools, the control
              plane matters as much as the model. Agent Ledger is where operators decide
              what those agents are allowed to do.
            </div>
          </article>
          <article id="product" className="retro-window">
            <div className="retro-titlebar">
              <span>Product</span>
              <span>Operator-first UI</span>
            </div>
            <div className="retro-window-body text-sm leading-7 text-muted">
              Create specialist agents, bind only the resources they need, review risky
              actions in one queue, and keep a ledger of what happened after every run.
            </div>
          </article>
          <article id="pricing" className="retro-window">
            <div className="retro-titlebar retro-titlebar-green">
              <span>Pricing logic</span>
              <span>Governed execution</span>
            </div>
            <div className="retro-window-body text-sm leading-7 text-muted">
              The value is not token markup. The value is governed execution:
              permissions, approvals, logs, limits, and the confidence to let agents keep working.
            </div>
          </article>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
