import { isOversight, requireProfile } from "@/lib/auth";
import { getTodayChecklist, getChecklistItems, getTemplates } from "@/lib/queries/checklists";
import { getAllProfiles } from "@/lib/queries/profiles";
import { getScheduleStops } from "@/lib/queries/schedule";
import { getAllCots } from "@/lib/queries/cots";
import { PageHeader, EmptyState } from "@/components/ui";
import { TodayBoard } from "./today-board";
import { StartToday } from "./start-today";
import { ScheduleSection } from "./schedule-section";
import { CotsSection } from "./cots-section";
import { TodayTabs } from "./today-tabs";

export default async function TodayPage() {
  const profile = await requireProfile();
  const oversight = isOversight(profile);
  const today = new Date().toISOString().slice(0, 10);

  const [checklist, stops, cots, activeProfiles] = await Promise.all([
    getTodayChecklist(),
    getScheduleStops(today),
    getAllCots(),
    getAllProfiles().then((profiles) => profiles.filter((p) => p.status === "active")),
  ]);

  return (
    <div>
      <PageHeader
        title="Today"
        subtitle={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      />

      <TodayTabs
        checklist={
          checklist ? (
            <TodayBoard
              checklistId={checklist.id}
              initialItems={await getChecklistItems(checklist.id)}
              isOversightUser={oversight}
              activeProfiles={activeProfiles}
            />
          ) : oversight ? (
            <StartToday templates={await getTemplates()} />
          ) : (
            <EmptyState>Nothing started yet today — check back soon.</EmptyState>
          )
        }
        schedule={
          <ScheduleSection
            travelDate={today}
            initialStops={stops}
            assignableProfiles={activeProfiles}
            canManage={oversight}
          />
        }
        cots={<CotsSection initialCots={cots} canManage={oversight} />}
      />
    </div>
  );
}
