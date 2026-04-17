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

// ── Types ──────────────────────────────────────────────────────────────

interface BudgetItem {
  id: string;
  wedding_id: string;
  category: string;
  description: string;
  amount: number;
  due_date: string | null;
  paid: boolean;
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
}

interface BudgetDashboardProps {
  budgetItems: BudgetItem[];
  vendors: Vendor[];
  shoppingItems: ShoppingItem[];
  weddingId: string;
  budgetTotal: number | null;
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

// Map vendor type → budget category
const VENDOR_TYPE_TO_CATEGORY: Record<VendorType, string> = {
  photographer: "Photography",
  videographer: "Videography",
  dj: "Music/DJ",
  band: "Music/DJ",
  caterer: "Catering",
  florist: "Flowers",
  baker: "Catering",
  hair_makeup: "Beauty",
  officiant: "Other",
  rentals: "Rentals",
  venue: "Venue",
  transportation: "Transportation",
  coordinator: "Other",
  photo_booth: "Other",
  other: "Other",
};

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
}: BudgetDashboardProps) {
  const router = useRouter();

  // Filter to only CUSTOM budget items (not linked to vendor or shopping)
  const customItems = useMemo(
    () => budgetItems.filter((b) => !b.vendor_id && !b.shopping_item_id),
    [budgetItems]
  );

  // ── Aggregations ───────────────────────────────────────────────────

  // From vendors: contract amounts OR deposit amounts (anything with $$$)
  const vendorTotals = useMemo(() => {
    const booked = vendors.filter(
      (v) => (v.contract_amount && v.contract_amount > 0) || (v.deposit_amount && v.deposit_amount > 0)
    );
    const committed = booked.reduce(
      (sum, v) => sum + (v.contract_amount || v.deposit_amount || 0),
      0
    );
    const spent = booked.reduce(
      (sum, v) => sum + (v.deposit_paid ? v.deposit_amount || 0 : 0),
      0
    );
    return { booked, committed, spent };
  }, [vendors]);

  // From shopping: received items (spent) + ordered items (committed)
  const shoppingTotals = useMemo(() => {
    const withCost = shoppingItems.filter(
      (s) => (s.actual_cost ?? s.estimated_cost ?? 0) > 0
    );
    const spent = withCost
      .filter((s) => s.status === "received" || s.status === "done")
      .reduce((sum, s) => sum + (s.actual_cost ?? s.estimated_cost ?? 0), 0);
    const committed = withCost.reduce(
      (sum, s) => sum + (s.actual_cost ?? s.estimated_cost ?? 0),
      0
    );
    return { items: withCost, committed, spent };
  }, [shoppingItems]);

  // From custom items
  const customTotals = useMemo(() => {
    const committed = customItems.reduce((sum, b) => sum + b.amount, 0);
    const spent = customItems
      .filter((b) => b.paid)
      .reduce((sum, b) => sum + b.amount, 0);
    return { committed, spent };
  }, [customItems]);

  // Overall totals
  const totalCommitted = vendorTotals.committed + shoppingTotals.committed + customTotals.committed;
  const totalSpent = vendorTotals.spent + shoppingTotals.spent + customTotals.spent;
  const budget = budgetTotal || 0;
  const remaining = budget - totalCommitted;

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
              <span className="font-medium text-emerald-700">{formatCurrency(totalSpent)}</span> spent
              {totalSpent > 0 && (
                budget - totalSpent >= 0 ? (
                  <>
                    <span className="text-muted-foreground/50"> · </span>
                    <span className="font-medium text-foreground/80">{formatCurrency(budget - totalSpent)}</span> left
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground/50"> · </span>
                    <span className="font-medium text-red-700">{formatCurrency(Math.abs(budget - totalSpent))}</span> over
                  </>
                )
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
              {formatCurrency(vendorTotals.committed)}
            </span>
          </button>

          {expandedSections.has("vendors") && (
            vendorTotals.booked.length > 0 ? (
              <div className="space-y-2">
                {vendorTotals.booked.map((vendor) => {
                  // Use contract amount if set, otherwise fall back to deposit amount
                  const totalAmount = vendor.contract_amount || vendor.deposit_amount || 0;
                  const deposit = vendor.deposit_paid ? vendor.deposit_amount || 0 : 0;
                  const balance = totalAmount - deposit;
                  const paidPercent = totalAmount > 0 ? Math.round((deposit / totalAmount) * 100) : 0;
                  const hasFullContract = vendor.contract_amount && vendor.contract_amount > 0;
                  const category = VENDOR_TYPE_TO_CATEGORY[vendor.type];
                  return (
                    <Link
                      key={vendor.id}
                      href={`/vendors/${vendor.id}`}
                      className="block py-2.5 px-3 -mx-3 rounded-lg hover:bg-muted/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{vendor.company_name}</span>
                            <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                              {category}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-foreground/80 tabular-nums">
                            {formatCurrency(deposit)} <span className="text-muted-foreground/60">/ {formatCurrency(totalAmount)}</span>
                          </div>
                          {!hasFullContract && (
                            <div className="text-[10px] text-amber-700 mt-0.5">Contract total not set</div>
                          )}
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors shrink-0" />
                      </div>

                      {/* Progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              paidPercent === 100 ? "bg-emerald-500" : "bg-primary/70"
                            )}
                            style={{ width: `${paidPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground tabular-nums w-10 text-right">
                          {paidPercent}%
                        </span>
                      </div>

                      {/* Status line */}
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {paidPercent === 100 ? (
                          <span className="text-emerald-700">Paid in full</span>
                        ) : deposit > 0 ? (
                          <>
                            <span className="text-emerald-700">{formatCurrency(deposit)} paid</span>
                            <span className="text-muted-foreground/50"> · </span>
                            <span>{formatCurrency(balance)} due</span>
                            {vendor.balance_due_date && <> {formatDate(vendor.balance_due_date)}</>}
                          </>
                        ) : (
                          <>{formatCurrency(balance)} due{vendor.balance_due_date && <> {formatDate(vendor.balance_due_date)}</>}</>
                        )}
                      </p>
                    </Link>
                  );
                })}
              </div>
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
              {formatCurrency(shoppingTotals.committed)}
            </span>
          </button>

          {expandedSections.has("shopping") && (
            shoppingTotals.items.length > 0 ? (
              <div className="space-y-1">
                {shoppingTotals.items.slice(0, 8).map((item) => {
                  const cost = item.actual_cost ?? item.estimated_cost ?? 0;
                  const isSpent = item.status === "received" || item.status === "done";
                  return (
                    <Link
                      key={item.id}
                      href="/shopping"
                      className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-muted/20 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-foreground">{item.item_name}</span>
                          <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                            {item.category}
                          </span>
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            isSpent ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"
                          )}>
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
                {shoppingTotals.items.length > 8 && (
                  <Link href="/shopping" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1">
                    + {shoppingTotals.items.length - 8} more in Shopping
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
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
              {formatCurrency(customTotals.committed)}
            </span>
          </button>

          {expandedSections.has("custom") && (
            <>
              {customItems.length > 0 && (
                <div className="space-y-1 mb-2">
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

              <Button onClick={openAddDialog} variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 -ml-2">
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
