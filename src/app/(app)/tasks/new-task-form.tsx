"use client";

import { useState, useTransition } from "react";
import { createTask } from "@/lib/actions/tasks";
import { Button, ErrorText, Field, Select, inputClass, textareaClass } from "@/components/ui";
import type { Profile, TaskPriority } from "@/lib/types";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

export function NewTaskForm({
  currentUserId,
  assignableProfiles,
  taskCounts,
  onDone,
}: {
  currentUserId: string;
  assignableProfiles: Profile[];
  /** Each person's current open-task count — least-busy sorted first, shown inline. Not a real workload model, just a nudge. */
  taskCounts: Record<string, number>;
  onDone: () => void;
}) {
  // Defaults to yourself — most ad-hoc tasks logged during the day are
  // things you're noting for yourself, not delegating.
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState(
    assignableProfiles.some((p) => p.id === currentUserId)
      ? currentUserId
      : (assignableProfiles[0]?.id ?? ""),
  );
  const sortedProfiles = [...assignableProfiles].sort(
    (a, b) => (taskCounts[a.id] ?? 0) - (taskCounts[b.id] ?? 0),
  );
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createTask({
        title,
        description: null,
        assignedTo,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        priority,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      // No manual refresh — the new row shows up via the tasks realtime
      // subscription in TasksBoard.
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="What needs to be done">
        <textarea
          className={textareaClass}
          rows={2}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Assign to">
          <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} required>
            {sortedProfiles.map((p) => {
              const count = taskCounts[p.id] ?? 0;
              const name = p.id === currentUserId ? "Myself" : p.full_name;
              return (
                <option key={p.id} value={p.id}>
                  {name} — {count} active
                </option>
              );
            })}
          </Select>
        </Field>

        <Field label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Due" hint="Optional">
        <input
          className={inputClass}
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
      </Field>

      <ErrorText>{error}</ErrorText>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create task"}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
