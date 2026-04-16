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
    <GuestManager guests={guests || []} weddingId={wedding.id} receptionFormat={wedding.reception_format} />
  );
}
