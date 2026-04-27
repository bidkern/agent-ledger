import "server-only";

import { getBillingSnapshot } from "@/data/billing";
import {
  listActionLogs,
  listAccessRequests,
  listAgents,
  listApprovals,
  listAuditEvents,
  listPolicies,
  redactSensitiveText,
} from "@/data/repository";

function redactExportValue<T>(value: T): T {
  if (typeof value === "string") {
    return (redactSensitiveText(value) ?? "") as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactExportValue(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactExportValue(item)]),
    ) as T;
  }

  return value;
}

export async function buildPrivateExportBundle() {
  const [agents, policies, actionLogs, approvals, accessRequests, auditTrail, billing] =
    await Promise.all([
      listAgents(),
      listPolicies(),
      listActionLogs(),
      listApprovals(),
      listAccessRequests(),
      listAuditEvents(),
      getBillingSnapshot(),
    ]);

  return redactExportValue({
    app: "Agent Ledger",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    agents,
    policies,
    actionLogs,
    approvals,
    accessRequests,
    billing,
    auditTrail,
  });
}

export function getPrivateExportFilename(exportedAt: string) {
  return `agent-ledger-private-export-${exportedAt.replace(/[:.]/g, "-")}.json`;
}
