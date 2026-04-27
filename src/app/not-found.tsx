import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-8">
      <div className="w-full max-w-3xl border-l-4 border-accent bg-white px-6 py-7 shadow-[0_8px_24px_rgba(29,36,41,0.08)] md:px-8">
        <p className="eyebrow text-xs font-medium text-muted">
          Not found
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">
          That route does not exist in Agent Ledger.
        </h1>
        <p className="mt-4 text-base leading-8 text-muted">
          The public site stays intentionally tight and the founder console stays
          private. Use one of the links below to get back to a known path.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
          >
            Go home
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink"
          >
            Open login
          </Link>
        </div>
      </div>
    </main>
  );
}
