import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { ShoppingManager } from "@/components/shopping/shopping-manager";

export default async function ShoppingPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: items }, { data: vendors }] = await Promise.all([
    supabase
      .from("shopping_items")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("category", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("vendors")
      .select("id, type, company_name")
      .eq("wedding_id", wedding.id)
      .order("company_name", { ascending: true }),
  ]);

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
        vendors={vendors || []}
        weddingId={wedding.id}
        weddingStyle={wedding.style}
        partner1Name={wedding.partner1_name}
        partner2Name={wedding.partner2_name}
        partner1Attire={wedding.partner1_attire}
        partner2Attire={wedding.partner2_attire}
        budgetTotal={wedding.budget_total}
      />
    </div>
  );
}
