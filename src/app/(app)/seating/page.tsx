import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { SeatingManager } from "@/components/seating/seating-manager";

export default async function SeatingPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();

  const [{ data: tables }, { data: guests }] = await Promise.all([
    supabase
      .from("tables")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("number", { ascending: true }),
    supabase
      .from("guests")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("last_name", { ascending: true }),
  ]);

  return (
    <SeatingManager
      tables={tables || []}
      guests={guests || []}
      weddingId={wedding.id}
    />
  );
}
