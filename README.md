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

## Demo Status

No public screenshot or hosted demo is checked in yet. For a portfolio release, capture:

- public landing page
- agent setup form
- vault/reference setup
- policy editor
- approval queue
- action log
- billing readiness panel

For a local demo, create `.env.local` from `.env.example`, run the app, and use the local seed/demo flows rather than connecting live customer accounts.

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
