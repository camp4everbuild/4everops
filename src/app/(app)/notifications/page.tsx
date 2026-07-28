import { requireProfile } from "@/lib/auth";
import { getNotifications } from "@/lib/queries/notifications";
import { PageHeader } from "@/components/ui";
import { NotificationList } from "./notification-list";

export default async function NotificationsPage() {
  const profile = await requireProfile();
  const notifications = await getNotifications(profile.id);

  return (
    <>
      <PageHeader title="Notifications" />
      <NotificationList initialNotifications={notifications} />
    </>
  );
}
