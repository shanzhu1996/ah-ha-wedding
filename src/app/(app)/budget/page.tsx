import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { BudgetDashboard } from "@/components/budget/budget-dashboard";

export default async function BudgetPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();

  const [
    { data: budgetItems },
    { data: vendors },
    { data: shoppingItems },
  ] = await Promise.all([
    supabase
      .from("budget_items")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("due_date", { ascending: true }),
    supabase
      .from("vendors")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("shopping_items")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <BudgetDashboard
      budgetItems={budgetItems || []}
      vendors={vendors || []}
      shoppingItems={shoppingItems || []}
      weddingId={wedding.id}
      budgetTotal={wedding.budget_total}
    />
  );
}
