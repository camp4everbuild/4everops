"use client";

import { useState, useTransition } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { updateTaskStatus, updateTaskNotes, deleteTask } from "@/lib/actions/tasks";
import { Card, PriorityBadge, textareaClass } from "@/components/ui";
import { CalendarIcon, PersonIcon, PencilIcon, TrashIcon } from "@/components/icons";
import type { TaskStatus, TaskWithPeople } from "@/lib/types";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Done" },
];

const STATUS_ACTIVE_CLASS: Record<TaskStatus, string> = {
  pending: "bg-border text-foreground shadow-sm",
  in_progress: "bg-accent text-accent-fg shadow-sm shadow-accent/30",
  completed: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
};

export function TaskRow({
  task,
  currentUserId,
  canDelete,
}: {
  task: TaskWithPeople;
  /** Whose screen this is — decides whether we show "From X", "To X", or "X → Y" (director oversight). */
  currentUserId: string;
  canDelete?: boolean;
}) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // No router.refresh() anywhere here — the parent's tasks realtime
  // subscription is what reconciles this row (and everyone else's view of
  // it) with the server. This local state is just the optimistic sliver
  // between clicking and that event arriving.
  function handleStatusChange(next: TaskStatus) {
    if (next === status) return;
    const previous = status;
    setStatus(next);
    setError(null);
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, next);
      if (result.error) {
        setStatus(previous);
        setError(result.error);
      }
    });
  }

  function handleSaveNotes() {
    startTransition(async () => {
      const result = await updateTaskNotes(task.id, notes);
      if (result.error) {
        setError(result.error);
      } else {
        setEditingNotes(false);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (result.error) setError(result.error);
    });
  }

  const timestampLabel = task.due_at
    ? `Due ${format(new Date(task.due_at), "MMM d, h:mm a")}`
    : `Logged ${formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}`;

  const peopleLabel = personLabel(task, currentUserId);

  return (
    <Card className={status === "completed" ? "opacity-60" : ""}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{task.title}</p>
          {task.description ? (
            <p className="mt-0.5 text-sm text-muted">{task.description}</p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5" />
              {timestampLabel}
            </span>
            {peopleLabel ? (
              <span className="inline-flex items-center gap-1">
                <PersonIcon className="h-3.5 w-3.5" />
                {peopleLabel}
              </span>
            ) : null}
          </div>
        </div>
        <PriorityBadge priority={task.priority} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-0.5 rounded-full bg-background p-0.5">
          {STATUS_OPTIONS.map((opt) => {
            const active = opt.value === status;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={isPending}
                onClick={() => handleStatusChange(opt.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-[0.97] disabled:opacity-50 ${
                  active ? STATUS_ACTIVE_CLASS[opt.value] : "text-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-label={task.notes ? "Edit notes" : "Add notes"}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-border/40 hover:text-foreground"
          onClick={() => setEditingNotes((v) => !v)}
        >
          <PencilIcon className="h-4 w-4" />
        </button>

        {canDelete ? (
          <button
            type="button"
            aria-label="Delete task"
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
            onClick={handleDelete}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {!editingNotes && task.notes ? (
        <p className="mt-2 rounded-lg bg-background px-3 py-2 text-sm text-muted">{task.notes}</p>
      ) : null}

      {editingNotes ? (
        <div className="mt-2 space-y-2">
          <textarea
            className={textareaClass}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes for the director…"
            autoFocus
          />
          <button
            type="button"
            className="text-xs font-medium text-accent hover:opacity-80 disabled:opacity-50"
            disabled={isPending}
            onClick={handleSaveNotes}
          >
            Save notes
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
    </Card>
  );
}

/**
 * Who shows up next to the timestamp depends on whose screen this is:
 * - assigned to you (someone else made it) → who it's from
 * - you made it for someone else → who it's going to
 * - neither (director oversight of someone else's delegation) → both
 * - you made it for yourself → nothing extra to say
 */
function personLabel(task: TaskWithPeople, currentUserId: string): string | null {
  const isMine = task.assigned_to === currentUserId;
  const isMadeByMe = task.assigned_by === currentUserId;

  if (isMine && !isMadeByMe) {
    return task.assigner ? `From ${task.assigner.full_name}` : null;
  }
  if (isMadeByMe && !isMine) {
    return task.assignee ? `To ${task.assignee.full_name}` : null;
  }
  if (!isMine && !isMadeByMe) {
    return `${task.assigner?.full_name ?? "?"} → ${task.assignee?.full_name ?? "?"}`;
  }
  return null;
}
