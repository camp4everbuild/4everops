import { isOversight, requireProfile } from "@/lib/auth";
import { getTodayChecklist, getChecklistItems, getTemplates } from "@/lib/queries/checklists";
import { getAllProfiles } from "@/lib/queries/profiles";
import { getScheduleStops } from "@/lib/queries/schedule";
import { getOutstandingCots } from "@/lib/queries/cots";
import { PageHeader, EmptyState } from "@/components/ui";
import { TodayBoard } from "./today-board";
import { StartToday } from "./start-today";
import { ScheduleSection } from "./schedule-section";
import { CotsSection } from "./cots-section";

export default async function TodayPage() {
  const profile = await requireProfile();
  const oversight = isOversight(profile);
  const today = new Date().toISOString().slice(0, 10);

  const [checklist, stops, cots] = await Promise.all([
    getTodayChecklist(),
    getScheduleStops(today),
    getOutstandingCots(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Today"
        subtitle={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      />

      {checklist ? (
        <TodayBoard
          checklistId={checklist.id}
          initialItems={await getChecklistItems(checklist.id)}
          isOversightUser={oversight}
          activeProfiles={(await getAllProfiles()).filter((p) => p.status === "active")}
        />
      ) : oversight ? (
        <StartToday templates={await getTemplates()} />
      ) : (
        <EmptyState>Nothing started yet today — check back soon.</EmptyState>
      )}

      <ScheduleSection travelDate={today} stops={stops} canManage={oversight} />

      <CotsSection cots={cots} />
    </div>
  );
}
