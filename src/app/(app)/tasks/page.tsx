import { canPostJobs, isDirector, requireProfile } from "@/lib/auth";
import { getMyTasks, getAllTasks, getOpenTaskCounts } from "@/lib/queries/tasks";
import { getAllProfiles } from "@/lib/queries/profiles";
import { getOpenJobs } from "@/lib/queries/jobs";
import { TasksBoard } from "./tasks-board";
import { JobsBoard } from "../jobs/jobs-board";

export default async function TasksPage() {
  const profile = await requireProfile();
  const director = isDirector(profile);

  const initialTasks = director ? await getAllTasks() : await getMyTasks(profile.id);
  const assignableProfiles = (await getAllProfiles()).filter((p) => p.status === "active");
  const taskCounts = await getOpenTaskCounts();
  const jobs = await getOpenJobs();

  return (
    <>
      <TasksBoard
        currentUserId={profile.id}
        isDirector={director}
        initialTasks={initialTasks}
        assignableProfiles={assignableProfiles}
        taskCounts={taskCounts}
      />

      <div className="mt-10 border-t border-border pt-8">
        <JobsBoard
          currentUserId={profile.id}
          isDirector={director}
          canPost={canPostJobs(profile)}
          initialJobs={jobs}
        />
      </div>
    </>
  );
}
