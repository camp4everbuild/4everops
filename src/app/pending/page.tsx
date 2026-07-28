import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth-shell";
import { PendingStatus } from "./pending-status";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, phone, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/auth/signout");
  if (!profile.phone) redirect("/onboarding");
  if (profile.status === "active") redirect("/");

  return (
    <AuthShell
      title="Waiting for approval"
      subtitle="A director needs to approve your account. This page will move on automatically as soon as that happens."
    >
      <PendingStatus userId={profile.id} />
    </AuthShell>
  );
}
