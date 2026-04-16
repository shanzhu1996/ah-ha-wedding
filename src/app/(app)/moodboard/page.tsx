import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { MoodboardManager } from "@/components/moodboard/moodboard-manager";

export default async function MoodboardPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) return redirect("/onboarding");

  const supabase = await createClient();
  const { data: sections } = await supabase
    .from("moodboard_sections")
    .select("*, moodboard_images(*)")
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: true });

  return (
    <MoodboardManager
      sections={sections || []}
      weddingId={wedding.id}
      partner1Name={wedding.partner1_name}
      partner2Name={wedding.partner2_name}
      weddingDate={wedding.wedding_date}
      venueName={wedding.venue_name}
      weddingStyle={wedding.style}
    />
  );
}
