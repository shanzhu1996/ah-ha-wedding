import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { TipsContent } from "./tips-content";
import type {
  EmergencyKitState,
  TipsInteractions,
  CustomKitItem,
} from "./data";

export function parseKitState(raw: unknown): EmergencyKitState {
  const empty: EmergencyKitState = { packed: [], hidden: [], custom: [] };
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as Record<string, unknown>;
  const assigneeRaw =
    r.assignee && typeof r.assignee === "object"
      ? (r.assignee as Record<string, unknown>)
      : null;
  const assignee = assigneeRaw
    ? {
        name:
          typeof assigneeRaw.name === "string" && assigneeRaw.name
            ? assigneeRaw.name
            : undefined,
        contact:
          typeof assigneeRaw.contact === "string" && assigneeRaw.contact
            ? assigneeRaw.contact
            : undefined,
      }
    : undefined;
  return {
    packed: Array.isArray(r.packed)
      ? r.packed.filter((x): x is string => typeof x === "string")
      : [],
    hidden: Array.isArray(r.hidden)
      ? r.hidden.filter((x): x is string => typeof x === "string")
      : [],
    custom: Array.isArray(r.custom)
      ? r.custom
          .map((c): CustomKitItem | null => {
            if (!c || typeof c !== "object") return null;
            const row = c as Record<string, unknown>;
            if (
              typeof row.id !== "string" ||
              typeof row.category !== "string" ||
              typeof row.name !== "string"
            )
              return null;
            if (
              row.category !== "freshen_up" &&
              row.category !== "first_aid" &&
              row.category !== "fix_it" &&
              row.category !== "fuel_comfort"
            )
              return null;
            return {
              id: row.id,
              category: row.category,
              name: row.name,
              packed: row.packed === true,
            };
          })
          .filter((x): x is CustomKitItem => x !== null)
      : [],
    ...(assignee ? { assignee } : {}),
  };
}

function parseInteractions(raw: unknown): TipsInteractions {
  if (!raw || typeof raw !== "object") return { dismissed: [] };
  const r = raw as Record<string, unknown>;
  return {
    dismissed: Array.isArray(r.dismissed)
      ? r.dismissed.filter((x): x is string => typeof x === "string")
      : [],
  };
}

export default async function TipsPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("wedding_day_details")
    .select("section, data")
    .eq("wedding_id", wedding.id)
    .in("section", ["emergency_kit", "tips_interactions"]);

  const kitRow = rows?.find((r) => r.section === "emergency_kit");
  const interactionsRow = rows?.find(
    (r) => r.section === "tips_interactions"
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
            Tips & Emergency Kit
          </h1>
          <Badge variant="secondary">Reference</Badge>
        </div>
        <p className="text-muted-foreground mt-1">
          Budget hacks, day-of tips, an emergency kit checklist, and what to
          prepare for. Hide ones that don&apos;t apply to your wedding or
          turn any of them into a timeline task.
        </p>
      </div>

      <TipsContent
        weddingId={wedding.id}
        weddingDate={wedding.wedding_date}
        venueIndoorOutdoor={wedding.venue_indoor_outdoor}
        initialKitState={parseKitState(kitRow?.data)}
        initialInteractions={parseInteractions(interactionsRow?.data)}
      />
    </div>
  );
}
