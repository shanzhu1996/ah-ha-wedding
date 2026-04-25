"use server";

import { createClient } from "@/lib/supabase/server";
import { generateTeaCeremonyTimeline } from "@/lib/timeline/tea-ceremony-template";

/**
 * Seed the 5 tea-ceremony pre-wedding tasks if the couple turned on
 * `weddings.has_tea_ceremony` but the tasks have not been seeded yet.
 * Idempotent: re-calling after seeding is a no-op (gated on
 * `tea_ceremony_seeded_at`). Silent if user/wedding can't be resolved
 * or the wedding has no date set yet.
 *
 * Called from two places:
 *   1. /timeline page server component — lazy seed on first visit
 *   2. Settings save (when user flips the flag on) — eager seed so the
 *      tasks appear without the couple needing to navigate first
 */
export async function seedTeaCeremonyIfNeeded(weddingId: string) {
  const supabase = await createClient();

  const { data: wedding } = await supabase
    .from("weddings")
    .select("has_tea_ceremony, tea_ceremony_seeded_at, wedding_date")
    .eq("id", weddingId)
    .single();

  if (!wedding) return;
  if (!wedding.has_tea_ceremony) return;
  if (wedding.tea_ceremony_seeded_at) return;
  if (!wedding.wedding_date) return;

  const teaTasks = generateTeaCeremonyTimeline(
    new Date(wedding.wedding_date + "T00:00:00"),
    1000
  );

  await supabase
    .from("timeline_events")
    .insert(teaTasks.map((t) => ({ ...t, wedding_id: weddingId })));

  await supabase
    .from("weddings")
    .update({ tea_ceremony_seeded_at: new Date().toISOString() })
    .eq("id", weddingId);
}
