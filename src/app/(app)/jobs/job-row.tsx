"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { claimJob, startJob, completeJob, deleteJob } from "@/lib/actions/jobs";
import { Button, Card } from "@/components/ui";
import { PersonIcon, TrashIcon } from "@/components/icons";
import type { JobStatus, OpenJobWithPeople } from "@/lib/types";

const STATUS_TILE_CLASS: Record<JobStatus, string> = {
  open: "",
  claimed: "border-accent/30 bg-accent/5",
  in_progress: "border-amber-500/30 bg-amber-500/5",
  completed: "border-emerald-500/30 bg-emerald-500/5 opacity-70",
};

export function JobRow({
  job,
  currentUserId,
  canDelete,
}: {
  job: OpenJobWithPeople;
  currentUserId: string;
  canDelete: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isMine = job.claimed_by === currentUserId;

  function run(action: () => Promise<{ error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card className={STATUS_TILE_CLASS[job.status]}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{job.title}</p>
          {job.description ? (
            <p className="mt-0.5 text-sm text-muted">{job.description}</p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>Posted by {job.creator?.full_name ?? "?"}</span>
            {job.claimer ? (
              <span className="inline-flex items-center gap-1">
                <PersonIcon className="h-3.5 w-3.5" />
                {job.claimer.full_name}
              </span>
            ) : null}
            {job.status === "completed" && job.completed_at ? (
              <span>
                Completed {formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })}
              </span>
            ) : null}
          </div>
          {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
        </div>

        {canDelete && job.status !== "completed" ? (
          <button
            type="button"
            aria-label="Delete job"
            disabled={isPending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
            onClick={() => run(() => deleteJob(job.id))}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {job.status === "open" ? (
        <Button className="mt-3 w-full" disabled={isPending} onClick={() => run(() => claimJob(job.id))}>
          {isPending ? "Claiming…" : "On it"}
        </Button>
      ) : job.status === "claimed" && isMine ? (
        <Button className="mt-3 w-full" disabled={isPending} onClick={() => run(() => startJob(job.id))}>
          {isPending ? "Starting…" : "In progress"}
        </Button>
      ) : job.status === "in_progress" && isMine ? (
        <Button className="mt-3 w-full" disabled={isPending} onClick={() => run(() => completeJob(job.id))}>
          {isPending ? "Finishing…" : "Done"}
        </Button>
      ) : null}
    </Card>
  );
}
