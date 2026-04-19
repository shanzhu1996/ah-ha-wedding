import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { KIT_CATEGORIES, defaultItemKey } from "@/app/(app)/tips/data";
import { parseKitState } from "@/app/(app)/tips/page";
import { PrintButton } from "./print-button";

export const metadata = {
  title: "Emergency Kit — Printable",
};

export default async function EmergencyKitPrintPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("wedding_day_details")
    .select("data")
    .eq("wedding_id", wedding.id)
    .eq("section", "emergency_kit")
    .maybeSingle();

  const state = parseKitState(row?.data ?? null);
  const hidden = new Set(state.hidden);
  const packed = new Set(state.packed);

  const rows = KIT_CATEGORIES.map((cat) => {
    const items = [
      ...[...cat.essentials, ...cat.extended]
        .filter((item) => !hidden.has(defaultItemKey(cat.id, item)))
        .map((item) => ({
          name: item,
          packed: packed.has(defaultItemKey(cat.id, item)),
          isCustom: false,
        })),
      ...state.custom
        .filter((c) => c.category === cat.id)
        .map((c) => ({ name: c.name, packed: c.packed, isCustom: true })),
    ];
    return { category: cat, items };
  }).filter((r) => r.items.length > 0);

  const totalItems = rows.reduce((sum, r) => sum + r.items.length, 0);
  const packedItems = rows.reduce(
    (sum, r) => sum + r.items.filter((i) => i.packed).length,
    0
  );

  const weddingDate = wedding.wedding_date
    ? new Date(wedding.wedding_date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-white print:bg-white">
      <style>{`
        @media print {
          @page { margin: 0.6in; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Print controls (hidden on print) */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Emergency Kit — printable hand-off sheet
        </span>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-3xl px-8 py-10 text-gray-900">
        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-4 mb-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-1">
            Wedding Emergency Kit
          </p>
          <h1 className="text-3xl font-serif">
            {wedding.partner1_name} &amp; {wedding.partner2_name}
          </h1>
          {weddingDate ? (
            <p className="text-sm text-gray-600 mt-1">{weddingDate}</p>
          ) : null}
        </div>

        {/* Keeper box */}
        <div className="border border-gray-300 rounded p-4 mb-6">
          <div className="text-[11px] uppercase tracking-[0.15em] text-gray-500 mb-2">
            Kit keeper
          </div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <span className="text-xs text-gray-500">Name: </span>
              <span className="text-lg font-medium">
                {state.assignee?.name || "____________________________"}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500">Contact: </span>
              <span className="text-base">
                {state.assignee?.contact || "____________________________"}
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-baseline justify-between mb-5">
          <p className="text-sm text-gray-700">
            Check each item off as it&apos;s packed into the kit bag. Leave
            this sheet in the bag for reference during the day.
          </p>
          <span className="text-sm tabular-nums text-gray-500 whitespace-nowrap ml-4">
            {packedItems} / {totalItems} packed
          </span>
        </div>

        {/* Category sections */}
        <div className="space-y-6">
          {rows.map((r) => (
            <section key={r.category.id} className="break-inside-avoid">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1 mb-3">
                {r.category.name}
                <span className="ml-2 text-xs font-normal text-gray-500 tabular-nums">
                  ({r.items.filter((i) => i.packed).length} / {r.items.length})
                </span>
              </h2>
              <ul className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                {r.items.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className="inline-block w-4 h-4 border-2 border-gray-400 rounded-sm flex-shrink-0 relative"
                      aria-hidden
                    >
                      {item.packed ? (
                        <span className="absolute inset-0 flex items-center justify-center text-gray-900 font-bold leading-none text-[13px]">
                          ✓
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={
                        item.packed
                          ? "line-through text-gray-500"
                          : "text-gray-900"
                      }
                    >
                      {item.name}
                      {item.isCustom ? (
                        <span className="ml-1 text-[10px] uppercase tracking-wider text-gray-400">
                          custom
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-gray-300 text-xs text-gray-500 flex items-center justify-between">
          <span>
            Printed from Ah-Ha! · {wedding.partner1_name} &amp;{" "}
            {wedding.partner2_name}
          </span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
