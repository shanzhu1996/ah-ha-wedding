import { redirect } from "next/navigation";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
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

  // Per-phase music vendor assignment (from Music page). DJ / Band booklets
  // filter their song lists by this map so each vendor only sees their own
  // phases when the couple has ≥2 music vendors.
  const entertainmentPlanRaw = dayOfMap.get("entertainment_plan");
  const phaseAssignments: Record<string, string> =
    entertainmentPlanRaw &&
    typeof entertainmentPlanRaw === "object" &&
    (entertainmentPlanRaw as { phase_assignments?: unknown })
      .phase_assignments
      ? Object.fromEntries(
          Object.entries(
            (entertainmentPlanRaw as { phase_assignments: Record<string, unknown> })
              .phase_assignments
          ).filter(
            ([, v]) => typeof v === "string" && (v as string).length > 0
          )
        ) as Record<string, string>
      : {};

  const vendors = vendorsRes.data || [];
  const vendorsWithArrival = vendors.filter((v) => v.arrival_time).length;
  const vendorsWithContact = vendors.filter((v) => v.phone || v.email).length;
  const hasVendors = vendors.length > 0;
  const completenessNeeded =
    hasVendors &&
    (vendorsWithArrival < vendors.length || vendorsWithContact < vendors.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
          Booklets
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          One PDF per vendor — their day-of timeline, your logistics, and the details they need. Print and hand off a week before.
        </p>
      </div>
      {!hasVendors ? (
        <div className="flex items-start gap-2.5 pl-3 pr-3 py-2.5 rounded-md bg-primary/[0.04] border border-primary/15 text-sm">
          <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/80 leading-relaxed flex-1">
            Booklets are generated per vendor. Start by adding your vendors.{" "}
            <Link href="/vendors" className="text-primary font-medium hover:underline">
              Go to Vendors →
            </Link>
          </p>
        </div>
      ) : completenessNeeded ? (
        <div className="flex items-start gap-2.5 pl-3 pr-3 py-2.5 rounded-md bg-muted/50 border border-border text-sm">
          <Lightbulb className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed flex-1">
            For best results, fill in each vendor&apos;s arrival time and contact info.{" "}
            <span className="font-medium text-foreground/80">
              {vendorsWithArrival}/{vendors.length}
            </span>{" "}
            have arrival time ·{" "}
            <span className="font-medium text-foreground/80">
              {vendorsWithContact}/{vendors.length}
            </span>{" "}
            have contact info.{" "}
            <Link href="/vendors" className="text-primary font-medium hover:underline">
              Review vendors →
            </Link>
          </p>
        </div>
      ) : null}
      <BookletGenerator
        vendors={vendors}
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
        phaseAssignments={phaseAssignments}
      />
    </div>
  );
}
