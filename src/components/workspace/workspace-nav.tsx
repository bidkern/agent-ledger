import Link from "next/link";

export type WorkspaceSection =
  | "overview"
  | "founder-map"
  | "agents"
  | "guide"
  | "policies"
  | "logs"
  | "approvals"
  | "pipeline"
  | "billing";

const sections: Array<{
  key: WorkspaceSection;
  href: string;
  label: string;
  hint: string;
}> = [
  {
    key: "overview",
    href: "/workspace",
    label: "Overview",
    hint: "See what needs attention and how the system is behaving.",
  },
  {
    key: "founder-map",
    href: "/workspace/founder-map",
    label: "Founder Map",
    hint: "The business model, wedge, moat, and operating rhythm in one page.",
  },
  {
    key: "agents",
    href: "/workspace/agents",
    label: "Agent Hub",
    hint: "Create specialist agents, bind vault permissions, and launch local runs.",
  },
  {
    key: "guide",
    href: "/workspace/implementation-guide",
    label: "Guide",
    hint: "Customer setup, safe testing, and real agent connection instructions.",
  },
  {
    key: "policies",
    href: "/workspace/policies",
    label: "Policies",
    hint: "The rules that allow, review, or block agent behavior.",
  },
  {
    key: "logs",
    href: "/workspace/logs",
    label: "Logs",
    hint: "The ledger of what agents attempted and what happened.",
  },
  {
    key: "approvals",
    href: "/workspace/approvals",
    label: "Approvals",
    hint: "The exception queue for actions that need human judgment.",
  },
  {
    key: "pipeline",
    href: "/workspace/pipeline",
    label: "Pipeline",
    hint: "Inbound demand from teams requesting access to the product.",
  },
  {
    key: "billing",
    href: "/workspace/billing",
    label: "Billing",
    hint: "Pricing, subscription state, and monetization controls.",
  },
];

export function WorkspaceNav({ current }: { current: WorkspaceSection }) {
  const activeSection = sections.find((section) => section.key === current);

  return (
    <nav className="space-y-0">
      <div className="flex flex-wrap gap-1">
        {sections.map((section) => {
          const active = section.key === current;

          return (
            <Link
              key={section.key}
              href={section.href}
              className={`retro-tab ${active ? "retro-tab-active" : ""}`}
            >
              {section.label}
            </Link>
          );
        })}
      </div>

      {activeSection ? (
        <div className="retro-inset px-4 py-3 text-sm leading-6 text-ink">
          <span className="font-semibold text-ink">{activeSection.label}:</span>{" "}
          {activeSection.hint}
        </div>
      ) : null}
    </nav>
  );
}
