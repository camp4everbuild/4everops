"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { EmptyState, TabBar } from "@/components/ui";
import { NewTaskToggle } from "./tasks/new-task-toggle";
import { TaskRow } from "./tasks/task-row";
import { NewJobToggle } from "./jobs/new-job-toggle";
import { JobRow } from "./jobs/job-row";
import type { OpenJobWithPeople, Profile, TaskWithPeople } from "@/lib/types";

const TASK_SELECT_WITH_PEOPLE =
  "*, assignee:assigned_to(id, full_name, phone), assigner:assigned_by(id, full_name, phone)";
const JOB_SELECT_WITH_PEOPLE = "*, creator:created_by(id, full_name, phone), claimer:claimed_by(id, full_name, phone)";

type Tab = "assigned" | "open" | "history";

export function HomeBoard({
  currentUserId,
  isDirector,
  isOversight,
  canPost,
  initialTasks,
  initialJobs,
  assignableProfiles,
  taskCounts,
}: {
  currentUserId: string;
  isDirector: boolean;
  isOversight: boolean;
  canPost: boolean;
  initialTasks: TaskWithPeople[];
  initialJobs: OpenJobWithPeople[];
  assignableProfiles: Profile[];
  taskCounts: Record<string, number>;
}) {
  const [tab, setTab] = useState<Tab>("assigned");
  const [tasks, setTasks] = useState(initialTasks);
  const [jobs, setJobs] = useState(initialJobs);

  useEffect(() => {
    const supabase = createClient();

    async function fetchFullTask(id: string) {
      const { data } = await supabase
        .from("tasks")
        .select(TASK_SELECT_WITH_PEOPLE)
        .eq("id", id)
        .maybeSingle();
      if (data) {
        const full = data as unknown as TaskWithPeople;
        setTasks((current) =>
          current.some((t) => t.id === full.id)
            ? current.map((t) => (t.id === full.id ? full : t))
            : [full, ...current],
        );
      }
    }

    // No client-side filter — RLS (assigned_to = me, assigned_by = me, or
    // oversight) already scopes exactly what each subscriber can receive.
    const tasksChannel = supabase
      .channel(`tasks-${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const oldRow = payload.old as { id: string };
          setTasks((current) => current.filter((t) => t.id !== oldRow.id));
          return;
        }
        if (payload.eventType === "INSERT") {
          fetchFullTask((payload.new as { id: string }).id);
          return;
        }
        const row = payload.new as TaskWithPeople;
        setTasks((current) => {
          if (!current.some((t) => t.id === row.id)) {
            fetchFullTask(row.id);
            return current;
          }
          return current.map((t) => (t.id === row.id ? { ...t, ...row } : t));
        });
      })
      .subscribe();

    async function fetchFullJob(id: string) {
      const { data } = await supabase
        .from("open_jobs")
        .select(JOB_SELECT_WITH_PEOPLE)
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

    const jobsChannel = supabase
      .channel("jobs-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "open_jobs" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const oldRow = payload.old as { id: string };
          setJobs((current) => current.filter((j) => j.id !== oldRow.id));
          return;
        }
        if (payload.eventType === "INSERT") {
          fetchFullJob((payload.new as { id: string }).id);
          return;
        }
        const row = payload.new as OpenJobWithPeople;
        setJobs((current) => {
          if (!current.some((j) => j.id === row.id)) {
            fetchFullJob(row.id);
            return current;
          }
          return current.map((j) => (j.id === row.id ? { ...j, ...row } : j));
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(jobsChannel);
    };
  }, [currentUserId]);

  const activeTasks = tasks.filter((t) => t.status !== "completed");
  const assignedJobs = jobs.filter((j) => j.status === "claimed" || j.status === "in_progress");
  const openJobs = jobs.filter((j) => j.status === "open");
  const historyTasks = [...tasks]
    .filter((t) => t.status === "completed")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const historyJobs = [...jobs]
    .filter((j) => j.status === "completed")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

  function taskRowProps(task: TaskWithPeople) {
    return {
      currentUserId,
      canDelete: isDirector || task.assigned_by === currentUserId,
      canReassign: isOversight,
      assignableProfiles: isOversight ? assignableProfiles : undefined,
    };
  }

  function jobRowProps(job: OpenJobWithPeople) {
    return {
      currentUserId,
      canDelete: isDirector || job.created_by === currentUserId,
      canAssign: isOversight,
      assignableProfiles: isOversight ? assignableProfiles : undefined,
    };
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
        {isOversight ? (
          <Link href="/imports" className="text-sm font-medium text-accent hover:opacity-80">
            Import
          </Link>
        ) : null}
        {canPost ? <NewJobToggle /> : null}
        <NewTaskToggle
          currentUserId={currentUserId}
          assignableProfiles={assignableProfiles}
          taskCounts={taskCounts}
        />
      </div>

      <TabBar
        tabs={[
          { id: "assigned", label: "Assigned" },
          { id: "open", label: "Open" },
          { id: "history", label: "History" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "assigned" ? (
        activeTasks.length === 0 && assignedJobs.length === 0 ? (
          <EmptyState>Nothing assigned right now.</EmptyState>
        ) : (
          <div className="space-y-6">
            {activeTasks.length > 0 ? (
              <div className="space-y-2">
                {assignedJobs.length > 0 ? (
                  <h2 className="text-sm font-medium text-muted">Tasks</h2>
                ) : null}
                {activeTasks.map((task) => (
                  <TaskRow
                    key={`${task.id}:${task.status}:${task.notes ?? ""}`}
                    task={task}
                    {...taskRowProps(task)}
                  />
                ))}
              </div>
            ) : null}
            {assignedJobs.length > 0 ? (
              <div className="space-y-2">
                {activeTasks.length > 0 ? <h2 className="text-sm font-medium text-muted">Jobs</h2> : null}
                {assignedJobs.map((job) => (
                  <JobRow key={job.id} job={job} {...jobRowProps(job)} />
                ))}
              </div>
            ) : null}
          </div>
        )
      ) : null}

      {tab === "open" ? (
        openJobs.length === 0 ? (
          <EmptyState>Nothing posted right now.</EmptyState>
        ) : (
          <div className="space-y-2">
            {openJobs.map((job) => (
              <JobRow key={job.id} job={job} {...jobRowProps(job)} />
            ))}
          </div>
        )
      ) : null}

      {tab === "history" ? (
        historyTasks.length === 0 && historyJobs.length === 0 ? (
          <EmptyState>Nothing completed yet.</EmptyState>
        ) : (
          <div className="space-y-6">
            {historyTasks.length > 0 ? (
              <div className="space-y-2">
                {historyJobs.length > 0 ? <h2 className="text-sm font-medium text-muted">Tasks</h2> : null}
                {historyTasks.map((task) => (
                  <TaskRow
                    key={`history:${task.id}:${task.notes ?? ""}`}
                    task={task}
                    {...taskRowProps(task)}
                  />
                ))}
              </div>
            ) : null}
            {historyJobs.length > 0 ? (
              <div className="space-y-2">
                {historyTasks.length > 0 ? <h2 className="text-sm font-medium text-muted">Jobs</h2> : null}
                {historyJobs.map((job) => (
                  <JobRow key={job.id} job={job} {...jobRowProps(job)} />
                ))}
              </div>
            ) : null}
          </div>
        )
      ) : null}
    </>
  );
}
