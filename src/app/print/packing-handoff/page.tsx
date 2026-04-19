import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "../emergency-kit/print-button";

export const metadata = { title: "Packing Hand-off — Printable" };

interface PackingItem {
  id: string;
  item_name: string;
  packed: boolean;
}

interface PackingBox {
  id: string;
  label: string;
  assigned_to: string | null;
  vehicle: string | null;
  delivery_time: string | null;
  sort_order: number;
  packing_items: PackingItem[];
}

export default async function PackingHandoffPrintPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();
  const { data: boxes } = await supabase
    .from("packing_boxes")
    .select("*, packing_items(*)")
    .eq("wedding_id", wedding.id)
    .order("sort_order", { ascending: true });

  const boxList: PackingBox[] = (boxes as PackingBox[] | null) ?? [];

  // Group by assignee. Unassigned boxes go last under "No assignee yet".
  const byPerson = new Map<string, PackingBox[]>();
  for (const b of boxList) {
    const key = b.assigned_to?.trim() || "No assignee yet";
    if (!byPerson.has(key)) byPerson.set(key, []);
    byPerson.get(key)!.push(b);
  }
  const groups = Array.from(byPerson.entries()).sort(([a], [b]) =>
    a === "No assignee yet" ? 1 : b === "No assignee yet" ? -1 : a.localeCompare(b)
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
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          @page { margin: 0.6in; }
          .no-print { display: none !important; }
          .person-page { page-break-after: always; }
          .person-page:last-child { page-break-after: auto; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Packing hand-off sheets — one page per assignee
        </span>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-3xl px-8 py-10 text-gray-900">
        {groups.length === 0 ? (
          <p className="text-sm text-gray-500 italic py-12 text-center">
            No packing boxes yet. Add boxes on the Packing page first.
          </p>
        ) : (
          groups.map(([person, boxes]) => (
            <section key={person} className="person-page mb-10">
              <div className="border-b-2 border-gray-900 pb-4 mb-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-1">
                  Packing hand-off
                </p>
                <h1 className="text-3xl font-serif">{person}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {wedding.partner1_name} &amp; {wedding.partner2_name}
                  {weddingDate ? ` · ${weddingDate}` : ""}
                </p>
              </div>

              <p className="text-sm text-gray-700 mb-5">
                You&apos;re responsible for {boxes.length} box
                {boxes.length === 1 ? "" : "es"}. Check each item off as
                it&apos;s packed. Keep this sheet with the boxes through
                delivery.
              </p>

              <div className="space-y-6">
                {boxes.map((b) => (
                  <div
                    key={b.id}
                    className="border border-gray-300 rounded p-4 break-inside-avoid"
                  >
                    <div className="flex items-baseline justify-between mb-2">
                      <h2 className="text-lg font-semibold">{b.label}</h2>
                      <span className="text-xs text-gray-500 tabular-nums">
                        {b.packing_items.filter((i) => i.packed).length} /{" "}
                        {b.packing_items.length} packed
                      </span>
                    </div>
                    {(b.vehicle || b.delivery_time) && (
                      <div className="flex flex-wrap gap-x-4 text-xs text-gray-600 mb-3">
                        {b.vehicle && (
                          <span>
                            <span className="uppercase tracking-wider text-[10px] text-gray-500">
                              Vehicle:{" "}
                            </span>
                            {b.vehicle}
                          </span>
                        )}
                        {b.delivery_time && (
                          <span>
                            <span className="uppercase tracking-wider text-[10px] text-gray-500">
                              Delivery:{" "}
                            </span>
                            {b.delivery_time}
                          </span>
                        )}
                      </div>
                    )}
                    {b.packing_items.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">
                        No items listed yet.
                      </p>
                    ) : (
                      <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                        {b.packing_items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center gap-2"
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
                                  : ""
                              }
                            >
                              {item.item_name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-3 border-t border-gray-300 text-[10px] text-gray-500 flex items-center justify-between">
                <span>Keep this sheet with the boxes.</span>
                <span>Printed {new Date().toLocaleDateString()}</span>
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
