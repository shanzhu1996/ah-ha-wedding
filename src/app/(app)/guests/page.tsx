import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { GuestManager } from "@/components/guests/guest-manager";

export default async function GuestsPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();
  const { data: guests } = await supabase
    .from("guests")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("last_name", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
          Guest List
        </h1>
        <p className="text-muted-foreground mt-1">
          Your guest list connects to everything — seating chart, caterer headcount, and thank-you cards after the wedding. Add everyone you&apos;re inviting, then track RSVPs as they come in.
        </p>
      </div>
      <GuestManager guests={guests || []} weddingId={wedding.id} receptionFormat={wedding.reception_format} />
    </div>
  );
}
