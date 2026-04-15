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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
          Moodboard
        </h1>
        <p className="text-muted-foreground mt-1">
          A moodboard is a collection of images that shows the look and feel you want for your wedding.
          Collect inspiration and share it with your vendors — so everyone designs toward the same vision.
        </p>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <span><strong className="text-foreground">1.</strong> Browse <a href="https://www.pinterest.com/search/pins/?q=wedding+inspiration+moodboard" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-500 underline underline-offset-2">Pinterest</a> for ideas</span>
          <span><strong className="text-foreground">2.</strong> Upload or paste pins here</span>
          <span><strong className="text-foreground">3.</strong> Export and share with your vendors</span>
        </div>
      </div>
      <MoodboardManager
        sections={sections || []}
        weddingId={wedding.id}
        partner1Name={wedding.partner1_name}
        partner2Name={wedding.partner2_name}
        weddingDate={wedding.wedding_date}
        venueName={wedding.venue_name}
        weddingStyle={wedding.style}
      />
    </div>
  );
}
