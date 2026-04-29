import Link from "next/link";

type SessionLike = {
  email: string;
} | null;

export function SiteHeader({ session }: { session: SessionLike }) {
  return (
    <header className="retro-window fade-up">
      <div className="retro-titlebar">
        <span>Agent Ledger Navigator</span>
        <span>Best viewed with approvals enabled</span>
      </div>
      <div className="retro-window-body flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="retro-inset flex h-11 w-11 items-center justify-center text-sm font-bold tracking-[0.08em] text-ink">
            AL
          </div>
            <div>
              <div className="text-base font-bold text-ink">Agent Ledger</div>
              <div className="text-sm text-muted">
                Desktop agent hub for the web&apos;s weird future
              </div>
            </div>
        </div>

        <nav className="hidden items-center gap-2 lg:flex">
          <HeaderLink href="/#why">Why it matters</HeaderLink>
          <HeaderLink href="/#product">Product</HeaderLink>
          <HeaderLink href="/#pricing">Pricing</HeaderLink>
          <HeaderLink href="/security">Security</HeaderLink>
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <Link
              href="/workspace"
              className="retro-link-button retro-button-primary"
            >
              Open workspace
            </Link>
          ) : (
            <>
              <Link
                href="/request-access"
                className="retro-link-button hidden md:inline-flex"
              >
                Request access
              </Link>
              <Link
                href="/login"
                className="retro-link-button retro-button-primary"
              >
                Existing operators
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function HeaderLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <Link
      href={href}
      className="retro-link-button"
    >
      {children}
    </Link>
  );
}
