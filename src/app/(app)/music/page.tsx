import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { MusicManager } from "@/components/music/music-manager";

export default async function MusicPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();
  const [songsRes, vendorsRes, planRes] = await Promise.all([
    supabase
      .from("music_selections")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("vendors")
      .select("id, type, company_name")
      .eq("wedding_id", wedding.id)
      .in("type", ["dj", "band", "mc"]),
    supabase
      .from("wedding_day_details")
      .select("data")
      .eq("wedding_id", wedding.id)
      .eq("section", "entertainment_plan")
      .maybeSingle(),
  ]);

  const rawPlan = planRes.data?.data as
    | { phase_assignments?: Record<string, string> }
    | null
    | undefined;
  const phaseAssignments: Record<string, string> =
    rawPlan && typeof rawPlan === "object" && rawPlan.phase_assignments
      ? Object.fromEntries(
          Object.entries(rawPlan.phase_assignments).filter(
            ([, v]) => typeof v === "string" && v.length > 0
          )
        )
      : {};

  return (
    <MusicManager
      songs={songsRes.data || []}
      weddingId={wedding.id}
      entertainmentVendors={vendorsRes.data || []}
      initialPhaseAssignments={phaseAssignments}
    />
  );
}
