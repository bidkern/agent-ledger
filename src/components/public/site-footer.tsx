import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="retro-window mt-6">
      <div className="retro-titlebar retro-titlebar-green">
        <span>Agent Ledger Footer Bar</span>
        <span className="retro-blink">Online</span>
      </div>
      <div className="retro-window-body">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow text-xs font-medium text-muted">Agent Ledger</p>
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
        <div className="retro-marquee mt-5 retro-inset px-3 py-2 text-sm text-muted">
          <span>
            Safe agents, visible approvals, operator-friendly logs, and just enough
            late-90s drama.
          </span>
        </div>
      </div>
    </footer>
  );
}
