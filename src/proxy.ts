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
     * Everything except static assets, image files, the PWA manifest, the
     * service worker, and /api routes. The manifest and service worker have
     * to be reachable with no session at all (fetched by the OS/browser
     * before any user is signed in). /api routes check their own auth —
     * some, like /api/push/send, are hit server-to-server by Supabase's
     * Database Webhooks with no browser session/cookies to redirect at all,
     * so routing them through the page-navigation auth redirect would just
     * break the webhook rather than protect anything.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
