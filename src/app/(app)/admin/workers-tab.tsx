"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { updateUserRoles } from "@/lib/actions/admin";
import { Card, Badge, EmptyState } from "@/components/ui";
import { RolePicker } from "../team/role-picker";
import { ROLE_LABELS } from "@/lib/types";
import type { UserRole } from "@/lib/types";
import type { WorkerWithLastLogin } from "@/lib/queries/admin";

export function WorkersTab({ workers }: { workers: WorkerWithLastLogin[] }) {
  if (workers.length === 0) return <EmptyState>No one here yet.</EmptyState>;

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {workers.map((worker) => (
        <WorkerRow key={worker.id} worker={worker} />
      ))}
    </div>
  );
}

function WorkerRow({ worker }: { worker: WorkerWithLastLogin }) {
  const [editing, setEditing] = useState(false);
  const [roles, setRoles] = useState<UserRole[]>(worker.roles);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: UserRole[]) {
    if (next.length === 0) return;
    const previous = roles;
    setRoles(next);
    setError(null);
    startTransition(async () => {
      const result = await updateUserRoles(worker.id, next);
      if (result.error) {
        setRoles(previous);
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{worker.full_name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {worker.phone ?? "No phone on file"} ·{" "}
            {worker.last_login
              ? `Last login ${formatDistanceToNow(new Date(worker.last_login), { addSuffix: true })}`
              : "Never logged in"}
          </p>
          {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
        </div>
        <Badge tone={worker.status === "active" ? "green" : "amber"}>{worker.status}</Badge>
      </div>

      <div className="mt-2">
        {editing ? (
          <RolePicker selected={roles} onChange={handleChange} disabled={isPending} />
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {roles.length === 0 ? (
              <span className="text-xs text-muted">No roles</span>
            ) : (
              roles.map((r) => (
                <Badge key={r} tone="neutral">
                  {ROLE_LABELS[r]}
                </Badge>
              ))
            )}
            <button
              type="button"
              className="ml-1 text-xs font-medium text-accent hover:opacity-80"
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
