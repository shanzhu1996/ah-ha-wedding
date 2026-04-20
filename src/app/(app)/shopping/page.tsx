import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { ShoppingManager } from "@/components/shopping/shopping-manager";
import { getDefaultItems, type AttirePreference } from "@/lib/shopping/defaults";

export default async function ShoppingPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();

  // One-shot seed on first visit, stamped via shopping_seeded_at.
  // After this, the couple owns the list — deletions won't resurrect.
  if (!wedding.shopping_seeded_at) {
    const defaults = getDefaultItems(
      wedding.partner1_name,
      wedding.partner2_name,
      wedding.partner1_attire as AttirePreference,
      wedding.partner2_attire as AttirePreference,
    );
    const rows = Object.entries(defaults).flatMap(([category, items]) =>
      items.map((item) => ({
        wedding_id: wedding.id,
        category,
        item_name: item.name,
        search_terms: item.search || null,
        status: "not_started",
        quantity: 1,
      }))
    );
    if (rows.length > 0) {
      await supabase.from("shopping_items").insert(rows);
    }
    await supabase
      .from("weddings")
      .update({ shopping_seeded_at: new Date().toISOString() })
      .eq("id", wedding.id);
  }

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
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
          Shopping
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
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
