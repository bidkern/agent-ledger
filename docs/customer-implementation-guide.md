# Agent Ledger Customer Implementation Guide

Agent Ledger is a desktop agent hub and permission layer.
It helps a customer create specialist agents, attach only the resources those agents need, require approval for risky work, and keep a readable log of what happened.

The key idea is simple:

1. The customer gives the agent a standing prompt, cadence, resources, and limits.
2. A worker or scheduler calls Agent Ledger's autonomous tick endpoint.
3. Agent Ledger queues due agent cycles without manual start/stop clicks.
4. The worker performs the queued job.
5. Before it does anything risky, it asks Agent Ledger.
6. Agent Ledger checks policies, permissions, budgets, email limits, action limits, and approval rules.
7. Agent Ledger returns `allow`, `review`, or `block`.
8. The agent only executes if the decision allows it.
9. The final result is written back to the log.

## What you can test today

You can test with your own data and tools, but start safely.

- Create your own specialist agents in Agent Hub.
- Add vault items from fresh environments such as a sandbox GitHub repo, test card, fresh wallet, disposable inbox, isolated browser profile, API key, local folder, or environment variable.
- Bind exact permissions from one vault item to one agent.
- Set standing prompts, autonomous cadences, daily action caps, email caps, and spend caps.
- Connect fresh environments with API keys, access tokens, isolated browser profiles, or local bridges. Do not paste normal account passwords.
- Run the autonomous service tick locally.
- Launch one-off manual tests when you want immediate feedback.
- Connect an outside agent through REST or MCP.
- Use the approval queue and logs to see what the agent attempted.

Important boundary:

Agent Ledger cannot control an agent that still has direct access to a real card, wallet, inbox, admin panel, or payment account.
For production, put the risky capability behind Agent Ledger through a guarded adapter.

## Safest first test

Use one agent, one job, and one safe resource.

Good first tests:

- A disposable email inbox with draft-only permission.
- A sandbox GitHub org or repo with read-only permission.
- A local folder with read-only permission.
- Stripe test mode with fake payment objects.
- A virtual card with a tiny limit.
- A fresh crypto wallet with no meaningful funds.
- An isolated browser profile that is only logged into sandbox accounts.

Avoid on day one:

- Real bank accounts.
- Real wallets with funds.
- Primary email inboxes.
- Primary GitHub orgs or production repos.
- Admin accounts.
- Production payment keys.
- Autopilot mode for spend, trade, send, admin, or customer-impacting work.

## Step-by-step customer setup

### 1. Launch Agent Ledger

Run the desktop launcher or open the app URL provided by the operator.

For local testing, the default URL is:

```text
http://localhost:3260
```

### 2. Sign in

Use the operator login or the demo workspace if you are evaluating the product locally.

### 3. Create an agent

Open `Workspace -> Agent Hub`.

Choose a template or create a custom agent.
Give the agent a narrow mission.

Examples:

- Inbox Agent: draft replies, summarize customer issues, label urgent messages.
- Research Agent: collect sources and summarize findings.
- Finance Ops Agent: review refund requests and propose decisions.
- Wallet Watch Agent: monitor public wallet activity and prepare a summary.
- Frontend Agent: review UI tasks and prepare implementation notes.

Start with `suggest` or `execute`.
Do not start with `autopilot` for risky workflows.

### 4. Add vault items

Vault items are references to outside resources the agent may use.

Examples:

- `Disposable Gmail Inbox`
- `Sandbox GitHub Repo`
- `Stripe Test Account`
- `$1 Virtual Test Card`
- `Fresh MetaMask Test Wallet`
- `Local Downloads Folder`
- `Agent Sandbox Browser Profile`

Secrets are optional.
If you store secrets, set `AGENT_LEDGER_VAULT_KEY` to a long random value first.

Zero-custody rule:

- Do not paste wallet private keys, seed phrases, card numbers, bank logins, account passwords, or production finance credentials into Agent Ledger.
- Wallets, cards, and bank accounts should be saved as public addresses, aliases, masked references, or guarded adapter names only.
- If an agent needs to spend, trade, refund, send, or administer something, put that action behind a guarded adapter and approval policy.

### 5. Bind permissions

Bind one vault item to one agent with one scope.

Recommended first scopes:

- `read` for viewing data.
- `draft` for preparing work without sending.
- `use` for low-risk local tools.

Require approval for:

- `send`
- `spend`
- `trade`
- `admin`

Add a daily limit when money is involved.

### 6. Set autonomous rules

Set:

- Operating mode: `autonomous`.
- Standing prompt: what the agent should keep doing.
- Cadence: how often the service should queue a cycle.
- Max actions per day.
- Max emails per day.
- Daily and monthly spend caps.
- Whether risky actions require approval.

Manual launches are still useful for quick tests, but they should not be the normal operating model.

### 7. Run the autonomous tick

The tick endpoint queues due autonomous cycles.
Run it from a worker, cron, scheduler, or local background service.

For a local background tick, use:

```bash
npm run agents:tick
npm run agents:loop
```

To process queued runs on the same machine, use the local worker:

```bash
npm run agents:work
npm run agents:work:loop
```

The worker now expects a real OpenAI runtime key. It produces task output, proposes governed actions, and writes results back to the ledger. To enable it, set an environment key or add an OpenAI API key as an encrypted vault item:

```env
AGENT_LEDGER_WORKER_PROVIDER=openai
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-5.4-mini
```

```js
await fetch(`${AGENT_LEDGER_URL}/api/v1/agents/autonomous/tick`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${AGENT_LEDGER_SERVICE_TOKEN}`,
  },
  body: JSON.stringify({ limit: 25 }),
});
```

### 8. Launch a one-off test run

Use dry-run first.

Example task:

```text
Review the latest support messages and draft a reply for the three most urgent customer questions. Do not send anything.
```

Then try supervised mode.

Supervised mode lets the agent propose actions, but anything risky should pause in the approval queue.

### 9. Review logs and approvals

Open:

- `Approvals` to decide paused actions.
- `Logs` to see what the agent attempted.
- `Policies` to adjust the rules.

Do not expand permissions until the logs are boring and predictable.

## Connecting a real account or agent

Use the simplest safe path the provider supports.

### Terminal/browser login pattern

This is the generic local-browser flow Agent Ledger supports best:

1. Create a fresh sandbox account, repo, inbox, wallet, or workspace.
2. Create an isolated browser profile for that agent.
3. Open the login page in that browser profile from the terminal.
4. The human signs in manually inside the browser window.
5. Agent Ledger stores the profile or bridge reference, not the password.
6. The agent uses that profile through a local browser bridge.
7. Risky work still goes through Agent Ledger policies and approvals.

Example bridge commands. Replace `browser-bridge` with the local browser tool a customer chooses:

```bash
browser-bridge profile create --name "github-sandbox"
browser-bridge profile start --name "github-sandbox"
browser-bridge open "https://github.com/login" --profile "github-sandbox"
```

In the app, use `Agent Hub -> Create a browser body for an agent` to save this profile as a runtime and vault reference.

### Option A: Fresh environment plus API key or access token

Use this for OpenAI, Claude, GitHub, Slack, Notion, and most developer tools.

Create a fresh project, repo, workspace, page set, inbox, or wallet first.
Then create a narrow key or token for only that environment, paste it into Agent Ledger once, and bind it only to the agent that needs it.

Do not paste your normal account password.

### Option B: Isolated browser/work profile

Use this when the provider does not offer a clean API key for the exact task.

Create a separate browser profile for the agent.
Only sign it into sandbox or test accounts, then point Agent Ledger at that profile or local browser bridge.

Keep this profile separate from your personal daily browser.

### Option C: REST API

Use this for scripts, local workers, no-code automations, and custom agent runtimes.

Set a service token:

```env
SERVICE_ACCOUNT_TOKENS=ops-agent:replace-with-a-long-random-token
```

Then restart Agent Ledger.

Your external agent should call Agent Ledger before risky actions:

```js
const response = await fetch(`${AGENT_LEDGER_URL}/api/v1/actions/propose`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${AGENT_LEDGER_SERVICE_TOKEN}`,
  },
  body: JSON.stringify({
    agentId: "agent-id-from-agent-hub",
    actionType: "send-email",
    target: "customer@example.com",
    tool: "gmail",
    vendor: "Google Workspace",
    summary: "Send a drafted reply to a customer.",
    reasoning:
      "The customer asked for setup help and the reply uses approved documentation.",
  }),
});

const decision = await response.json();

if (decision.decision === "allow") {
  // Execute the external action through the guarded tool.
} else if (decision.decision === "review") {
  // Pause and wait for human approval.
} else {
  // Stop. The action was blocked.
}
```

After an allowed action runs, write back the result:

```js
await fetch(`${AGENT_LEDGER_URL}/api/v1/actions/${decision.actionLogId}/result`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${AGENT_LEDGER_SERVICE_TOKEN}`,
  },
  body: JSON.stringify({
    status: "completed",
    externalReferenceId: "gmail-message-id-or-tool-run-id",
    resultDetail: "Draft was created and left unsent.",
  }),
});
```

### Option D: MCP

Use this for agents that can connect to remote MCP tools.

Endpoint:

```text
POST /api/mcp
```

Available tools:

- `list_agents`
- `propose_action`
- `get_approval_status`
- `stripe_create_refund`

Basic tool-list request:

```bash
curl -X POST http://localhost:3260/api/mcp \
  -H "Authorization: Bearer replace-with-a-long-random-token" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### Option E: Guarded adapter

Use this for production.

A guarded adapter is a wrapper around a risky tool.
The agent does not receive the raw Stripe key, wallet seed, bank login, inbox login, or admin credential.
Instead, the agent calls the adapter.
The adapter calls Agent Ledger.
Agent Ledger decides whether the action can continue.

This is the trust-minimized path. If Agent Ledger's data store leaked, the attacker should see references and redacted logs, not the keys needed to move funds.

Production pattern:

```text
Agent -> Guarded Adapter -> Agent Ledger -> Policy Decision -> External System -> Action Log
```

This is the strongest control model because the agent cannot bypass Agent Ledger unless someone gives it direct credentials.

## REST API reference

All service endpoints require one of:

```text
Authorization: Bearer <token>
x-agent-ledger-service-key: <token>
```

### List agents

```text
GET /api/v1/agents
```

Returns registered agents and their IDs.

### Queue autonomous cycles

```text
POST /api/v1/agents/autonomous/tick
```

Queues due autonomous agents from their standing prompts.
This is what the background service should call repeatedly.

### Propose action

```text
POST /api/v1/actions/propose
```

Required fields:

- `agentId`
- `actionType`
- `target`
- `tool`
- `summary`
- `reasoning`

Optional fields:

- `vendor`
- `amountUsd`

### Read approval status

```text
GET /api/v1/approvals/[approvalId]
```

Use this when `propose_action` returns an approval request.

### Record action result

```text
POST /api/v1/actions/[actionId]/result
```

Valid statuses:

- `completed`
- `failed`

### Guarded Stripe refund

```text
POST /api/v1/stripe/refunds
```

Use this instead of giving an agent direct Stripe refund access.
Start in Stripe test mode.

## Customer FAQ

### Can I use my own agents?

Yes.
Any agent that can make authenticated HTTP requests can connect through REST.
Any agent that can use remote MCP tools can connect through `/api/mcp`.

### Can I use ChatGPT or Claude?

Yes, if the specific agent environment you use can call an authenticated HTTP endpoint or connect to a remote MCP server.
The important part is not the model provider.
The important part is that the agent must ask Agent Ledger before using sensitive tools.

### Does Agent Ledger execute the agent's whole task?

Not yet.
The current product creates agents, stores vault references, binds permissions, queues autonomous cycles, enforces guidelines, handles approvals, logs actions, and exposes REST/MCP governance endpoints.
The actual worker service still needs to be connected for live tool work.

### What stops an agent from bypassing Agent Ledger?

Architecture.
Do not give the agent raw credentials for risky tools.
Give it a guarded adapter that calls Agent Ledger first.

### What should we test before going live?

- Agent creation.
- Vault item setup.
- Permission binding.
- Standing prompt setup.
- Autonomous cadence setup.
- Service tick queueing.
- One-off dry-run launches.
- One-off supervised launches.
- Policy review decisions.
- Approval queue decisions.
- Action log completeness.
- REST or MCP integration.
- Result writeback.
- Guarded adapter behavior.

### When is it safe to use live accounts?

Only after test-mode runs are predictable, approval rules are working, logs are complete, and the agent cannot reach the live account except through Agent Ledger or a guarded adapter.

## Implementation checklist for a customer pilot

- Choose one workflow.
- Choose one agent owner.
- Create one specialist agent.
- Add one to three test vault items.
- Bind exact permissions.
- Require approval for all risky scopes.
- Create one service token.
- Connect the external worker through REST or MCP.
- Run five autonomous tick cycles.
- Run five one-off supervised tests.
- Review every log.
- Tighten policies.
- Only then consider a small live test.
