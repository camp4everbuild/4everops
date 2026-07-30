"use client";

import { useState } from "react";
import { TabBar } from "@/components/ui";
import { HomeBoard } from "../home-board";
import { TodayBoard } from "../today/today-board";
import { ScheduleSection } from "../today/schedule-section";
import { CotsSection } from "../today/cots-section";
import type {
  ChecklistItemWithAssignee,
  Cot,
  OpenJobWithPeople,
  Profile,
  ScheduleStopWithAssignee,
  TaskWithPeople,
} from "@/lib/types";

type Sub = "work" | "checklist" | "schedule" | "cots";

/**
 * The same live, fully-interactive boards used elsewhere in the app
 * (Home, Today's checklist/schedule/cots) — reused here rather than
 * rebuilt as read-only tables, since director/admin already has full
 * visibility through them and they already come with realtime + every
 * control (reassign, delete, resend, status change) built in.
 */
export function LiveOpsTab({
  currentUserId,
  todayDate,
  initialTasks,
  initialJobs,
  assignableProfiles,
  taskCounts,
  checklistId,
  initialChecklistItems,
  initialScheduleStops,
  initialCots,
}: {
  currentUserId: string;
  todayDate: string;
  initialTasks: TaskWithPeople[];
  initialJobs: OpenJobWithPeople[];
  assignableProfiles: Profile[];
  taskCounts: Record<string, number>;
  checklistId: string | null;
  initialChecklistItems: ChecklistItemWithAssignee[];
  initialScheduleStops: ScheduleStopWithAssignee[];
  initialCots: Cot[];
}) {
  const [sub, setSub] = useState<Sub>("work");

  return (
    <div>
      <TabBar
        tabs={[
          { id: "work", label: "Tasks & Jobs" },
          { id: "checklist", label: "Checklist" },
          { id: "schedule", label: "Schedule" },
          { id: "cots", label: "Cots" },
        ]}
        value={sub}
        onChange={setSub}
      />

      <div className={sub === "work" ? "" : "hidden"}>
        <HomeBoard
          currentUserId={currentUserId}
          isDirector
          isOversight
          canPost
          initialTasks={initialTasks}
          initialJobs={initialJobs}
          assignableProfiles={assignableProfiles}
          taskCounts={taskCounts}
        />
      </div>

      <div className={sub === "checklist" ? "" : "hidden"}>
        {checklistId ? (
          <TodayBoard
            checklistId={checklistId}
            initialItems={initialChecklistItems}
            isOversightUser
            activeProfiles={assignableProfiles}
          />
        ) : (
          <p className="text-sm text-muted">Nothing started today yet.</p>
        )}
      </div>

      <div className={sub === "schedule" ? "" : "hidden"}>
        <ScheduleSection
          travelDate={todayDate}
          initialStops={initialScheduleStops}
          assignableProfiles={assignableProfiles}
          canManage
        />
      </div>

      <div className={sub === "cots" ? "" : "hidden"}>
        <CotsSection initialCots={initialCots} canManage />
      </div>
    </div>
  );
}
