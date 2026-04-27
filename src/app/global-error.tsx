"use client";

import Link from "next/link";
import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background px-6 py-8 text-ink">
        <main className="mx-auto flex min-h-[80vh] w-full max-w-3xl items-center justify-center">
          <div className="w-full border-l-4 border-danger bg-white px-6 py-7 shadow-[0_8px_24px_rgba(29,36,41,0.08)] md:px-8">
            <p className="eyebrow text-xs font-medium text-muted">
              Global error
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">
              The workspace hit an unexpected error.
            </h1>
            <p className="mt-4 text-base leading-8 text-muted">
              Private control-plane data stayed server-side, but this request did
              not complete cleanly. Retry the route and inspect the logs using the
              digest below if it keeps happening.
            </p>
            <div className="mt-6 rounded-md border border-line bg-[#f7f8f7] p-4 text-sm text-muted">
              Error digest: {error.digest || "not available"}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => unstable_retry()}
                className="rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
              >
                Retry request
              </button>
              <Link
                href="/"
                className="rounded-md border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink"
              >
                Return home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
