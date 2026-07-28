import { requireRole } from "@/lib/auth";
import { OVERSIGHT_ROLES } from "@/lib/types";
import { getPendingImports } from "@/lib/queries/imports";
import { getAllProfiles } from "@/lib/queries/profiles";
import { PageHeader } from "@/components/ui";
import { ImportsBoard } from "./imports-board";

export default async function ImportsPage() {
  await requireRole(...OVERSIGHT_ROLES);

  const [items, profiles] = await Promise.all([getPendingImports(), getAllProfiles()]);
  const assignableProfiles = profiles.filter((p) => p.status === "active");

  return (
    <>
      <PageHeader
        title="Import"
        subtitle="Upload a tasks or kitchen-menu CSV, then assign each row or post it as an open job."
      />
      <ImportsBoard initialItems={items} assignableProfiles={assignableProfiles} />
    </>
  );
}
