# Agent Ledger

Agent Ledger is a desktop/web hub for creating autonomous specialist agents while keeping budgets, approvals, runtime permissions, action logs, and billing controls in one governed workspace.

The product thesis is simple: useful agents need a place where people can grant narrow permissions, see what happened, and stop risky work before it touches external systems.

## What Works Today

This repo currently includes:

- public landing, request-access, terms, privacy, and security pages
- an access-code or OIDC-backed private workspace
- agent templates with owners, standing prompts, cadence, autonomy mode, and budgets
- vault/account-reference forms with local secret encryption support
- tool allowlists, policies, approval gates, and action logs
- local sandbox simulations for proposed agent actions
- service endpoints for autonomous ticks, run reads, proposed actions, approvals, and run results
- a local worker that can run in mock mode or use an OpenAI key when explicitly configured
- Stripe checkout, billing portal, and webhook sync helpers
- filesystem storage for local development and Postgres storage for deployment
- an Electron shell and PowerShell launchers for a desktop-style experience

## Product Proof

These screenshots and demo clips were recaptured from the local production build on April 29, 2026 after a 90s-style UI redesign and after `npm run build` plus `npm run lint` passed.

<table>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/landing.png" alt="Agent Ledger landing page" />
      <p><strong>Public thesis and request-access entry point</strong></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/workspace.png" alt="Agent Ledger workspace overview" />
      <p><strong>Operator workspace with approvals, action history, and safety metrics</strong></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/agents.png" alt="Agent Ledger agent hub" />
      <p><strong>Agent Hub for runtime setup, specialist creation, and dry-run testing</strong></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/approvals.png" alt="Agent Ledger approvals queue" />
      <p><strong>Approval queue that explains why risky work paused for human review</strong></p>
    </td>
  </tr>
</table>

<p>
  <img src="docs/screenshots/implementation-guide.png" alt="Agent Ledger implementation guide" />
</p>

**Customer implementation guide**: a shippable onboarding surface for connecting real runtimes without giving agents unsafe access.

### Demo Videos

- [Landing to workspace tour](docs/demo-videos/landing-to-workspace.webm)
- [Workspace navigation tour](docs/demo-videos/workspace-tour.webm)

Refresh proof assets:

```bash
npm run proof:capture -- --base-url=http://localhost:3261
```

## Demo Flow

1. Open the landing page and read the product thesis: create specialist agents, give them narrow permissions, and stop risky work before it leaves the app.
2. Open `/workspace` to see the operator home screen with pending approvals, recent actions, protected spend, and blocked actions.
3. Open `/workspace/agents` to walk the core product path: connect a model/runtime, create a specialist agent, add a resource, give a permission, and stage a dry run.
4. Open `/workspace/approvals` to inspect how the system pauses risky work, explains the policy reason, and lets the operator approve or reject the action.
5. Open `/workspace/implementation-guide` to show the customer-facing rollout path for safe live usage.
6. Optional: run `npm run desktop:launch` to show the Electron shell version instead of the browser view.

## Why It Is Interesting

- Separates agent creation from agent permissioning, approvals, billing, and audit history.
- Treats API keys, wallets, browser profiles, and external accounts as governed references rather than unbounded credentials.
- Blocks wallet private keys, seed phrases, payment card numbers, and bank credentials from vault storage.
- Keeps runtime actions approval-aware so a worker can propose sensitive work without silently executing it.
- Includes a local simulation harness for policy testing before a real runtime is connected.

## Architecture

- `Next.js` App Router for public pages, private workspace, API routes, and server actions
- `Electron` desktop shell for a local app-window launch path
- filesystem or Postgres-backed repository layer
- OIDC-ready enterprise auth plus local access-code auth
- Stripe billing services behind guarded runtime checks
- OpenAI-backed worker path that stays disabled unless API billing is intentionally configured

## Implemented Vs Planned

| Area | Implemented in this repo | Planned next |
| --- | --- | --- |
| Public product surface | Marketing site, request-access funnel, login, and founder workspace | Sharper customer case studies and recorded onboarding walkthroughs |
| Agent setup | Specialist agent creation flow, runtime connection setup, budgets, cadence, owners, and dry-run launches | Shared template packs, richer versioning, and collaborative handoff between operators |
| Governance | Policy authoring, approval queue, action log, blocked-action tracking, and protected spend visibility | More granular policy packs, richer risk scoring, and deeper audit export/reporting |
| Runtime execution | Autonomous tick endpoint, local worker loop, queued run processing, and governed action staging | Multi-worker remote orchestration, better scheduling controls, and runtime health SLAs |
| Storage and auth | Signed session cookies, access-code auth, optional OIDC path, filesystem storage, Postgres support, and export route | Full tenant administration, SCIM, org hierarchy, and longer-term retention controls |
| Billing | Stripe-backed billing configuration, checkout, portal launch, and webhook sync | Metered billing, seat controls, invoice workflows, and finance reconciliation |
| Desktop delivery | Electron shell plus Windows launcher and shortcut install scripts | Signed installers, auto-update, and packaged distribution for non-technical buyers |
| Enterprise safety | Local vault, secret redaction, dangerous-secret rejection rules, and customer implementation guide | Managed secret-manager integrations, connector attestations, and deeper compliance packaging |

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment example:

```bash
cp .env.example .env.local
```

3. Start the web app:

```bash
npm run dev
```

4. Or launch it as a desktop-style app:

```bash
npm run desktop:launch
```

The launcher reads `APP_URL` and scans upward from that port if another local project is already using it.

## Environment

Minimum local values:

- `AUTH_STRATEGY=access-code`
- `APP_ACCESS_CODE`
- `SESSION_SECRET`
- `AGENT_LEDGER_VAULT_KEY`
- `SERVICE_ACCOUNT_TOKENS`
- `APP_URL=http://localhost:3260`

Optional local/demo values:

- `ENABLE_LOCAL_DEMO`
- `DATA_DIR`
- `STORAGE_BACKEND`
- `AGENT_LEDGER_AUTONOMOUS_TICK_SECONDS`
- `AGENT_LEDGER_WORKER_SECONDS`

Real external integrations stay off until configured:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY` or `CLAUDE_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OIDC_*`

Do not put real private keys, seed phrases, bank credentials, or payment card secrets into `.env.local` or vault records.

## Verification

Use these before publishing the repo:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

The GitHub Actions workflow in `.github/workflows/portfolio-checks.yml` runs the same lightweight checks without calling live APIs.

Useful local-only scripts:

```bash
npm run agents:simulate
npm run agents:tick
npm run agents:work
npm run desktop:launch
npm run desktop:stop
```

Do not run live worker or billing flows with production keys unless you intend to spend money or mutate external services.

## Security Notes

- The private workspace uses signed `httpOnly` session cookies.
- Private pages, exports, and workspace responses are marked no-store/noindex where appropriate.
- Runtime OAuth routes stay disabled unless `ENABLE_RUNTIME_OAUTH=true`.
- The local worker refuses metered API calls unless `AGENT_LEDGER_ALLOW_METERED_API=true`.
- Vault secrets are encrypted locally when `AGENT_LEDGER_VAULT_KEY` is set.
- Secret redaction is applied to logs, runs, approvals, exports, and persisted records.
- Stripe webhooks must be verified before subscription state changes.

More detail lives in [docs/security-architecture.md](docs/security-architecture.md) and [docs/production-checklist.md](docs/production-checklist.md).

## Important Files

- [src/app/page.tsx](src/app/page.tsx) - public product page
- [src/app/workspace/page.tsx](src/app/workspace/page.tsx) - private mission control
- [src/app/workspace/agents/page.tsx](src/app/workspace/agents/page.tsx) - agent setup and runtime controls
- [src/app/workspace/approvals/page.tsx](src/app/workspace/approvals/page.tsx) - approval queue
- [src/app/workspace/logs/page.tsx](src/app/workspace/logs/page.tsx) - action ledger
- [src/data/autonomous-engine.ts](src/data/autonomous-engine.ts) - cadence and run-queue logic
- [src/data/repository.ts](src/data/repository.ts) - durable data access layer
- [src/data/local-worker.ts](src/data/local-worker.ts) - governed local worker support
- [desktop/main.cjs](desktop/main.cjs) - desktop app shell
- [scripts/run-agent-ledger-sandbox-simulations.mjs](scripts/run-agent-ledger-sandbox-simulations.mjs) - simulation harness

## Portfolio Metadata

Suggested GitHub description:

```text
Desktop agent hub for governing autonomous AI work with approvals, budgets, vault references, logs, and billing controls.
```

Suggested topics:

```text
ai-agents, nextjs, typescript, electron, openai, agent-orchestration, governance, automation, stripe, workflow-automation
```

## License

MIT. See [LICENSE](LICENSE).
