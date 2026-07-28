import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

const RELATED_TABLE_URL: Record<string, string> = {
  tasks: "/",
  open_jobs: "/",
  checklist_items: "/today",
  checklists: "/today",
  announcements: "/announcements",
  travel_days: "/today",
};

type NotificationsWebhookPayload = {
  type: "INSERT";
  table: string;
  record: {
    user_id: string;
    title: string;
    body: string | null;
    related_table: string | null;
  };
};

/**
 * Receives the Supabase Database Webhook fired on every `notifications`
 * INSERT (configured in the dashboard — see the migration's comment for
 * why it's not wired up in SQL) and turns it into an actual OS push to
 * every device the recipient has subscribed from.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "Push isn't configured" }, { status: 500 });
  }

  webpush.setVapidDetails("mailto:support@4everops.app", vapidPublicKey, vapidPrivateKey);

  const payload = (await request.json()) as NotificationsWebhookPayload;
  if (payload.table !== "notifications" || payload.type !== "INSERT") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { user_id, title, body, related_table } = payload.record;
  const admin = createAdminClient();

  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const pushPayload = JSON.stringify({
    title,
    body: body ?? "",
    url: (related_table && RELATED_TABLE_URL[related_table]) || "/",
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        pushPayload,
      ),
    ),
  );

  // A 404/410 means the push service considers that endpoint dead
  // (uninstalled, permission revoked) — clean it up rather than retrying
  // it forever.
  const deadSubscriptionIds = results
    .map((result, i) =>
      result.status === "rejected" && [404, 410].includes(result.reason?.statusCode)
        ? subscriptions[i].id
        : null,
    )
    .filter((id): id is string => id !== null);

  if (deadSubscriptionIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", deadSubscriptionIds);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ ok: true, sent, pruned: deadSubscriptionIds.length });
}
