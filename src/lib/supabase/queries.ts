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
