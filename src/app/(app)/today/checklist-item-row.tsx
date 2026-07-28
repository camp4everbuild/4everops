"use client";

import { useState, useTransition } from "react";
import { toggleChecklistItem, assignChecklistItem } from "@/lib/actions/checklists";
import { Card, Select } from "@/components/ui";
import { CheckIcon, PersonIcon } from "@/components/icons";
import type { ChecklistItemWithAssignee, Profile } from "@/lib/types";

export function ChecklistItemRow({
  item,
  candidates,
  canAssign,
}: {
  item: ChecklistItemWithAssignee;
  /** Active staff in this item's department — who it can be assigned to. */
  candidates: Profile[];
  canAssign: boolean;
}) {
  const [done, setDone] = useState(item.is_complete);
  const [assignedTo, setAssignedTo] = useState(item.assigned_to ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !done;
    setDone(next);
    setError(null);
    startTransition(async () => {
      const result = await toggleChecklistItem(item.id, next);
      if (result.error) {
        setDone(!next);
        setError(result.error);
      }
    });
  }

  function handleAssign(userId: string) {
    const previous = assignedTo;
    setAssignedTo(userId);
    startTransition(async () => {
      const result = await assignChecklistItem(item.id, userId || null);
      if (result.error) {
        setAssignedTo(previous);
        setError(result.error);
      }
    });
  }

  return (
    <Card className={`flex items-center gap-3 ${done ? "opacity-60" : ""}`}>
      <button
        type="button"
        aria-label={done ? "Mark not done" : "Mark done"}
        disabled={isPending}
        onClick={handleToggle}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-[0.95] disabled:opacity-50 ${
          done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-border text-transparent hover:border-accent"
        }`}
      >
        <CheckIcon className="h-4 w-4" strokeWidth={2.5} />
      </button>

      <div className="min-w-0 flex-1">
        <p className={`font-medium ${done ? "line-through" : ""}`}>{item.title}</p>
        {error ? <p className="text-xs text-red-500">{error}</p> : null}
      </div>

      {canAssign ? (
        <Select small className="w-auto" value={assignedTo} onChange={(e) => handleAssign(e.target.value)}>
          <option value="">Unassigned</option>
          {candidates.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </Select>
      ) : item.assignee ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted">
          <PersonIcon className="h-3.5 w-3.5" />
          {item.assignee.full_name}
        </span>
      ) : null}
    </Card>
  );
}
