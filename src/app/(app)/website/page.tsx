import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { WebsiteBuilder } from "@/components/website/website-builder";

export default async function WebsitePage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("timeline_events")
    .select("id, type, event_time, title, description, sort_order")
    .eq("wedding_id", wedding.id)
    .eq("type", "day_of")
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
          Wedding Website
        </h1>
        <p className="text-muted-foreground mt-1">
          Build a beautiful wedding website and download it as an HTML file you
          can host anywhere.
        </p>
      </div>
      <WebsiteBuilder
        wedding={{
          partner1_name: wedding.partner1_name,
          partner2_name: wedding.partner2_name,
          wedding_date: wedding.wedding_date,
          venue_name: wedding.venue_name,
          venue_address: wedding.venue_address,
          ceremony_style: wedding.ceremony_style,
          reception_format: wedding.reception_format,
        }}
        timelineEvents={events || []}
      />
    </div>
  );
}
