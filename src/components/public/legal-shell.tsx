import type { ReactNode } from "react";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export function LegalShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="relative overflow-hidden grain">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-6 md:px-10 md:py-8">
        <SiteHeader session={null} />

        <section className="panel rounded-[2rem] p-6 md:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-ink md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted">{intro}</p>
        </section>

        <section className="panel-strong rounded-[2rem] p-6 md:p-8">
          <div className="space-y-8 text-sm leading-8 text-muted md:text-base">
            {children}
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
