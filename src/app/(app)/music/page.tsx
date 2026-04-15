import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { MusicManager } from "@/components/music/music-manager";

export default async function MusicPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();
  const { data: songs } = await supabase
    .from("music_selections")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
          Music
        </h1>
        <p className="text-muted-foreground mt-1">
          Your DJ or band needs to know what to play, when to play it, and
          what to never play. Plan songs for every moment — ceremony
          processional, cocktail hour, dinner, first dance, open
          dancing — and export the list straight to your DJ.
        </p>
      </div>
      <MusicManager songs={songs || []} weddingId={wedding.id} />
    </div>
  );
}
