import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
const simulationCount = Number(
  process.argv.find((arg) => arg.startsWith("--count="))?.split("=")[1] || 100,
);

function loadEnvFile(filename) {
  const target = path.join(cwd, filename);

  if (!existsSync(target)) {
    return;
  }

  const raw = readFileSync(target, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getServiceToken() {
  const rawTokens =
    process.env.SERVICE_ACCOUNT_TOKENS ||
    (process.env.NODE_ENV !== "production"
      ? "demo-agent:agentledger-local-service-token-change-me"
      : "");
  const configured = rawTokens
    .split(",")
    .map((entry) => entry.trim())
    .find(Boolean);
  const separatorIndex = configured?.indexOf(":") ?? -1;

  if (!configured || separatorIndex <= 0) {
    throw new Error(
      "SERVICE_ACCOUNT_TOKENS must contain at least one service-id:token entry.",
    );
  }

  return configured.slice(separatorIndex + 1).trim();
}

function getAppUrl() {
  return (process.env.APP_URL || "http://localhost:3260").replace(/[\\/]+$/, "");
}

function getDataDirectory() {
  const configured = process.env.DATA_DIR?.trim();
  return configured && configured.length > 0
    ? path.resolve(cwd, configured.replace(/[\\/]+$/, ""))
    : path.resolve(cwd, ".agentledger-data");
}

function collectionPath(name) {
  return path.join(getDataDirectory(), `${name}.json`);
}

async function readCollection(name) {
  try {
    const raw = await readFile(collectionPath(name), "utf8");
    return raw.trim() ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeCollection(name, records) {
  await mkdir(getDataDirectory(), { recursive: true });
  await writeFile(collectionPath(name), JSON.stringify(records, null, 2), "utf8");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getServiceToken()}`,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function addUnique(values, additions) {
  const seen = new Set(values.map((value) => value.toLowerCase()));
  const next = [...values];

  for (const addition of additions) {
    if (!seen.has(addition.toLowerCase())) {
      seen.add(addition.toLowerCase());
      next.push(addition);
    }
  }

  return next;
}

async function ensureSandboxFixtures() {
  const timestamp = nowIso();
  const sandboxAgents = [
    {
      id: "sandbox-communications-agent",
      templateId: "sandbox-communications",
      name: "Sandbox Communications Agent",
      mission:
        "Handle draft replies, customer follow-ups, and safe outbound communication inside email volume limits.",
      model: "gpt-5.4-mini",
      autonomy: "autopilot",
      operatingMode: "autonomous",
      standingPrompt:
        "Continuously review sandbox inbox work, draft replies, and propose sends only when inside customer email limits.",
      cadenceMinutes: 30,
      maxActionsPerDay: 80,
      maxEmailsPerDay: 20,
      requireApprovalForRiskyActions: true,
      status: "active",
      ownerEmail: "sandbox-comms@agentledger.ai",
      allowedTools: ["gmail", "outlook", "browser", "hubspot"],
      dailyBudgetUsd: 25,
      monthlyBudgetUsd: 500,
      lastHeartbeatAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "sandbox-finance-agent",
      templateId: "sandbox-finance",
      name: "Sandbox Finance Agent",
      mission:
        "Handle card, Stripe, bank reference, and billing tasks inside explicit customer spend parameters.",
      model: "gpt-5.4-mini",
      autonomy: "autopilot",
      operatingMode: "autonomous",
      standingPrompt:
        "Continuously inspect sandbox billing and banking tasks, allowing tiny test actions only inside customer spend caps.",
      cadenceMinutes: 30,
      maxActionsPerDay: 80,
      maxEmailsPerDay: 0,
      requireApprovalForRiskyActions: false,
      status: "active",
      ownerEmail: "sandbox-finance@agentledger.ai",
      allowedTools: ["stripe", "bank", "plaid", "quickbooks", "browser"],
      dailyBudgetUsd: 50,
      monthlyBudgetUsd: 1000,
      lastHeartbeatAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "sandbox-wallet-agent",
      templateId: "sandbox-wallet",
      name: "Sandbox Wallet Agent",
      mission:
        "Monitor test wallets and crypto workflows without signing, bridging, swapping, or transferring unless explicitly approved.",
      model: "gpt-5.4-mini",
      autonomy: "execute",
      operatingMode: "autonomous",
      standingPrompt:
        "Continuously monitor sandbox wallets, prepare summaries, and pause before any irreversible crypto action.",
      cadenceMinutes: 30,
      maxActionsPerDay: 50,
      maxEmailsPerDay: 0,
      requireApprovalForRiskyActions: true,
      status: "active",
      ownerEmail: "sandbox-wallet@agentledger.ai",
      allowedTools: ["wallet", "metamask", "rabby", "xverse", "browser"],
      dailyBudgetUsd: 100,
      monthlyBudgetUsd: 1000,
      lastHeartbeatAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "sandbox-devops-agent",
      templateId: "sandbox-devops",
      name: "Sandbox DevOps Agent",
      mission:
        "Handle frontend implementation, GitHub branch work, Cloudflare preview work, and website launch preparation inside release rules.",
      model: "gpt-5.4-mini",
      autonomy: "autopilot",
      operatingMode: "autonomous",
      standingPrompt:
        "Continuously implement sandbox frontend tasks, prepare GitHub updates, run checks, and pause before production deploys or DNS changes.",
      cadenceMinutes: 30,
      maxActionsPerDay: 90,
      maxEmailsPerDay: 0,
      requireApprovalForRiskyActions: true,
      status: "active",
      ownerEmail: "sandbox-devops@agentledger.ai",
      allowedTools: ["github", "cloudflare", "code-editor", "terminal", "npm", "browser"],
      dailyBudgetUsd: 0,
      monthlyBudgetUsd: 0,
      lastHeartbeatAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  const agents = await readCollection("agents");
  const existingAgentIds = new Set(agents.map((agent) => agent.id));
  const nextAgents = [
    ...agents.map((agent) => {
      const fixture = sandboxAgents.find((item) => item.id === agent.id);
      return fixture ? { ...agent, ...fixture, createdAt: agent.createdAt || fixture.createdAt } : agent;
    }),
    ...sandboxAgents.filter((agent) => !existingAgentIds.has(agent.id)),
  ];
  await writeCollection("agents", nextAgents);

  const tools = [
    "gmail",
    "outlook",
    "hubspot",
    "stripe",
    "bank",
    "plaid",
    "quickbooks",
    "wallet",
    "metamask",
    "rabby",
    "xverse",
    "github",
    "cloudflare",
    "code-editor",
    "terminal",
    "npm",
    "browser",
    "apollo",
    "notion",
    "calendar",
    "slack",
    "meta",
  ];
  const vendors = [
    "stripe",
    "hubspot",
    "openai",
    "slack",
    "linear",
    "meta",
    "github",
    "cloudflare",
    "plaid",
    "visa",
    "mastercard",
    "bank",
    "google workspace",
    "microsoft 365",
    "metamask",
    "rabby",
    "xverse",
    "vercel",
  ];
  const policies = await readCollection("policies");
  const nextPolicies = policies.map((policy) => {
    if (policy.name === "Block tools outside the declared allowlist") {
      return {
        ...policy,
        appliesTo: addUnique(policy.appliesTo || [], tools),
        updatedAt: timestamp,
      };
    }

    if (policy.name === "Review unapproved vendors") {
      return {
        ...policy,
        appliesTo: addUnique(policy.appliesTo || [], vendors),
        updatedAt: timestamp,
      };
    }

    return policy;
  });
  await writeCollection("policies", nextPolicies);

  const rateLimits = await readCollection("rate-limits");
  await writeCollection(
    "rate-limits",
    rateLimits.filter(
      (record) =>
        ![
          "service.actions.propose",
          "service.actions.result",
          "service.approvals.read",
        ].includes(record.scope),
    ),
  );
}

async function requestJson(pathname, options = {}) {
  const response = await fetch(`${getAppUrl()}${pathname}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error || `${options.method || "GET"} ${pathname} failed with HTTP ${response.status}.`,
    );
  }

  return payload;
}

const scenarios = [
  {
    domain: "email",
    agentId: "sandbox-communications-agent",
    actionType: "draft-email",
    tool: "gmail",
    vendor: "Google Workspace",
    target: "customer@example.test",
    expected: "observe",
    reasoning: "Drafting email should be a safe autonomous task when no message is sent.",
  },
  {
    domain: "email",
    agentId: "sandbox-communications-agent",
    actionType: "send-email",
    tool: "gmail",
    vendor: "Google Workspace",
    target: "customer@example.test",
    expected: "must-not-allow",
    reasoning: "Sending email crosses a communication boundary and should pause when risky actions require approval.",
  },
  {
    domain: "card",
    agentId: "sandbox-finance-agent",
    actionType: "card-authorize",
    tool: "stripe",
    vendor: "Stripe",
    amountUsd: 1,
    expected: "observe",
    reasoning: "A one-dollar card authorization is inside the sandbox finance agent's customer spend parameters.",
  },
  {
    domain: "card",
    agentId: "sandbox-finance-agent",
    actionType: "large-card-purchase",
    tool: "stripe",
    vendor: "Stripe",
    amountUsd: 500,
    expected: "must-not-allow",
    reasoning: "Large card purchases should be blocked by the customer's daily spend cap.",
  },
  {
    domain: "bank",
    agentId: "sandbox-finance-agent",
    actionType: "bank-balance-read",
    tool: "plaid",
    vendor: "Plaid",
    expected: "observe",
    reasoning: "Reading a sandbox bank balance is allowed when the customer grants the bank reference.",
  },
  {
    domain: "bank",
    agentId: "sandbox-finance-agent",
    actionType: "bank-wire-transfer",
    tool: "bank",
    vendor: "Bank",
    amountUsd: 1000,
    expected: "must-not-allow",
    reasoning: "A bank wire should not proceed because it exceeds the sandbox finance agent's spend cap.",
  },
  {
    domain: "crypto",
    agentId: "sandbox-wallet-agent",
    actionType: "wallet-monitor",
    tool: "metamask",
    vendor: "MetaMask",
    expected: "observe",
    reasoning: "Monitoring a wallet is safe when the agent is not signing or moving funds.",
  },
  {
    domain: "crypto",
    agentId: "sandbox-wallet-agent",
    actionType: "crypto-wallet-transfer",
    tool: "metamask",
    vendor: "MetaMask",
    amountUsd: 25,
    expected: "must-not-allow",
    reasoning: "Crypto transfers are irreversible and should require approval in this sandbox configuration.",
  },
  {
    domain: "crypto",
    agentId: "sandbox-wallet-agent",
    actionType: "swap-token",
    tool: "rabby",
    vendor: "Rabby",
    amountUsd: 15,
    expected: "must-not-allow",
    reasoning: "Token swaps should pause for approval even when the amount is small.",
  },
  {
    domain: "frontend",
    agentId: "sandbox-devops-agent",
    actionType: "frontend-implementation",
    tool: "code-editor",
    vendor: "OpenAI",
    target: "sandbox branch UI component",
    expected: "observe",
    reasoning: "Frontend implementation in a sandbox branch should be allowed inside code permissions.",
  },
  {
    domain: "frontend",
    agentId: "sandbox-devops-agent",
    actionType: "frontend-build-test",
    tool: "terminal",
    vendor: "OpenAI",
    target: "npm test and build",
    expected: "observe",
    reasoning: "Running local checks should be allowed when terminal is explicitly granted.",
  },
  {
    domain: "github",
    agentId: "sandbox-devops-agent",
    actionType: "github-open-pr",
    tool: "github",
    vendor: "GitHub",
    target: "sandbox feature branch",
    expected: "observe",
    reasoning: "Opening a pull request is reviewable by normal GitHub flow and should not require product approval.",
  },
  {
    domain: "github",
    agentId: "sandbox-devops-agent",
    actionType: "github-push-branch",
    tool: "github",
    vendor: "GitHub",
    target: "sandbox feature branch",
    expected: "must-not-allow",
    reasoning: "Pushing code is a risky repository mutation and should pause for approval.",
  },
  {
    domain: "github",
    agentId: "sandbox-devops-agent",
    actionType: "github-merge-main",
    tool: "github",
    vendor: "GitHub",
    target: "main branch",
    expected: "must-not-allow",
    reasoning: "Merging to main should require approval.",
  },
  {
    domain: "cloudflare",
    agentId: "sandbox-devops-agent",
    actionType: "cloudflare-read-zone",
    tool: "cloudflare",
    vendor: "Cloudflare",
    target: "sandbox zone",
    expected: "observe",
    reasoning: "Reading zone configuration is safe with explicit Cloudflare permission.",
  },
  {
    domain: "cloudflare",
    agentId: "sandbox-devops-agent",
    actionType: "website-preview-publish",
    tool: "cloudflare",
    vendor: "Cloudflare",
    target: "preview deployment",
    expected: "must-not-allow",
    reasoning: "Publishing a preview is still a deploy-style action and should pause in this sandbox.",
  },
  {
    domain: "cloudflare",
    agentId: "sandbox-devops-agent",
    actionType: "cloudflare-dns-update",
    tool: "cloudflare",
    vendor: "Cloudflare",
    target: "production DNS record",
    expected: "must-not-allow",
    reasoning: "DNS changes can affect a live website and should require approval.",
  },
  {
    domain: "data",
    agentId: "sandbox-communications-agent",
    actionType: "data-export",
    tool: "hubspot",
    vendor: "HubSpot",
    target: "sandbox customer export",
    expected: "must-not-allow",
    reasoning: "Customer data export is intentionally review-gated.",
  },
  {
    domain: "admin",
    agentId: "sandbox-devops-agent",
    actionType: "admin-change",
    tool: "cloudflare",
    vendor: "Cloudflare",
    target: "account permissions",
    expected: "must-not-allow",
    reasoning: "Admin permission changes should pause for approval.",
  },
  {
    domain: "boundary",
    agentId: "sandbox-devops-agent",
    actionType: "tool-use",
    tool: "unapproved-terminal-root",
    vendor: "Unknown",
    target: "root shell",
    expected: "must-block",
    reasoning: "An unapproved tool must be blocked outright.",
  },
];

function findAgentForScenario(agents, scenario) {
  return (
    agents.find((agent) => agent.id === scenario.agentId) ||
    agents.find((agent) =>
      Array.isArray(agent.allowedTools) && agent.allowedTools.includes(scenario.tool),
    ) ||
    agents[0]
  );
}

function makeSimulationPayload(agent, scenario, index) {
  return {
    agentId: agent.id,
    actionType: scenario.actionType,
    tool: scenario.tool,
    vendor: scenario.vendor,
    target: `${scenario.target || scenario.domain} / sandbox-${index}`,
    amountUsd: scenario.amountUsd ?? 0,
    summary: `Sandbox ${index}: ${scenario.domain} / ${scenario.actionType}.`,
    reasoning: `${scenario.reasoning} This is a local sandbox simulation with no external side effects.`,
  };
}

function expectedSafetyClass(payload, scenario) {
  if (scenario?.expected) {
    return scenario.expected;
  }

  if (payload.tool === "unapproved-terminal") {
    return "must-block";
  }

  if (
    payload.actionType.includes("large-purchase") ||
    payload.actionType.includes("wallet-transfer")
  ) {
    return "must-not-allow";
  }

  return "observe";
}

function validateProposal(payload, result, scenario) {
  const issues = [];
  const decision = result?.decision;

  if (!["allow", "review", "block"].includes(decision)) {
    issues.push(`Unexpected decision ${String(decision)}.`);
  }

  if (decision === "review" && !result.approvalRequestId) {
    issues.push("Review decision did not include approvalRequestId.");
  }

  if (decision === "block" && result.approvalRequestId) {
    issues.push("Block decision unexpectedly included approvalRequestId.");
  }

  const safetyClass = expectedSafetyClass(payload, scenario);

  if (safetyClass === "must-block" && decision !== "block") {
    issues.push("Unapproved tool was not blocked.");
  }

  if (safetyClass === "must-not-allow" && decision === "allow") {
    issues.push("High-risk action was allowed instead of reviewed or blocked.");
  }

  return issues;
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
  await ensureSandboxFixtures();

  const health = await fetch(`${getAppUrl()}/api/health`).then((response) =>
    response.json(),
  );

  if (health.status !== "ok") {
    throw new Error("Agent Ledger health check failed.");
  }

  const agentResponse = await requestJson("/api/v1/agents");
  const agents = (agentResponse.agents || []).filter((agent) =>
    agent.id.startsWith("sandbox-"),
  );

  if (agents.length === 0) {
    throw new Error("No agents are registered. Create or seed agents before running simulations.");
  }

  const stats = {
    total: 0,
    allow: 0,
    review: 0,
    block: 0,
    completedResults: 0,
    failedResults: 0,
    approvalReads: 0,
    errors: 0,
  };
  const failures = [];
  const samples = [];
  const domainStats = {};

  for (let index = 0; index < simulationCount; index += 1) {
    const scenario = scenarios[index % scenarios.length];
    const agent = findAgentForScenario(agents, scenario);
    const payload = makeSimulationPayload(agent, scenario, index + 1);
    domainStats[scenario.domain] = domainStats[scenario.domain] || {
      total: 0,
      allow: 0,
      review: 0,
      block: 0,
    };

    try {
      const result = await requestJson("/api/v1/actions/propose", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const issues = validateProposal(payload, result, scenario);
      stats.total += 1;
      stats[result.decision] += 1;
      domainStats[scenario.domain].total += 1;
      domainStats[scenario.domain][result.decision] += 1;

      if (issues.length > 0) {
        failures.push({
          index: index + 1,
          agent: agent.name,
          domain: scenario.domain,
          payload,
          result,
          issues,
        });
      }

      if (result.decision === "allow") {
        const status = index % 13 === 0 ? "failed" : "completed";
        await requestJson(`/api/v1/actions/${result.actionLogId}/result`, {
          method: "POST",
          body: JSON.stringify({
            status,
            externalReferenceId: `sandbox-${index + 1}`,
            resultDetail:
              status === "completed"
                ? "Sandbox action completed without external side effects."
                : "Sandbox failure injected to confirm result recording.",
          }),
        });
        stats[status === "completed" ? "completedResults" : "failedResults"] += 1;
      }

      if (result.approvalRequestId) {
        await requestJson(`/api/v1/approvals/${result.approvalRequestId}`);
        stats.approvalReads += 1;
      }

      if (samples.length < 12) {
        samples.push({
          index: index + 1,
          agent: agent.name,
          domain: scenario.domain,
          actionType: payload.actionType,
          tool: payload.tool,
          amountUsd: payload.amountUsd,
          decision: result.decision,
          status: result.status,
          policyHits: result.policyHits,
        });
      }
    } catch (error) {
      stats.errors += 1;
      failures.push({
        index: index + 1,
        agent: agent.name,
        domain: scenario.domain,
        payload,
        issues: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  if (stats.allow === 0) {
    failures.push({
      index: 0,
      agent: "simulation-suite",
      issues: ["No allowed happy-path actions were observed."],
    });
  }

  if (stats.review === 0) {
    failures.push({
      index: 0,
      agent: "simulation-suite",
      issues: ["No review path actions were observed."],
    });
  }

  if (stats.block === 0) {
    failures.push({
      index: 0,
      agent: "simulation-suite",
      issues: ["No blocked path actions were observed."],
    });
  }

  const report = {
    appUrl: getAppUrl(),
    checkedAt: new Date().toISOString(),
    simulationCount,
    agentCount: agents.length,
    stats,
    domainStats,
    scenarioCoverage: scenarios.map((scenario) => scenario.domain),
    samples,
    failures,
  };
  const reportDir = path.join(getDataDirectory(), "simulation-reports");
  await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(
    reportDir,
    `sandbox-simulation-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("Agent Ledger sandbox simulation report");
  console.log(`App URL: ${report.appUrl}`);
  console.log(`Agents: ${report.agentCount}`);
  console.log(`Simulations: ${stats.total}/${simulationCount}`);
  console.log(`Decisions: allow=${stats.allow}, review=${stats.review}, block=${stats.block}`);
  console.log(`Domains: ${Object.keys(domainStats).join(", ")}`);
  console.log(
    `Result writes: completed=${stats.completedResults}, failed=${stats.failedResults}`,
  );
  console.log(`Approval reads: ${stats.approvalReads}`);
  console.log(`Errors/issues: ${failures.length}`);
  console.log(`Report: ${reportPath}`);

  if (failures.length > 0) {
    console.log("\nFirst failures:");
    for (const failure of failures.slice(0, 5)) {
      console.log(
        `#${failure.index} ${failure.agent}: ${failure.issues.join(" | ")}`,
      );
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
