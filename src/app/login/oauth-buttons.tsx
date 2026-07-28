"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ErrorText } from "@/components/ui";
import { GoogleLogo } from "@/components/icons";

export function OAuthButtons({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setError(error.message);
      setPending(false);
    }
    // On success the browser is redirected away by Supabase, so there's
    // nothing else to do here.
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={signInWithGoogle}
        className="flex w-full min-h-11 items-center justify-center gap-3 rounded-lg border border-[#dadce0] bg-white px-4 text-sm font-medium text-[#3c4043] shadow-sm transition-shadow hover:shadow-md disabled:opacity-60 dark:border-[#5f6368] dark:bg-[#131314] dark:text-[#e3e3e3]"
      >
        <GoogleLogo className="h-[18px] w-[18px] shrink-0" />
        {pending ? "Redirecting…" : "Continue with Google"}
      </button>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
