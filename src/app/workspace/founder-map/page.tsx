import Link from "next/link";
import { WorkspacePageHero } from "@/components/workspace/workspace-page-hero";
import { requireSession } from "@/data/auth";

export const metadata = {
  title: "Founder Map",
};

const northStar = [
  {
    label: "What we sell",
    value: "The control plane for fresh agent environments",
    detail:
      "Agent Ledger helps teams create isolated work environments for agents, then approve, block, meter, and audit what those agents do.",
  },
  {
    label: "Who buys first",
    value: "Teams automating money, customers, or sensitive data",
    detail:
      "The best early customers are founder-led AI companies and operator teams whose agents trigger refunds, spend, outreach, or data movement.",
  },
  {
    label: "Why they pay",
    value: "Unsafe automation is worse than no automation",
    detail:
      "If an agent can touch real systems, buyers need policies, approvals, logs, and guardrails faster than they can build them in-house.",
  },
  {
    label: "One viable million-dollar path",
    value: "70 teams x $1.2k/mo = about $1.0M ARR",
    detail:
      "This does not need consumer scale. It needs a modest number of serious customers running meaningful governed workflows.",
  },
] as const;

const productLoop = [
  {
    step: "01",
    title: "Create the agent's sandbox",
    body:
      "Start with fresh repos, test accounts, disposable inboxes, and isolated profiles. Then connect the agent runtime through a narrow key, bridge, API, or remote MCP.",
  },
  {
    step: "02",
    title: "Evaluate each proposed action",
    body:
      "Every action request is checked against identity, tool allowlists, spend limits, data rules, and approval policies before it can run.",
  },
  {
    step: "03",
    title: "Allow, review, or block",
    body:
      "Low-risk work should complete automatically. Ambiguous actions should enter approvals. Unsafe actions should stop before they create damage.",
  },
  {
    step: "04",
    title: "Write the ledger and meter value",
    body:
      "Once governed actions are visible and trusted, the product can charge for active agents, protected spend, governed actions, and audit history.",
  },
] as const;

const moatLayers = [
  {
    title: "Provider-neutral governance",
    text:
      "Teams do not want to rebuild guardrails every time they switch models or agent frameworks. The value compounds if the same governance layer works across them all.",
  },
  {
    title: "Risk-specific adapters",
    text:
      "Guarded Stripe, email, CRM, browser, and data-export adapters are more defensible than generic chat UI because they encode real operational risk.",
  },
  {
    title: "History becomes switching cost",
    text:
      "Once approvals, policy decisions, spend limits, and incident history live here, replacing the system means losing the operational memory buyers rely on.",
  },
  {
    title: "Trust sells expansion",
    text:
      "The more a customer relies on the product to explain why an action was allowed or stopped, the more the governance layer becomes part of procurement and compliance.",
  },
] as const;

const buildSequence = [
  {
    phase: "Now",
    title: "Trust the interface",
    body:
      "Demo workspace, clear founder narrative, operator-friendly UI, seeded scenarios, and a crisp explanation of what the company actually does.",
    outcome: "A pilot customer can understand the product in one walkthrough.",
  },
  {
    phase: "Next",
    title: "Trust the runtime",
    body:
      "Service auth, propose_action API, remote MCP server, guarded Stripe refund flow, durable action states, and agent-facing contracts.",
    outcome: "External agents can ask the system for governed execution instead of staying in demo mode.",
  },
  {
    phase: "Then",
    title: "Trust the platform",
    body:
      "OIDC SSO, Postgres-backed state, append-only ledger storage, live billing, usage metering, and customer tenant boundaries.",
    outcome: "The product is safe to sell to real companies, not only design partners.",
  },
  {
    phase: "Scale",
    title: "Trust the business",
    body:
      "Onboarding playbooks, packaged integrations, deployment guides, audit exports, incident handling, and sales proof that risky automation can be governed.",
    outcome: "The company graduates from pilot tool to repeatable revenue engine.",
  },
] as const;

const aiLane = [
  "Design and ship product code across the app, APIs, connectors, guardrails, and demos.",
  "Write product copy, positioning, docs, onboarding material, and pilot collateral.",
  "Instrument analytics, meter usage, and propose pricing logic tied to governed value.",
  "Build adapters, policy templates, approval flows, and operator UX improvements continuously.",
  "Generate launch assets, sales decks, outbound drafts, and customer-specific demo environments.",
] as const;

const founderLane = [
  "Own the legal shell: company formation, banking, tax posture, privacy promises, and contract signatures.",
  "Create the real trust boundary by deciding what live credentials, tools, and customers the product is allowed to touch.",
  "Sell the first customers, gather objections, and decide which workflows are worth productizing first.",
  "Handle financial operations with Stripe, payouts, chargebacks, and any regulated edge cases.",
  "Make final calls when product tradeoffs affect liability, reputation, or customer commitments.",
] as const;

const cadence = [
  {
    label: "Daily",
    title: "Watch the boundary",
    text:
      "Review approvals, inspect failures, tighten confusing policies, and make sure the demo and pilot flows tell the same product story.",
  },
  {
    label: "Weekly",
    title: "Remove one sales blocker",
    text:
      "Ship the next integration or trust feature that turns a buyer objection into a confident yes.",
  },
  {
    label: "Monthly",
    title: "Move upmarket",
    text:
      "Standardize what worked with early pilots into a repeatable package: onboarding, pricing, security answers, and customer success proof.",
  },
] as const;

const launchSteps = [
  {
    title: "Controlled rollout",
    detail:
      "Use the local demo, seeded data, and approval stories to get design partners without meaningful infrastructure cost.",
  },
  {
    title: "Paid pilots",
    detail:
      "Charge for governance around one risky workflow first, like refunds, vendor spend, or customer-data export approvals.",
  },
  {
    title: "Expansion revenue",
    detail:
      "Add more guarded adapters and increase seat, agent, and governed action volume within the same customer account.",
  },
] as const;

export default async function FounderMapPage() {
  await requireSession();

  return (
    <main className="relative flex-1 overflow-hidden px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <WorkspacePageHero
          current="founder-map"
          eyebrow="Founder operating map"
          title="See the company as a system you can actually operate."
          body="This page is the business model, product wedge, moat thesis, build sequence, and founder-versus-AI split in one place. Use it as the map for what we are building and why customers would pay for it."
          actions={
            <>
              <Link
                href="/workspace/agents"
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Open agents
              </Link>
              <Link
                href="/workspace/billing"
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Open billing
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
              label="Plain-English purpose"
              title="Give agents clean workspaces before they touch real work."
              text="The product becomes valuable when customers can launch agents into fresh, limited environments instead of handing over primary accounts."
            />
            <HeroCard
              label="How this wins"
              title="Model progress strengthens the need for governance"
              text="If agents stay weak, nobody buys them. If they get strong, buyers need permissioning, approvals, and auditability around them."
            />
          </div>
        </WorkspacePageHero>

        <section className="grid gap-4 lg:grid-cols-4">
          {northStar.map((item) => (
            <MetricCard
              key={item.label}
              label={item.label}
              value={item.value}
              detail={item.detail}
            />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
          <article className="panel rounded-[2rem] p-6 md:p-7">
            <p className="eyebrow text-xs font-medium text-muted">Product loop</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              The wedge is simple: make fresh agent environments easy to launch and govern.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              Customers should not hand agents their primary accounts. They create
              clean work environments, connect the workers they trust, and Agent
              Ledger becomes the control, approval, and audit layer around real
              execution.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {productLoop.map((item) => (
                <StepCard
                  key={item.step}
                  step={item.step}
                  title={item.title}
                  body={item.body}
                />
              ))}
            </div>
          </article>

          <article className="panel-strong rounded-[2rem] p-6 md:p-7">
            <p className="eyebrow text-xs font-medium text-muted">Moat layers</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              The moat is not “we also have guardrails.”
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              The moat becomes real when this repo turns into the durable layer
              customers trust across providers, teams, and risky workflows.
            </p>
            <div className="mt-6 grid gap-4">
              {moatLayers.map((item) => (
                <InsightCard
                  key={item.title}
                  title={item.title}
                  text={item.text}
                />
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <article className="panel rounded-[2rem] p-6 md:p-7">
            <p className="eyebrow text-xs font-medium text-muted">Build sequence</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              What this repo has to become, in order
            </h2>
            <div className="mt-6 grid gap-4">
              {buildSequence.map((item) => (
                <BuildCard
                  key={item.phase}
                  phase={item.phase}
                  title={item.title}
                  body={item.body}
                  outcome={item.outcome}
                />
              ))}
            </div>
          </article>

          <article className="tech-panel-muted signal-grid rounded-[2rem] p-6 md:p-7">
            <div className="relative z-10">
              <p className="eyebrow text-xs font-medium text-white/72">Launch path</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                A low-cost rollout is realistic
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/80">
                The earliest demos can stay local, use seeded workspace data, and
                rely on Stripe test mode or stubbed actions. That keeps early
                testing close to zero cost until real customers justify live
                infrastructure.
              </p>

              <div className="mt-6 grid gap-4">
                {launchSteps.map((item, index) => (
                  <DarkStep
                    key={item.title}
                    number={`0${index + 1}`}
                    title={item.title}
                    text={item.detail}
                  />
                ))}
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <article className="panel rounded-[2rem] p-6 md:p-7">
            <p className="eyebrow text-xs font-medium text-muted">AI-owned lane</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              What I can keep driving
            </h2>
            <div className="mt-6 grid gap-3">
              {aiLane.map((item) => (
                <LaneItem key={item} text={item} />
              ))}
            </div>
          </article>

          <article className="panel-strong rounded-[2rem] p-6 md:p-7">
            <p className="eyebrow text-xs font-medium text-muted">Founder-owned lane</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              What still needs a human legal and commercial shell
            </h2>
            <div className="mt-6 grid gap-3">
              {founderLane.map((item) => (
                <LaneItem key={item} text={item} />
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {cadence.map((item) => (
            <article key={item.label} className="soft-card-strong rounded-[1.7rem] p-6">
              <p className="eyebrow text-xs font-medium text-muted">{item.label}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
                {item.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="panel rounded-[2rem] p-6 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow text-xs font-medium text-muted">Use the product map</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                Every workspace page should support this business story
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                Agents prove identity, policies prove control, approvals prove the
                exception boundary, logs prove truth, and billing proves there is a
                business under the software. If a feature does not reinforce one of
                those claims, it should probably not be first priority.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/workspace/policies"
                className="rounded-full border border-line bg-white/90 px-4 py-2 text-sm font-medium text-ink transition hover:bg-white"
              >
                Policies
              </Link>
              <Link
                href="/workspace/approvals"
                className="rounded-full border border-line bg-white/90 px-4 py-2 text-sm font-medium text-ink transition hover:bg-white"
              >
                Approvals
              </Link>
              <Link
                href="/workspace/logs"
                className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
              >
                Logs
              </Link>
            </div>
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

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="soft-card-strong rounded-[1.7rem] p-6">
      <p className="field-label">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-4 text-sm leading-7 text-muted">{detail}</p>
    </article>
  );
}

function StepCard({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <article className="soft-card rounded-[1.55rem] p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-full border border-accent/25 bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink">
          {step}
        </div>
        <div>
          <p className="text-base font-semibold text-ink">{title}</p>
          <p className="mt-3 text-sm leading-7 text-muted">{body}</p>
        </div>
      </div>
    </article>
  );
}

function InsightCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="soft-card rounded-[1.5rem] p-5">
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="mt-3 text-sm leading-7 text-muted">{text}</p>
    </article>
  );
}

function BuildCard({
  phase,
  title,
  body,
  outcome,
}: {
  phase: string;
  title: string;
  body: string;
  outcome: string;
}) {
  return (
    <article className="soft-card rounded-[1.55rem] p-5">
      <p className="eyebrow text-xs font-medium text-muted">{phase}</p>
      <p className="mt-3 text-xl font-semibold text-ink">{title}</p>
      <p className="mt-3 text-sm leading-7 text-muted">{body}</p>
      <div className="mt-4 rounded-[1.2rem] border border-line bg-white/92 px-4 py-4">
        <p className="field-label">What success looks like</p>
        <p className="mt-2 text-sm font-medium text-ink">{outcome}</p>
      </div>
    </article>
  );
}

function DarkStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-full border border-white/14 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
          {number}
        </div>
        <div>
          <p className="text-base font-semibold text-white">{title}</p>
          <p className="mt-3 text-sm leading-7 text-white/78">{text}</p>
        </div>
      </div>
    </article>
  );
}

function LaneItem({ text }: { text: string }) {
  return (
    <div className="rounded-[1.35rem] border border-line bg-white/92 px-4 py-4 text-sm leading-7 text-muted">
      {text}
    </div>
  );
}
