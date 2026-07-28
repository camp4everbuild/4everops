import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next 16 renamed `middleware.ts` to `proxy.ts`. This does two things:
 * refreshes the Supabase auth cookie on every request, and does an optimistic
 * redirect for signed-out users.
 *
 * It is NOT the authorization layer. Per the Next docs, Server Functions are
 * POST requests to the route they live on, so a matcher change can silently
 * drop coverage — every page and action re-checks with requireProfile(), and
 * RLS enforces the real boundary in Postgres.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets, image files, and the PWA manifest —
     * the manifest in particular has to be reachable with no session at
     * all, since the OS/browser fetches it before any user is signed in to
     * decide whether the app is installable.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
