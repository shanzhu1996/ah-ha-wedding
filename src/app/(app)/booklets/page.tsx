import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { BookletGenerator, type DayOfDetailsBundle } from "@/components/booklets/booklet-generator";
import {
  SECTION_KEYS,
  getDefaultSectionData,
  type AllSectionData,
} from "@/components/day-of-details/types";

export default async function BookletsPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();

  const [vendorsRes, timelineRes, musicRes, guestsRes, delegationRes, dayOfRes] =
    await Promise.all([
      supabase
        .from("vendors")
        .select("*")
        .eq("wedding_id", wedding.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("timeline_events")
        .select("*")
        .eq("wedding_id", wedding.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("music_selections")
        .select("*")
        .eq("wedding_id", wedding.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("guests")
        .select("*")
        .eq("wedding_id", wedding.id)
        .order("last_name", { ascending: true }),
      supabase
        .from("delegation_tasks")
        .select("*")
        .eq("wedding_id", wedding.id),
      supabase
        .from("wedding_day_details")
        .select("section, data")
        .eq("wedding_id", wedding.id),
    ]);

  const dayOfMap = new Map((dayOfRes.data || []).map((r) => [r.section, r.data]));
  const dayOfDetails: DayOfDetailsBundle = {};
  for (const key of SECTION_KEYS) {
    const value =
      dayOfMap.get(key) ?? getDefaultSectionData(key);
    (dayOfDetails as Record<string, unknown>)[key] = value as AllSectionData[typeof key];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
          Vendor Booklets
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate reference documents for each vendor with timeline, logistics,
          and vendor-specific details.
        </p>
      </div>
      <BookletGenerator
        vendors={vendorsRes.data || []}
        wedding={{
          partner1_name: wedding.partner1_name,
          partner2_name: wedding.partner2_name,
          wedding_date: wedding.wedding_date,
          venue_name: wedding.venue_name,
          venue_address: wedding.venue_address,
        }}
        timelineEvents={timelineRes.data || []}
        musicSelections={musicRes.data || []}
        guests={guestsRes.data || []}
        delegationTasks={delegationRes.data || []}
        dayOfDetails={dayOfDetails}
      />
    </div>
  );
}
