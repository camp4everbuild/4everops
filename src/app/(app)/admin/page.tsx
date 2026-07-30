import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getRecentNotificationsForAdmin } from "@/lib/queries/notifications";
import { getAuditLog } from "@/lib/queries/audit";
import { PageHeader } from "@/components/ui";
import { AdminBoard } from "./admin-board";

export default async function AdminPage() {
  await requireRole("director");

  const [notifications, auditLog] = await Promise.all([
    getRecentNotificationsForAdmin(),
    getAuditLog(),
  ]);

  return (
    <>
      <PageHeader title="Admin" subtitle="Notifications and an audit trail of admin actions." />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/team"
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium transition hover:bg-border/40"
        >
          Team & roles
        </Link>
        <Link
          href="/imports"
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium transition hover:bg-border/40"
        >
          CSV imports
        </Link>
        <Link
          href="/today"
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium transition hover:bg-border/40"
        >
          Today&apos;s checklist
        </Link>
      </div>

      <AdminBoard initialNotifications={notifications} initialAuditLog={auditLog} />
    </>
  );
}
