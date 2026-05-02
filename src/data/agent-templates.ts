import "server-only";

import type { AgentTemplate } from "@/data/types";

export const agentTemplates = [
  {
    id: "operator-generalist",
    name: "Operations Agent",
    category: "operations",
    description:
      "Coordinates repeatable internal tasks, tracks handoffs, and prepares work for approval.",
    defaultMission:
      "Handle repeatable operations tasks, prepare clear summaries, and pause before actions that spend money or affect customers.",
    defaultModel: "gpt-5.4-mini",
    defaultAutonomy: "execute",
    defaultTools: ["browser", "notion", "slack", "calendar"],
    defaultDailyBudgetUsd: 25,
    defaultMonthlyBudgetUsd: 500,
    recommendedVaultKinds: ["browser-profile", "api-key", "file-folder"],
    starterTask:
      "Review the current operating checklist and prepare a prioritized action plan.",
    riskNote:
      "Good first agent. Keep external sends and spending behind approval until the workflow is trusted.",
  },
  {
    id: "inbox-agent",
    name: "Inbox Agent",
    category: "communications",
    description:
      "Reads inboxes, drafts replies, triages opportunities, and escalates sensitive conversations.",
    defaultMission:
      "Triage inbound email, draft replies, label priorities, and ask for approval before sending external messages.",
    defaultModel: "gpt-5.4-mini",
    defaultAutonomy: "suggest",
    defaultTools: ["gmail", "calendar", "crm"],
    defaultDailyBudgetUsd: 0,
    defaultMonthlyBudgetUsd: 0,
    recommendedVaultKinds: ["email", "api-key"],
    starterTask:
      "Scan the inbox for customer or sales opportunities and draft recommended replies.",
    riskNote:
      "Start in draft mode. Sending email should stay approval-gated until tone and routing are proven.",
  },
  {
    id: "research-agent",
    name: "Research Agent",
    category: "research",
    description:
      "Collects public information, compares options, and prepares decisions with sources.",
    defaultMission:
      "Research markets, products, competitors, and vendors, then return sourced recommendations without taking external actions.",
    defaultModel: "gpt-5.4-mini",
    defaultAutonomy: "execute",
    defaultTools: ["browser", "files", "notion"],
    defaultDailyBudgetUsd: 0,
    defaultMonthlyBudgetUsd: 0,
    recommendedVaultKinds: ["browser-profile", "file-folder"],
    starterTask:
      "Research three relevant competitors and summarize where the product should differentiate.",
    riskNote:
      "Low-risk starting point. Keep it away from private accounts unless a user explicitly binds them.",
  },
  {
    id: "frontend-agent",
    name: "Frontend Agent",
    category: "engineering",
    description:
      "Works on local UI tasks, proposes changes, and keeps implementation notes tied to the run history.",
    defaultMission:
      "Improve product UI, implement focused frontend tasks, and leave concise run summaries for review.",
    defaultModel: "gpt-5.4",
    defaultAutonomy: "suggest",
    defaultTools: ["files", "browser", "terminal"],
    defaultDailyBudgetUsd: 0,
    defaultMonthlyBudgetUsd: 0,
    recommendedVaultKinds: ["file-folder", "environment"],
    starterTask:
      "Review the current workspace UI and propose the next highest-impact usability improvement.",
    riskNote:
      "Keep file access scoped to a workspace folder and require review before running destructive commands.",
  },
  {
    id: "finance-ops-agent",
    name: "Finance Ops Agent",
    category: "finance",
    description:
      "Prepares refunds, spend reviews, subscription checks, and finance ops tasks behind strict limits.",
    defaultMission:
      "Prepare finance operations tasks, check spend context, and request approval before moving money or changing billing state.",
    defaultModel: "gpt-5.4-mini",
    defaultAutonomy: "suggest",
    defaultTools: ["stripe", "quickbooks", "browser"],
    defaultDailyBudgetUsd: 1,
    defaultMonthlyBudgetUsd: 25,
    recommendedVaultKinds: ["payment-card", "bank-reference", "api-key"],
    starterTask:
      "Review pending finance tasks and identify which actions need approval before execution.",
    riskNote:
      "High-risk lane. Keep spending at test limits and require approvals for money movement.",
  },
  {
    id: "customer-follow-up-agent",
    name: "Customer Follow-Up Agent",
    category: "operations",
    description:
      "Tracks customer follow-ups, drafts next steps, and escalates overdue or sensitive items.",
    defaultMission:
      "Review customer follow-up records, summarize overdue items, and draft next steps for operator review.",
    defaultModel: "gpt-5.4-mini",
    defaultAutonomy: "suggest",
    defaultTools: ["crm", "email", "calendar"],
    defaultDailyBudgetUsd: 0,
    defaultMonthlyBudgetUsd: 0,
    recommendedVaultKinds: ["api-key", "email", "browser-profile"],
    starterTask:
      "Review open customer follow-ups and prepare a prioritized list of next actions.",
    riskNote:
      "Start in draft mode. External customer messages should stay approval-gated until tone and routing are proven.",
  },
] satisfies AgentTemplate[];

export function listAgentTemplates() {
  return agentTemplates;
}

export function getAgentTemplateById(id: string) {
  return agentTemplates.find((template) => template.id === id) ?? null;
}
