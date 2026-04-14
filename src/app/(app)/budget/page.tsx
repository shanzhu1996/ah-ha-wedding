import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { BudgetDashboard } from "@/components/budget/budget-dashboard";

export default async function BudgetPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();

  const [{ data: budgetItems }, { data: vendors }] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
          Budget
        </h1>
        <p className="text-muted-foreground mt-1">
          Track spending, payments, and vendor tips.
        </p>
      </div>
      <BudgetDashboard
        budgetItems={budgetItems || []}
        vendors={vendors || []}
        weddingId={wedding.id}
        budgetTotal={wedding.budget_total}
      />
    </div>
  );
}
