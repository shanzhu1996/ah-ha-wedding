"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Sparkles, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { VendorType } from "@/types/database";
import {
  TIP_SUGGESTIONS,
  formatTipRange,
  computeDefaultTip,
} from "@/lib/tip-suggestions";

interface Vendor {
  id: string;
  type: VendorType;
  company_name: string;
  contract_amount: number | null;
}

interface BudgetItem {
  id: string;
  vendor_id: string | null;
  item_type: "deposit" | "balance" | "tip" | "purchase";
  amount: number;
}

interface TipRow {
  itemId: string;
  amount: number;
}

interface Props {
  vendors: Vendor[];
  budgetItems: BudgetItem[];
  weddingId: string;
  expanded: boolean;
  onToggle: () => void;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Tip Planner — per-vendor suggested tip row + one-click apply.
 *
 * Renders as a Budget-dashboard collapsible section. Vendors that are
 * "typically not tipped" (venue) are still shown so couples know that's
 * an intentional zero rather than a missing entry.
 *
 * Writes `budget_items` rows with item_type='tip', so the PaymentSchedule
 * component inside "From Vendors" automatically surfaces them.
 */
export function TipPlanner({
  vendors,
  budgetItems,
  weddingId,
  expanded,
  onToggle,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);

  // Existing tip rows per vendor (from budget_items). We track the
  // underlying item ids so the inline Remove button can delete them
  // without sending the couple to the payment schedule.
  const tipsByVendor = useMemo(() => {
    const m: Record<string, TipRow[]> = {};
    for (const item of budgetItems) {
      if (item.item_type !== "tip" || !item.vendor_id) continue;
      if (!m[item.vendor_id]) m[item.vendor_id] = [];
      m[item.vendor_id].push({ itemId: item.id, amount: item.amount });
    }
    return m;
  }, [budgetItems]);

  // Compute total suggested across all vendors (default pick per type).
  const rows = useMemo(
    () =>
      vendors.map((v) => {
        const suggestion = TIP_SUGGESTIONS[v.type];
        const defaultTip = computeDefaultTip(v.type, v.contract_amount);
        const applied = tipsByVendor[v.id] || [];
        const appliedTotal = applied.reduce((sum, r) => sum + r.amount, 0);
        return {
          vendor: v,
          suggestion,
          defaultTip,
          applied,
          appliedTotal,
          rangeLabel: formatTipRange(v.type),
        };
      }),
    [vendors, tipsByVendor]
  );

  const totalSuggested = rows.reduce((sum, r) => sum + r.defaultTip, 0);
  const totalApplied = rows.reduce((sum, r) => sum + r.appliedTotal, 0);

  async function applyTip(vendorId: string, amount: number, vendorName: string) {
    if (amount <= 0) return;
    setSavingId(vendorId);
    const supabase = createClient();
    const { error } = await supabase.from("budget_items").insert({
      wedding_id: weddingId,
      category: "Tips",
      description: "Tip",
      amount,
      due_date: null,
      paid: false,
      item_type: "tip",
      vendor_id: vendorId,
      shopping_item_id: null,
    });
    setSavingId(null);
    if (error) {
      toast.error("Could not apply tip", { description: error.message });
      return;
    }
    toast.success(`Added ${formatCurrency(amount)} tip for ${vendorName}`);
    startTransition(() => router.refresh());
  }

  async function removeTip(vendorId: string, vendorName: string, itemIds: string[]) {
    if (itemIds.length === 0) return;
    setSavingId(vendorId);
    const supabase = createClient();
    const { error } = await supabase
      .from("budget_items")
      .delete()
      .in("id", itemIds);
    setSavingId(null);
    if (error) {
      toast.error("Could not remove tip", { description: error.message });
      return;
    }
    toast.success(`Removed tip for ${vendorName}`);
    startTransition(() => router.refresh());
  }

  async function applyAll() {
    const pending = rows.filter((r) => r.appliedTotal === 0 && r.defaultTip > 0);
    if (pending.length === 0) return;
    const supabase = createClient();
    const { error } = await supabase.from("budget_items").insert(
      pending.map((r) => ({
        wedding_id: weddingId,
        category: "Tips",
        description: "Tip",
        amount: r.defaultTip,
        due_date: null,
        paid: false,
        item_type: "tip" as const,
        vendor_id: r.vendor.id,
        shopping_item_id: null,
      }))
    );
    if (error) {
      toast.error("Could not apply tips", { description: error.message });
      return;
    }
    toast.success(`Added ${pending.length} tips`);
    startTransition(() => router.refresh());
  }

  if (vendors.length === 0) return null;

  return (
    <section>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between mb-3 pb-2 border-b border-border/50 group"
      >
        <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] uppercase text-foreground/80 group-hover:text-foreground transition-colors">
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              expanded && "rotate-90"
            )}
          />
          <Sparkles className="h-3.5 w-3.5" />
          Tip Planner
          <span className="text-muted-foreground/60 normal-case tracking-normal font-normal">
            · suggestions for {vendors.length} vendor{vendors.length === 1 ? "" : "s"}
          </span>
        </span>
        <span className="text-[11px] font-medium text-muted-foreground tabular-nums whitespace-nowrap">
          {totalApplied > 0
            ? `${formatCurrency(totalApplied)} of ${formatCurrency(totalSuggested)}`
            : formatCurrency(totalSuggested)}
        </span>
      </button>

      {expanded && (
        <div className="pl-6 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Industry norms vary — these are starting points. Applying a tip
            creates a line item under the vendor&apos;s payment schedule.
          </p>

          <ul className="divide-y divide-border/40">
            {rows.map(({ vendor, suggestion, defaultTip, applied, appliedTotal, rangeLabel }) => {
              const isApplied = appliedTotal > 0;
              const isNotTipped = suggestion.kind === "none";
              const needsContract =
                suggestion.kind === "percent" &&
                (!vendor.contract_amount || vendor.contract_amount <= 0);
              return (
                <li
                  key={vendor.id}
                  className="py-3 flex items-center gap-3 flex-wrap"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {vendor.company_name}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                        {vendor.type.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="tabular-nums">{rangeLabel}</span>
                      {suggestion.note && (
                        <>
                          <span className="mx-1.5 text-muted-foreground/40">·</span>
                          <span className="italic">{suggestion.note}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isApplied ? (
                      <>
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 tabular-nums">
                          <Check className="h-3.5 w-3.5" />
                          {formatCurrency(appliedTotal)} applied
                        </span>
                        <button
                          type="button"
                          disabled={savingId === vendor.id}
                          onClick={() =>
                            removeTip(
                              vendor.id,
                              vendor.company_name,
                              applied.map((r) => r.itemId)
                            )
                          }
                          aria-label={`Remove tip for ${vendor.company_name}`}
                          title="Remove tip"
                          className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-muted transition-colors disabled:opacity-40"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : isNotTipped ? (
                      <span className="text-xs text-muted-foreground italic">
                        Not tipped
                      </span>
                    ) : needsContract ? (
                      <span className="text-xs text-muted-foreground italic">
                        Set contract amount first
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={savingId === vendor.id}
                        onClick={() => applyTip(vendor.id, defaultTip, vendor.company_name)}
                        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors tabular-nums disabled:opacity-50"
                      >
                        {savingId === vendor.id ? "Saving…" : `Apply ${formatCurrency(defaultTip)} →`}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {rows.some((r) => r.appliedTotal === 0 && r.defaultTip > 0) && (
            <div className="pt-1">
              <button
                type="button"
                onClick={applyAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                Apply all remaining suggestions
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
