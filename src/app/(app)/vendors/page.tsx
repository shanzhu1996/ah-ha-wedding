import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { VendorList } from "@/components/vendors/vendor-list";

export default async function VendorsPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: vendors }, { data: budgetItems }] = await Promise.all([
    supabase
      .from("vendors")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("budget_items")
      .select("*")
      .eq("wedding_id", wedding.id)
      .not("vendor_id", "is", null),
  ]);

  // Group payments by vendor_id for fast lookup
  const paymentsByVendor: Record<
    string,
    { id: string; vendor_id: string | null; paid: boolean; item_type: string }[]
  > = {};
  for (const item of budgetItems || []) {
    if (!item.vendor_id) continue;
    if (!paymentsByVendor[item.vendor_id]) paymentsByVendor[item.vendor_id] = [];
    paymentsByVendor[item.vendor_id].push({
      id: item.id,
      vendor_id: item.vendor_id,
      paid: item.paid,
      item_type: item.item_type,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
          Vendors
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Everyone helping you pull this off — photographer, caterer, florist, DJ, and so on. Track contacts, contracts, arrival times, and meals in one place.
        </p>
      </div>
      <VendorList
        vendors={vendors || []}
        weddingId={wedding.id}
        paymentsByVendor={paymentsByVendor}
      />
    </div>
  );
}
