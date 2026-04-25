import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { TimelineManager } from "@/components/timeline/timeline-manager";
import { generatePreWeddingTimeline } from "@/lib/timeline/pre-wedding-template";
import { seedTeaCeremonyIfNeeded } from "@/lib/actions/seed-tea-ceremony";

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

  // Cultural seed (A4): runs the first time a tea-ceremony couple visits
  // /timeline (lazy fallback). Settings save also calls this directly so
  // tasks appear without needing a manual visit. Idempotent.
  await seedTeaCeremonyIfNeeded(wedding.id);

  const { data: events } = await supabase
    .from("timeline_events")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("sort_order", { ascending: true });

  // Visual filter (preserve, don't delete): when the couple turns the
  // tea-ceremony cultural flag off, hide its 5 seeded tasks from the
  // working list. Data stays in DB so re-enabling restores the same
  // (potentially user-edited) tasks.
  const visibleEvents = (events || []).filter(
    (e) => e.category !== "tea_ceremony" || wedding.has_tea_ceremony
  );

  return (
    <TimelineManager
      events={visibleEvents}
      weddingId={wedding.id}
      weddingDate={wedding.wedding_date}
      guestCount={wedding.guest_count_estimate}
      bridalPartySize={wedding.bridal_party_size}
      partner1Name={wedding.partner1_name}
      partner2Name={wedding.partner2_name}
    />
  );
}
