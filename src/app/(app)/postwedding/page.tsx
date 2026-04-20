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
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
          Post-Wedding
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          After the dust settles — thank-you notes, name changes, vendor reviews, and all the little wrap-up tasks.
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
