"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { retriggerNotification } from "@/lib/actions/notifications";
import { Card, EmptyState, TabBar } from "@/components/ui";
import { RefreshIcon } from "@/components/icons";
import type { AuditLogEntry, NotificationWithRecipient } from "@/lib/types";

type Tab = "notifications" | "audit";

const ACTION_LABELS: Record<string, string> = {
  invite_user: "Invited a user",
  approve_user: "Approved a user",
  update_user_roles: "Changed roles",
  delete_task: "Deleted a task",
  delete_job: "Deleted a job",
  delete_checklist_item: "Deleted a checklist item",
  delete_schedule_stop: "Deleted a schedule stop",
  register_cot: "Added a cot",
  delete_cot: "Removed a cot",
  resend_notification: "Resent a notification",
};

export function AdminBoard({
  initialNotifications,
  initialAuditLog,
}: {
  initialNotifications: NotificationWithRecipient[];
  initialAuditLog: AuditLogEntry[];
}) {
  const [tab, setTab] = useState<Tab>("notifications");

  return (
    <div>
      <TabBar
        tabs={[
          { id: "notifications", label: "Notifications" },
          { id: "audit", label: "Audit log" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "notifications" ? (
        <NotificationsAdmin items={initialNotifications} />
      ) : (
        <AuditLog items={initialAuditLog} />
      )}
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
