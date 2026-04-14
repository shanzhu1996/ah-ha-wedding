"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  DollarSign,
  TrendingUp,
  CreditCard,
  PiggyBank,
  CalendarClock,
  Download,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import type { BudgetItemType, VendorType } from "@/types/database";

// --- Types ---

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

interface BudgetDashboardProps {
  budgetItems: BudgetItem[];
  vendors: Vendor[];
  weddingId: string;
  budgetTotal: number | null;
}

// --- Constants ---

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

const ITEM_TYPES: { value: BudgetItemType; label: string }[] = [
  { value: "deposit", label: "Deposit" },
  { value: "balance", label: "Balance" },
  { value: "tip", label: "Tip" },
  { value: "purchase", label: "Purchase" },
];

const TIP_SUGGESTIONS = [
  { role: "Photographer", range: "10-20%", low: 0.1, high: 0.2 },
  { role: "DJ/Band", range: "10-15%", low: 0.1, high: 0.15 },
  { role: "Hair & Makeup", range: "15-20%", low: 0.15, high: 0.2 },
  { role: "Coordinator", range: "15-20%", low: 0.15, high: 0.2 },
  { role: "Caterer staff", range: "15-20%", low: 0.15, high: 0.2 },
  { role: "Officiant", range: "$50-100 flat", low: 0, high: 0 },
  { role: "Transportation", range: "15-20%", low: 0.15, high: 0.2 },
];

const VENDOR_TYPE_TO_TIP_ROLE: Partial<Record<VendorType, string>> = {
  photographer: "Photographer",
  videographer: "Photographer",
  dj: "DJ/Band",
  band: "DJ/Band",
  hair_makeup: "Hair & Makeup",
  coordinator: "Coordinator",
  caterer: "Caterer staff",
  officiant: "Officiant",
  transportation: "Transportation",
};

// --- Helpers ---

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
    year: "numeric",
  });
}

// --- Component ---

export function BudgetDashboard({
  budgetItems,
  vendors,
  weddingId,
  budgetTotal,
}: BudgetDashboardProps) {
  const router = useRouter();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  // Add form state
  const [formCategory, setFormCategory] = useState<string>("Venue");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPaid, setFormPaid] = useState(false);
  const [formItemType, setFormItemType] = useState<BudgetItemType>("purchase");

  // --- Computed values ---

  const totalSpent = useMemo(
    () =>
      budgetItems
        .filter((b) => b.paid)
        .reduce((sum, b) => sum + Number(b.amount), 0),
    [budgetItems]
  );

  const projectedTotal = useMemo(
    () => budgetItems.reduce((sum, b) => sum + Number(b.amount), 0),
    [budgetItems]
  );

  const budget = budgetTotal ?? 0;
  const remaining = budget - totalSpent;

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { spent: number; projected: number }> = {};
    for (const cat of CATEGORIES) {
      map[cat] = { spent: 0, projected: 0 };
    }
    for (const item of budgetItems) {
      const cat = CATEGORIES.find(
        (c) => c.toLowerCase() === item.category.toLowerCase()
      );
      const key = cat || "Other";
      if (!map[key]) map[key] = { spent: 0, projected: 0 };
      map[key].projected += Number(item.amount);
      if (item.paid) map[key].spent += Number(item.amount);
    }
    return Object.entries(map)
      .filter(([, v]) => v.projected > 0)
      .sort((a, b) => b[1].projected - a[1].projected);
  }, [budgetItems]);

  const upcomingPayments = useMemo(
    () =>
      budgetItems
        .filter((b) => b.due_date)
        .sort(
          (a, b) =>
            new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
        ),
    [budgetItems]
  );

  const vendorTips = useMemo(() => {
    return vendors
      .filter((v) => VENDOR_TYPE_TO_TIP_ROLE[v.type] && v.contract_amount)
      .map((v) => {
        const tipRole = VENDOR_TYPE_TO_TIP_ROLE[v.type]!;
        const suggestion = TIP_SUGGESTIONS.find((t) => t.role === tipRole);
        const amount = Number(v.contract_amount);
        const isFlat = suggestion?.low === 0 && suggestion?.high === 0;
        return {
          vendor: v,
          role: tipRole,
          range: suggestion?.range || "",
          lowTip: isFlat ? 50 : Math.round(amount * (suggestion?.low || 0)),
          highTip: isFlat ? 100 : Math.round(amount * (suggestion?.high || 0)),
        };
      });
  }, [vendors]);

  // --- Handlers ---

  function resetForm() {
    setFormCategory("Venue");
    setFormDescription("");
    setFormAmount("");
    setFormDueDate("");
    setFormPaid(false);
    setFormItemType("purchase");
  }

  async function handleAddItem() {
    if (!formDescription || !formAmount) return;
    setSaving(true);
    const supabase = createClient();

    await supabase.from("budget_items").insert({
      wedding_id: weddingId,
      category: formCategory,
      description: formDescription,
      amount: parseFloat(formAmount),
      due_date: formDueDate || null,
      paid: formPaid,
      item_type: formItemType,
      vendor_id: null,
      shopping_item_id: null,
    });

    setSaving(false);
    setShowAddDialog(false);
    resetForm();
    router.refresh();
  }

  async function togglePaid(item: BudgetItem) {
    const supabase = createClient();
    await supabase
      .from("budget_items")
      .update({ paid: !item.paid })
      .eq("id", item.id);
    router.refresh();
  }

  async function deleteItem(id: string) {
    const supabase = createClient();
    await supabase.from("budget_items").delete().eq("id", id);
    router.refresh();
  }

  async function importFromVendors() {
    setImporting(true);
    const supabase = createClient();

    // Get existing vendor-linked budget items to avoid duplicates
    const { data: existing } = await supabase
      .from("budget_items")
      .select("vendor_id, item_type")
      .eq("wedding_id", weddingId)
      .not("vendor_id", "is", null);

    const existingSet = new Set(
      (existing || []).map((e) => `${e.vendor_id}-${e.item_type}`)
    );

    const toInsert: Array<{
      wedding_id: string;
      category: string;
      description: string;
      amount: number;
      due_date: string | null;
      paid: boolean;
      item_type: BudgetItemType;
      vendor_id: string;
      shopping_item_id: null;
    }> = [];

    const typeToCategory: Partial<Record<VendorType, string>> = {
      venue: "Venue",
      caterer: "Catering",
      photographer: "Photography",
      videographer: "Videography",
      florist: "Flowers",
      baker: "Catering",
      hair_makeup: "Beauty",
      dj: "Music/DJ",
      band: "Music/DJ",
      coordinator: "Other",
      rentals: "Rentals",
      transportation: "Transportation",
      photo_booth: "Other",
      officiant: "Other",
      other: "Other",
    };

    for (const vendor of vendors) {
      if (!vendor.contract_amount) continue;
      const category = typeToCategory[vendor.type] || "Other";

      // Add deposit if exists
      if (
        vendor.deposit_amount &&
        !existingSet.has(`${vendor.id}-deposit`)
      ) {
        toInsert.push({
          wedding_id: weddingId,
          category,
          description: `${vendor.company_name} - Deposit`,
          amount: Number(vendor.deposit_amount),
          due_date: null,
          paid: vendor.deposit_paid,
          item_type: "deposit",
          vendor_id: vendor.id,
          shopping_item_id: null,
        });
      }

      // Add balance
      const balance =
        Number(vendor.contract_amount) - (Number(vendor.deposit_amount) || 0);
      if (balance > 0 && !existingSet.has(`${vendor.id}-balance`)) {
        toInsert.push({
          wedding_id: weddingId,
          category,
          description: `${vendor.company_name} - Balance`,
          amount: balance,
          due_date: vendor.balance_due_date,
          paid: false,
          item_type: "balance",
          vendor_id: vendor.id,
          shopping_item_id: null,
        });
      }
    }

    if (toInsert.length > 0) {
      await supabase.from("budget_items").insert(toInsert);
    }

    setImporting(false);
    router.refresh();
  }

  // --- Budget usage percentage ---
  const budgetUsedPercent = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="tips">Tip Calculator</TabsTrigger>
      </TabsList>

      {/* ============ OVERVIEW TAB ============ */}
      <TabsContent value="overview">
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total Budget
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatCurrency(budget)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatCurrency(totalSpent)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <PiggyBank className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p
                      className={`text-lg font-semibold tabular-nums ${remaining < 0 ? "text-destructive" : ""}`}
                    >
                      {formatCurrency(remaining)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Projected Total
                    </p>
                    <p
                      className={`text-lg font-semibold tabular-nums ${projectedTotal > budget && budget > 0 ? "text-destructive" : ""}`}
                    >
                      {formatCurrency(projectedTotal)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget progress bar */}
          {budget > 0 && (
            <Card>
              <CardContent className="p-4">
                <Progress value={budgetUsedPercent}>
                  <ProgressLabel>Budget Used</ProgressLabel>
                  <ProgressValue>
                    {() => `${Math.round(budgetUsedPercent)}%`}
                  </ProgressValue>
                </Progress>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                resetForm();
                setShowAddDialog(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Budget Item
            </Button>
            <Button
              variant="outline"
              onClick={importFromVendors}
              disabled={importing || vendors.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {importing ? "Importing..." : "Import from Vendors"}
            </Button>
          </div>

          {/* Category Breakdown */}
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-4">Spending by Category</h2>
              {categoryBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No budget items yet. Add items to see your spending breakdown.
                </p>
              ) : (
                <div className="space-y-4">
                  {categoryBreakdown.map(([category, data]) => {
                    const pct =
                      projectedTotal > 0
                        ? (data.projected / projectedTotal) * 100
                        : 0;
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium">{category}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {formatCurrency(data.spent)} /{" "}
                            {formatCurrency(data.projected)}
                          </span>
                        </div>
                        <Progress value={pct}>
                          <ProgressLabel className="sr-only">
                            {category}
                          </ProgressLabel>
                        </Progress>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ============ PAYMENTS TAB ============ */}
      <TabsContent value="payments">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Payment Timeline</h2>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setShowAddDialog(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>

          {upcomingPayments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No payments with due dates yet.</p>
                <p className="text-xs mt-1">
                  Add budget items with due dates to see your payment timeline.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcomingPayments.map((item) => {
                const isPast =
                  !item.paid &&
                  item.due_date &&
                  new Date(item.due_date) < new Date();
                return (
                  <Card
                    key={item.id}
                    className={item.paid ? "opacity-60" : ""}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => togglePaid(item)}
                          className={`flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            item.paid
                              ? "bg-green-500 border-green-500 text-white"
                              : "border-muted-foreground/30 hover:border-primary"
                          }`}
                        >
                          {item.paid && <Check className="h-3.5 w-3.5" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium text-sm ${item.paid ? "line-through" : ""}`}
                            >
                              {item.description}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">
                              {item.item_type}
                            </Badge>
                            {isPast && (
                              <Badge
                                variant="destructive"
                                className="text-[10px]"
                              >
                                Overdue
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>{item.category}</span>
                            {item.due_date && (
                              <>
                                <span>-</span>
                                <span>{formatDate(item.due_date)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <span className="font-semibold text-sm tabular-nums">
                          {formatCurrency(Number(item.amount))}
                        </span>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteItem(item.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Items without due dates */}
          {budgetItems.filter((b) => !b.due_date).length > 0 && (
            <>
              <h3 className="font-medium text-sm text-muted-foreground pt-4">
                No due date
              </h3>
              <div className="space-y-2">
                {budgetItems
                  .filter((b) => !b.due_date)
                  .map((item) => (
                    <Card
                      key={item.id}
                      className={item.paid ? "opacity-60" : ""}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => togglePaid(item)}
                            className={`flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                              item.paid
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-muted-foreground/30 hover:border-primary"
                            }`}
                          >
                            {item.paid && <Check className="h-3.5 w-3.5" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-medium text-sm ${item.paid ? "line-through" : ""}`}
                              >
                                {item.description}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {item.item_type}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {item.category}
                            </span>
                          </div>

                          <span className="font-semibold text-sm tabular-nums">
                            {formatCurrency(Number(item.amount))}
                          </span>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteItem(item.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </>
          )}
        </div>
      </TabsContent>

      {/* ============ TIPS TAB ============ */}
      <TabsContent value="tips">
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold">Vendor Tip Calculator</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Suggested tip amounts based on industry standards and your vendor
              contracts.
            </p>
          </div>

          {/* General reference table */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-sm mb-3">
                Standard Tip Guidelines
              </h3>
              <div className="divide-y">
                {TIP_SUGGESTIONS.map((tip) => (
                  <div
                    key={tip.role}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span>{tip.role}</span>
                    <Badge variant="secondary">{tip.range}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Personalized tips from vendors */}
          {vendorTips.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-sm mb-3">
                  Your Vendor Tip Estimates
                </h3>
                <div className="divide-y">
                  {vendorTips.map((t) => (
                    <div
                      key={t.vendor.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {t.vendor.company_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.role} - Contract:{" "}
                          {formatCurrency(Number(t.vendor.contract_amount))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums">
                          {formatCurrency(t.lowTip)} -{" "}
                          {formatCurrency(t.highTip)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {t.range}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 flex items-center justify-between text-sm font-semibold">
                    <span>Estimated Total Tips</span>
                    <span className="tabular-nums">
                      {formatCurrency(
                        vendorTips.reduce((sum, t) => sum + t.lowTip, 0)
                      )}{" "}
                      -{" "}
                      {formatCurrency(
                        vendorTips.reduce((sum, t) => sum + t.highTip, 0)
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {vendorTips.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p className="text-sm">
                  Add vendors with contract amounts to see personalized tip
                  estimates.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      {/* ============ ADD BUDGET ITEM DIALOG ============ */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Budget Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formCategory}
                onValueChange={(v) => setFormCategory(v ?? "Venue")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="e.g., Venue deposit"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount ($) *</Label>
                <Input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="1500"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Item Type</Label>
              <Select
                value={formItemType}
                onValueChange={(v) =>
                  setFormItemType((v ?? "purchase") as BudgetItemType)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="formPaid"
                checked={formPaid}
                onCheckedChange={(v) => setFormPaid(!!v)}
              />
              <Label htmlFor="formPaid" className="font-normal">
                Already paid
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddItem}
                disabled={saving || !formDescription || !formAmount}
              >
                {saving ? "Saving..." : "Add Item"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
