"use client";

function timeOfDayGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Greeting({ firstName }: { firstName: string }) {
  // The server doesn't know the visitor's local time zone, so it can't
  // pick a greeting — only the browser can. suppressHydrationWarning tells
  // React this particular text mismatch (server: nothing client-specific
  // yet vs. client: the real local-time greeting) is intentional.
  const greeting = typeof window === "undefined" ? null : timeOfDayGreeting(new Date().getHours());

  return (
    <h1 className="text-2xl font-semibold tracking-tight" suppressHydrationWarning>
      {greeting ?? "Welcome"}, {firstName}
    </h1>
  );
}
