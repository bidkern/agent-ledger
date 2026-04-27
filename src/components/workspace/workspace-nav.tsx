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
    <nav className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => {
          const active = section.key === current;

          return (
            <Link
              key={section.key}
              href={section.href}
              className={
                active
                  ? "rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-[0_8px_22px_rgba(8,19,29,0.18)] transition"
                  : "rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white/78 transition hover:bg-white/12 hover:text-white"
              }
            >
              {section.label}
            </Link>
          );
        })}
      </div>

      {activeSection ? (
        <div className="rounded-[1.1rem] border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-white/76">
          <span className="font-semibold text-white">{activeSection.label}:</span>{" "}
          {activeSection.hint}
        </div>
      ) : null}
    </nav>
  );
}
