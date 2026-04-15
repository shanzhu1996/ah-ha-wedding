"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Sparkles,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createClient } from "@/lib/supabase/client";
import { ConfettiCanvas, triggerConfetti } from "@/components/ui/confetti";

type AttirePreference = "dress" | "suit" | "undecided" | null;

const DRESS_ITEMS: { name: string; search: string }[] = [
  { name: "Wedding gown", search: "wedding dress bridal gown" },
  { name: "Veil or headpiece", search: "bridal veil headpiece" },
  { name: "Wedding shoes", search: "bridal wedding shoes" },
  { name: "Comfortable backup flats", search: "foldable ballet flats wedding" },
  { name: "Bridal earrings", search: "bridal earrings wedding jewelry" },
  { name: "Bridal necklace", search: "bridal necklace Etsy" },
  { name: "Hair accessories", search: "bridal hair comb pins" },
  { name: "Garter", search: "wedding garter Etsy" },
  { name: "Getting-ready robe", search: "bride getting ready robe satin" },
  { name: "Bridal undergarments", search: "strapless bra shapewear bridal" },
  { name: "Dress hanger (for photos)", search: "personalized bridal dress hanger" },
  { name: "Something old/new/borrowed/blue", search: "something blue bridal charm" },
];

const SUIT_ITEMS: { name: string; search: string }[] = [
  { name: "Suit or tuxedo", search: "groom wedding suit" },
  { name: "Dress shirt", search: "men's white dress shirt wedding" },
  { name: "Tie or bow tie", search: "groom tie bow tie wedding" },
  { name: "Cufflinks", search: "wedding cufflinks groom" },
  { name: "Dress shoes", search: "men's dress shoes wedding" },
  { name: "Belt or suspenders", search: "groom belt suspenders" },
  { name: "Pocket square", search: "pocket square wedding" },
  { name: "Getting-ready outfit", search: "" },
];

function getAttireItems(attire: AttirePreference): { name: string; search: string }[] {
  if (attire === "dress") return DRESS_ITEMS;
  if (attire === "suit") return SUIT_ITEMS;
  // undecided or null: show both combined
  return [...DRESS_ITEMS, ...SUIT_ITEMS];
}

const STATIC_CATEGORIES = [
  "Stationery",
  "Ceremony",
  "Cocktail Hour",
  "Reception Decor",
  "Welcome Table",
  "Signage",
  "Rentals",
  "Welcome Bags",
  "Gifts",
];

function getCategories(partner1Name: string, partner2Name: string): string[] {
  return [
    `${partner1Name}'s Attire`,
    `${partner2Name}'s Attire`,
    ...STATIC_CATEGORIES,
  ];
}

function getDefaultItems(
  partner1Name: string,
  partner2Name: string,
  partner1Attire: AttirePreference,
  partner2Attire: AttirePreference,
): Record<string, { name: string; search: string }[]> {
  return {
    [`${partner1Name}'s Attire`]: getAttireItems(partner1Attire),
    [`${partner2Name}'s Attire`]: getAttireItems(partner2Attire),
    "Stationery": [
      { name: "Save-the-dates", search: "save the date cards Etsy" },
      { name: "Wedding invitations", search: "wedding invitation suite Etsy" },
      { name: "RSVP cards + envelopes", search: "RSVP cards wedding" },
      { name: "Detail / enclosure cards", search: "wedding detail cards" },
      { name: "Postage stamps", search: "USPS wedding stamps" },
      { name: "Thank-you cards", search: "wedding thank you cards" },
    ],
    "Ceremony": [
      { name: "Welcome sign + easel", search: "wedding welcome sign acrylic Etsy" },
      { name: "Guest book + pen", search: "wedding guest book alternative" },
      { name: "Card box", search: "wedding card box lock Etsy" },
      { name: "Ceremony arch/arbor decor", search: "wedding arch decor" },
      { name: "Aisle runner", search: "wedding aisle runner" },
      { name: "Unity ceremony items", search: "unity candle sand ceremony set" },
      { name: "Ring pillow or ring box", search: "ring bearer pillow box" },
      { name: "Flower girl basket + petals", search: "flower girl basket petals" },
      { name: "Programs", search: "wedding ceremony programs" },
      { name: "Reserved seating signs", search: "reserved wedding sign" },
      { name: "Unplugged ceremony sign", search: "unplugged ceremony sign" },
    ],
    "Cocktail Hour": [
      { name: "Signature cocktail sign", search: "signature cocktail sign wedding" },
      { name: "Bar menu sign", search: "bar menu sign wedding" },
      { name: "Photo booth props", search: "wedding photo booth props" },
      { name: "Lawn games", search: "wedding lawn games cornhole" },
    ],
    "Reception Decor": [
      { name: "Centerpieces", search: "wedding centerpiece" },
      { name: "Candles + holders", search: "wedding candles votive holders bulk" },
      { name: "Table numbers", search: "wedding table numbers acrylic Etsy" },
      { name: "Table linens", search: "wedding table runner linen" },
      { name: "Napkins", search: "wedding cloth napkins" },
      { name: "Charger plates", search: "wedding charger plates gold" },
      { name: "Place cards", search: "wedding place cards Etsy" },
      { name: "Menu cards", search: "wedding menu cards" },
      { name: "Cake topper", search: "wedding cake topper Etsy" },
      { name: "Cake cutting set", search: "wedding cake cutting set" },
      { name: "Cake stand", search: "wedding cake stand" },
      { name: "Toasting flutes", search: "wedding toasting glasses" },
      { name: "Sweetheart table decor", search: "sweetheart table decor" },
      { name: "String lights", search: "string lights wedding reception" },
      { name: "Wedding favors", search: "wedding favors" },
      { name: "Sparklers / exit items", search: "wedding sparklers send off" },
    ],
    "Welcome Table": [
      { name: "Welcome sign", search: "wedding welcome sign" },
      { name: "Framed photos", search: "gold photo frames wedding" },
      { name: "Escort card display", search: "escort card display wedding" },
      { name: "Memorial table items", search: "in loving memory wedding frame" },
    ],
    "Signage": [
      { name: "Seating chart display", search: "wedding seating chart sign" },
      { name: "Hashtag sign", search: "wedding hashtag sign" },
      { name: "Directional signs", search: "wedding directional signs" },
      { name: "Cards & gifts sign", search: "cards and gifts sign wedding" },
      { name: "Guest book sign", search: "guest book sign wedding" },
    ],
    "Rentals": [
      { name: "Tables", search: "" },
      { name: "Chairs", search: "" },
      { name: "Place settings (china, flatware, glassware)", search: "" },
      { name: "Dance floor", search: "" },
      { name: "Tent / canopy", search: "" },
      { name: "Lighting (uplights, chandeliers)", search: "" },
      { name: "Lounge furniture", search: "" },
      { name: "Audio equipment", search: "" },
    ],
    "Welcome Bags": [
      { name: "Tote bags", search: "wedding welcome bag tote" },
      { name: "Water bottles", search: "personalized water bottle labels wedding" },
      { name: "Snacks & local treats", search: "" },
      { name: "Itinerary cards", search: "wedding weekend itinerary card" },
      { name: "Hangover kit items", search: "wedding hangover kit supplies" },
    ],
    "Gifts": [
      { name: "Wedding party gifts", search: "wedding party gift box set" },
      { name: "Parents gifts", search: "parent gift wedding" },
      { name: "Flower girl gift", search: "flower girl gift" },
      { name: "Ring bearer gift", search: "ring bearer gift" },
    ],
  };
}

const statusColors: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-700",
  ordered: "bg-blue-100 text-blue-700",
  received: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
};

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
}

interface ShoppingManagerProps {
  items: ShoppingItem[];
  weddingId: string;
  weddingStyle: string | null;
  partner1Name: string;
  partner2Name: string;
  partner1Attire: AttirePreference;
  partner2Attire: AttirePreference;
}

export function ShoppingManager({ items: initialItems, weddingId, weddingStyle, partner1Name, partner2Name, partner1Attire, partner2Attire }: ShoppingManagerProps) {
  const router = useRouter();
  const CATEGORIES = getCategories(partner1Name, partner2Name);
  const DEFAULT_ITEMS = getDefaultItems(partner1Name, partner2Name, partner1Attire, partner2Attire);
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("grouped");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(CATEGORIES.length > 0 ? [CATEGORIES[0]] : [])
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [generating, setGenerating] = useState(false);
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
  const [notes, setNotes] = useState("");

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

  const totalEstCost = initialItems.reduce((s, i) => s + (Number(i.estimated_cost) || 0), 0);
  const totalActualCost = initialItems.reduce((s, i) => s + (Number(i.actual_cost) || 0), 0);

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

    return (
      <div
        key={item.id}
        className={`flex items-center gap-3 p-3 border rounded-lg group hover:bg-muted/30 ${
          isDone ? "bg-green-50/60" : ""
        }`}
      >
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

        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>
            {item.item_name}
          </span>
          {item.search_terms && (
            <p className="text-xs text-muted-foreground truncate">
              Search: {item.search_terms}
            </p>
          )}
        </div>

        <Badge variant="outline" className="text-xs hidden sm:inline-flex">
          {item.category}
        </Badge>

        {(item.estimated_cost || item.actual_cost) && (
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

  async function generateDefaults() {
    setGenerating(true);
    const supabase = createClient();

    const rows: Array<{
      wedding_id: string;
      category: string;
      item_name: string;
      search_terms: string | null;
      status: string;
      quantity: number;
    }> = [];

    for (const [cat, items] of Object.entries(DEFAULT_ITEMS)) {
      for (const item of items) {
        // Skip if already exists
        if (initialItems.some((i) => i.category === cat && i.item_name === item.name)) continue;
        rows.push({
          wedding_id: weddingId,
          category: cat,
          item_name: item.name,
          search_terms: item.search || null,
          status: "not_started",
          quantity: 1,
        });
      }
    }

    if (rows.length > 0) {
      await supabase.from("shopping_items").insert(rows);
    }
    setGenerating(false);
    router.refresh();
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
    setNotes("");
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
    setNotes(item.notes || "");
    setShowDialog(true);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
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
    };
    if (editingItem) {
      await supabase.from("shopping_items").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("shopping_items").insert(payload);
    }
    setSaving(false);
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
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
        <Button variant="outline" onClick={generateDefaults} disabled={generating} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {generating ? "Generating..." : "Auto-Fill Defaults"}
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

      {/* View Mode Toggle */}
      <div className="flex gap-2 flex-wrap items-center">
        <Button
          variant={viewMode === "grouped" ? "default" : "outline"}
          size="sm"
          onClick={() => { setViewMode("grouped"); setActiveCategory("all"); }}
        >
          By Category
        </Button>
        <Button
          variant={viewMode === "flat" && activeCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => { setViewMode("flat"); setActiveCategory("all"); }}
        >
          All ({initialItems.length})
        </Button>
        {viewMode === "flat" && categoryCounts.map((cc) => (
          <Button
            key={cc.category}
            variant={activeCategory === cc.category ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cc.category)}
          >
            {cc.category} ({cc.done}/{cc.total})
          </Button>
        ))}
      </div>

      {/* Items List */}
      {initialItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Click &ldquo;Auto-Fill Defaults&rdquo; to populate a comprehensive shopping list.
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
                <Select value={category} onValueChange={(v) => setCategory(v ?? CATEGORIES[0])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>
            <div className="space-y-2">
              <Label>Vendor / Source</Label>
              <Input value={vendorSource} onChange={(e) => setVendorSource(e.target.value)} />
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
