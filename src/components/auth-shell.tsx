import type { ReactNode } from "react";
import { InfinityMark } from "@/components/icons";

/**
 * Shared frame for solo, unauthenticated-shell pages — login, onboarding,
 * pending. Keeps them visually identical: logo mark, centered narrow
 * column, elevated card for the interactive content, safe-area aware.
 * Gets a bit more visual polish than the working (app) screens on
 * purpose — this is the front door, not a data-dense task list.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="auth-backdrop flex min-h-dvh flex-col justify-center py-12">
      <div className="shell-narrow">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-accent-fg shadow-sm shadow-accent/30">
            <InfinityMark className="h-6 w-6" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-lg shadow-black/[0.04] sm:p-8 dark:shadow-black/30">
          {children}
        </div>
      </div>
    </main>
  );
}
