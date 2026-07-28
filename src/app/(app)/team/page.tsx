import { requireRole } from "@/lib/auth";
import { getAllProfiles, getPendingProfiles } from "@/lib/queries/profiles";
import { PageHeader } from "@/components/ui";
import { PendingApprovals } from "./pending-approvals";
import { TeamRoster } from "./team-roster";

export default async function TeamPage() {
  await requireRole("director");

  const [pending, everyone] = await Promise.all([getPendingProfiles(), getAllProfiles()]);
  const active = everyone.filter((p) => p.status === "active");

  return (
    <>
      <PageHeader title="Team" subtitle="Approve new sign-ups and manage roles." />
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-muted">Waiting for approval</h2>
        <PendingApprovals initialPending={pending} />
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Staff</h2>
        <TeamRoster profiles={active} />
      </section>
    </>
  );
}
