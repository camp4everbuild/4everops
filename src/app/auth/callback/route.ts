import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
          .select("phone, status")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.phone) return NextResponse.redirect(`${origin}/onboarding`);
        if (profile.status !== "active") return NextResponse.redirect(`${origin}/pending`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
