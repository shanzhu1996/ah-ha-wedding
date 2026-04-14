import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { PostWeddingManager } from "@/components/postwedding/postwedding-manager";

export default async function PostWeddingPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();

  const [{ data: guests }, { data: vendors }] = await Promise.all([
    supabase
      .from("guests")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("last_name", { ascending: true }),
    supabase
      .from("vendors")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
          Post-Wedding
        </h1>
        <p className="text-muted-foreground mt-1">
          Thank-you tracker, name changes, vendor reviews, and wrap-up tasks.
        </p>
      </div>
      <PostWeddingManager
        guests={guests || []}
        vendors={vendors || []}
        weddingId={wedding.id}
      />
    </div>
  );
}
