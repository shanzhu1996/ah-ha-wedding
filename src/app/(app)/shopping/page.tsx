import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { ShoppingManager } from "@/components/shopping/shopping-manager";

export default async function ShoppingPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("shopping_items")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("category", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
          Shopping List
        </h1>
        <p className="text-muted-foreground mt-1">
          Everything you need to buy or rent, organized by category.
        </p>
      </div>
      <ShoppingManager
        items={items || []}
        weddingId={wedding.id}
        weddingStyle={wedding.style}
      />
    </div>
  );
}
