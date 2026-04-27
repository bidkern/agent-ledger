import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), process.env.DATA_DIR || ".agentledger-data");
const emptyCollections = [
  "agents.json",
  "agent-runs.json",
  "runtime-connections.json",
  "agent-permissions.json",
  "vault-items.json",
  "policies.json",
  "action-logs.json",
  "approvals.json",
  "access-requests.json",
  "audit-events.json",
  "rate-limits.json",
];

await mkdir(dataDir, { recursive: true });

await Promise.all(
  emptyCollections.map((file) =>
    writeFile(path.join(dataDir, file), "[]\n", "utf8"),
  ),
);

await writeFile(
  path.join(dataDir, "billing-config.json"),
  `${JSON.stringify(
    [
      {
        id: "default",
        companyName: "Your Company",
        plan: "starter",
        stripeMode: "manual",
        stripeSubscriptionStatus: "manual",
        billingEmail: "founder@agentledger.ai",
        baseFeeUsd: 0,
        perAgentUsd: 0,
        perThousandActionsUsd: 0,
        notes: "Fresh local workspace. Configure billing when ready.",
        updatedAt: new Date().toISOString(),
      },
    ],
    null,
    2,
  )}\n`,
  "utf8",
);

console.log("Agent Ledger local workspace reset to a clean slate.");
