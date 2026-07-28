import { requireProfile } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/types";
import { LogOutIcon } from "@/components/icons";
import { ProfileForm } from "./profile-form";
import { ThemeToggle } from "./theme-toggle";

export default async function ProfilePage() {
  const profile = await requireProfile();

  return (
    <>
      <PageHeader title="Profile" />

      <div className="space-y-6">
        <Card>
          <ProfileForm profile={profile} />
        </Card>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">Roles</h2>
          <Card>
            <div className="flex flex-wrap gap-1.5">
              {profile.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
                >
                  {ROLE_LABELS[role]}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              A director can change your roles from the Team page.
            </p>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">Appearance</h2>
          <Card>
            <ThemeToggle />
          </Card>
        </section>

        <a
          href="/auth/signout"
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/40 text-sm font-medium text-red-500 transition hover:bg-red-500/10"
        >
          <LogOutIcon className="h-4 w-4" />
          Sign out
        </a>
      </div>
    </>
  );
}
