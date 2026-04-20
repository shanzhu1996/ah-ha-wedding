import { redirect } from "next/navigation";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { HandoutsManager } from "@/components/handouts/handouts-manager";

export interface HandoutsSettings {
  dress_code: string;
  emergency_contacts: string;
}

export function parseHandoutsSettings(raw: unknown): HandoutsSettings {
  const empty: HandoutsSettings = { dress_code: "", emergency_contacts: "" };
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as Record<string, unknown>;
  return {
    dress_code: typeof r.dress_code === "string" ? r.dress_code : "",
    emergency_contacts:
      typeof r.emergency_contacts === "string" ? r.emergency_contacts : "",
  };
}

// Tags we consider "wedding party" — people who'd receive a handout. Broader
// than Packing's carrier list (we include ushers, readers, officiants too).
// Grandparents stay out — they're honored guests, not briefed roles.
export const HANDOUT_ROLE_RE =
  /moh|maid of honor|matron of honor|man of honor|best man|\bbm\b|brides?maid|groomsm[ae]n|usher|reader|officiant|\bmc\b|emcee|flower girl|ring bearer|mother|father|\bmom\b|\bdad\b|\bparent\b/i;

export default async function HandoutsPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();

  const [
    { data: timelineEvents },
    { data: delegationTasks },
    { data: guests },
    { data: settingsRow },
    { count: totalGuestCount },
  ] = await Promise.all([
    supabase
      .from("timeline_events")
      .select("*")
      .eq("wedding_id", wedding.id)
      .eq("type", "day_of")
      .order("sort_order", { ascending: true }),
    supabase
      .from("delegation_tasks")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("guests")
      .select("id, first_name, last_name, relationship_tag")
      .eq("wedding_id", wedding.id)
      .not("relationship_tag", "is", null),
    supabase
      .from("wedding_day_details")
      .select("data")
      .eq("wedding_id", wedding.id)
      .eq("section", "handouts")
      .maybeSingle(),
    supabase
      .from("guests")
      .select("*", { count: "exact", head: true })
      .eq("wedding_id", wedding.id),
  ]);

  const partyMembers = (guests || [])
    .filter((g) => g.relationship_tag && HANDOUT_ROLE_RE.test(g.relationship_tag))
    .map((g) => ({
      id: g.id,
      name: `${g.first_name ?? ""} ${g.last_name ?? ""}`.trim(),
      role: g.relationship_tag!.trim(),
    }))
    .filter((m) => m.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const hasGuests = (totalGuestCount ?? 0) > 0;
  const hasPartyMembers = partyMembers.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
          Handouts
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          One info sheet per wedding-party member — their day-of timeline, dress code, and key contacts.
        </p>
      </div>
      {!hasPartyMembers && (
        <div className="flex items-start gap-2.5 pl-3 pr-3 py-2.5 rounded-md bg-primary/[0.04] border border-primary/15 text-sm">
          <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/80 leading-relaxed flex-1">
            {hasGuests ? (
              <>
                Handouts pull from your wedding-party tags. Open{" "}
                <Link href="/guests" className="text-primary font-medium hover:underline">
                  Guests
                </Link>{" "}
                and add a relationship tag (MOH, best man, bridesmaid, parent, etc.) to anyone you&apos;ll brief.
              </>
            ) : (
              <>
                Add guests first — then tag the wedding party so they show up here.{" "}
                <Link href="/guests" className="text-primary font-medium hover:underline">
                  Go to Guests →
                </Link>
              </>
            )}
          </p>
        </div>
      )}
      <HandoutsManager
        wedding={wedding}
        timelineEvents={timelineEvents || []}
        delegationTasks={delegationTasks || []}
        partyMembers={partyMembers}
        initialSettings={parseHandoutsSettings(settingsRow?.data)}
      />
    </div>
  );
}
