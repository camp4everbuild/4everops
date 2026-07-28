"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, EmptyState } from "@/components/ui";
import { TaskRow } from "./task-row";
import { NewTaskToggle } from "./new-task-toggle";
import type { Profile, TaskWithPeople } from "@/lib/types";

const SELECT_WITH_PEOPLE =
  "*, assignee:assigned_to(id, full_name), assigner:assigned_by(id, full_name)";

export function TasksBoard({
  currentUserId,
  isDirector,
  isOversight,
  initialTasks,
  assignableProfiles,
  taskCounts,
}: {
  currentUserId: string;
  isDirector: boolean;
  /** Director or head — sees every task and can reassign any of them. */
  isOversight: boolean;
  initialTasks: TaskWithPeople[];
  assignableProfiles: Profile[];
  taskCounts: Record<string, number>;
}) {
  const [tasks, setTasks] = useState(initialTasks);

  useEffect(() => {
    const supabase = createClient();

    // Realtime payloads carry only the raw tasks row — no assignee/assigner
    // join. For a row we've never seen before, fetch it properly once so the
    // name shows up instead of leaving it blank.
    async function fetchFull(id: string) {
      const { data } = await supabase
        .from("tasks")
        .select(SELECT_WITH_PEOPLE)
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
    // director) already scopes exactly what each subscriber is allowed to
    // receive, and Realtime filters can't express an OR across two columns
    // anyway, so this is both simpler and more correct than trying to hack
    // one together.
    const channel = supabase
      .channel(`tasks-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id: string };
            setTasks((current) => current.filter((t) => t.id !== oldRow.id));
            return;
          }

          if (payload.eventType === "INSERT") {
            fetchFull((payload.new as { id: string }).id);
            return;
          }

          // UPDATE — merge the changed scalar columns onto the row we
          // already have cached, which keeps its assignee/assigner intact.
          const row = payload.new as TaskWithPeople;
          setTasks((current) => {
            if (!current.some((t) => t.id === row.id)) {
              fetchFull(row.id);
              return current;
            }
            return current.map((t) => (t.id === row.id ? { ...t, ...row } : t));
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const mine = tasks.filter(
    (t) => t.assigned_to === currentUserId || t.assigned_by === currentUserId,
  );
  const myActive = mine.filter((t) => t.status !== "completed");
  const everyoneActive = tasks.filter((t) => t.status !== "completed");
  const history = (isOversight ? tasks : mine)
    .filter((t) => t.status === "completed")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  function rowProps(task: TaskWithPeople) {
    return {
      currentUserId,
      canDelete: isDirector || task.assigned_by === currentUserId,
      canReassign: isOversight,
      assignableProfiles: isOversight ? assignableProfiles : undefined,
    };
  }

  return (
    <>
      <PageHeader
        title="Tasks"
        action={
          <NewTaskToggle
            currentUserId={currentUserId}
            assignableProfiles={assignableProfiles}
            taskCounts={taskCounts}
          />
        }
      />

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-muted">My tasks</h2>
        {myActive.length === 0 ? (
          <EmptyState>Nothing on your plate right now.</EmptyState>
        ) : (
          <div className="space-y-2">
            {myActive.map((task) => (
              <TaskRow
                key={`${task.id}:${task.status}:${task.notes ?? ""}`}
                task={task}
                {...rowProps(task)}
              />
            ))}
          </div>
        )}
      </section>

      {isOversight ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-muted">Everyone&apos;s tasks</h2>
          {everyoneActive.length === 0 ? (
            <EmptyState>No active tasks right now.</EmptyState>
          ) : (
            <div className="space-y-2">
              {everyoneActive.map((task) => (
                <TaskRow
                  key={`all:${task.id}:${task.status}:${task.notes ?? ""}`}
                  task={task}
                  {...rowProps(task)}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {history.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">History</h2>
          <div className="space-y-2">
            {history.map((task) => (
              <TaskRow
                key={`history:${task.id}:${task.status}:${task.notes ?? ""}`}
                task={task}
                {...rowProps(task)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
