import Link from "next/link";
import { isDirector, requireProfile } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/types";
import { BottomNav } from "@/components/bottom-nav";
import { HeaderThemeToggle } from "@/components/header-theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { PushPrompt } from "@/components/push-prompt";
import { VisibilityRefresh } from "@/components/visibility-refresh";
import { ShieldIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="shell-content flex items-center justify-between gap-3 py-3">
          <Link href="/" className="font-semibold tracking-tight">
            4everOPS
          </Link>
          <div className="flex items-center gap-3">
            {isDirector(profile) ? (
              <Link
                href="/admin"
                aria-label="Admin"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-border/40 hover:text-foreground"
              >
                <ShieldIcon className="h-4 w-4" />
              </Link>
            ) : null}
            <HeaderThemeToggle />
            <NotificationBell
              userId={profile.id}
              initialUnread={count ?? 0}
            />
            <Link
              href="/profile"
              className="text-right text-xs leading-tight text-muted hover:text-foreground"
            >
              <span className="block font-medium text-foreground">
                {profile.full_name}
              </span>
              <span className="block">
                {profile.roles.map((r) => ROLE_LABELS[r]).join(", ")}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <VisibilityRefresh />
      <PushPrompt />

      <main className="shell-content flex-1 py-5 pb-28">{children}</main>

      <BottomNav roles={profile.roles} />
    </div>
  );
}
