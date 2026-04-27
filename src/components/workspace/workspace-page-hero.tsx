import type { ReactNode } from "react";
import { WorkspaceNav, type WorkspaceSection } from "@/components/workspace/workspace-nav";

type WorkspacePageHeroProps = {
  current: WorkspaceSection;
  eyebrow: string;
  title: string;
  body: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export function WorkspacePageHero({
  current,
  eyebrow,
  title,
  body,
  actions,
  children,
}: WorkspacePageHeroProps) {
  return (
    <header className="tech-panel signal-grid rounded-[1.8rem] px-6 py-6 md:px-7">
      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl space-y-3">
            <p className="eyebrow text-[11px] font-medium text-white/64">
              {eyebrow}
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {title}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-white/78 md:text-base">
                {body}
              </p>
            </div>
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>

        {children ? <div className="pt-1">{children}</div> : null}

        <WorkspaceNav current={current} />
      </div>
    </header>
  );
}
