"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Stamps the first-visit timestamp for a tool route on the current user's
 * wedding. Once set, never updates — the data point is "has this user
 * explored this tool?". Silent if user/wedding can't be resolved.
 */
export async function markToolVisited(toolHref: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: membership } = await supabase
    .from("wedding_members")
    .select("wedding_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  if (!membership) return;

  const { data: wedding } = await supabase
    .from("weddings")
    .select("tool_visits")
    .eq("id", membership.wedding_id)
    .single();

  const visits = (wedding?.tool_visits as Record<string, string>) || {};
  if (visits[toolHref]) return;

  visits[toolHref] = new Date().toISOString();

  await supabase
    .from("weddings")
    .update({ tool_visits: visits })
    .eq("id", membership.wedding_id);
}
