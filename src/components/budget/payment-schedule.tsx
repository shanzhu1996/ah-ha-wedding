"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { BudgetItemType } from "@/types/database";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────

export interface PaymentItem {
  id: string;
  description: string;
  amount: number;
  due_date: string | null;
  paid: boolean;
  paid_at: string | null;
  item_type: BudgetItemType;
}

interface Props {
  vendorId: string;
  weddingId: string;
  category: string; // vendor category (used when inserting new rows)
  contractAmount: number | null;
  items: PaymentItem[];
  variant?: "inline" | "expanded";
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Sort by payment-type chronology, not by paid status. Checking an item
// should NOT reshuffle the list — the ✓ icon already signals "done".
//
//   Deposit  →  top      (first money out, at booking)
//   Balance  →  middle   (by due_date asc; undated last within group)
//   Purchase →  middle   (grouped with balance)
//   Tip      →  bottom   (paid day-of; last money out)
const TYPE_ORDER: Record<string, number> = {
  deposit: 0,
  balance: 1,
  purchase: 1,
  tip: 2,
};

function sortPayments(a: PaymentItem, b: PaymentItem) {
  const aOrder = TYPE_ORDER[a.item_type] ?? 1;
  const bOrder = TYPE_ORDER[b.item_type] ?? 1;
  if (aOrder !== bOrder) return aOrder - bOrder;

  // Within the same type, sort by due_date ascending; undated items go last.
  if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
  if (a.due_date) return -1;
  if (b.due_date) return 1;
  return 0;
}

// ── Component ──────────────────────────────────────────────────────────

export function PaymentSchedule({
  vendorId,
  weddingId,
  category,
  contractAmount,
  items,
  variant = "expanded",
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [, startTransition] = useTransition();

  // Optimistic paid state for snappier feel
  const [optimisticPaid, setOptimisticPaid] = useState<Record<string, boolean>>(
    {}
  );

  // Add-payment form state
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("Midpoint");
  const [newAmount, setNewAmount] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newType, setNewType] = useState<BudgetItemType>("balance");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDue, setEditDue] = useState("");

  // Inline collapse/expand
  const [expanded, setExpanded] = useState(false);
  const showFull = variant === "expanded" || expanded;

  const sortedItems = [...items].sort(sortPayments);

  // Aggregations
  const nonTip = items.filter((i) => i.item_type !== "tip");
  const totalAllocated = nonTip.reduce((sum, i) => sum + i.amount, 0);
  const paidSum = items
    .filter((i) => (optimisticPaid[i.id] ?? i.paid))
    .reduce((sum, i) => sum + i.amount, 0);
  const scheduledSum = items
    .filter((i) => !(optimisticPaid[i.id] ?? i.paid))
    .reduce((sum, i) => sum + i.amount, 0);

  const divergence =
    contractAmount != null && contractAmount > 0
      ? contractAmount - totalAllocated
      : 0;

  // Next unpaid due date
  const nextDue = sortedItems.find(
    (i) => !(optimisticPaid[i.id] ?? i.paid) && i.due_date
  );

  // ── Mutations ────────────────────────────────────────────────────────

  async function togglePaid(item: PaymentItem) {
    const newPaid = !(optimisticPaid[item.id] ?? item.paid);
    setOptimisticPaid((p) => ({ ...p, [item.id]: newPaid }));

    const { error } = await supabase
      .from("budget_items")
      .update({
        paid: newPaid,
        paid_at: newPaid ? new Date().toISOString() : null,
      })
      .eq("id", item.id);

    if (error) {
      setOptimisticPaid((p) => {
        const next = { ...p };
        delete next[item.id];
        return next;
      });
      return;
    }
    startTransition(() => router.refresh());
  }

  async function handleAdd() {
    // Empty amount → 0, so couples can scaffold a payment row and fill in the
    // dollar value later when the vendor confirms the number.
    const parsed = parseFloat(newAmount);
    const amt = isNaN(parsed) ? 0 : parsed;
    if (!newLabel.trim() || amt < 0) return;
    setSaving(true);
    const { error } = await supabase.from("budget_items").insert({
      wedding_id: weddingId,
      category,
      description: newLabel.trim(),
      amount: amt,
      due_date: newDue || null,
      paid: false,
      item_type: newType,
      vendor_id: vendorId,
      shopping_item_id: null,
    });
    setSaving(false);
    if (error) return;
    setAdding(false);
    setNewLabel("Midpoint");
    setNewAmount("");
    setNewDue("");
    setNewType("balance");
    startTransition(() => router.refresh());
  }

  function startEdit(item: PaymentItem) {
    setEditingId(item.id);
    setEditLabel(item.description);
    setEditAmount(String(item.amount));
    setEditDue(item.due_date ?? "");
  }

  async function handleEditSave() {
    if (!editingId) return;
    // Empty amount → 0 (same rationale as handleAdd).
    const parsed = parseFloat(editAmount);
    const amt = isNaN(parsed) ? 0 : parsed;
    if (!editLabel.trim() || amt < 0) return;
    setSaving(true);
    const { error } = await supabase
      .from("budget_items")
      .update({
        description: editLabel.trim(),
        amount: amt,
        due_date: editDue || null,
      })
      .eq("id", editingId);
    setSaving(false);
    if (error) return;
    setEditingId(null);
    startTransition(() => router.refresh());
  }

  async function handleDelete(itemId: string) {
    if (!confirm("Remove this payment?")) return;
    const { error } = await supabase
      .from("budget_items")
      .delete()
      .eq("id", itemId);
    if (error) return;
    startTransition(() => router.refresh());
  }

  // ── Inline collapsed view ────────────────────────────────────────────

  if (variant === "inline" && !expanded) {
    if (sortedItems.length === 0) {
      return (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          + Add payment schedule
        </button>
      );
    }
    const paidCount = items.filter(
      (i) => optimisticPaid[i.id] ?? i.paid
    ).length;
    // Next unpaid item — used to surface a "Mark paid" quick action
    const nextUnpaid = sortedItems.find(
      (i) => !(optimisticPaid[i.id] ?? i.paid)
    );
    return (
      <div className="group/row flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors tabular-nums rounded-md -mx-1.5 px-1.5 py-1 hover:bg-muted/40"
        >
          <ChevronRight className="h-3 w-3 transition-transform" />
          <span className="flex items-center gap-0.5">
            {sortedItems.map((i) => {
              const isPaid = optimisticPaid[i.id] ?? i.paid;
              return (
                <span
                  key={i.id}
                  className={cn(
                    "inline-block h-2 w-2 rounded-sm",
                    isPaid ? "bg-emerald-600" : "bg-muted-foreground/30"
                  )}
                />
              );
            })}
          </span>
          <span className="whitespace-nowrap">
            {paidCount} of {items.length} paid
            {nextDue?.due_date && (
              <> · next {formatDate(nextDue.due_date)}</>
            )}
          </span>
        </button>
        {nextUnpaid && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePaid(nextUnpaid);
            }}
            className="text-xs text-primary hover:underline opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            Mark {nextUnpaid.description.toLowerCase()} paid →
          </button>
        )}
      </div>
    );
  }

  // ── Expanded view (shared by both variants) ─────────────────────────

  return (
    <div className="space-y-2">
      {variant === "inline" && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ▴ Collapse
        </button>
      )}

      {sortedItems.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-2">
          No payments scheduled yet.
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {sortedItems.map((item) => {
            const isPaid = optimisticPaid[item.id] ?? item.paid;
            const isEditing = editingId === item.id;

            if (isEditing) {
              return (
                <li key={item.id} className="py-2.5">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_140px_auto] gap-2 items-center">
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Label"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="Amount"
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={editDue}
                      onChange={(e) => setEditDue(e.target.value)}
                      type="date"
                      className="h-8 text-sm"
                    />
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        disabled={saving}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleEditSave}
                        disabled={saving}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            }

            return (
              <li
                key={item.id}
                className="group flex items-center gap-3 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => togglePaid(item)}
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded border-2 transition-colors",
                    isPaid
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-muted-foreground/40 hover:border-foreground"
                  )}
                  aria-label={isPaid ? "Mark unpaid" : "Mark paid"}
                >
                  {isPaid && <Check className="h-3 w-3" strokeWidth={3} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isPaid && "text-muted-foreground line-through"
                      )}
                    >
                      {item.description}
                    </span>
                    {item.item_type === "tip" && (
                      <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                        Tip
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isPaid && item.paid_at ? (
                      <>
                        paid {formatDate(item.paid_at.slice(0, 10))}
                      </>
                    ) : item.due_date ? (
                      <>due {formatDate(item.due_date)}</>
                    ) : (
                      <span className="italic">no due date</span>
                    )}
                  </div>
                </div>

                <div className="text-sm font-medium tabular-nums">
                  {formatCurrency(item.amount)}
                </div>

                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => startEdit(item)}
                    aria-label="Edit payment"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(item.id)}
                    aria-label="Delete payment"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Summary line */}
      {sortedItems.length > 0 && (
        <div className="pt-1 text-xs text-muted-foreground tabular-nums flex items-center gap-2 flex-wrap">
          <span>
            <span className="font-medium text-emerald-700">
              {formatCurrency(paidSum)}
            </span>{" "}
            paid
          </span>
          <span>·</span>
          <span>
            <span className="font-medium text-foreground/80">
              {formatCurrency(scheduledSum)}
            </span>{" "}
            scheduled
          </span>
          {divergence !== 0 && contractAmount != null && (
            <>
              <span>·</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  divergence > 0 ? "text-amber-700" : "text-red-700"
                )}
              >
                <AlertCircle className="h-3 w-3" />
                {divergence > 0 ? (
                  <>{formatCurrency(divergence)} unallocated</>
                ) : (
                  <>{formatCurrency(Math.abs(divergence))} over contract</>
                )}
              </span>
            </>
          )}
        </div>
      )}

      {/* Add payment form */}
      {adding ? (
        <div className="border border-border/60 rounded-md p-3 space-y-2 bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_100px_140px_130px] gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Label</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Midpoint"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Amount</Label>
              <Input
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0"
                type="number"
                step="0.01"
                min="0"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Due date</Label>
              <Input
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                type="date"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select
                value={newType}
                onValueChange={(v) => setNewType(v as BudgetItemType)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="balance">Balance</SelectItem>
                  <SelectItem value="tip">Tip</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAdding(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={saving}>
              Add payment
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add payment
        </button>
      )}
    </div>
  );
}
