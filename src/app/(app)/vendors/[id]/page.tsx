import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { VendorDetail } from "@/components/vendors/vendor-detail";

// Valid vendor type slugs
const VENDOR_TYPES = new Set([
  "photographer", "videographer", "dj", "band", "caterer", "florist",
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

    // Render detail page — vendor may be null (new vendor mode)
    return (
      <VendorDetail
        vendor={vendor}
        vendorType={id}
        weddingId={wedding.id}
        weddingDate={wedding.wedding_date}
      />
    );
  }

  // id is a UUID — fetch by ID
  const { data: vendor } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .single();

  if (!vendor) redirect("/vendors");

  return (
    <VendorDetail
      vendor={vendor}
      vendorType={vendor.type}
      weddingId={wedding.id}
      weddingDate={wedding.wedding_date}
    />
  );
}
