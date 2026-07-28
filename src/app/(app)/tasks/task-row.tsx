"use client";

import { useState, useTransition } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { updateTaskStatus, updateTaskNotes, deleteTask, reassignTask } from "@/lib/actions/tasks";
import { Card, PriorityBadge, Select, textareaClass } from "@/components/ui";
import { ActionRow } from "@/components/action-row";
import { CalendarIcon, PersonIcon, PencilIcon, SwapIcon, TrashIcon } from "@/components/icons";
import type { Profile, TaskStatus, TaskWithPeople } from "@/lib/types";

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

// Card's own base classes (border-border, bg-surface) land at an arbitrary
// point in Tailwind's alphabetically-generated stylesheet — for some status
// colors that's before these, for others after, so plain utility classes win
// unpredictably. The trailing `!` forces these to always win regardless.
const STATUS_TILE_CLASS: Record<TaskStatus, string> = {
  pending: "border-2 border-slate-400/60! bg-slate-400/10! dark:border-slate-500/60! dark:bg-slate-400/[0.08]!",
  in_progress: "border-2 border-accent/60! bg-accent/10!",
  completed: "border-2 border-emerald-500/60! bg-emerald-500/10! opacity-70",
};

export function TaskRow({
  task,
  currentUserId,
  canDelete,
  canReassign,
  assignableProfiles,
}: {
  task: TaskWithPeople;
  /** Whose screen this is — decides whether we show "From X", "To X", or "X → Y" (director oversight). */
  currentUserId: string;
  canDelete?: boolean;
  /** Director/head — can hand this task to a different person. */
  canReassign?: boolean;
  assignableProfiles?: Profile[];
}) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [editingNotes, setEditingNotes] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [reassignTo, setReassignTo] = useState(task.assigned_to);
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

  function handleReassign() {
    if (!reassignTo || reassignTo === task.assigned_to) {
      setReassigning(false);
      return;
    }
    startTransition(async () => {
      const result = await reassignTask(task.id, reassignTo);
      if (result.error) setError(result.error);
      else setReassigning(false);
    });
  }

  const timestampLabel = task.due_at
    ? `Due ${format(new Date(task.due_at), "MMM d, h:mm a")}`
    : `Logged ${formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}`;

  const person = personInfo(task, currentUserId);

  return (
    <Card className={STATUS_TILE_CLASS[status]}>
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
            {person ? (
              <span className="inline-flex items-center gap-1">
                <PersonIcon className="h-3.5 w-3.5" />
                {person.label}
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

        {canReassign && assignableProfiles ? (
          <button
            type="button"
            aria-label="Reassign task"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-border/40 hover:text-foreground"
            onClick={() => setReassigning((v) => !v)}
          >
            <SwapIcon className="h-4 w-4" />
          </button>
        ) : null}

        <button
          type="button"
          aria-label={task.notes ? "Edit notes" : "Add notes"}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-border/40 hover:text-foreground ${
            canReassign && assignableProfiles ? "" : "ml-auto"
          }`}
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

      {reassigning && assignableProfiles ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Select
            small
            className="flex-1"
            value={reassignTo}
            onChange={(e) => setReassignTo(e.target.value)}
          >
            {assignableProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
          <button
            type="button"
            className="text-xs font-medium text-accent hover:opacity-80 disabled:opacity-50"
            disabled={isPending}
            onClick={handleReassign}
          >
            Reassign
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}

      <ActionRow phone={person?.contact?.phone} />
    </Card>
  );
}

/**
 * Who shows up next to the timestamp depends on whose screen this is:
 * - assigned to you (someone else made it) → who it's from (contact icons for them)
 * - you made it for someone else → who it's going to (contact icons for them)
 * - neither (director oversight of someone else's delegation) → both, no single
 *   person to attach contact icons to
 * - you made it for yourself → nothing extra to say
 */
function personInfo(
  task: TaskWithPeople,
  currentUserId: string,
): { label: string; contact: Pick<Profile, "phone"> | null } | null {
  const isMine = task.assigned_to === currentUserId;
  const isMadeByMe = task.assigned_by === currentUserId;

  if (isMine && !isMadeByMe) {
    return task.assigner ? { label: `From ${task.assigner.full_name}`, contact: task.assigner } : null;
  }
  if (isMadeByMe && !isMine) {
    return task.assignee ? { label: `To ${task.assignee.full_name}`, contact: task.assignee } : null;
  }
  if (!isMine && !isMadeByMe) {
    return {
      label: `${task.assigner?.full_name ?? "?"} → ${task.assignee?.full_name ?? "?"}`,
      contact: null,
    };
  }
  return null;
}
