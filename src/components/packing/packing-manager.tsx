"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Pencil,
  Package,
  Sparkles,
  CheckCircle2,
  Clock,
  Car,
  User,
  ShoppingBag,
  Printer,
  Loader2,
  X,
  Users,
  LayoutGrid,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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

interface PackingItem {
  id: string;
  box_id: string;
  shopping_item_id: string | null;
  item_name: string;
  packed: boolean;
  created_at: string;
}

interface PackingBox {
  id: string;
  wedding_id: string;
  label: string;
  assigned_to: string | null;
  vehicle: string | null;
  delivery_time: string | null;
  delivery_when: string | null;
  sort_order: number;
  created_at: string;
  packing_items: PackingItem[];
}

type DeliveryWhen =
  | "day_before"
  | "morning_of"
  | "afternoon_of"
  | "after_ceremony"
  | "custom"
  | null;

const DELIVERY_WHEN_OPTIONS: {
  value: Exclude<DeliveryWhen, null>;
  label: string;
}[] = [
  { value: "day_before", label: "Day before" },
  { value: "morning_of", label: "Morning of" },
  { value: "afternoon_of", label: "Afternoon of" },
  { value: "after_ceremony", label: "After ceremony" },
  { value: "custom", label: "Custom" },
];

const DELIVERY_WHEN_ORDER: Record<string, number> = {
  day_before: 1,
  morning_of: 2,
  afternoon_of: 3,
  after_ceremony: 4,
  custom: 5,
};

function deliveryWhenLabel(w: string | null): string {
  return (
    DELIVERY_WHEN_OPTIONS.find((o) => o.value === w)?.label ?? ""
  );
}

interface ShoppingItem {
  id: string;
  category: string;
  item_name: string;
  status: string;
}

interface PackingManagerProps {
  boxes: PackingBox[];
  shoppingItems: ShoppingItem[];
  weddingId: string;
  initialEndOfNight: EndOfNightState;
  assigneeSuggestions: { label: string; note: string }[];
}

export interface EndOfNightState {
  checked: string[];
  hidden: string[];
  custom: { id: string; name: string; checked: boolean }[];
}

const DEFAULT_BOXES = [
  "Ceremony",
  "Reception Decor",
  "Signage",
  "Personal Items",
  "Cocktail Hour",
  "Paper Goods",
];

const END_OF_NIGHT_ITEMS = [
  "Card box (with cards/envelopes)",
  "Marriage license",
  "Cake topper",
  "Guest book & pen",
  "Personal items (jewelry, shoes, etc.)",
  "Rental items to return",
];

type ViewMode = "boxes" | "timeline" | "by_person";

export function PackingManager({
  boxes: initialBoxes,
  shoppingItems,
  weddingId,
  initialEndOfNight,
  assigneeSuggestions,
}: PackingManagerProps) {
  const router = useRouter();
  const [showBoxDialog, setShowBoxDialog] = useState(false);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showPullDialog, setShowPullDialog] = useState(false);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [generatingDefaults, setGeneratingDefaults] = useState(false);
  const [view, setView] = useState<ViewMode>("boxes");

  // Box form
  const [boxLabel, setBoxLabel] = useState("");
  const [boxAssignedTo, setBoxAssignedTo] = useState("");
  const [boxVehicle, setBoxVehicle] = useState("");
  const [boxDeliveryWhen, setBoxDeliveryWhen] = useState<string>("");
  const [boxDeliveryTime, setBoxDeliveryTime] = useState("");

  // Item form
  const [itemName, setItemName] = useState("");
  const [itemSource, setItemSource] = useState<"custom" | "shopping">("custom");
  const [selectedShoppingItemId, setSelectedShoppingItemId] = useState("");

  // Pull-from-Shopping dialog state
  const [pullTargetBoxId, setPullTargetBoxId] = useState<string>("");
  const [pullSelected, setPullSelected] = useState<Set<string>>(new Set());
  const [pulling, setPulling] = useState(false);
  const [addCustomEon, setAddCustomEon] = useState("");

  // End-of-night checklist (DB-backed, same pattern as Emergency Kit)
  const [eon, setEon] = useState<EndOfNightState>(initialEndOfNight);
  const [savingEon, setSavingEon] = useState(false);
  const eonSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipInitialEonSave = useRef(true);

  useEffect(() => {
    if (skipInitialEonSave.current) {
      skipInitialEonSave.current = false;
      return;
    }
    if (eonSaveTimeout.current) clearTimeout(eonSaveTimeout.current);
    setSavingEon(true);
    eonSaveTimeout.current = setTimeout(async () => {
      const supabase = createClient();
      await supabase.from("wedding_day_details").upsert(
        {
          wedding_id: weddingId,
          section: "packing_end_of_night",
          data: eon as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "wedding_id,section" }
      );
      setSavingEon(false);
    }, 600);
    return () => {
      if (eonSaveTimeout.current) clearTimeout(eonSaveTimeout.current);
    };
  }, [eon, weddingId]);

  // Progress calculations
  const allItems = initialBoxes.flatMap((b) => b.packing_items);
  const totalPacked = allItems.filter((i) => i.packed).length;
  const totalItems = allItems.length;
  const overallProgress = totalItems
    ? Math.round((totalPacked / totalItems) * 100)
    : 0;

  function resetBoxForm() {
    setBoxLabel("");
    setBoxAssignedTo("");
    setBoxVehicle("");
    setBoxDeliveryWhen("");
    setBoxDeliveryTime("");
  }

  function resetItemForm() {
    setItemName("");
    setItemSource("custom");
    setSelectedShoppingItemId("");
  }

  async function handleSaveBox() {
    if (!boxLabel.trim()) return;
    setCreating(true);
    const supabase = createClient();
    if (editingBoxId) {
      await supabase
        .from("packing_boxes")
        .update({
          label: boxLabel.trim(),
          assigned_to: boxAssignedTo.trim() || null,
          vehicle: boxVehicle.trim() || null,
          delivery_when: boxDeliveryWhen || null,
          delivery_time: boxDeliveryTime.trim() || null,
        })
        .eq("id", editingBoxId);
    } else {
      await supabase.from("packing_boxes").insert({
        wedding_id: weddingId,
        label: boxLabel.trim(),
        assigned_to: boxAssignedTo.trim() || null,
        vehicle: boxVehicle.trim() || null,
        delivery_when: boxDeliveryWhen || null,
        delivery_time: boxDeliveryTime.trim() || null,
        sort_order: initialBoxes.length,
      });
    }
    setCreating(false);
    setShowBoxDialog(false);
    setEditingBoxId(null);
    resetBoxForm();
    router.refresh();
  }

  function openEditBox(box: PackingBox) {
    setEditingBoxId(box.id);
    setBoxLabel(box.label);
    setBoxAssignedTo(box.assigned_to ?? "");
    setBoxVehicle(box.vehicle ?? "");
    setBoxDeliveryWhen(box.delivery_when ?? "");
    setBoxDeliveryTime(box.delivery_time ?? "");
    setShowBoxDialog(true);
  }

  async function handleGenerateDefaults() {
    setGeneratingDefaults(true);
    const supabase = createClient();
    const existingLabels = initialBoxes.map((b) => b.label.toLowerCase());
    const toInsert = DEFAULT_BOXES.filter(
      (label) => !existingLabels.includes(label.toLowerCase())
    ).map((label, i) => ({
      wedding_id: weddingId,
      label,
      sort_order: initialBoxes.length + i,
    }));

    if (toInsert.length > 0) {
      await supabase.from("packing_boxes").insert(toInsert);
    }
    setGeneratingDefaults(false);
    router.refresh();
  }

  async function handleDeleteBox(boxId: string) {
    const supabase = createClient();
    // Delete items first, then box
    await supabase.from("packing_items").delete().eq("box_id", boxId);
    await supabase.from("packing_boxes").delete().eq("id", boxId);
    router.refresh();
  }

  async function handleAddItem() {
    if (!activeBoxId) return;
    setCreating(true);
    const supabase = createClient();

    if (itemSource === "shopping" && selectedShoppingItemId) {
      const shoppingItem = shoppingItems.find(
        (s) => s.id === selectedShoppingItemId
      );
      if (shoppingItem) {
        await supabase.from("packing_items").insert({
          box_id: activeBoxId,
          shopping_item_id: shoppingItem.id,
          item_name: shoppingItem.item_name,
          packed: false,
        });
      }
    } else if (itemName.trim()) {
      await supabase.from("packing_items").insert({
        box_id: activeBoxId,
        item_name: itemName.trim(),
        packed: false,
      });
    }

    setCreating(false);
    setShowItemDialog(false);
    resetItemForm();
    router.refresh();
  }

  async function handleTogglePacked(itemId: string, currentPacked: boolean) {
    const supabase = createClient();
    await supabase
      .from("packing_items")
      .update({ packed: !currentPacked })
      .eq("id", itemId);
    router.refresh();
  }

  async function handleDeleteItem(itemId: string) {
    const supabase = createClient();
    await supabase.from("packing_items").delete().eq("id", itemId);
    router.refresh();
  }

  function openAddItem(boxId: string) {
    setActiveBoxId(boxId);
    resetItemForm();
    setShowItemDialog(true);
  }

  // Shopping items already placed in a box — used to filter suggestions.
  const packedShoppingIds = useMemo(() => {
    const set = new Set<string>();
    initialBoxes.forEach((b) =>
      b.packing_items.forEach((it) => {
        if (it.shopping_item_id) set.add(it.shopping_item_id);
      })
    );
    return set;
  }, [initialBoxes]);

  // Only items that are purchased (received/done) and not yet in any box.
  // Not-started or ordered items aren't worth packing yet.
  const shoppingItemsAvailableForPull = useMemo(
    () =>
      shoppingItems.filter(
        (s) =>
          !packedShoppingIds.has(s.id) &&
          (s.status === "received" || s.status === "done")
      ),
    [shoppingItems, packedShoppingIds]
  );

  function openPullDialog() {
    if (initialBoxes.length === 0) {
      toast.error("Create a box first", {
        description: "Click 'Add Default Boxes' or 'New Box' to get started.",
      });
      return;
    }
    setPullTargetBoxId(initialBoxes[0].id);
    setPullSelected(new Set());
    setShowPullDialog(true);
  }

  async function handlePullBatch() {
    if (!pullTargetBoxId || pullSelected.size === 0) return;
    setPulling(true);
    const supabase = createClient();
    const picks = shoppingItems.filter((s) => pullSelected.has(s.id));
    const rows = picks.map((s) => ({
      box_id: pullTargetBoxId,
      shopping_item_id: s.id,
      item_name: s.item_name,
      packed: false,
    }));
    const { error } = await supabase.from("packing_items").insert(rows);
    setPulling(false);
    if (error) {
      toast.error("Could not add items", { description: error.message });
      return;
    }
    const boxLabel =
      initialBoxes.find((b) => b.id === pullTargetBoxId)?.label ?? "box";
    toast.success(
      `Added ${rows.length} item${rows.length === 1 ? "" : "s"} to ${boxLabel}`
    );
    setShowPullDialog(false);
    setPullSelected(new Set());
    router.refresh();
  }

  function togglePullSelected(id: string) {
    setPullSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePullSelectAll() {
    setPullSelected((prev) => {
      if (prev.size === shoppingItemsAvailableForPull.length) return new Set();
      return new Set(shoppingItemsAvailableForPull.map((s) => s.id));
    });
  }

  // ── End-of-night handlers ──────────────────────────────────────────
  const toggleEonDefault = useCallback((item: string) => {
    setEon((prev) => {
      const checked = new Set(prev.checked);
      if (checked.has(item)) checked.delete(item);
      else checked.add(item);
      return { ...prev, checked: Array.from(checked) };
    });
  }, []);
  const hideEonDefault = useCallback((item: string) => {
    setEon((prev) => {
      const hidden = new Set(prev.hidden);
      hidden.add(item);
      return {
        ...prev,
        hidden: Array.from(hidden),
        checked: prev.checked.filter((c) => c !== item),
      };
    });
  }, []);
  const toggleEonCustom = useCallback((id: string) => {
    setEon((prev) => ({
      ...prev,
      custom: prev.custom.map((c) =>
        c.id === id ? { ...c, checked: !c.checked } : c
      ),
    }));
  }, []);
  const addEonCustom = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setEon((prev) => ({
      ...prev,
      custom: [
        ...prev.custom,
        {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: trimmed,
          checked: false,
        },
      ],
    }));
  }, []);
  const removeEonCustom = useCallback((id: string) => {
    setEon((prev) => ({
      ...prev,
      custom: prev.custom.filter((c) => c.id !== id),
    }));
  }, []);

  // Group boxes by assignee for the "by_person" view.
  const boxesByPerson = useMemo(() => {
    const map = new Map<string, PackingBox[]>();
    initialBoxes.forEach((b) => {
      const key = b.assigned_to?.trim() || "Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return Array.from(map.entries()).sort(([a], [b]) =>
      a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b)
    );
  }, [initialBoxes]);

  // Sort boxes by (delivery_when ordinal, delivery_time string). Boxes
  // without a delivery_when fall to the bottom.
  const boxesByDeliveryTime = useMemo(
    () =>
      [...initialBoxes].sort((a, b) => {
        const ao = a.delivery_when
          ? DELIVERY_WHEN_ORDER[a.delivery_when] ?? 99
          : 99;
        const bo = b.delivery_when
          ? DELIVERY_WHEN_ORDER[b.delivery_when] ?? 99
          : 99;
        if (ao !== bo) return ao - bo;
        const at = a.delivery_time?.trim() || "";
        const bt = b.delivery_time?.trim() || "";
        if (!at && !bt) return a.sort_order - b.sort_order;
        if (!at) return 1;
        if (!bt) return -1;
        return at.localeCompare(bt);
      }),
    [initialBoxes]
  );

  function renderBoxCard(box: PackingBox) {
    const boxPacked = box.packing_items.filter((i) => i.packed).length;
    const boxTotal = box.packing_items.length;
    const boxProgress = boxTotal
      ? Math.round((boxPacked / boxTotal) * 100)
      : 0;
    const isComplete = boxTotal > 0 && boxPacked === boxTotal;
    return (
      <Card
        key={box.id}
        className={isComplete ? "border-green-300 bg-green-50/30" : ""}
      >
        <CardContent className="p-4 space-y-3">
          {/* Box header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-base">{box.label}</h3>
              {isComplete && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => openEditBox(box)}
                title="Edit box info"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => handleDeleteBox(box.id)}
                title="Delete box"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Box metadata */}
          <div className="flex flex-wrap gap-2">
            {box.assigned_to && (
              <Badge variant="outline" className="text-xs gap-1">
                <User className="h-3 w-3" />
                {box.assigned_to}
              </Badge>
            )}
            {box.vehicle && (
              <Badge variant="outline" className="text-xs gap-1">
                <Car className="h-3 w-3" />
                {box.vehicle}
              </Badge>
            )}
            {(box.delivery_when || box.delivery_time) && (
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                {[deliveryWhenLabel(box.delivery_when), box.delivery_time]
                  .filter(Boolean)
                  .join(" · ")}
              </Badge>
            )}
          </div>

          {/* Box progress */}
          {boxTotal > 0 && (
            <div className="flex items-center gap-2">
              <Progress value={boxProgress} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {boxPacked}/{boxTotal}
              </span>
            </div>
          )}

          {/* Items checklist */}
          {box.packing_items.length > 0 && (
            <div className="space-y-1">
              {box.packing_items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 group py-0.5"
                >
                  <Checkbox
                    checked={item.packed}
                    onCheckedChange={() =>
                      handleTogglePacked(item.id, item.packed)
                    }
                  />
                  <span
                    className={`text-sm flex-1 ${
                      item.packed
                        ? "line-through text-muted-foreground"
                        : ""
                    }`}
                  >
                    {item.item_name}
                  </span>
                  {item.shopping_item_id && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      from list
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add item button */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground h-7 text-xs"
            onClick={() => openAddItem(box.id)}
          >
            <Plus className="h-3 w-3" />
            Add item
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Overall Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Overall Progress</p>
            <div className="text-2xl font-bold mt-1">{overallProgress}%</div>
            <Progress value={overallProgress} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Items Packed</p>
            <div className="text-2xl font-bold mt-1">
              {totalPacked} / {totalItems}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Boxes</p>
            <div className="text-2xl font-bold mt-1">
              {initialBoxes.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => {
            setEditingBoxId(null);
            resetBoxForm();
            setShowBoxDialog(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Box
        </Button>
        <Button
          variant="outline"
          onClick={handleGenerateDefaults}
          disabled={generatingDefaults}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {generatingDefaults ? "Creating..." : "Add Default Boxes"}
        </Button>
        <Button
          variant="outline"
          onClick={openPullDialog}
          className="gap-2"
          title="Bulk-import purchased shopping items into a box"
        >
          <ShoppingBag className="h-4 w-4" />
          Pull from Shopping
          {shoppingItemsAvailableForPull.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {shoppingItemsAvailableForPull.length}
            </Badge>
          )}
        </Button>
        <Link
          href="/print/packing-handoff"
          target="_blank"
          className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-border/60 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Printable hand-off sheets per assignee"
        >
          <Printer className="h-4 w-4" />
          Print
        </Link>
      </div>

      {/* View toggle — only meaningful with boxes */}
      {initialBoxes.length > 0 && (
        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="View mode"
            className="inline-flex rounded-full border border-border/60 p-0.5 text-xs"
          >
            {(
              [
                { id: "boxes" as const, label: "By box", icon: LayoutGrid },
                {
                  id: "timeline" as const,
                  label: "By delivery time",
                  icon: CalendarClock,
                },
                { id: "by_person" as const, label: "By person", icon: Users },
              ] as const
            ).map((v) => {
              const Ic = v.icon;
              const active = view === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setView(v.id)}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Ic className="h-3 w-3" />
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Views */}
      {initialBoxes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No boxes yet. Create a box or click &quot;Add Default Boxes&quot; to
            get started.
          </CardContent>
        </Card>
      ) : view === "by_person" ? (
        <div className="space-y-5">
          {boxesByPerson.map(([person, boxes]) => (
            <div key={person}>
              <div className="flex items-baseline gap-2 mb-2 pb-1 border-b border-border/40">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground/80">
                  {person}
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  · {boxes.length} box{boxes.length === 1 ? "" : "es"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {boxes.map((b) => renderBoxCard(b))}
              </div>
            </div>
          ))}
        </div>
      ) : view === "timeline" ? (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground italic">
            Sorted by delivery time. Boxes without a time appear at the end.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {boxesByDeliveryTime.map((b) => renderBoxCard(b))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialBoxes.map((box) => renderBoxCard(box))}
        </div>
      )}

      {/* End of Night Repack */}
      <div className="pt-4">
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="text-lg font-semibold font-[family-name:var(--font-heading)]">
            End-of-Night Repack Checklist
          </h2>
          {savingEon && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving…
            </span>
          )}
        </div>
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              Items to collect and take home at the end of the night.
              Syncs across devices.
            </p>
            {END_OF_NIGHT_ITEMS.filter(
              (item) => !eon.hidden.includes(item)
            ).map((item) => {
              const checked = eon.checked.includes(item);
              return (
                <div
                  key={item}
                  className="group flex items-center gap-2 py-0.5"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleEonDefault(item)}
                  />
                  <span
                    className={`text-sm flex-1 ${
                      checked ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {item}
                  </span>
                  <button
                    type="button"
                    onClick={() => hideEonDefault(item)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/60 hover:text-destructive"
                    title="Remove this default item"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}

            {eon.custom.map((c) => (
              <div
                key={c.id}
                className="group flex items-center gap-2 py-0.5"
              >
                <Checkbox
                  checked={c.checked}
                  onCheckedChange={() => toggleEonCustom(c.id)}
                />
                <span
                  className={`text-sm flex-1 ${
                    c.checked ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {c.name}
                  <span className="ml-1.5 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                    custom
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeEonCustom(c.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/60 hover:text-destructive"
                  title="Delete"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <Input
                value={addCustomEon}
                onChange={(e) => setAddCustomEon(e.target.value)}
                placeholder="Add item (e.g. favorite vase, extra cake slice)"
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addEonCustom(addCustomEon);
                    setAddCustomEon("");
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!addCustomEon.trim()}
                onClick={() => {
                  addEonCustom(addCustomEon);
                  setAddCustomEon("");
                }}
              >
                Add
              </Button>
            </div>

            {eon.hidden.length > 0 && (
              <div className="pt-2 text-[11px] text-muted-foreground flex items-center justify-between border-t border-border/40 mt-2">
                <span>
                  {eon.hidden.length} default item
                  {eon.hidden.length === 1 ? "" : "s"} hidden
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEon((prev) => ({ ...prev, hidden: [] }))
                  }
                  className="hover:text-foreground underline-offset-2 hover:underline"
                >
                  Restore all
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Box Dialog */}
      <Dialog
        open={showBoxDialog}
        onOpenChange={(open) => {
          setShowBoxDialog(open);
          if (!open) {
            setEditingBoxId(null);
            resetBoxForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBoxId ? "Edit Packing Box" : "New Packing Box"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Box Label *</Label>
              <Input
                value={boxLabel}
                onChange={(e) => setBoxLabel(e.target.value)}
                placeholder="e.g. Ceremony, Reception Decor"
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Input
                value={boxAssignedTo}
                onChange={(e) => setBoxAssignedTo(e.target.value)}
                placeholder="Who carries or places this box?"
              />
              {assigneeSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {assigneeSuggestions
                    .filter(
                      (s) =>
                        s.label.toLowerCase() !==
                        boxAssignedTo.trim().toLowerCase()
                    )
                    .slice(0, 6)
                    .map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => setBoxAssignedTo(s.label)}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-border hover:border-primary/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title={s.note}
                      >
                        + {s.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vehicle / Transport (optional)</Label>
                <Input
                  value={boxVehicle}
                  onChange={(e) => setBoxVehicle(e.target.value)}
                  placeholder="e.g. SUV, rental van, Uber XL"
                />
              </div>
              <div className="space-y-2">
                <Label>When</Label>
                <Select
                  value={boxDeliveryWhen}
                  onValueChange={(v) => setBoxDeliveryWhen(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(v) =>
                        v
                          ? deliveryWhenLabel(v as string) || "Pick a window..."
                          : "Pick a window..."
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_WHEN_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Specific time (optional)</Label>
              <Input
                value={boxDeliveryTime}
                onChange={(e) => setBoxDeliveryTime(e.target.value)}
                placeholder="e.g. 10:00 AM, 1 hour before ceremony"
              />
              <p className="text-[11px] text-muted-foreground">
                Only if you need to be precise. Otherwise just pick the
                window above.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBoxDialog(false);
                  resetBoxForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBox}
                disabled={creating || !boxLabel.trim()}
              >
                {creating
                  ? editingBoxId
                    ? "Saving..."
                    : "Creating..."
                  : editingBoxId
                    ? "Save"
                    : "Create Box"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pull from Shopping Dialog — bulk-import purchased items */}
      <Dialog open={showPullDialog} onOpenChange={setShowPullDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pull from Shopping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Only shows items you&apos;ve marked{" "}
              <strong>received</strong> or <strong>done</strong> on the
              Shopping page and haven&apos;t yet placed in a box.
            </p>
            <div className="space-y-2">
              <Label>Add into box</Label>
              <Select
                value={pullTargetBoxId}
                onValueChange={(v) => setPullTargetBoxId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a box..." />
                </SelectTrigger>
                <SelectContent>
                  {initialBoxes.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {shoppingItemsAvailableForPull.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center">
                No unpacked purchased items available. Mark items as
                received / done on the Shopping page.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {pullSelected.size} of{" "}
                    {shoppingItemsAvailableForPull.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={togglePullSelectAll}
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  >
                    {pullSelected.size ===
                    shoppingItemsAvailableForPull.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                </div>
                <div className="max-h-[320px] overflow-y-auto border border-border/60 rounded-lg divide-y divide-border/40">
                  {shoppingItemsAvailableForPull.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <Checkbox
                        checked={pullSelected.has(s.id)}
                        onCheckedChange={() => togglePullSelected(s.id)}
                      />
                      <span className="flex-1">{s.item_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.category}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPullDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePullBatch}
                disabled={
                  pulling || pullSelected.size === 0 || !pullTargetBoxId
                }
              >
                {pulling ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : null}
                Add {pullSelected.size > 0 ? pullSelected.size : ""} items
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item to Box</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Source</Label>
              <Select
                value={itemSource}
                onValueChange={(v) => setItemSource((v ?? "custom") as "custom" | "shopping")}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(v) => (v === "shopping" ? "From shopping" : "Custom")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="shopping">From shopping</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {itemSource === "custom" ? (
              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Unity candle, Ring pillow"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Shopping List Item *</Label>
                <Select
                  value={selectedShoppingItemId}
                  onValueChange={(v) => setSelectedShoppingItemId(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an item..." />
                  </SelectTrigger>
                  <SelectContent>
                    {shoppingItems.map((si) => (
                      <SelectItem key={si.id} value={si.id}>
                        {si.item_name} ({si.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowItemDialog(false);
                  resetItemForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddItem}
                disabled={
                  creating ||
                  (itemSource === "custom" && !itemName.trim()) ||
                  (itemSource === "shopping" && !selectedShoppingItemId)
                }
              >
                {creating ? "Adding..." : "Add Item"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
