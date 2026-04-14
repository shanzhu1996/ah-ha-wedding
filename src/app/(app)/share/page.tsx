import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { ShareManager } from "@/components/share/share-manager";

export default async function SharePage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();

  const [{ data: timelineEvents }, { data: delegationTasks }] =
    await Promise.all([
      supabase
        .from("timeline_events")
        .select("*")
        .eq("wedding_id", wedding.id)
        .eq("type", "day_of")
        .order("sort_order", { ascending: true }),
      supabase
        .from("delegation_tasks")
        .select("*")
        .eq("wedding_id", wedding.id)
        .order("created_at", { ascending: true }),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
          Share with Wedding Party
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your wedding party and generate shareable info pages.
        </p>
      </div>
      <ShareManager
        wedding={wedding}
        timelineEvents={timelineEvents || []}
        delegationTasks={delegationTasks || []}
      />
    </div>
  );
}
