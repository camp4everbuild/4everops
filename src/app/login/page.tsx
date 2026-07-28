import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";
import { OAuthButtons } from "./oauth-buttons";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = next ?? "/";

  return (
    <AuthShell
      title="4everOPS"
      subtitle="New here? Sign in with Google and a director will approve your account."
    >
      <OAuthButtons next={nextPath} />

      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>

      <LoginForm next={nextPath} />
    </AuthShell>
  );
}
