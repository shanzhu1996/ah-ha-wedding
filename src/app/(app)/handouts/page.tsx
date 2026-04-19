import { redirect } from "next/navigation";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
          Handouts
        </h1>
        <p className="text-muted-foreground mt-1">
          One info sheet per wedding-party member — timeline, dress code, contacts.
        </p>
      </div>
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
