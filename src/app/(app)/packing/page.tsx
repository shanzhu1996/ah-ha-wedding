import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { PackingManager } from "@/components/packing/packing-manager";

export interface EndOfNightState {
  checked: string[]; // keys of default items that are checked
  hidden: string[]; // default items the couple removed
  custom: { id: string; name: string; checked: boolean }[];
}

export function parseEndOfNight(raw: unknown): EndOfNightState {
  const empty: EndOfNightState = { checked: [], hidden: [], custom: [] };
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as Record<string, unknown>;
  return {
    checked: Array.isArray(r.checked)
      ? r.checked.filter((x): x is string => typeof x === "string")
      : [],
    hidden: Array.isArray(r.hidden)
      ? r.hidden.filter((x): x is string => typeof x === "string")
      : [],
    custom: Array.isArray(r.custom)
      ? r.custom
          .map((x) => {
            if (!x || typeof x !== "object") return null;
            const row = x as Record<string, unknown>;
            if (typeof row.id !== "string" || typeof row.name !== "string")
              return null;
            return {
              id: row.id,
              name: row.name,
              checked: row.checked === true,
            };
          })
          .filter(
            (x): x is { id: string; name: string; checked: boolean } =>
              x !== null
          )
      : [],
  };
}

export default async function PackingPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();

  const [
    { data: boxes },
    { data: shoppingItems },
    { data: eonRow },
    { data: vendors },
    { data: delegationTasks },
    { data: guests },
  ] = await Promise.all([
    supabase
      .from("packing_boxes")
      .select("*, packing_items(*)")
      .eq("wedding_id", wedding.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("shopping_items")
      .select("id, category, item_name, status")
      .eq("wedding_id", wedding.id)
      .order("category", { ascending: true })
      .order("item_name", { ascending: true }),
    supabase
      .from("wedding_day_details")
      .select("data")
      .eq("wedding_id", wedding.id)
      .eq("section", "packing_end_of_night")
      .maybeSingle(),
    supabase
      .from("vendors")
      .select("id, type, company_name, contact_name")
      .eq("wedding_id", wedding.id),
    supabase
      .from("delegation_tasks")
      .select("id, task, assigned_to")
      .eq("wedding_id", wedding.id),
    supabase
      .from("guests")
      .select("first_name, last_name, relationship_tag")
      .eq("wedding_id", wedding.id)
      .not("relationship_tag", "is", null),
  ]);

  // Assignee suggestion pool — who realistically carries/places a box.
  // We deliberately DON'T include service vendors (photographer, DJ,
  // baker, florist, caterer, etc.) — they have their own deliveries and
  // won't carry yours. Box carriers are:
  //   1. Coordinator (if hired)
  //   2. Family / friends from delegation_tasks
  //   3. The couple themselves
  type Suggestion = { label: string; note: string };
  const suggestions: Suggestion[] = [];
  const seen = new Set<string>();
  const pushSuggestion = (label: string, note: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push({ label: trimmed, note });
  };

  (vendors || [])
    .filter((v) => v.type === "coordinator")
    .forEach((v) =>
      pushSuggestion(v.contact_name || v.company_name, "Coordinator")
    );

  // Wedding party + family from guests.relationship_tag. Only surface the
  // roles that realistically carry/place things: MOH, BM, bridesmaids,
  // groomsmen, parents. Grandparents skip — they're honored, not laborers.
  // Regex tolerant to common typos ("bridemaid" missing the s) and variants.
  const WEDDING_PARTY_RE =
    /moh|maid of honor|matron of honor|man of honor|best man|\bbm\b|brides?maid|groomsm[ae]n|mother|father|\bmom\b|\bdad\b|\bparent\b/i;
  (guests || []).forEach((g) => {
    const tag = g.relationship_tag?.trim();
    if (!tag) return;
    if (!WEDDING_PARTY_RE.test(tag)) return;
    const fullName = `${g.first_name ?? ""} ${g.last_name ?? ""}`.trim();
    if (!fullName) return;
    pushSuggestion(`${fullName} (${tag})`, "Wedding party / family");
  });

  (delegationTasks || []).forEach((t) =>
    pushSuggestion(t.assigned_to, "Day-of role")
  );
  pushSuggestion(wedding.partner1_name, "Partner 1");
  pushSuggestion(wedding.partner2_name, "Partner 2");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
          Packing Lists
        </h1>
        <p className="text-muted-foreground mt-1">
          Organize items into labeled boxes for venue delivery.
        </p>
      </div>
      <PackingManager
        boxes={boxes || []}
        shoppingItems={shoppingItems || []}
        weddingId={wedding.id}
        initialEndOfNight={parseEndOfNight(eonRow?.data)}
        assigneeSuggestions={suggestions}
      />
    </div>
  );
}
