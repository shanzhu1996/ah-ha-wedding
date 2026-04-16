import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { DayStepper } from "@/components/day-of-details/day-stepper";
import { SECTION_KEYS, getDefaultSectionData } from "@/components/day-of-details/types";

export default async function DayOfDetailsPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();

  // Fetch all saved sections
  const { data: savedSections } = await supabase
    .from("wedding_day_details")
    .select("section, data")
    .eq("wedding_id", wedding.id);

  // Build initial data: saved data merged with defaults
  const initialData: Record<string, unknown> = {};
  const savedMap = new Map((savedSections || []).map((r) => [r.section, r.data]));

  for (const key of SECTION_KEYS) {
    initialData[key] = savedMap.get(key) || getDefaultSectionData(key);
  }

  return <DayStepper weddingId={wedding.id} initialData={initialData} />;
}
