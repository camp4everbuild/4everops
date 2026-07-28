"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui";
import { JobRow } from "./job-row";
import { NewJobToggle } from "./new-job-toggle";
import type { OpenJobWithPeople, Profile } from "@/lib/types";

const SELECT_WITH_PEOPLE = "*, creator:created_by(id, full_name), claimer:claimed_by(id, full_name)";

export function JobsBoard({
  currentUserId,
  isDirector,
  isOversight,
  canPost,
  initialJobs,
  assignableProfiles,
}: {
  currentUserId: string;
  isDirector: boolean;
  /** Director or head — can assign/reassign jobs directly. */
  isOversight: boolean;
  canPost: boolean;
  initialJobs: OpenJobWithPeople[];
  assignableProfiles: Profile[];
}) {
  const [jobs, setJobs] = useState(initialJobs);

  useEffect(() => {
    const supabase = createClient();

    async function fetchFull(id: string) {
      const { data } = await supabase
        .from("open_jobs")
        .select(SELECT_WITH_PEOPLE)
        .eq("id", id)
        .maybeSingle();
      if (data) {
        const full = data as unknown as OpenJobWithPeople;
        setJobs((current) =>
          current.some((j) => j.id === full.id)
            ? current.map((j) => (j.id === full.id ? full : j))
            : [full, ...current],
        );
      }
    }

    const channel = supabase
      .channel("jobs-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "open_jobs" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const oldRow = payload.old as { id: string };
          setJobs((current) => current.filter((j) => j.id !== oldRow.id));
          return;
        }

        if (payload.eventType === "INSERT") {
          fetchFull((payload.new as { id: string }).id);
          return;
        }

        const row = payload.new as OpenJobWithPeople;
        setJobs((current) => {
          if (!current.some((j) => j.id === row.id)) {
            fetchFull(row.id);
            return current;
          }
          return current.map((j) => (j.id === row.id ? { ...j, ...row } : j));
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const open = jobs.filter((j) => j.status === "open");
  const assigned = jobs.filter((j) => j.status === "claimed" || j.status === "in_progress");
  const history = jobs
    .filter((j) => j.status === "completed")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

  function canDelete(job: OpenJobWithPeople) {
    return isDirector || job.created_by === currentUserId;
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted">Open jobs</h2>
          {canPost ? <NewJobToggle /> : null}
        </div>
        {open.length === 0 ? (
          <EmptyState>Nothing posted right now.</EmptyState>
        ) : (
          <div className="space-y-2">
            {open.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                currentUserId={currentUserId}
                canDelete={canDelete(job)}
                canAssign={isOversight}
                assignableProfiles={assignableProfiles}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Assigned jobs</h2>
        {assigned.length === 0 ? (
          <EmptyState>Nobody&apos;s working a job right now.</EmptyState>
        ) : (
          <div className="space-y-2">
            {assigned.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                currentUserId={currentUserId}
                canDelete={canDelete(job)}
                canAssign={isOversight}
                assignableProfiles={assignableProfiles}
              />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">History</h2>
          <div className="space-y-2">
            {history.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                currentUserId={currentUserId}
                canDelete={canDelete(job)}
                canAssign={isOversight}
                assignableProfiles={assignableProfiles}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
