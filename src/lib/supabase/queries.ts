import { createClient } from "./server";

export async function getCurrentWedding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("wedding_members")
    .select("wedding_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) return null;

  const { data: wedding } = await supabase
    .from("weddings")
    .select("*")
    .eq("id", membership.wedding_id)
    .single();

  return wedding;
}

export async function getWeddingStats(weddingId: string) {
  const supabase = await createClient();

  const [guests, vendors, shoppingItems, budgetItems, timelineEvents] =
    await Promise.all([
      supabase
        .from("guests")
        .select("rsvp_status")
        .eq("wedding_id", weddingId),
      supabase
        .from("vendors")
        .select("id")
        .eq("wedding_id", weddingId),
      supabase
        .from("shopping_items")
        .select("status")
        .eq("wedding_id", weddingId),
      supabase
        .from("budget_items")
        .select("amount, paid")
        .eq("wedding_id", weddingId),
      supabase
        .from("timeline_events")
        .select("completed, type, event_date, title")
        .eq("wedding_id", weddingId)
        .eq("type", "pre_wedding")
        .order("event_date", { ascending: true }),
    ]);

  const guestList = guests.data || [];
  const rsvpCounts = {
    confirmed: guestList.filter((g) => g.rsvp_status === "confirmed").length,
    declined: guestList.filter((g) => g.rsvp_status === "declined").length,
    pending: guestList.filter(
      (g) => g.rsvp_status === "pending" || g.rsvp_status === "no_response"
    ).length,
    total: guestList.length,
  };

  const items = shoppingItems.data || [];
  const shoppingProgress = items.length
    ? Math.round(
        (items.filter((i) => i.status === "done" || i.status === "received")
          .length /
          items.length) *
          100
      )
    : 0;

  const budgetData = budgetItems.data || [];
  const budgetSpent = budgetData
    .filter((b) => b.paid)
    .reduce((sum, b) => sum + Number(b.amount), 0);
  const budgetTotal = budgetData.reduce(
    (sum, b) => sum + Number(b.amount),
    0
  );

  const allTimelineEvents = timelineEvents.data || [];
  const upcoming = allTimelineEvents
    .filter((e) => !e.completed && e.event_date)
    .slice(0, 5);

  return {
    vendorCount: (vendors.data || []).length,
    rsvpCounts,
    shoppingProgress,
    shoppingItemCount: items.length,
    budgetSpent,
    budgetTotal,
    timelineEventCount: allTimelineEvents.length,
    upcomingTasks: upcoming,
  };
}

export async function getCompletedFeatures(weddingId: string): Promise<Set<string>> {
  const supabase = await createClient();

  const [vendors, guests, budget, timeline, shopping, moodboard, music, tables, packing, delegation] =
    await Promise.all([
      supabase.from("vendors").select("id").eq("wedding_id", weddingId).limit(1),
      supabase.from("guests").select("id").eq("wedding_id", weddingId).limit(1),
      supabase.from("budget_items").select("id").eq("wedding_id", weddingId).limit(1),
      supabase.from("timeline_events").select("id").eq("wedding_id", weddingId).limit(1),
      supabase.from("shopping_items").select("id").eq("wedding_id", weddingId).limit(1),
      supabase.from("moodboard_sections").select("id").eq("wedding_id", weddingId).limit(1),
      supabase.from("music_selections").select("id").eq("wedding_id", weddingId).limit(1),
      supabase.from("tables").select("id").eq("wedding_id", weddingId).limit(1),
      supabase.from("packing_boxes").select("id").eq("wedding_id", weddingId).limit(1),
      supabase.from("delegation_tasks").select("id").eq("wedding_id", weddingId).limit(1),
    ]);

  const completed = new Set<string>();
  if ((vendors.data || []).length > 0) completed.add("vendors");
  if ((guests.data || []).length > 0) completed.add("guests");
  if ((budget.data || []).length > 0) completed.add("budget");
  if ((timeline.data || []).length > 0) completed.add("timeline");
  if ((shopping.data || []).length > 0) completed.add("shopping");
  if ((moodboard.data || []).length > 0) completed.add("moodboard");
  if ((music.data || []).length > 0) completed.add("music");
  if ((tables.data || []).length > 0) completed.add("seating");
  if ((packing.data || []).length > 0) completed.add("packing");
  if ((delegation.data || []).length > 0) completed.add("share");

  // These are static/reference pages — mark as "started" once user has content
  // Tips, Booklets, Website, Post-Wedding: mark as started if they've reached Phase 3+
  if (completed.size >= 6) {
    completed.add("tips");
  }

  return completed;
}
