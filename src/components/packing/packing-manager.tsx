"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Package,
  Sparkles,
  CheckCircle2,
  Clock,
  Car,
  User,
} from "lucide-react";
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
  sort_order: number;
  created_at: string;
  packing_items: PackingItem[];
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

export function PackingManager({
  boxes: initialBoxes,
  shoppingItems,
  weddingId,
}: PackingManagerProps) {
  const router = useRouter();
  const [showBoxDialog, setShowBoxDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [generatingDefaults, setGeneratingDefaults] = useState(false);

  // Box form
  const [boxLabel, setBoxLabel] = useState("");
  const [boxAssignedTo, setBoxAssignedTo] = useState("");
  const [boxVehicle, setBoxVehicle] = useState("");
  const [boxDeliveryTime, setBoxDeliveryTime] = useState("");

  // Item form
  const [itemName, setItemName] = useState("");
  const [itemSource, setItemSource] = useState<"custom" | "shopping">("custom");
  const [selectedShoppingItemId, setSelectedShoppingItemId] = useState("");

  // End-of-night checklist (local state only)
  const [endOfNightChecked, setEndOfNightChecked] = useState<
    Record<string, boolean>
  >({});

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
    setBoxDeliveryTime("");
  }

  function resetItemForm() {
    setItemName("");
    setItemSource("custom");
    setSelectedShoppingItemId("");
  }

  async function handleCreateBox() {
    if (!boxLabel.trim()) return;
    setCreating(true);
    const supabase = createClient();
    await supabase.from("packing_boxes").insert({
      wedding_id: weddingId,
      label: boxLabel.trim(),
      assigned_to: boxAssignedTo.trim() || null,
      vehicle: boxVehicle.trim() || null,
      delivery_time: boxDeliveryTime.trim() || null,
      sort_order: initialBoxes.length,
    });
    setCreating(false);
    setShowBoxDialog(false);
    resetBoxForm();
    router.refresh();
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
      </div>

      {/* Box Cards */}
      {initialBoxes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No boxes yet. Create a box or click &quot;Add Default Boxes&quot; to
            get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialBoxes.map((box) => {
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDeleteBox(box.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
                    {box.delivery_time && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Clock className="h-3 w-3" />
                        {box.delivery_time}
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
          })}
        </div>
      )}

      {/* End of Night Repack */}
      <div className="pt-4">
        <h2 className="text-lg font-semibold font-[family-name:var(--font-heading)] mb-3">
          End-of-Night Repack Checklist
        </h2>
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              Items to collect and take home at the end of the night.
            </p>
            {END_OF_NIGHT_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-2 py-0.5">
                <Checkbox
                  checked={endOfNightChecked[item] || false}
                  onCheckedChange={() =>
                    setEndOfNightChecked((prev) => ({
                      ...prev,
                      [item]: !prev[item],
                    }))
                  }
                />
                <span
                  className={`text-sm ${
                    endOfNightChecked[item]
                      ? "line-through text-muted-foreground"
                      : ""
                  }`}
                >
                  {item}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Create Box Dialog */}
      <Dialog open={showBoxDialog} onOpenChange={setShowBoxDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Packing Box</DialogTitle>
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
                placeholder="Who is responsible for this box?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Input
                  value={boxVehicle}
                  onChange={(e) => setBoxVehicle(e.target.value)}
                  placeholder="e.g. Mom's SUV"
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Time</Label>
                <Input
                  value={boxDeliveryTime}
                  onChange={(e) => setBoxDeliveryTime(e.target.value)}
                  placeholder="e.g. Morning of, Day before"
                />
              </div>
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
                onClick={handleCreateBox}
                disabled={creating || !boxLabel.trim()}
              >
                {creating ? "Creating..." : "Create Box"}
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Type custom item</SelectItem>
                  <SelectItem value="shopping">
                    Pick from shopping list
                  </SelectItem>
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
