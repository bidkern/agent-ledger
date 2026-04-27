const statuses = [
  {
    label: "allowed",
    tone: "border-accent/25 bg-accent-soft text-ink",
    body: "Policy cleared the action to execute, but the external result may still be pending.",
  },
  {
    label: "completed",
    tone: "border-success/18 bg-green-50 text-success",
    body: "Policy allowed the action and the agent finished it.",
  },
  {
    label: "pending approval",
    tone: "border-[#edd89b] bg-[#fff7e2] text-[#8d6200]",
    body: "The system escalated the action because a rule required review.",
  },
  {
    label: "blocked",
    tone: "border-danger/18 bg-red-50 text-danger",
    body: "A rule stopped the action before the agent could complete it.",
  },
] as const;

export function ActionStatusLegend() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {statuses.map((status) => (
        <article
          key={status.label}
          className="soft-card rounded-[1.35rem] p-4"
        >
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${status.tone}`}
          >
            {status.label}
          </span>
          <p className="mt-3 text-sm leading-6 text-muted">{status.body}</p>
        </article>
      ))}
    </div>
  );
}
