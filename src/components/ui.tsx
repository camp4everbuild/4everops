import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { JobStatus, TaskPriority, TaskStatus } from "@/lib/types";
import { ChevronDownIcon } from "@/components/icons";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-4 shadow-sm shadow-black/[0.03] dark:shadow-black/10 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "danger" }) {
  return (
    <button
      {...props}
      className={`${buttonClass(variant)} ${className}`}
    />
  );
}

export function LinkButton({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  return <Link {...props} className={`${buttonClass(variant)} ${className}`} />;
}

function buttonClass(variant: "primary" | "secondary" | "danger") {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100";
  if (variant === "primary") {
    return `${base} bg-accent text-accent-fg shadow-sm shadow-accent/30 hover:opacity-90`;
  }
  if (variant === "danger") {
    return `${base} border border-red-500/40 text-red-500 hover:bg-red-500/10`;
  }
  return `${base} border border-border bg-surface hover:bg-border/40`;
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full min-h-11 rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition-shadow focus:border-accent focus:ring-4 focus:ring-accent/15";

export const textareaClass =
  "w-full rounded-xl border border-border bg-background p-3.5 text-sm outline-none transition-shadow focus:border-accent focus:ring-4 focus:ring-accent/15";

/**
 * A real native <select> underneath (keyboard nav, screen readers, mobile
 * wheel-picker all work for free) but with the OS's default select chrome
 * switched off via appearance-none, so it actually matches the rest of the
 * UI instead of looking like an un-styled form control.
 */
export function Select({
  className = "",
  small,
  ...props
}: ComponentProps<"select"> & { small?: boolean }) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full appearance-none rounded-xl border border-border bg-background pl-3.5 pr-9 text-sm outline-none transition-shadow focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-50 ${
          small ? "min-h-9" : "min-h-11"
        } ${className}`}
      />
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

/** Full-width segmented tab control — controlled, so callers own where the active tab lives (local state, or split across two data sources like Home's board). */
export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="mb-5 flex items-center gap-0.5 overflow-x-auto rounded-full bg-border/40 p-1">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`shrink-0 flex-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition active:scale-[0.97] ${
              active ? "bg-accent text-accent-fg shadow-sm shadow-accent/30" : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "blue" | "green" | "amber" | "red";
}) {
  const tones = {
    neutral: "bg-border/60 text-muted",
    blue: "bg-blue-500/15 text-blue-500",
    green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    red: "bg-red-500/15 text-red-500",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const tone = (
    { low: "neutral", medium: "blue", high: "amber", urgent: "red" } as const
  )[priority];
  return <Badge tone={tone}>{priority}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const tone = (
    { pending: "neutral", in_progress: "blue", completed: "green" } as const
  )[status];
  const label = { pending: "Pending", in_progress: "In progress", completed: "Done" }[
    status
  ];
  return <Badge tone={tone}>{label}</Badge>;
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const tone = (
    {
      open: "green",
      claimed: "blue",
      in_progress: "amber",
      completed: "neutral",
    } as const
  )[status];
  const label = {
    open: "Open",
    claimed: "Claimed",
    in_progress: "In progress",
    completed: "Done",
  }[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
      {children}
    </p>
  );
}
