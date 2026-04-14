import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { TimelineManager } from "@/components/timeline/timeline-manager";

export default async function TimelinePage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("timeline_events")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
          Timeline
        </h1>
        <p className="text-muted-foreground mt-1">
          Your pre-wedding checklist and day-of schedule.
        </p>
      </div>
      <TimelineManager
        events={events || []}
        weddingId={wedding.id}
        weddingDate={wedding.wedding_date}
        guestCount={wedding.guest_count_estimate}
        bridalPartySize={wedding.bridal_party_size}
        partner1Name={wedding.partner1_name}
        partner2Name={wedding.partner2_name}
      />
    </div>
  );
}
