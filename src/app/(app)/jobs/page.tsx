import { canPostJobs, isDirector, requireProfile } from "@/lib/auth";
import { getOpenJobs } from "@/lib/queries/jobs";
import { PageHeader } from "@/components/ui";
import { JobsBoard } from "./jobs-board";
import { NewJobToggle } from "./new-job-toggle";

export default async function JobsPage() {
  const profile = await requireProfile();
  const jobs = await getOpenJobs();

  return (
    <>
      <PageHeader
        title="Jobs"
        action={canPostJobs(profile) ? <NewJobToggle /> : undefined}
      />
      <JobsBoard currentUserId={profile.id} isDirector={isDirector(profile)} initialJobs={jobs} />
    </>
  );
}
