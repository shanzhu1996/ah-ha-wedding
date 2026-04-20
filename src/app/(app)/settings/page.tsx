import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { SettingsManager } from "@/components/settings/settings-manager";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const wedding = await getCurrentWedding();

  if (!wedding) redirect("/onboarding");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Manage your wedding details and account.
        </p>
      </div>
      <SettingsManager wedding={wedding} userEmail={user.email ?? ""} />
    </div>
  );
}
