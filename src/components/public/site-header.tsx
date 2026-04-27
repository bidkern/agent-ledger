import Link from "next/link";

type SessionLike = {
  email: string;
} | null;

export function SiteHeader({ session }: { session: SessionLike }) {
  return (
    <header className="fade-up flex flex-wrap items-center justify-between gap-4 rounded-[1.6rem] border border-line bg-white/82 px-5 py-4 shadow-[0_10px_24px_rgba(8,19,29,0.05)] backdrop-blur-lg">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-sm font-semibold tracking-[0.08em] text-white">
          AL
        </div>
        <div>
          <div className="text-base font-semibold text-ink">Agent Ledger</div>
          <div className="text-sm text-muted">Governed actions for AI agents</div>
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
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
          >
            Open workspace
          </Link>
        ) : (
          <>
            <Link
              href="/request-access"
              className="hidden rounded-full border border-line bg-white/78 px-4 py-2 text-sm font-medium text-ink transition hover:bg-white md:inline-flex"
            >
              Request access
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
            >
              Existing operators
            </Link>
          </>
        )}
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
      className="rounded-full px-3 py-2 text-sm text-muted transition hover:bg-white hover:text-ink"
    >
      {children}
    </Link>
  );
}
