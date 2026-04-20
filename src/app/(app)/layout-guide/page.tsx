import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { LayoutGuide } from "@/components/layout-guide/layout-guide";

export default async function LayoutGuidePage() {
  const wedding = await getCurrentWedding();
  if (!wedding) return redirect("/onboarding");

  // Fetch existing shopping items to check which layout items are already added
  const supabase = await createClient();
  const { data: shoppingItems } = await supabase
    .from("shopping_items")
    .select("item_name")
    .eq("wedding_id", wedding.id);

  const existingItemNames = (shoppingItems || []).map((i) => i.item_name);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
          Layout Guide
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Where does everything GO? Plan the physical layout of each space — welcome table, ceremony seating, reception floor plan, and table settings. Check off items you need and they&apos;ll be added to your shopping list.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-2">
          Best done: 2-3 months before the wedding, after your venue walkthrough
        </p>
      </div>
      <LayoutGuide
        weddingId={wedding.id}
        existingShoppingItems={existingItemNames}
        partner1Name={wedding.partner1_name}
        partner2Name={wedding.partner2_name}
        weddingDate={wedding.wedding_date}
        venueName={wedding.venue_name}
      />
    </div>
  );
}
