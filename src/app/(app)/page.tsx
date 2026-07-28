import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { requireProfile } from "@/lib/auth";
import { getMyTasks } from "@/lib/queries/tasks";
import { getOpenJobs } from "@/lib/queries/jobs";
import { getAnnouncements } from "@/lib/queries/announcements";
import { Card, EmptyState, PriorityBadge, TaskStatusBadge } from "@/components/ui";
import { TasksIcon, JobsIcon, BellIcon, CalendarIcon } from "@/components/icons";
import type { ComponentType, SVGProps } from "react";
import type { TaskWithPeople } from "@/lib/types";
import { Greeting } from "./greeting";

export default async function HomePage() {
  const profile = await requireProfile();
  const firstName = profile.full_name.split(/\s+/)[0];

  const [tasks, jobs, announcements] = await Promise.all([
    getMyTasks(profile.id),
    getOpenJobs(),
    getAnnouncements(profile.id),
  ]);

  const openTasks = tasks.filter((t) => t.status !== "completed");
  const openJobs = jobs.filter((j) => j.status === "open");
  const needsAck = announcements.filter((a) => a.requires_ack && !a.acknowledged);

  return (
    <div className="space-y-6">
      <Greeting firstName={firstName} />

      {needsAck.length > 0 ? (
        <Link
          href="/announcements"
          className="block rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm font-medium text-accent transition-colors hover:bg-accent/15"
        >
          {needsAck.length === 1
            ? "1 announcement needs your acknowledgment"
            : `${needsAck.length} announcements need your acknowledgment`}
        </Link>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <StatCard href="/tasks" icon={TasksIcon} label="My tasks" value={openTasks.length} />
        <StatCard href="/tasks" icon={JobsIcon} label="Open jobs" value={openJobs.length} />
        <StatCard href="/announcements" icon={BellIcon} label="To review" value={needsAck.length} />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted">Up next</h2>
          <Link href="/tasks" className="text-sm font-medium text-accent hover:opacity-80">
            View all
          </Link>
        </div>

        {openTasks.length === 0 ? (
          <EmptyState>Nothing on your plate right now.</EmptyState>
        ) : (
          <div className="space-y-2">
            {openTasks.slice(0, 4).map((task) => (
              <TaskPreviewCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * A quick-glance version of a task — same badges/icons as the real Tasks
 * page so it reads as the same system, but no status control or notes/
 * delete buttons. Home is for a glance and a tap-through, not management;
 * reusing the full interactive row here just made Home feel like a
 * truncated copy of Tasks instead of its own page.
 */
function TaskPreviewCard({ task }: { task: TaskWithPeople }) {
  const timestampLabel = task.due_at
    ? `Due ${format(new Date(task.due_at), "MMM d")}`
    : `Logged ${formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}`;

  return (
    <Link href="/tasks">
      <Card className="flex items-center justify-between gap-3 transition-colors hover:bg-border/20">
        <div className="min-w-0">
          <p className="truncate font-medium">{task.title}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted">
            <CalendarIcon className="h-3.5 w-3.5" />
            {timestampLabel}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TaskStatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
      </Card>
    </Link>
  );
}

function StatCard({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface py-5 text-center shadow-sm shadow-black/[0.03] transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md dark:shadow-black/20"
    >
      <Icon className="h-5 w-5 text-muted transition-colors group-hover:text-accent" />
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </Link>
  );
}
