"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { claimJob, startJob, completeJob, deleteJob, assignJob } from "@/lib/actions/jobs";
import { mapsUrl, wazeUrl } from "@/lib/maps";
import { Button, Card, Select } from "@/components/ui";
import { ContactIcons } from "@/components/contact-icons";
import { GoogleMapsLogo, PersonIcon, SwapIcon, TrashIcon, WazeLogo } from "@/components/icons";
import type { JobStatus, OpenJobWithPeople, Profile } from "@/lib/types";

// Each button is tinted toward the status it moves the job *into* — same
// language as the tile colors, so the button previews what tapping it does.
const ACTION_BUTTON_CLASS: Record<"claimed" | "in_progress" | "completed", string> = {
  claimed: "",
  in_progress: "bg-amber-500! shadow-amber-500/30!",
  completed: "bg-emerald-500! shadow-emerald-500/30!",
};

// See task-row.tsx's STATUS_TILE_CLASS comment — trailing `!` needed because
// Card's own base border/bg classes otherwise win unpredictably depending on
// where they land in Tailwind's generated stylesheet relative to each color.
const STATUS_TILE_CLASS: Record<JobStatus, string> = {
  open: "border-2 border-sky-500/60! bg-sky-500/10!",
  claimed: "border-2 border-accent/60! bg-accent/10!",
  in_progress: "border-2 border-amber-500/60! bg-amber-500/10!",
  completed: "border-2 border-emerald-500/60! bg-emerald-500/10! opacity-70",
};

export function JobRow({
  job,
  currentUserId,
  canDelete,
  canAssign,
  assignableProfiles,
}: {
  job: OpenJobWithPeople;
  currentUserId: string;
  canDelete: boolean;
  /** Director/head — can hand this job straight to someone, or reassign it. */
  canAssign?: boolean;
  assignableProfiles?: Profile[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignTo, setAssignTo] = useState(job.claimed_by ?? currentUserId);
  const [isPending, startTransition] = useTransition();

  const isMine = job.claimed_by === currentUserId;

  function run(action: () => Promise<{ error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  function handleAssign() {
    if (!assignTo || assignTo === job.claimed_by) {
      setAssigning(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await assignJob(job.id, assignTo);
      if (result.error) setError(result.error);
      else setAssigning(false);
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
                <ContactIcons phone={job.claimer.phone} />
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

        <div className="flex shrink-0 items-center gap-1">
          {canAssign && assignableProfiles && job.status !== "completed" ? (
            <button
              type="button"
              aria-label={job.status === "open" ? "Assign job" : "Reassign job"}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-border/40 hover:text-foreground"
              onClick={() => setAssigning((v) => !v)}
            >
              <SwapIcon className="h-4 w-4" />
            </button>
          ) : null}

          {canDelete && job.status !== "completed" ? (
            <button
              type="button"
              aria-label="Delete job"
              disabled={isPending}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
              onClick={() => run(() => deleteJob(job.id))}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {assigning && assignableProfiles ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select small className="flex-1" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
            {assignableProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
          <Button disabled={isPending} onClick={handleAssign}>
            {job.status === "open" ? "Assign" : "Reassign"}
          </Button>
        </div>
      ) : job.status === "open" ? (
        <Button
          className={`mt-3 w-full ${ACTION_BUTTON_CLASS.claimed}`}
          disabled={isPending}
          onClick={() => run(() => claimJob(job.id))}
        >
          {isPending ? "Claiming…" : "On it"}
        </Button>
      ) : job.status === "claimed" && isMine ? (
        <Button
          className={`mt-3 w-full ${ACTION_BUTTON_CLASS.in_progress}`}
          disabled={isPending}
          onClick={() => run(() => startJob(job.id))}
        >
          {isPending ? "Starting…" : "In progress"}
        </Button>
      ) : job.status === "in_progress" && isMine ? (
        <Button
          className={`mt-3 w-full ${ACTION_BUTTON_CLASS.completed}`}
          disabled={isPending}
          onClick={() => run(() => completeJob(job.id))}
        >
          {isPending ? "Finishing…" : "Done"}
        </Button>
      ) : null}

      <div className="mt-2 flex gap-2">
        <a
          href={mapsUrl(job.title)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium transition hover:bg-border/40"
        >
          <GoogleMapsLogo width={14} height={14} />
          Maps
        </a>
        <a
          href={wazeUrl(job.title)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium transition hover:bg-border/40"
        >
          <WazeLogo width={14} height={14} />
          Waze
        </a>
      </div>
    </Card>
  );
}
