"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Edit,
  Search,
  DollarSign,
  Circle,
  Clock,
  Package,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CalendarDays,
  HandCoins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ConfettiCanvas, triggerConfetti } from "@/components/ui/confetti";
import {
  DRESS_ITEMS,
  SUIT_ITEMS,
  STATIC_CATEGORIES,
  getCategories,
  getDefaultItems,
  type AttirePreference,
} from "@/lib/shopping/defaults";

const statusColors: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-700",
  ordered: "bg-blue-100 text-blue-700",
  received: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
};

/**
 * Build a Google search URL for the given terms. Preserved hint keywords
 * (etsy, amazon, target) keep the intent visible in the results page.
 */
function buildSearchUrl(terms: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(terms)}`;
}

/**
 * Format a due-date string into a relative chip label + tone bucket.
 * Past = overdue (red), <=7 days = urgent (amber), otherwise soft (muted).
 */
function formatDueDate(
  dateStr: string | null
): { label: string; full: string; tone: "overdue" | "urgent" | "soft" } | null {
  if (!dateStr) return null;
  const due = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
  );
  const full = due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return {
      label: `${days}d overdue`,
      full,
      tone: "overdue",
    };
  }
  if (diffDays === 0) return { label: "Due today", full, tone: "urgent" };
  if (diffDays === 1) return { label: "Due tomorrow", full, tone: "urgent" };
  if (diffDays <= 7) return { label: `Due in ${diffDays}d`, full, tone: "urgent" };
  const short = due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return { label: short, full, tone: "soft" };
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  not_started: { label: "Not Started", icon: Circle },
  ordered: { label: "Ordered", icon: Clock },
  received: { label: "Received", icon: Package },
  done: { label: "Done", icon: CheckCircle2 },
};

interface ShoppingItem {
  id: string;
  category: string;
  item_name: string;
  status: string;
  quantity: number;
  estimated_cost: number | null;
  actual_cost: number | null;
  search_terms: string | null;
  vendor_source: string | null;
  notes: string | null;
  due_date: string | null;
  covered_by_vendor: boolean;
  covered_by_vendor_id: string | null;
}

interface VendorRef {
  id: string;
  type: string;
  company_name: string;
}

interface ShoppingManagerProps {
  items: ShoppingItem[];
  vendors: VendorRef[];
  weddingId: string;
  weddingStyle: string | null;
  partner1Name: string;
  partner2Name: string;
  partner1Attire: AttirePreference;
  partner2Attire: AttirePreference;
  budgetTotal: number | null;
}

export function ShoppingManager({ items: initialItems, vendors, weddingId, weddingStyle, partner1Name, partner2Name, partner1Attire, partner2Attire, budgetTotal }: ShoppingManagerProps) {
  const router = useRouter();
  const BUILT_IN_CATEGORIES = getCategories(partner1Name, partner2Name);
  const DEFAULT_ITEMS = getDefaultItems(partner1Name, partner2Name, partner1Attire, partner2Attire);
  // Union built-ins with any categories the couple has added on items.
  // Couples can type a new category name in the Add/Edit dialog — it
  // materializes as soon as the first item is saved with that name.
  const CATEGORIES = [
    ...BUILT_IN_CATEGORIES,
    ...Array.from(
      new Set(
        initialItems
          .map((i) => i.category)
          .filter((c) => c && !BUILT_IN_CATEGORIES.includes(c))
      )
    ),
  ];
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("grouped");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(CATEGORIES.length > 0 ? [CATEGORIES[0]] : [])
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Form
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [status, setStatus] = useState("not_started");
  const [quantity, setQuantity] = useState("1");
  const [estCost, setEstCost] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [searchTerms, setSearchTerms] = useState("");
  const [vendorSource, setVendorSource] = useState("");
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [coveredByVendor, setCoveredByVendor] = useState(false);

  // Category stats
  const categoryCounts = CATEGORIES.map((cat) => {
    const catItems = initialItems.filter((i) => i.category === cat);
    const done = catItems.filter((i) => i.status === "done" || i.status === "received").length;
    return { category: cat, total: catItems.length, done };
  });

  const totalDone = initialItems.filter((i) => i.status === "done" || i.status === "received").length;
  const overallProgress = initialItems.length
    ? Math.round((totalDone / initialItems.length) * 100)
    : 0;

  // Vendor-covered items don't count toward the couple's spend.
  const couplePaidItems = initialItems.filter((i) => !i.covered_by_vendor);
  const totalEstCost = couplePaidItems.reduce((s, i) => s + (Number(i.estimated_cost) || 0), 0);
  const totalActualCost = couplePaidItems.reduce((s, i) => s + (Number(i.actual_cost) || 0), 0);
  const coveredCount = initialItems.filter((i) => i.covered_by_vendor).length;

  const filtered = initialItems.filter((item) => {
    const matchesCat = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch = item.item_name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  function renderItemRow(item: ShoppingItem) {
    const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.not_started;
    const StatusIcon = statusConf.icon;
    const isDone = item.status === "done";
    const isCovered = item.covered_by_vendor;
    const due = formatDueDate(item.due_date);

    return (
      <div
        key={item.id}
        className={cn(
          "flex items-center gap-3 p-3 border rounded-lg group hover:bg-muted/30",
          isDone && !isCovered && "bg-green-50/60",
          isCovered && "bg-muted/40 border-dashed"
        )}
      >
        {isCovered ? (
          // Covered-by-vendor items aren't bought by the couple — no status
          // dropdown, just a static badge + vendor.
          <span className="inline-flex items-center gap-1.5 w-32 text-xs text-muted-foreground shrink-0">
            <HandCoins className="h-3.5 w-3.5 text-primary/70" />
            Covered
          </span>
        ) : (
          <Select
            value={item.status}
            onValueChange={(v) => quickStatusUpdate(item.id, v ?? "not_started")}
          >
            <SelectTrigger className="w-32 h-7 text-xs">
              <span className="flex items-center gap-1.5">
                <StatusIcon className="h-3.5 w-3.5" />
                {statusConf.label}
              </span>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([value, conf]) => {
                const Icon = conf.icon;
                return (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      {conf.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-sm font-medium",
                isDone && !isCovered && "line-through text-muted-foreground",
                isCovered && "text-muted-foreground"
              )}
            >
              {item.item_name}
            </span>
            {isCovered &&
              (item.covered_by_vendor_id ? (
                <Link
                  href={`/vendors/${item.covered_by_vendor_id}`}
                  className="text-[11px] text-muted-foreground/70 hover:text-primary transition-colors inline-flex items-center gap-0.5"
                >
                  · by {item.vendor_source || "vendor"}
                  <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              ) : item.vendor_source ? (
                <span className="text-[11px] text-muted-foreground/70">
                  · by {item.vendor_source}
                </span>
              ) : null)}
          </div>
          {item.search_terms && !isCovered && (
            <a
              href={buildSearchUrl(item.search_terms)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors truncate max-w-full"
              title="Search on Google"
            >
              <Search className="h-3 w-3 shrink-0" />
              <span className="truncate">{item.search_terms}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
            </a>
          )}
        </div>

        {due && !isCovered && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full shrink-0",
              due.tone === "overdue" && "bg-destructive/10 text-destructive",
              due.tone === "urgent" && "bg-amber-500/10 text-amber-700",
              due.tone === "soft" && "bg-muted/60 text-muted-foreground/80"
            )}
            title={`Due ${due.full}`}
          >
            <CalendarDays className="h-3 w-3" />
            {due.label}
          </span>
        )}

        <Badge variant="outline" className="text-xs hidden sm:inline-flex">
          {item.category}
        </Badge>

        {!isCovered && (item.estimated_cost || item.actual_cost) && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            ${Number(item.actual_cost || item.estimated_cost).toLocaleString()}
          </span>
        )}

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteItem(item.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  function resetForm() {
    setItemName("");
    setCategory(CATEGORIES[0]);
    setStatus("not_started");
    setQuantity("1");
    setEstCost("");
    setActualCost("");
    setSearchTerms("");
    setVendorSource("");
    setVendorId(null);
    setNotes("");
    setDueDate("");
    setCoveredByVendor(false);
    setEditingItem(null);
  }

  function openEdit(item: ShoppingItem) {
    setEditingItem(item);
    setItemName(item.item_name);
    setCategory(item.category);
    setStatus(item.status);
    setQuantity(item.quantity.toString());
    setEstCost(item.estimated_cost?.toString() || "");
    setActualCost(item.actual_cost?.toString() || "");
    setSearchTerms(item.search_terms || "");
    setVendorSource(item.vendor_source || "");
    setVendorId(item.covered_by_vendor_id || null);
    setNotes(item.notes || "");
    setDueDate(item.due_date || "");
    setCoveredByVendor(!!item.covered_by_vendor);
    setShowDialog(true);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    // Auto-link vendor_source to a booked vendor when the typed name
    // matches (case-insensitive). This keeps the FK in sync as couples
    // type — no separate picker needed.
    const resolvedVendorId = (() => {
      if (!coveredByVendor) return null;
      if (vendorId) return vendorId;
      const match = vendors.find(
        (v) =>
          v.company_name?.trim().toLowerCase() ===
          vendorSource.trim().toLowerCase()
      );
      return match?.id ?? null;
    })();
    const payload = {
      wedding_id: weddingId,
      category,
      item_name: itemName,
      status,
      quantity: parseInt(quantity) || 1,
      estimated_cost: estCost ? parseFloat(estCost) : null,
      actual_cost: actualCost ? parseFloat(actualCost) : null,
      search_terms: searchTerms || null,
      vendor_source: vendorSource || null,
      notes: notes || null,
      due_date: dueDate || null,
      covered_by_vendor: coveredByVendor,
      covered_by_vendor_id: resolvedVendorId,
    };
    const isEdit = !!editingItem;
    const { error } = isEdit
      ? await supabase.from("shopping_items").update(payload).eq("id", editingItem.id)
      : await supabase.from("shopping_items").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Could not save item", { description: error.message });
      return;
    }
    toast.success(isEdit ? "Item updated" : "Item added");
    setShowDialog(false);
    resetForm();
    router.refresh();
  }

  async function quickStatusUpdate(id: string, newStatus: string) {
    const supabase = createClient();
    await supabase.from("shopping_items").update({ status: newStatus }).eq("id", id);

    // Check if all items are now done/received after this update
    if (newStatus === "done" || newStatus === "received") {
      const remainingIncomplete = initialItems.filter(
        (i) => i.id !== id && i.status !== "done" && i.status !== "received"
      ).length;
      if (remainingIncomplete === 0 && initialItems.length > 0) {
        triggerConfetti();
      }
    }

    router.refresh();
  }

  async function deleteItem(id: string) {
    const supabase = createClient();
    await supabase.from("shopping_items").delete().eq("id", id);
    router.refresh();
  }

  /**
   * Commit the couple's attire choice for partner1 / partner2. Triggered
   * from the inline prompt shown inside an "{Name}'s Attire" category
   * while the couple is still "undecided".
   *
   * Safe-reseed:
   *   - Only deletes built-in default items (matching DRESS/SUIT names)
   *     that are still in default state — never touches custom items or
   *     anything the couple has edited (status / cost / notes).
   *   - Inserts the desired list for the chosen style, skipping names
   *     that are already present.
   */
  async function pickAttire(
    which: "partner1" | "partner2",
    choice: "dress" | "suit" | "mix" | "custom"
  ) {
    const supabase = createClient();
    const column = which === "partner1" ? "partner1_attire" : "partner2_attire";
    const partnerName = which === "partner1" ? partner1Name : partner2Name;
    const categoryName = `${partnerName}'s Attire`;

    const desired =
      choice === "dress"
        ? DRESS_ITEMS
        : choice === "suit"
          ? SUIT_ITEMS
          : choice === "mix"
            ? [...DRESS_ITEMS, ...SUIT_ITEMS]
            : [];
    const desiredNames = new Set(desired.map((d) => d.name));
    const allDefaultNames = new Set(
      [...DRESS_ITEMS, ...SUIT_ITEMS].map((i) => i.name)
    );

    const existing = initialItems.filter((i) => i.category === categoryName);
    const toDelete = existing.filter(
      (i) =>
        allDefaultNames.has(i.item_name) &&
        !desiredNames.has(i.item_name) &&
        i.status === "not_started" &&
        !i.actual_cost &&
        !i.estimated_cost &&
        !i.notes &&
        !i.covered_by_vendor
    );
    const existingNames = new Set(existing.map((i) => i.item_name));
    const toAdd = desired.filter((d) => !existingNames.has(d.name));

    // Persist the choice before mutating items so a mid-way failure
    // doesn't leave an "undecided" wedding with a curated list.
    await supabase
      .from("weddings")
      .update({ [column]: choice })
      .eq("id", weddingId);

    if (toDelete.length > 0) {
      await supabase
        .from("shopping_items")
        .delete()
        .in(
          "id",
          toDelete.map((i) => i.id)
        );
    }
    if (toAdd.length > 0) {
      await supabase.from("shopping_items").insert(
        toAdd.map((d) => ({
          wedding_id: weddingId,
          category: categoryName,
          item_name: d.name,
          search_terms: d.search || null,
          status: "not_started",
          quantity: 1,
        }))
      );
    }

    router.refresh();
  }

  /**
   * Returns the prompt metadata for a given attire category when the
   * couple hasn't committed to a style yet. null otherwise (no prompt).
   */
  function attirePromptFor(
    category: string
  ): { partner: "partner1" | "partner2"; name: string } | null {
    if (
      category === `${partner1Name}'s Attire` &&
      (partner1Attire === "undecided" || partner1Attire === null)
    ) {
      return { partner: "partner1", name: partner1Name };
    }
    if (
      category === `${partner2Name}'s Attire` &&
      (partner2Attire === "undecided" || partner2Attire === null)
    ) {
      return { partner: "partner2", name: partner2Name };
    }
    return null;
  }

  function renderAttirePrompt(
    partner: "partner1" | "partner2",
    name: string
  ) {
    const choices: {
      value: "dress" | "suit" | "mix" | "custom";
      label: string;
      emoji: string;
    }[] = [
      { value: "dress", label: "Dress", emoji: "👗" },
      { value: "suit", label: "Suit", emoji: "🤵" },
      { value: "mix", label: "Mix", emoji: "🎭" },
      { value: "custom", label: "I'll add my own", emoji: "✏️" },
    ];
    return (
      <div className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.04] p-4 mb-3">
        <p className="text-sm font-medium">What will {name} wear?</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">
          Pick a style — we&apos;ll curate a shopping list. You can change
          it anytime.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {choices.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => pickAttire(partner, c.value)}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/70 bg-background text-sm hover:border-primary/60 hover:bg-primary/5 transition-colors text-left"
            >
              <span className="text-base">{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfettiCanvas />
      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Progress</p>
            <div className="text-2xl font-bold mt-1">{overallProgress}%</div>
            <Progress value={overallProgress} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Items</p>
            <div className="text-2xl font-bold mt-1">
              {totalDone} / {initialItems.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Est. Total Cost</p>
            <div className="text-2xl font-bold mt-1">
              ${totalEstCost.toLocaleString()}
            </div>
            {totalActualCost > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Actual: ${totalActualCost.toLocaleString()}
              </p>
            )}
            {coveredCount > 0 && (
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                + {coveredCount} covered by vendors
              </p>
            )}
            {budgetTotal && budgetTotal > 0 && totalEstCost > 0 && (
              <Link
                href="/budget"
                className="text-[11px] text-muted-foreground/70 hover:text-primary transition-colors mt-1 inline-flex items-center gap-1"
              >
                ~{Math.round((totalEstCost / budgetTotal) * 100)}% of $
                {budgetTotal.toLocaleString()} budget · View in Budget ↗
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            className="pl-9 w-52"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* View Mode Toggle — segmented control style so it reads as a view
          switcher, not as a second primary action (was too similar to
          "Add Item"). Category filter buttons stay as outline chips. */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setViewMode("grouped");
              setActiveCategory("all");
            }}
            className={cn(
              "px-3 py-1 rounded-md transition-colors",
              viewMode === "grouped"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            By Category
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("flat");
              setActiveCategory("all");
            }}
            className={cn(
              "px-3 py-1 rounded-md transition-colors",
              viewMode === "flat" && activeCategory === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({initialItems.length})
          </button>
        </div>
        {viewMode === "flat" && (
          <div className="flex gap-2 flex-wrap items-center">
            {categoryCounts.map((cc) => (
              <Button
                key={cc.category}
                variant={activeCategory === cc.category ? "secondary" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cc.category)}
              >
                {cc.category} ({cc.done}/{cc.total})
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Items List */}
      {initialItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Your shopping list is empty. Use + Add Item to start building it.
          </CardContent>
        </Card>
      ) : viewMode === "grouped" ? (
        /* Grouped view with collapsible category sections */
        <div className="space-y-2">
          {categoryCounts
            .filter((cc) => cc.total > 0)
            .map((cc) => {
              const catItems = filtered.filter((i) => i.category === cc.category);
              const isExpanded = expandedCategories.has(cc.category);

              if (search && catItems.length === 0) return null;

              return (
                <Collapsible
                  key={cc.category}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(cc.category)}
                >
                  <CollapsibleTrigger className="flex items-center gap-3 w-full p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors text-left cursor-pointer">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-semibold text-sm flex-1">{cc.category}</span>
                    <span className="text-xs text-muted-foreground">
                      {cc.done}/{cc.total}
                    </span>
                    <Progress value={cc.total > 0 ? (cc.done / cc.total) * 100 : 0} className="w-20 h-1.5" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 mt-2 ml-7">
                      {(() => {
                        const prompt = attirePromptFor(cc.category);
                        return prompt
                          ? renderAttirePrompt(prompt.partner, prompt.name)
                          : null;
                      })()}
                      {catItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No items match your search.</p>
                      ) : (
                        catItems.map((item) => renderItemRow(item))
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No items match your filter.
          </CardContent>
        </Card>
      ) : (
        /* Flat view */
        <div className="space-y-2">
          {filtered.map((item) => renderItemRow(item))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input value={itemName} onChange={(e) => setItemName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  list="shopping-category-suggestions"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Pick or type a new one"
                />
                <datalist id="shopping-category-suggestions">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v ?? "not_started")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([value, conf]) => {
                      const Icon = conf.icon;
                      return (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5" />
                            {conf.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Qty</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Est. Cost ($)</Label>
                <Input type="number" value={estCost} onChange={(e) => setEstCost(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Actual Cost ($)</Label>
                <Input type="number" value={actualCost} onChange={(e) => setActualCost(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Search Terms</Label>
              <Input
                value={searchTerms}
                onChange={(e) => setSearchTerms(e.target.value)}
                placeholder="wedding card box Etsy"
              />
              <p className="text-[11px] text-muted-foreground/70">
                Click the search row on the item to open a Google search.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Vendor / Source</Label>
                <Input
                  list="shopping-vendor-suggestions"
                  value={vendorSource}
                  onChange={(e) => {
                    setVendorSource(e.target.value);
                    // Keep vendorId in sync while typing — picking from
                    // the datalist selects a booked vendor; free text
                    // clears the FK so we don't keep a stale link.
                    const match = vendors.find(
                      (v) =>
                        v.company_name?.trim().toLowerCase() ===
                        e.target.value.trim().toLowerCase()
                    );
                    setVendorId(match?.id ?? null);
                  }}
                  placeholder="Pick a booked vendor or type a source"
                />
                <datalist id="shopping-vendor-suggestions">
                  {vendors.map((v) => (
                    <option key={v.id} value={v.company_name} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="rounded-md border border-dashed border-border/70 bg-muted/30 p-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={coveredByVendor}
                  onCheckedChange={(v) => setCoveredByVendor(v === true)}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Covered by vendor</p>
                  <p className="text-[11px] text-muted-foreground">
                    Check if a booked vendor provides this (e.g., caterer
                    brings napkins). It won&apos;t count toward your spend.
                  </p>
                </div>
              </label>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth remembering — color, SKU, backup plan…"
                className="min-h-[60px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !itemName}>
                {saving ? "Saving..." : editingItem ? "Update" : "Add Item"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
