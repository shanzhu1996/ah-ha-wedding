import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { VendorDetail } from "@/components/vendors/vendor-detail";

// Valid vendor type slugs
const VENDOR_TYPES = new Set([
  "photographer", "videographer", "dj", "band", "mc", "caterer", "florist",
  "baker", "hair_makeup", "officiant", "rentals", "venue",
  "transportation", "coordinator", "photo_booth", "other",
]);

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();

  // Check if `id` is a vendor type slug or a UUID
  const isTypeSlug = VENDOR_TYPES.has(id);

  if (isTypeSlug) {
    // Look up existing vendor of this type
    const { data: vendor } = await supabase
      .from("vendors")
      .select("*")
      .eq("wedding_id", wedding.id)
      .eq("type", id)
      .limit(1)
      .single();

    const [{ data: payments }, { data: coveredItems }] = vendor
      ? await Promise.all([
          supabase
            .from("budget_items")
            .select("*")
            .eq("vendor_id", vendor.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("shopping_items")
            .select("id, category, item_name, status, notes")
            .eq("covered_by_vendor_id", vendor.id)
            .order("category", { ascending: true })
            .order("item_name", { ascending: true }),
        ])
      : [{ data: [] as never[] }, { data: [] as never[] }];

    return (
      <VendorDetail
        vendor={vendor}
        vendorType={id}
        weddingId={wedding.id}
        weddingDate={wedding.wedding_date}
        initialPayments={payments || []}
        coveredItems={coveredItems || []}
      />
    );
  }

  // id is a UUID — fetch by ID
  const [{ data: vendor }, { data: payments }, { data: coveredItems }] =
    await Promise.all([
      supabase
        .from("vendors")
        .select("*")
        .eq("id", id)
        .eq("wedding_id", wedding.id)
        .single(),
      supabase
        .from("budget_items")
        .select("*")
        .eq("vendor_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("shopping_items")
        .select("id, category, item_name, status, notes")
        .eq("covered_by_vendor_id", id)
        .order("category", { ascending: true })
        .order("item_name", { ascending: true }),
    ]);

  if (!vendor) redirect("/vendors");

  return (
    <VendorDetail
      vendor={vendor}
      vendorType={vendor.type}
      weddingId={wedding.id}
      weddingDate={wedding.wedding_date}
      initialPayments={payments || []}
      coveredItems={coveredItems || []}
    />
  );
}
