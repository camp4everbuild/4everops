"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { markNotificationRead, deleteNotification } from "@/lib/actions/notifications";
import { Card, EmptyState } from "@/components/ui";
import {
  TasksIcon,
  CheckIcon,
  JobsIcon,
  MegaphoneIcon,
  CalendarIcon,
  TrashIcon,
} from "@/components/icons";
import type { ComponentType, SVGProps } from "react";
import type { Notification } from "@/lib/types";

const TYPE_ICON: Record<Notification["type"], ComponentType<SVGProps<SVGSVGElement>>> = {
  task_assigned: TasksIcon,
  task_completed: CheckIcon,
  job_posted: JobsIcon,
  job_assigned: JobsIcon,
  job_status_change: JobsIcon,
  announcement: MegaphoneIcon,
  deadline: CalendarIcon,
  schedule_change: CalendarIcon,
};

const TYPE_TINT: Record<Notification["type"], string> = {
  task_assigned: "bg-accent/10 text-accent",
  task_completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  job_posted: "bg-accent/10 text-accent",
  job_assigned: "bg-accent/10 text-accent",
  job_status_change: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  announcement: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  deadline: "bg-red-500/10 text-red-500",
  schedule_change: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export function NotificationList({
  initialNotifications,
}: {
  initialNotifications: Notification[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [, startTransition] = useTransition();

  function handleRead(id: string) {
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    startTransition(() => {
      markNotificationRead(id);
    });
  }

  function handleDelete(id: string) {
    setNotifications((current) => current.filter((n) => n.id !== id));
    startTransition(() => {
      deleteNotification(id);
    });
  }

  if (notifications.length === 0) {
    return <EmptyState>Nothing here yet.</EmptyState>;
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => {
        const Icon = TYPE_ICON[notification.type];
        return (
          <Card key={notification.id} className={notification.is_read ? "opacity-60" : ""}>
            <div className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TYPE_TINT[notification.type]}`}
              >
                <Icon className="h-4 w-4" />
              </span>

              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => !notification.is_read && handleRead(notification.id)}
              >
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{notification.title}</p>
                  {!notification.is_read ? (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  ) : null}
                </div>
                {notification.body ? (
                  <p className="mt-0.5 text-sm text-muted">{notification.body}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </button>

              <button
                type="button"
                aria-label="Dismiss"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-red-500/10 hover:text-red-500"
                onClick={() => handleDelete(notification.id)}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
