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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
          Seating Chart
        </h1>
        <p className="text-muted-foreground mt-1">
          The seating chart decides who sits where at your reception. It
          goes to your coordinator, caterer, and stationer (for escort
          cards). Group guests by family and friends so everyone has people
          they know at their table — no awkward strangers.
        </p>
      </div>
      <SeatingManager
        tables={tables || []}
        guests={guests || []}
        weddingId={wedding.id}
      />
    </div>
  );
}
