import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-8 rounded-[2rem] border border-line bg-white/65 px-6 py-6 backdrop-blur-xl">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted">
            Agent Ledger
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            Govern agent identity, approvals, logs, and spend from one mission
            control layer built for companies that expect autonomous work to grow.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted">
          <Link href="/request-access">Request access</Link>
          <Link href="/security">Security</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/login">Founder login</Link>
        </div>
      </div>
    </footer>
  );
}
