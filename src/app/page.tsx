import Link from "next/link";
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
    <main className="min-h-screen bg-[#101417] px-6 py-6 text-[#f2f0e8]">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/12 bg-[#1b2227] text-sm font-semibold text-[#f2f0e8]">
              AL
            </div>
            <div>
              <p className="text-base font-semibold">Agent Ledger</p>
              <p className="text-sm text-[#aeb8b8]">Desktop agent hub</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/security"
              className="rounded-md px-3 py-2 text-sm text-[#c8d0cc] transition hover:bg-white/8 hover:text-white"
            >
              Security
            </Link>
            <Link
              href="/request-access"
              className="rounded-md px-3 py-2 text-sm text-[#c8d0cc] transition hover:bg-white/8 hover:text-white"
            >
              Request access
            </Link>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="max-w-3xl">
            <p className="eyebrow text-xs font-medium text-[#9fb2aa]">
              Create agents. Give permissions. Launch safely.
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-normal text-[#f2f0e8] md:text-6xl">
              A simple home base for specialist AI agents.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#c8d0cc]">
              Agent Ledger helps you set up different agents for different jobs.
              Each agent only gets the tools and accounts you allow.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={session ? "/workspace/agents" : "/login?demo=1"}
                className="rounded-md bg-[#f2f0e8] px-5 py-3 text-sm font-semibold text-[#12181c] transition hover:bg-white"
              >
                {session ? "Open Agent Hub" : "Try the demo"}
              </Link>
              <Link
                href="/login"
                className="rounded-md border border-white/14 px-5 py-3 text-sm font-semibold text-[#f2f0e8] transition hover:bg-white/8"
              >
                Operator login
              </Link>
            </div>
          </div>

          <div className="border border-white/10 bg-[#171d21] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
            <div className="border-b border-white/10 pb-4">
              <p className="text-sm font-semibold text-[#f2f0e8]">How it works</p>
              <p className="mt-1 text-sm text-[#aeb8b8]">
                Three steps. No framework knowledge required.
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="grid grid-cols-[2.25rem_1fr] gap-4 border border-white/10 bg-[#20282d] p-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#e4ecdf] text-sm font-semibold text-[#172018]">
                    {step.number}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[#f2f0e8]">
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#c8d0cc]">
                      {step.text}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 border border-white/10 bg-[#11171a] p-4">
              <p className="text-sm font-semibold text-[#f2f0e8]">
                What stays protected
              </p>
              <div className="mt-3 grid gap-2">
                {checks.map((item) => (
                  <p key={item} className="text-sm leading-6 text-[#c8d0cc]">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
