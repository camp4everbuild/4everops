import { isDirector, requireProfile } from "@/lib/auth";
import { getMyTasks, getAllTasks, getOpenTaskCounts } from "@/lib/queries/tasks";
import { getAllProfiles } from "@/lib/queries/profiles";
import { TasksBoard } from "./tasks-board";

export default async function TasksPage() {
  const profile = await requireProfile();
  const director = isDirector(profile);

  const initialTasks = director ? await getAllTasks() : await getMyTasks(profile.id);
  const assignableProfiles = (await getAllProfiles()).filter((p) => p.status === "active");
  const taskCounts = await getOpenTaskCounts();

  return (
    <TasksBoard
      currentUserId={profile.id}
      isDirector={director}
      initialTasks={initialTasks}
      assignableProfiles={assignableProfiles}
      taskCounts={taskCounts}
    />
  );
}
