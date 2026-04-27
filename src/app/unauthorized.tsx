import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-2xl border-l-4 border-accent bg-white px-6 py-7 shadow-[0_8px_24px_rgba(29,36,41,0.08)] md:px-8">
        <h1 className="text-3xl font-semibold text-ink md:text-4xl">
          Sign in to open Agent Ledger.
        </h1>
        <p className="mt-4 text-base leading-8 text-muted">
          Your agents, rules, approvals, and action history stay inside the
          private workspace.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
          >
            Go to login
          </Link>
          <Link
            href="/"
            className="rounded-md border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink"
          >
            Back to public site
          </Link>
          <Link
            href="/request-access"
            className="rounded-md border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink"
          >
            Request access
          </Link>
        </div>
      </div>
    </main>
  );
}
