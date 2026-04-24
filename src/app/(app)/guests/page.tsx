import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { GuestManager } from "@/components/guests/guest-manager";

export default async function GuestsPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();
  const [guestsRes, vendorsRes] = await Promise.all([
    supabase
      .from("guests")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("last_name", { ascending: true }),
    supabase
      .from("vendors")
      .select("meals_needed")
      .eq("wedding_id", wedding.id),
  ]);

  // Compute catering roll-up on the server to keep GuestManager lean.
  const vendors = vendorsRes.data || [];
  const vendorMealsTotal = vendors.reduce(
    (sum, v) => sum + (v.meals_needed || 0),
    0
  );
  const vendorsWithoutMeals = vendors.filter(
    (v) => v.meals_needed == null
  ).length;

  return (
    <GuestManager
      guests={guestsRes.data || []}
      weddingId={wedding.id}
      receptionFormat={wedding.reception_format}
      vendorMealsTotal={vendorMealsTotal}
      vendorsWithoutMeals={vendorsWithoutMeals}
    />
  );
}
