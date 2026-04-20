import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { TimelineManager } from "@/components/timeline/timeline-manager";
import { generatePreWeddingTimeline } from "@/lib/timeline/pre-wedding-template";

export default async function TimelinePage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();

  // One-shot seed: once per wedding, stamped via pre_wedding_seeded_at.
  // After this, the couple owns the list — never regenerate.
  if (!wedding.pre_wedding_seeded_at && wedding.wedding_date) {
    const tasks = generatePreWeddingTimeline(
      new Date(wedding.wedding_date + "T00:00:00")
    );
    await supabase.from("timeline_events").insert(
      tasks.map((t) => ({ ...t, wedding_id: wedding.id }))
    );
    await supabase
      .from("weddings")
      .update({ pre_wedding_seeded_at: new Date().toISOString() })
      .eq("id", wedding.id);
  }

  const { data: events } = await supabase
    .from("timeline_events")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("sort_order", { ascending: true });

  return (
    <TimelineManager
      events={events || []}
      weddingId={wedding.id}
      weddingDate={wedding.wedding_date}
      guestCount={wedding.guest_count_estimate}
      bridalPartySize={wedding.bridal_party_size}
      partner1Name={wedding.partner1_name}
      partner2Name={wedding.partner2_name}
    />
  );
}
