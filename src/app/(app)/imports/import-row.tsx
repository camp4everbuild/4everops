"use client";

import { useState, useTransition } from "react";
import { pushPendingToOpenJob, assignPendingAsTask, deletePendingImport } from "@/lib/actions/imports";
import { Button, Card, Select } from "@/components/ui";
import { TrashIcon } from "@/components/icons";
import type { PendingImport, Profile } from "@/lib/types";

export function ImportRow({
  item,
  assignableProfiles,
}: {
  item: PendingImport;
  assignableProfiles: Profile[];
}) {
  const [assignTo, setAssignTo] = useState(assignableProfiles[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card>
      <p className="font-medium">{item.title}</p>
      {item.description ? <p className="mt-0.5 text-sm text-muted">{item.description}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select
          small
          className="min-w-0 flex-1"
          value={assignTo}
          onChange={(e) => setAssignTo(e.target.value)}
        >
          {assignableProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </Select>
        <Button
          disabled={isPending || !assignTo}
          onClick={() => run(() => assignPendingAsTask(item.id, assignTo))}
        >
          Assign
        </Button>
        <Button
          variant="secondary"
          disabled={isPending}
          onClick={() => run(() => pushPendingToOpenJob(item.id))}
        >
          Post as open job
        </Button>
        <button
          type="button"
          aria-label="Discard"
          disabled={isPending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
          onClick={() => run(() => deletePendingImport(item.id))}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
    </Card>
  );
}
