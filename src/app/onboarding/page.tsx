import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/auth/signout");
  if (profile.phone) redirect("/pending");

  const [defaultFirstName = "", ...rest] = profile.full_name.trim().split(/\s+/);
  const defaultLastName = rest.join(" ");

  return (
    <AuthShell
      title="One more thing"
      subtitle="Tell us who you are so a director can get you set up."
    >
      <OnboardingForm defaultFirstName={defaultFirstName} defaultLastName={defaultLastName} />
    </AuthShell>
  );
}
