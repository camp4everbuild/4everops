import { requireRole } from "@/lib/auth";
import { getAdminStats, getWorkersWithLastLogin } from "@/lib/queries/admin";
import { getRecentNotificationsForAdmin } from "@/lib/queries/notifications";
import { getAuditLog } from "@/lib/queries/audit";
import { getAllTasks, getOpenTaskCounts } from "@/lib/queries/tasks";
import { getOpenJobs } from "@/lib/queries/jobs";
import { getAllProfiles } from "@/lib/queries/profiles";
import { getTodayChecklist, getChecklistItems } from "@/lib/queries/checklists";
import { getScheduleStops } from "@/lib/queries/schedule";
import { getAllCots } from "@/lib/queries/cots";
import { PageHeader } from "@/components/ui";
import { AdminBoard } from "./admin-board";

export default async function AdminPage() {
  const profile = await requireRole("director", "admin");
  const today = new Date().toISOString().slice(0, 10);

  const [
    stats,
    workers,
    notifications,
    auditLog,
    tasks,
    jobs,
    taskCounts,
    allProfiles,
    todayChecklist,
    scheduleStops,
    cots,
  ] = await Promise.all([
    getAdminStats(),
    getWorkersWithLastLogin(),
    getRecentNotificationsForAdmin(),
    getAuditLog(),
    getAllTasks(),
    getOpenJobs(),
    getOpenTaskCounts(),
    getAllProfiles(),
    getTodayChecklist(),
    getScheduleStops(today),
    getAllCots(),
  ]);

  const checklistItems = todayChecklist ? await getChecklistItems(todayChecklist.id) : [];
  const assignableProfiles = allProfiles.filter((p) => p.status === "active");

  return (
    <>
      <PageHeader title="Admin" subtitle="Full control center — everyone, everything, live." />

      <AdminBoard
        currentUserId={profile.id}
        todayDate={today}
        stats={stats}
        workers={workers}
        initialNotifications={notifications}
        initialAuditLog={auditLog}
        initialTasks={tasks}
        initialJobs={jobs}
        assignableProfiles={assignableProfiles}
        taskCounts={taskCounts}
        checklistId={todayChecklist?.id ?? null}
        initialChecklistItems={checklistItems}
        initialScheduleStops={scheduleStops}
        initialCots={cots}
      />
    </>
  );
}
