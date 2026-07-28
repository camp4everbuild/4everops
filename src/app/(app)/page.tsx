import Link from "next/link";
import { canPostJobs, isDirector, isOversight, requireProfile } from "@/lib/auth";
import { getMyTasks, getAllTasks, getOpenTaskCounts } from "@/lib/queries/tasks";
import { getAllProfiles } from "@/lib/queries/profiles";
import { getOpenJobs } from "@/lib/queries/jobs";
import { getAnnouncements } from "@/lib/queries/announcements";
import { HomeBoard } from "./home-board";
import { Greeting } from "./greeting";

export default async function HomePage() {
  const profile = await requireProfile();
  const firstName = profile.full_name.split(/\s+/)[0];
  const director = isDirector(profile);
  const oversight = isOversight(profile);

  const [initialTasks, assignableProfiles, taskCounts, jobs, announcements] = await Promise.all([
    oversight ? getAllTasks() : getMyTasks(profile.id),
    getAllProfiles().then((profiles) => profiles.filter((p) => p.status === "active")),
    getOpenTaskCounts(),
    getOpenJobs(),
    getAnnouncements(profile.id),
  ]);

  const needsAck = announcements.filter((a) => a.requires_ack && !a.acknowledged);

  return (
    <div className="space-y-6">
      <Greeting firstName={firstName} />

      {needsAck.length > 0 ? (
        <Link
          href="/announcements"
          className="block rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm font-medium text-accent transition-colors hover:bg-accent/15"
        >
          {needsAck.length === 1
            ? "1 announcement needs your acknowledgment"
            : `${needsAck.length} announcements need your acknowledgment`}
        </Link>
      ) : null}

      <HomeBoard
        currentUserId={profile.id}
        isDirector={director}
        isOversight={oversight}
        canPost={canPostJobs(profile)}
        initialTasks={initialTasks}
        initialJobs={jobs}
        assignableProfiles={assignableProfiles}
        taskCounts={taskCounts}
      />
    </div>
  );
}
