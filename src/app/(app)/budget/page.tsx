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

  // Group budget_items by vendor_id for PaymentSchedule embeds
  const paymentsByVendor: Record<
    string,
    {
      id: string;
      description: string;
      amount: number;
      due_date: string | null;
      paid: boolean;
      paid_at: string | null;
      item_type: "deposit" | "balance" | "tip" | "purchase";
    }[]
  > = {};
  for (const item of budgetItems || []) {
    if (!item.vendor_id) continue;
    if (!paymentsByVendor[item.vendor_id]) paymentsByVendor[item.vendor_id] = [];
    paymentsByVendor[item.vendor_id].push({
      id: item.id,
      description: item.description,
      amount: Number(item.amount),
      due_date: item.due_date,
      paid: item.paid,
      paid_at: item.paid_at,
      item_type: item.item_type,
    });
  }

  return (
    <BudgetDashboard
      budgetItems={budgetItems || []}
      vendors={vendors || []}
      shoppingItems={shoppingItems || []}
      weddingId={wedding.id}
      budgetTotal={wedding.budget_total}
      paymentsByVendor={paymentsByVendor}
    />
  );
}
