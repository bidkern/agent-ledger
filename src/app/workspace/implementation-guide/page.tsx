import Link from "next/link";
import { WorkspacePageHero } from "@/components/workspace/workspace-page-hero";
import { requireSession } from "@/data/auth";

export const metadata = {
  title: "Implementation Guide",
};

const setupSteps = [
  {
    step: "01",
    title: "Create one specialist agent",
    text:
      "Open Agent Hub, choose a template, and give the agent one clear ongoing job. Start narrow, like inbox triage, refund review, research, or local file organization.",
  },
  {
    step: "02",
    title: "Add only safe test resources",
    text:
      "Add a vault item for each outside thing the agent may touch. Use masked card references, public wallet addresses, test Stripe keys, disposable inboxes, and local folders.",
  },
  {
    step: "03",
    title: "Bind exact permissions",
    text:
      "Connect each vault item to one agent with one scope. Use read or draft first. Require approval for send, spend, trade, admin, and anything that can affect money or customers.",
  },
  {
    step: "04",
    title: "Set the standing prompt and cadence",
    text:
      "Tell the agent what to keep doing and how often the service should queue it. Manual launches are only for immediate tests.",
  },
  {
    step: "05",
    title: "Connect the real worker service",
    text:
      "Run a worker that calls the autonomous tick endpoint, picks up queued cycles, and calls Agent Ledger before risky actions. If Agent Ledger allows it, execute. If it asks for review, pause. If it blocks, stop.",
  },
] as const;

const customerChecklist = [
  "Start with one agent and one job.",
  "Use test-mode accounts before live accounts.",
  "Never paste wallet keys, seed phrases, card numbers, bank logins, account passwords, or production finance credentials.",
  "Never give an agent direct access to a real wallet, bank account, card, inbox, or admin tool until approvals are proven.",
  "Keep spend and trade permissions approval-gated until the action log shows predictable behavior.",
  "Use separate service tokens for each external agent or integration.",
  "Run the autonomous tick from a worker or scheduler instead of manually starting and stopping agents.",
  "Review the logs after every test run and tighten policies before expanding permissions.",
] as const;

const connectionOptions = [
  {
    title: "Fresh environment plus key or token",
    bestFor: "OpenAI, Claude, GitHub, Slack, Notion, and most developer tools.",
    text:
      "Create a fresh project, repo, workspace, page set, inbox, or wallet first. Then create the narrow key or token for only that environment.",
  },
  {
    title: "Isolated browser/work profile",
    bestFor: "Web tools that do not offer a clean API key path for the exact task.",
    text:
      "Create a separate profile for the agent and only sign it into test or sandbox accounts. Point Agent Ledger at that profile or local browser bridge.",
  },
  {
    title: "No-code or script agent",
    bestFor: "Zapier-style flows, small scripts, local automations, and prototypes.",
    text:
      "Make an authenticated HTTP request to Agent Ledger before the automation sends email, spends money, exports data, or uses a sensitive account.",
  },
  {
    title: "MCP-compatible agent",
    bestFor: "Agents that can use custom MCP tools or remote tool servers.",
    text:
      "Connect the agent to /api/mcp, list tools, then call propose_action, get_approval_status, list_agents, or guarded Stripe refund tools.",
  },
  {
    title: "Guarded adapter",
    bestFor: "Production systems where you need stronger control than documentation alone.",
    text:
      "Put Agent Ledger between the agent and the dangerous tool. The agent never gets raw payment, wallet, inbox, browser, or admin access without passing through the adapter.",
  },
] as const;

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/agents",
    purpose: "List registered agents the integration can reference.",
  },
  {
    method: "POST",
    path: "/api/v1/agents/autonomous/tick",
    purpose: "Queue due autonomous agent cycles from each standing prompt.",
  },
  {
    method: "POST",
    path: "/api/v1/actions/propose",
    purpose: "Ask Agent Ledger to allow, review, or block a planned action.",
  },
  {
    method: "GET",
    path: "/api/v1/approvals/[approvalId]",
    purpose: "Check whether a human has approved or rejected a paused action.",
  },
  {
    method: "POST",
    path: "/api/v1/actions/[actionId]/result",
    purpose: "Write the final outcome after an allowed action succeeds or fails.",
  },
  {
    method: "POST",
    path: "/api/v1/stripe/refunds",
    purpose: "Use the guarded Stripe refund adapter instead of direct Stripe access.",
  },
  {
    method: "POST",
    path: "/api/mcp",
    purpose: "Remote MCP endpoint for agents that prefer tool calls over raw REST.",
  },
] as const;

const envExample = [
  "APP_URL=http://localhost:3260",
  "SERVICE_ACCOUNT_TOKENS=ops-agent:replace-with-a-long-random-token",
  "AGENT_LEDGER_WORKER_PROVIDER=openai",
  "AGENT_LEDGER_WORKER_SECONDS=60",
  "AGENT_LEDGER_VAULT_KEY=replace-with-a-long-random-local-vault-key",
].join("\n");

const restExample = [
  "const response = await fetch(`${AGENT_LEDGER_URL}/api/v1/actions/propose`, {",
  "  method: 'POST',",
  "  headers: {",
  "    'Content-Type': 'application/json',",
  "    Authorization: `Bearer ${AGENT_LEDGER_SERVICE_TOKEN}`,",
  "  },",
  "  body: JSON.stringify({",
  "    agentId: 'agent-id-from-agent-hub',",
  "    actionType: 'send-email',",
  "    target: 'customer@example.com',",
  "    tool: 'gmail',",
  "    vendor: 'Google Workspace',",
  "    summary: 'Send a drafted reply to a customer.',",
  "    reasoning: 'The customer asked for setup steps and the reply uses approved documentation.',",
  "  }),",
  "});",
  "",
  "const decision = await response.json();",
  "",
  "if (decision.decision === 'allow') {",
  "  // Execute the external action, then write the result back to Agent Ledger.",
  "} else if (decision.decision === 'review') {",
  "  // Pause and wait for the approval queue.",
  "} else {",
  "  // Stop. The policy layer blocked the action.",
  "}",
].join("\n");

const tickExample = [
  "await fetch(`${AGENT_LEDGER_URL}/api/v1/agents/autonomous/tick`, {",
  "  method: 'POST',",
  "  headers: {",
  "    'Content-Type': 'application/json',",
  "    Authorization: `Bearer ${AGENT_LEDGER_SERVICE_TOKEN}`,",
  "  },",
  "  body: JSON.stringify({ limit: 25 }),",
  "});",
].join("\n");

const workerExample = [
  "npm run agents:work",
  "npm run agents:work:loop",
  "",
  "# Required model-backed worker",
  "AGENT_LEDGER_WORKER_PROVIDER=openai",
  "OPENAI_API_KEY=your-key",
  "OPENAI_MODEL=gpt-5.4-mini",
].join("\n");

const mcpExample = [
  "curl -X POST http://localhost:3260/api/mcp \\",
  "  -H \"Authorization: Bearer replace-with-a-long-random-token\" \\",
  "  -H \"Content-Type: application/json\" \\",
  "  -d '{",
  "    \"jsonrpc\": \"2.0\",",
  "    \"id\": 1,",
  "    \"method\": \"tools/list\",",
  "    \"params\": {}",
  "  }'",
].join("\n");

const faq = [
  {
    question: "Can I test with my own stuff today?",
    answer:
      "Yes, but start with safe resources. Create your own agent, add your own test vault items, bind permissions, set a standing prompt, and run the autonomous tick locally. For live outside systems, wire the external worker through the REST or MCP endpoints first.",
  },
  {
    question: "Does Agent Ledger run the actual AI worker yet?",
    answer:
      "The current product creates autonomous schedules, queues due cycles, enforces guidelines, logs actions, and exposes REST/MCP governance endpoints. A real worker service still needs to be connected to perform live tool work.",
  },
  {
    question: "What stops an agent from ignoring Agent Ledger?",
    answer:
      "Nothing if the agent still has direct access to the real tool. In production, the risky capability must live behind Agent Ledger. The agent should only receive the guarded adapter, not raw card, wallet, inbox, or admin credentials.",
  },
  {
    question: "What is the safest first live test?",
    answer:
      "Use a disposable inbox, Stripe test mode, a local folder, or a virtual card with a tiny limit. Keep approvals on and review the log after every autonomous cycle.",
  },
] as const;

export default async function ImplementationGuidePage() {
  await requireSession();

  return (
    <main className="relative flex-1 overflow-hidden px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <WorkspacePageHero
          current="guide"
          eyebrow="Customer implementation guide"
          title="Connect real agents without handing them the keys to everything."
          body="Use this page as the customer-facing setup guide: create one specialist, create fresh work environments, give it limited test resources, set standing rules, then connect the worker with a key, token, isolated profile, bridge, REST call, MCP tool, or guarded adapter."
          actions={
            <>
              <Link
                href="/workspace/agents"
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Open Agent Hub
              </Link>
              <Link
                href="/workspace/policies"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/92"
              >
                Review policies
              </Link>
            </>
          }
        >
          <div className="grid gap-3 lg:grid-cols-3">
            <HeroCard
              label="Plain English"
              title="Agent Ledger is the permission desk."
              text="Autonomous agents keep moving, but risky actions still ask before crossing customer limits."
            />
            <HeroCard
              label="Safe first test"
              title="Use fake or limited resources."
              text="Masked test cards, public wallet references, disposable inboxes, and dry-runs come before live accounts."
            />
            <HeroCard
              label="Production rule"
              title="No custody of dangerous secrets."
              text="Use fresh environments, narrow keys, isolated profiles, public references, or guarded adapters so the agent only gets safe access."
            />
          </div>
        </WorkspacePageHero>

        <section className="grid gap-4 lg:grid-cols-5">
          {setupSteps.map((item) => (
            <StepCard
              key={item.step}
              step={item.step}
              title={item.title}
              text={item.text}
            />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="panel rounded-lg p-5 md:p-6">
            <p className="field-label">How real agents connect</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              Put Agent Ledger before the risky action, not before every thought.
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              The agent can think, plan, browse, draft, or prepare work however it
              wants. The background service queues work from the standing prompt.
              Before the worker uses a sensitive capability, it sends a proposal
              to Agent Ledger. Agent Ledger checks identity, policies, budgets,
              vault permissions, and approval rules.
            </p>

            <div className="mt-5 grid gap-3">
              <FlowRow label="1" text="Service tick queues a due autonomous cycle." />
              <FlowRow label="2" text="Worker runs the standing prompt and plans actions." />
              <FlowRow label="3" text="Worker calls Agent Ledger before risky execution." />
              <FlowRow label="4" text="Agent Ledger returns allow, review, or block." />
              <FlowRow label="5" text="Allowed actions execute and write results back." />
            </div>
          </article>

          <article className="panel-strong rounded-lg p-5 md:p-6">
            <p className="field-label">Connection options</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              Choose the smallest integration that controls the real risk.
            </h2>
            <div className="mt-5 grid gap-4">
              {connectionOptions.map((option) => (
                <ConnectionCard key={option.title} {...option} />
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <CodePanel
            label="Required environment"
            title="Create a service token for each external agent."
            text="Set this in the Agent Ledger environment, then restart the app. Use a different token per agent or connector so logs can show which service acted."
            code={envExample}
          />
          <CodePanel
            label="Service tick"
            title="Queue due autonomous cycles on a timer."
            text="Run this from a worker, cron, or local service. It is the difference between a manually started bot and an autonomous agent fleet."
            code={tickExample}
          />
          <CodePanel
            label="Local worker"
            title="Process queued runs on your machine."
            text="Use a real OpenAI runtime key for model-generated task reasoning. External side effects still require guarded adapters."
            code={workerExample}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <CodePanel
            label="REST example"
            title="Ask before sending, spending, trading, or exporting."
            text="This is the core integration pattern. The outside agent proposes a risky action, then follows the returned decision."
            code={restExample}
          />
          <CodePanel
            label="Run queue"
            title="External workers can read queued runs directly."
            text="This is useful if the customer brings their own Claude, OpenAI, browser, or custom agent runtime."
            code={[
              "GET /api/v1/agent-runs?status=queued&limit=10",
              "POST /api/v1/agent-runs/[runId]/result",
            ].join("\n")}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="panel rounded-lg p-5 md:p-6">
            <p className="field-label">API reference</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              The endpoints customers need first
            </h2>
            <div className="mt-5 grid gap-3">
              {endpoints.map((endpoint) => (
                <EndpointRow key={`${endpoint.method}-${endpoint.path}`} {...endpoint} />
              ))}
            </div>
          </article>

          <CodePanel
            label="MCP example"
            title="For agents that prefer tools instead of raw HTTP."
            text="The remote MCP endpoint exposes list_agents, propose_action, get_approval_status, and guarded Stripe refund tools."
            code={mcpExample}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <article className="tech-panel-muted signal-grid rounded-lg p-5 md:p-6">
            <div className="relative z-10">
              <p className="eyebrow text-xs font-medium text-white/72">Safe testing</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                How to test with your own accounts without getting burned
              </h2>
              <div className="mt-5 grid gap-3">
                {customerChecklist.map((item) => (
                  <div
                    key={item}
                    className="rounded-md border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-white/80"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="panel rounded-lg p-5 md:p-6">
            <p className="field-label">Customer FAQ</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              The questions people will ask during onboarding
            </h2>
            <div className="mt-5 grid gap-4">
              {faq.map((item) => (
                <FaqCard key={item.question} {...item} />
              ))}
            </div>
          </article>
        </section>

        <section className="panel-strong rounded-lg p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="field-label">Current product boundary</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                The demo is not the moat. The integration boundary is.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                Agent Ledger becomes valuable when customers stop giving agents
                direct access to dangerous systems. The next production step is
                adding more guarded adapters so the agent hub becomes the easiest
                way to create, permission, launch, and govern specialist workers.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/workspace/logs"
                className="rounded-full border border-line bg-white/90 px-4 py-2 text-sm font-medium text-ink transition hover:bg-white"
              >
                View logs
              </Link>
              <Link
                href="/workspace/approvals"
                className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
              >
                Approval queue
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
    <div className="rounded-md border border-white/10 bg-white/6 p-4">
      <p className="eyebrow text-[11px] font-medium text-white/62">{label}</p>
      <p className="mt-3 text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/76">{text}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  text,
}: {
  step: string;
  title: string;
  text: string;
}) {
  return (
    <article className="soft-card-strong rounded-lg p-5">
      <p className="eyebrow text-xs font-medium text-muted">{step}</p>
      <h2 className="mt-3 text-lg font-semibold tracking-tight text-ink">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-muted">{text}</p>
    </article>
  );
}

function FlowRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-white/86 px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink text-sm font-semibold text-white">
        {label}
      </span>
      <p className="text-sm font-medium text-ink">{text}</p>
    </div>
  );
}

function ConnectionCard({
  title,
  bestFor,
  text,
}: {
  title: string;
  bestFor: string;
  text: string;
}) {
  return (
    <article className="rounded-md border border-line bg-white/86 p-4">
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">
        Best for: {bestFor}
      </p>
      <p className="mt-3 text-sm leading-7 text-muted">{text}</p>
    </article>
  );
}

function CodePanel({
  label,
  title,
  text,
  code,
}: {
  label: string;
  title: string;
  text: string;
  code: string;
}) {
  return (
    <article className="panel rounded-lg p-5 md:p-6">
      <p className="field-label">{label}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted">{text}</p>
      <pre className="mt-5 overflow-x-auto rounded-md border border-[#26323a] bg-[#11181d] p-4 text-xs leading-6 text-[#d7e6e0]">
        <code>{code}</code>
      </pre>
    </article>
  );
}

function EndpointRow({
  method,
  path,
  purpose,
}: {
  method: string;
  path: string;
  purpose: string;
}) {
  return (
    <div className="rounded-md border border-line bg-white/86 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-accent/25 bg-accent-soft px-2 py-1 text-xs font-semibold text-ink">
          {method}
        </span>
        <code className="text-sm font-semibold text-ink">{path}</code>
      </div>
      <p className="mt-3 text-sm leading-7 text-muted">{purpose}</p>
    </div>
  );
}

function FaqCard({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <article className="soft-card rounded-lg p-5">
      <p className="text-base font-semibold text-ink">{question}</p>
      <p className="mt-3 text-sm leading-7 text-muted">{answer}</p>
    </article>
  );
}
