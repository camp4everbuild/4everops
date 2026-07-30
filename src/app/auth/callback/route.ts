import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Landing spot for Google/Apple OAuth redirects. Exchanges the auth code for
 * a session, then routes the user to wherever they actually belong next —
 * onboarding if they've never given a name/phone, pending if a director
 * hasn't approved them yet, otherwise on to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone, status")
          .eq("id", user.id)
          .maybeSingle();

        // Admin client, deliberately — right after exchangeCodeForSession
        // the new session lives only on this client's in-memory state and
        // the outgoing response cookies, not yet on any cookies a fresh
        // client could read back, so a normal RLS-bound insert here would
        // see auth.uid() as null and get rejected.
        if (profile?.status === "active") {
          const admin = createAdminClient();
          await admin.from("audit_log").insert({
            actor_id: user.id,
            actor_name: profile.full_name,
            action: "login",
          });
        }

        if (!profile?.phone) return NextResponse.redirect(`${origin}/onboarding`);
        if (profile.status !== "active") return NextResponse.redirect(`${origin}/pending`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
