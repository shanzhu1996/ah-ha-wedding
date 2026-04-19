"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Check,
  ChevronRight,
  ShoppingCart,
  Users,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import type { BudgetItemType, VendorType, ItemStatus } from "@/types/database";
import { cn } from "@/lib/utils";
import {
  PaymentSchedule,
  type PaymentItem,
} from "@/components/budget/payment-schedule";
import { VENDOR_TYPE_TO_CATEGORY as CATEGORY_MAP } from "@/lib/vendor-categories";

// ── Types ──────────────────────────────────────────────────────────────

interface BudgetItem {
  id: string;
  wedding_id: string;
  category: string;
  description: string;
  amount: number;
  due_date: string | null;
  paid: boolean;
  paid_at: string | null;
  item_type: BudgetItemType;
  vendor_id: string | null;
  shopping_item_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Vendor {
  id: string;
  wedding_id: string;
  type: VendorType;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  contract_amount: number | null;
  deposit_amount: number | null;
  deposit_paid: boolean;
  balance_due_date: string | null;
  notes: string | null;
}

interface ShoppingItem {
  id: string;
  wedding_id: string;
  category: string;
  item_name: string;
  status: ItemStatus;
  quantity: number;
  estimated_cost: number | null;
  actual_cost: number | null;
  vendor_source: string | null;
  notes: string | null;
  due_date: string | null;
  covered_by_vendor: boolean;
}

interface BudgetDashboardProps {
  budgetItems: BudgetItem[];
  vendors: Vendor[];
  shoppingItems: ShoppingItem[];
  weddingId: string;
  budgetTotal: number | null;
  paymentsByVendor?: Record<string, PaymentItem[]>;
}

// ── Constants ──────────────────────────────────────────────────────────

const CATEGORIES = [
  "Venue",
  "Catering",
  "Photography",
  "Videography",
  "Flowers",
  "Attire",
  "Music/DJ",
  "Decor",
  "Stationery",
  "Transportation",
  "Rentals",
  "Beauty",
  "Favors",
  "Other",
] as const;

// Map vendor type → budget category (shared helper for consistency across app)
const VENDOR_TYPE_TO_CATEGORY = CATEGORY_MAP;

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

// ── Component ──────────────────────────────────────────────────────────

export function BudgetDashboard({
  budgetItems,
  vendors,
  shoppingItems,
  weddingId,
  budgetTotal,
  paymentsByVendor = {},
}: BudgetDashboardProps) {
  const router = useRouter();

  // Filter to only CUSTOM budget items (not linked to vendor or shopping)
  const customItems = useMemo(
    () => budgetItems.filter((b) => !b.vendor_id && !b.shopping_item_id),
    [budgetItems]
  );

  // ── Aggregations ───────────────────────────────────────────────────

  // Booked vendors: any vendor with at least one budget_items row OR with contract_amount set
  const vendorTotals = useMemo(() => {
    const booked = vendors.filter(
      (v) =>
        (paymentsByVendor[v.id]?.length ?? 0) > 0 ||
        (v.contract_amount && v.contract_amount > 0)
    );
    // Sum all vendor-linked budget_items (these are the vendor installments)
    const vendorItems = budgetItems.filter((b) => b.vendor_id);
    const paid = vendorItems
      .filter((b) => b.paid)
      .reduce((sum, b) => sum + b.amount, 0);
    const scheduled = vendorItems
      .filter((b) => !b.paid)
      .reduce((sum, b) => sum + b.amount, 0);
    return { booked, paid, scheduled, total: paid + scheduled };
  }, [vendors, budgetItems, paymentsByVendor]);

  // From shopping: received items (paid) + ordered/unstarted items (scheduled).
  // Covered-by-vendor items are excluded — the vendor provides them, so the
  // couple's shopping spend shouldn't double-count what's already in a
  // vendor contract.
  const shoppingTotals = useMemo(() => {
    const withCost = shoppingItems.filter(
      (s) => !s.covered_by_vendor && (s.actual_cost ?? s.estimated_cost ?? 0) > 0
    );
    const paid = withCost
      .filter((s) => s.status === "received" || s.status === "done")
      .reduce((sum, s) => sum + (s.actual_cost ?? s.estimated_cost ?? 0), 0);
    const scheduled = withCost
      .filter((s) => s.status !== "received" && s.status !== "done")
      .reduce((sum, s) => sum + (s.actual_cost ?? s.estimated_cost ?? 0), 0);
    return { items: withCost, paid, scheduled, total: paid + scheduled };
  }, [shoppingItems]);

  // Group shopping items by shopping category for a cleaner breakdown — so
  // couples see "Stationery $420 · Reception Decor $1,200" at a glance
  // instead of a flat list where big and small items blur together.
  const shoppingByCategory = useMemo(() => {
    const groups: Record<
      string,
      { total: number; items: ShoppingItem[] }
    > = {};
    for (const item of shoppingTotals.items) {
      const cat = item.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = { total: 0, items: [] };
      const cost = item.actual_cost ?? item.estimated_cost ?? 0;
      groups[cat].total += cost;
      groups[cat].items.push(item);
    }
    // Sort by total descending — biggest spend shown first.
    return Object.entries(groups)
      .map(([category, g]) => ({ category, ...g }))
      .sort((a, b) => b.total - a.total);
  }, [shoppingTotals.items]);

  // From custom items (budget_items with no vendor_id and no shopping_item_id)
  const customTotals = useMemo(() => {
    const paid = customItems
      .filter((b) => b.paid)
      .reduce((sum, b) => sum + b.amount, 0);
    const scheduled = customItems
      .filter((b) => !b.paid)
      .reduce((sum, b) => sum + b.amount, 0);
    return { paid, scheduled, total: paid + scheduled };
  }, [customItems]);

  // Overall totals
  const totalPaid = vendorTotals.paid + shoppingTotals.paid + customTotals.paid;
  const totalScheduled =
    vendorTotals.scheduled + shoppingTotals.scheduled + customTotals.scheduled;
  const totalAllocated = totalPaid + totalScheduled;
  const budget = budgetTotal || 0;
  const unallocated = budget - totalAllocated;


  // Upcoming payments (vendor balances + custom items with due dates + unpaid)
  // Empty state: no vendors, no shopping costs, no custom items
  const isEmpty =
    vendorTotals.booked.length === 0 &&
    shoppingTotals.items.length === 0 &&
    customItems.length === 0;

  // ── Collapsible sections state ─────────────────────────────────────

  // Auto-expand sections that have data, collapse empty ones
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    if (vendorTotals.booked.length > 0) expanded.add("vendors");
    if (shoppingTotals.items.length > 0) expanded.add("shopping");
    if (customItems.length > 0) expanded.add("custom");
    // If everything is empty, expand vendors by default so the user sees structure
    if (expanded.size === 0) expanded.add("vendors");
    return expanded;
  });

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ── Dialog state for Custom Items ──────────────────────────────────

  const [showDialog, setShowDialog] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budgetTotal ? String(budgetTotal) : "");
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [formCategory, setFormCategory] = useState<string>("Other");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPaid, setFormPaid] = useState(false);

  function resetForm() {
    setEditingItem(null);
    setFormCategory("Other");
    setFormDescription("");
    setFormAmount("");
    setFormDueDate("");
    setFormPaid(false);
  }

  function openAddDialog() {
    resetForm();
    setShowDialog(true);
  }

  function openEditDialog(item: BudgetItem) {
    setEditingItem(item);
    setFormCategory(item.category);
    setFormDescription(item.description);
    setFormAmount(String(item.amount));
    setFormDueDate(item.due_date || "");
    setFormPaid(item.paid);
    setShowDialog(true);
  }

  async function handleSaveBudget() {
    const amount = parseFloat(budgetInput);
    if (isNaN(amount) || amount < 0) return;
    const supabase = createClient();
    await supabase.from("weddings").update({ budget_total: amount }).eq("id", weddingId);
    setShowBudgetDialog(false);
    router.refresh();
  }

  async function handleSave() {
    if (!formDescription.trim() || !formAmount) return;
    const supabase = createClient();
    const payload = {
      wedding_id: weddingId,
      category: formCategory,
      description: formDescription.trim(),
      amount: parseFloat(formAmount),
      due_date: formDueDate || null,
      paid: formPaid,
      item_type: "purchase" as BudgetItemType,
      vendor_id: null,
      shopping_item_id: null,
    };
    if (editingItem) {
      await supabase.from("budget_items").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("budget_items").insert(payload);
    }
    setShowDialog(false);
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("budget_items").delete().eq("id", id);
    router.refresh();
  }

  async function handleTogglePaid(id: string, paid: boolean) {
    const supabase = createClient();
    await supabase.from("budget_items").update({ paid: !paid }).eq("id", id);
    router.refresh();
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header — editorial pattern */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
          Budget
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {budget > 0 ? (
            <>
              <button
                onClick={() => setShowBudgetDialog(true)}
                className="font-medium text-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-1 group"
                title="Click to edit budget"
              >
                {formatCurrency(budget)}
                <Pencil className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />
              </button>
              {" "}budget
              <span className="text-muted-foreground/50"> · </span>
              <span className="font-medium text-emerald-700">{formatCurrency(totalPaid)}</span> paid
              {totalScheduled > 0 && (
                <>
                  <span className="text-muted-foreground/50"> · </span>
                  <span className="font-medium text-foreground/80">{formatCurrency(totalScheduled)}</span> scheduled
                </>
              )}
              <span className="text-muted-foreground/50"> · </span>
              {unallocated >= 0 ? (
                <>
                  <span className="font-medium text-foreground/80">{formatCurrency(unallocated)}</span> unallocated
                </>
              ) : (
                <>
                  <span className="font-medium text-red-700">{formatCurrency(Math.abs(unallocated))}</span> over budget
                </>
              )}
            </>
          ) : (
            <button
              onClick={() => setShowBudgetDialog(true)}
              className="text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              Set your budget →
            </button>
          )}
        </p>
      </div>

      {/* Intro when page is completely empty */}
      {isEmpty && (
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Your budget fills in automatically from vendors and shopping. Add vendor contracts or custom items to get started.
        </p>
      )}

      {/* From Vendors section — collapsible */}
      <section>
          <button
            onClick={() => toggleSection("vendors")}
            className="w-full flex items-center justify-between mb-3 pb-2 border-b border-border/50 group"
          >
            <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] uppercase text-foreground/80 group-hover:text-foreground transition-colors">
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expandedSections.has("vendors") && "rotate-90")} />
              <Users className="h-3.5 w-3.5" />
              From Vendors
              <span className="text-muted-foreground/60 normal-case tracking-normal font-normal">
                · {vendorTotals.booked.length} {vendorTotals.booked.length === 1 ? "vendor" : "vendors"}
              </span>
            </span>
            <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
              {formatCurrency(vendorTotals.total)}
            </span>
          </button>

          {expandedSections.has("vendors") && (
            vendorTotals.booked.length > 0 ? (
              <ul className="divide-y divide-border/40 pl-6">
                {vendorTotals.booked.map((vendor) => {
                  const category = VENDOR_TYPE_TO_CATEGORY[vendor.type];
                  const payments = paymentsByVendor[vendor.id] ?? [];
                  return (
                    <li key={vendor.id} className="py-3">
                      <div className="flex items-baseline gap-2 mb-2">
                        <Link
                          href={`/vendors/${vendor.id}`}
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {vendor.company_name}
                        </Link>
                        <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                          {category}
                        </span>
                        {vendor.contract_amount && (
                          <span className="ml-auto text-xs font-medium text-foreground/80 tabular-nums">
                            {formatCurrency(vendor.contract_amount)}
                          </span>
                        )}
                      </div>
                      <PaymentSchedule
                        vendorId={vendor.id}
                        weddingId={weddingId}
                        category={category}
                        contractAmount={vendor.contract_amount}
                        items={payments}
                        variant="inline"
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Link href="/vendors" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                No vendor contracts yet — add vendors
                <ChevronRight className="h-3 w-3" />
              </Link>
            )
          )}
        </section>

      {/* From Shopping section — collapsible */}
      <section>
          <button
            onClick={() => toggleSection("shopping")}
            className="w-full flex items-center justify-between mb-3 pb-2 border-b border-border/50 group"
          >
            <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] uppercase text-foreground/80 group-hover:text-foreground transition-colors">
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expandedSections.has("shopping") && "rotate-90")} />
              <ShoppingCart className="h-3.5 w-3.5" />
              From Shopping
              <span className="text-muted-foreground/60 normal-case tracking-normal font-normal">
                · {shoppingTotals.items.length} {shoppingTotals.items.length === 1 ? "item" : "items"}
              </span>
            </span>
            <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
              {formatCurrency(shoppingTotals.total)}
            </span>
          </button>

          {expandedSections.has("shopping") && (
            shoppingByCategory.length > 0 ? (
              <div className="space-y-4 pl-6">
                {shoppingByCategory.map((group) => (
                  <div key={group.category}>
                    <div className="flex items-baseline justify-between text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground/70 mb-1 pb-1 border-b border-border/30">
                      <span>
                        {group.category}
                        <span className="text-muted-foreground/60 normal-case tracking-normal font-normal ml-1">
                          · {group.items.length}
                        </span>
                      </span>
                      <span className="tabular-nums">
                        {formatCurrency(group.total)}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const cost = item.actual_cost ?? item.estimated_cost ?? 0;
                        const isSpent =
                          item.status === "received" || item.status === "done";
                        return (
                          <Link
                            key={item.id}
                            href="/shopping"
                            className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-muted/20 transition-colors group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-foreground">
                                  {item.item_name}
                                </span>
                                <span
                                  className={cn(
                                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                                    isSpent
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-amber-50 text-amber-800 border border-amber-200"
                                  )}
                                >
                                  {item.status}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm font-medium text-foreground/80 tabular-nums">
                              {formatCurrency(cost)}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Link href="/shopping" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                No shopping items with costs yet — open Shopping list
                <ChevronRight className="h-3 w-3" />
              </Link>
            )
          )}
        </section>

      {/* Other (custom items) section — collapsible */}
      <section>
          <button
            onClick={() => toggleSection("custom")}
            className="w-full flex items-center justify-between mb-3 pb-2 border-b border-border/50 group"
          >
            <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] uppercase text-foreground/80 group-hover:text-foreground transition-colors">
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expandedSections.has("custom") && "rotate-90")} />
              Custom Items
              <span className="text-muted-foreground/60 normal-case tracking-normal font-normal">
                · {customItems.length} {customItems.length === 1 ? "item" : "items"}
              </span>
            </span>
            <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
              {formatCurrency(customTotals.total)}
            </span>
          </button>

          {expandedSections.has("custom") && (
            <>
              {customItems.length > 0 && (
                <div className="space-y-1 mb-2 pl-6">
                  {customItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-muted/20 transition-colors group"
                    >
                      <button
                        onClick={() => handleTogglePaid(item.id, item.paid)}
                        className="shrink-0"
                        title={item.paid ? "Mark unpaid" : "Mark paid"}
                      >
                        {item.paid ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-sm text-foreground", item.paid && "line-through text-muted-foreground")}>
                            {item.description}
                          </span>
                          {item.category && item.category !== "Other" && (
                            <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                              {item.category}
                            </span>
                          )}
                        </div>
                        {item.due_date && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Due {formatDate(item.due_date)}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground/80 tabular-nums">
                        {formatCurrency(item.amount)}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditDialog(item)}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={openAddDialog} variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 ml-4">
                <Plus className="h-3 w-3" />
                Add item
              </Button>
            </>
          )}
        </section>


      {/* Add/Edit Custom Item Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit" : "Add"} custom budget item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="e.g., Venue service charge"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formCategory} onValueChange={(v) => setFormCategory(v ?? "Other")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due date (optional)</Label>
              <Input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={formPaid} onCheckedChange={(v) => setFormPaid(!!v)} />
              Already paid
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={!formDescription.trim() || !formAmount}>
                {editingItem ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Budget amount dialog */}
      <Dialog open={showBudgetDialog} onOpenChange={(open) => { setShowBudgetDialog(open); if (open) setBudgetInput(budgetTotal ? String(budgetTotal) : ""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{budget > 0 ? "Edit your budget" : "Set your budget"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Total budget</Label>
              <Input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="60000"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveBudget(); }}
              />
              <p className="text-xs text-muted-foreground">
                This is the total amount you&apos;re planning to spend. You can change it anytime as decisions evolve.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowBudgetDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveBudget} disabled={!budgetInput || isNaN(parseFloat(budgetInput))}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
