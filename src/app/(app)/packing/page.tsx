import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { PackingManager } from "@/components/packing/packing-manager";

export default async function PackingPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();

  const [{ data: boxes }, { data: shoppingItems }] = await Promise.all([
    supabase
      .from("packing_boxes")
      .select("*, packing_items(*)")
      .eq("wedding_id", wedding.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("shopping_items")
      .select("id, category, item_name, status")
      .eq("wedding_id", wedding.id)
      .order("category", { ascending: true })
      .order("item_name", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
          Packing Lists
        </h1>
        <p className="text-muted-foreground mt-1">
          Organize items into labeled boxes for venue delivery.
        </p>
      </div>
      <PackingManager
        boxes={boxes || []}
        shoppingItems={shoppingItems || []}
        weddingId={wedding.id}
      />
    </div>
  );
}
