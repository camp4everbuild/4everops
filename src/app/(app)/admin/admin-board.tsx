"use client";

import { useEffect, useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { retriggerNotification } from "@/lib/actions/notifications";
import { Card, EmptyState, TabBar } from "@/components/ui";
import {
  RefreshIcon,
  TasksIcon,
  JobsIcon,
  TeamIcon,
  ChecklistIcon,
  BedIcon,
  BellIcon,
} from "@/components/icons";
import { useSyncedState } from "@/lib/use-synced-state";
import { WorkersTab } from "./workers-tab";
import { LiveOpsTab } from "./live-ops-tab";
import type {
  AuditLogEntry,
  ChecklistItemWithAssignee,
  Cot,
  NotificationWithRecipient,
  OpenJobWithPeople,
  Profile,
  ScheduleStopWithAssignee,
  TaskWithPeople,
} from "@/lib/types";
import type { AdminStats, WorkerWithLastLogin } from "@/lib/queries/admin";

type Tab = "overview" | "workers" | "liveops" | "activity" | "notifications";

const NOTIFICATION_SELECT = "*, recipient:user_id(id, full_name)";

const ACTION_LABELS: Record<string, string> = {
  login: "Logged in",
  invite_user: "Invited a user",
  approve_user: "Approved a user",
  update_user_roles: "Changed roles",
  create_task: "Created a task",
  update_task_status: "Updated a task's status",
  reassign_task: "Reassigned a task",
  delete_task: "Deleted a task",
  create_job: "Posted a job",
  claim_job: "Claimed a job",
  start_job: "Started a job",
  complete_job: "Completed a job",
  assign_job: "Assigned a job",
  delete_job: "Deleted a job",
  create_checklist_item: "Added a checklist item",
  toggle_checklist_item: "Toggled a checklist item",
  assign_checklist_item: "Assigned a checklist item",
  delete_checklist_item: "Deleted a checklist item",
  add_schedule_stop: "Added a schedule stop",
  assign_schedule_stop: "Assigned a schedule stop",
  delete_schedule_stop: "Deleted a schedule stop",
  check_cot_out: "Checked out a cot",
  check_cot_returned: "Checked in a cot",
  register_cot: "Added a cot",
  delete_cot: "Removed a cot",
  import_rows: "Imported CSV rows",
  push_to_open_job: "Posted an imported row as a job",
  assign_pending_as_task: "Assigned an imported row as a task",
  delete_pending_import: "Discarded an imported row",
  resend_notification: "Resent a notification",
};

export function AdminBoard({
  currentUserId,
  todayDate,
  stats,
  workers,
  initialNotifications,
  initialAuditLog,
  initialTasks,
  initialJobs,
  assignableProfiles,
  taskCounts,
  checklistId,
  initialChecklistItems,
  initialScheduleStops,
  initialCots,
}: {
  currentUserId: string;
  todayDate: string;
  stats: AdminStats;
  workers: WorkerWithLastLogin[];
  initialNotifications: NotificationWithRecipient[];
  initialAuditLog: AuditLogEntry[];
  initialTasks: TaskWithPeople[];
  initialJobs: OpenJobWithPeople[];
  assignableProfiles: Profile[];
  taskCounts: Record<string, number>;
  checklistId: string | null;
  initialChecklistItems: ChecklistItemWithAssignee[];
  initialScheduleStops: ScheduleStopWithAssignee[];
  initialCots: Cot[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [notifications, setNotifications] = useSyncedState(initialNotifications);
  const [auditLog, setAuditLog] = useSyncedState(initialAuditLog);

  useEffect(() => {
    const supabase = createClient();

    async function fetchFullNotification(id: string) {
      const { data } = await supabase
        .from("notifications")
        .select(NOTIFICATION_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (data) {
        const full = data as unknown as NotificationWithRecipient;
        setNotifications((current) => [full, ...current]);
      }
    }

    const notificationsChannel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => fetchFullNotification((payload.new as { id: string }).id),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, (payload) => {
        const row = payload.new as NotificationWithRecipient;
        setNotifications((current) => current.map((n) => (n.id === row.id ? { ...n, ...row } : n)));
      })
      .subscribe();

    const auditChannel = supabase
      .channel("admin-audit-log")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_log" }, (payload) => {
        setAuditLog((current) => [payload.new as AuditLogEntry, ...current]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(auditChannel);
    };
  }, [setNotifications, setAuditLog]);

  return (
    <div>
      <TabBar
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "workers", label: "Workers" },
          { id: "liveops", label: "Live ops" },
          { id: "activity", label: "Activity" },
          { id: "notifications", label: "Alerts" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className={tab === "overview" ? "" : "hidden"}>
        <Overview stats={stats} recentActivity={auditLog.slice(0, 5)} />
      </div>
      <div className={tab === "workers" ? "" : "hidden"}>
        <WorkersTab workers={workers} />
      </div>
      <div className={tab === "liveops" ? "" : "hidden"}>
        <LiveOpsTab
          currentUserId={currentUserId}
          todayDate={todayDate}
          initialTasks={initialTasks}
          initialJobs={initialJobs}
          assignableProfiles={assignableProfiles}
          taskCounts={taskCounts}
          checklistId={checklistId}
          initialChecklistItems={initialChecklistItems}
          initialScheduleStops={initialScheduleStops}
          initialCots={initialCots}
        />
      </div>
      <div className={tab === "activity" ? "" : "hidden"}>
        <AuditLog items={auditLog} />
      </div>
      <div className={tab === "notifications" ? "" : "hidden"}>
        <NotificationsAdmin items={notifications} />
      </div>
    </div>
  );
}

function Overview({
  stats,
  recentActivity,
}: {
  stats: AdminStats;
  recentActivity: AuditLogEntry[];
}) {
  const cards: { label: string; value: string | number; icon: typeof TasksIcon }[] = [
    { label: "Active staff", value: stats.activeStaff, icon: TeamIcon },
    { label: "Pending approvals", value: stats.pendingApprovals, icon: BellIcon },
    { label: "Open jobs", value: stats.openJobs, icon: JobsIcon },
    { label: "Active tasks", value: stats.activeTasks, icon: TasksIcon },
    { label: "Cots out", value: stats.cotsOut, icon: BedIcon },
    {
      label: "Today's checklist",
      value: stats.checklistTotal > 0 ? `${stats.checklistDone}/${stats.checklistTotal}` : "—",
      icon: ChecklistIcon,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="flex flex-col items-center gap-1.5 py-5 text-center">
              <Icon className="h-5 w-5 text-muted" />
              <span className="text-2xl font-semibold tracking-tight">{c.value}</span>
              <span className="text-xs text-muted">{c.label}</span>
            </Card>
          );
        })}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Recent activity</h2>
        {recentActivity.length === 0 ? (
          <EmptyState>Nothing logged yet.</EmptyState>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((entry) => (
              <Card key={entry.id}>
                <p className="text-sm">
                  <span className="font-medium">{entry.actor_name}</span> —{" "}
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NotificationsAdmin({ items }: { items: NotificationWithRecipient[] }) {
  const [resentIds, setResentIds] = useState<Set<string>>(new Set());
  const [errorId, setErrorId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleResend(id: string) {
    setErrorId(null);
    startTransition(async () => {
      const result = await retriggerNotification(id);
      if (result.error) setErrorId(id);
      else setResentIds((current) => new Set(current).add(id));
    });
  }

  if (items.length === 0) return <EmptyState>No notifications yet.</EmptyState>;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Card key={item.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{item.title}</p>
              {item.body ? <p className="mt-0.5 text-sm text-muted">{item.body}</p> : null}
              <p className="mt-1 text-xs text-muted">
                To {item.recipient?.full_name ?? "?"} ·{" "}
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })} ·{" "}
                {item.is_read ? "Read" : "Unread"}
              </p>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleResend(item.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium transition hover:bg-border/40 disabled:opacity-50"
            >
              <RefreshIcon className="h-3.5 w-3.5" />
              {resentIds.has(item.id) ? "Resent" : "Resend"}
            </button>
          </div>
          {errorId === item.id ? <p className="mt-1 text-xs text-red-500">Failed to resend.</p> : null}
        </Card>
      ))}
    </div>
  );
}

function AuditLog({ items }: { items: AuditLogEntry[] }) {
  if (items.length === 0) return <EmptyState>Nothing logged yet.</EmptyState>;

  return (
    <div className="space-y-2">
      {items.map((entry) => (
        <Card key={entry.id}>
          <p className="font-medium">
            {entry.actor_name} — {ACTION_LABELS[entry.action] ?? entry.action}
          </p>
          {entry.detail ? <p className="mt-0.5 text-sm text-muted">{entry.detail}</p> : null}
          <p className="mt-1 text-xs text-muted">
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
          </p>
        </Card>
      ))}
    </div>
  );
}
