"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Trash2,
  Edit,
  Users,
  Wand2,
  CircleOff,
  Armchair,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Table {
  id: string;
  wedding_id: string;
  number: number;
  name: string | null;
  capacity: number;
  shape: string;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
}

interface Guest {
  id: string;
  wedding_id: string;
  first_name: string;
  last_name: string;
  rsvp_status: string;
  meal_choice: string | null;
  dietary_restrictions: string | null;
  table_id: string | null;
  relationship_tag: string | null;
  plus_one?: boolean;
  plus_one_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

interface SeatingManagerProps {
  tables: Table[];
  guests: Guest[];
  weddingId: string;
}

/* ------------------------------------------------------------------ */
/*  Relationship-tag colour palette                                    */
/* ------------------------------------------------------------------ */

const TAG_COLORS: Record<string, string> = {};
const PALETTE = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-amber-100 text-amber-800",
  "bg-teal-100 text-teal-800",
  "bg-indigo-100 text-indigo-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
  "bg-lime-100 text-lime-800",
  "bg-orange-100 text-orange-800",
];

function tagColor(tag: string | null): string {
  if (!tag) return "bg-gray-100 text-gray-600";
  if (!TAG_COLORS[tag]) {
    TAG_COLORS[tag] = PALETTE[Object.keys(TAG_COLORS).length % PALETTE.length];
  }
  return TAG_COLORS[tag];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SeatingManager({
  tables: initialTables,
  guests: initialGuests,
  weddingId,
}: SeatingManagerProps) {
  const router = useRouter();

  // --- selection state ---
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // --- table dialog state ---
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableName, setTableName] = useState("");
  const [tableCapacity, setTableCapacity] = useState("8");
  const [tableShape, setTableShape] = useState("round");
  const [saving, setSaving] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Derived data                                                     */
  /* ---------------------------------------------------------------- */

  const confirmedGuests = initialGuests.filter(
    (g) => g.rsvp_status === "confirmed"
  );
  const seatedGuests = initialGuests.filter((g) => g.table_id);
  const unassignedGuests = initialGuests.filter((g) => !g.table_id);

  const guestsByTable = useMemo(() => {
    const map: Record<string, Guest[]> = {};
    for (const g of initialGuests) {
      if (g.table_id) {
        if (!map[g.table_id]) map[g.table_id] = [];
        map[g.table_id].push(g);
      }
    }
    return map;
  }, [initialGuests]);

  // Group unassigned guests by relationship_tag
  const unassignedByTag = useMemo(() => {
    const map: Record<string, Guest[]> = {};
    const filtered = unassignedGuests.filter((g) => {
      const name = `${g.first_name} ${g.last_name}`.toLowerCase();
      return name.includes(search.toLowerCase());
    });
    for (const g of filtered) {
      const tag = g.relationship_tag || "Ungrouped";
      if (!map[tag]) map[tag] = [];
      map[tag].push(g);
    }
    return map;
  }, [unassignedGuests, search]);

  const tablesWithOpenSeats = initialTables.filter(
    (t) => (guestsByTable[t.id]?.length || 0) < t.capacity
  ).length;

  const unassignedConfirmed = confirmedGuests.filter(
    (g) => !g.table_id
  ).length;

  const recommendedTables = Math.ceil(confirmedGuests.length / 8);

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  function resetTableForm() {
    setTableName("");
    setTableCapacity("8");
    setTableShape("round");
    setEditingTable(null);
  }

  function openAddTable() {
    resetTableForm();
    setShowTableDialog(true);
  }

  function openEditTable(table: Table) {
    setEditingTable(table);
    setTableName(table.name || "");
    setTableCapacity(String(table.capacity));
    setTableShape(table.shape || "round");
    setShowTableDialog(true);
  }

  async function handleSaveTable() {
    setSaving(true);
    const supabase = createClient();

    if (editingTable) {
      await supabase
        .from("tables")
        .update({
          name: tableName || null,
          capacity: parseInt(tableCapacity) || 8,
          shape: tableShape,
        })
        .eq("id", editingTable.id);
    } else {
      const nextNumber =
        initialTables.length > 0
          ? Math.max(...initialTables.map((t) => t.number)) + 1
          : 1;
      await supabase.from("tables").insert({
        wedding_id: weddingId,
        number: nextNumber,
        name: tableName || null,
        capacity: parseInt(tableCapacity) || 8,
        shape: tableShape,
        position_x: 0,
        position_y: 0,
      });
    }

    setSaving(false);
    setShowTableDialog(false);
    resetTableForm();
    router.refresh();
  }

  async function handleDeleteTable(tableId: string) {
    const supabase = createClient();
    // Unassign guests first
    await supabase
      .from("guests")
      .update({ table_id: null })
      .eq("table_id", tableId);
    await supabase.from("tables").delete().eq("id", tableId);
    router.refresh();
  }

  async function handleAssignGuest(guestId: string, tableId: string) {
    const supabase = createClient();
    await supabase.from("guests").update({ table_id: tableId }).eq("id", guestId);
    setSelectedGuestId(null);
    router.refresh();
  }

  async function handleUnassignGuest(guestId: string) {
    const supabase = createClient();
    await supabase
      .from("guests")
      .update({ table_id: null })
      .eq("id", guestId);
    router.refresh();
  }

  async function handleAutoSuggest() {
    setSaving(true);
    const supabase = createClient();

    // Group unassigned guests by relationship_tag
    const groups: Record<string, Guest[]> = {};
    for (const g of unassignedGuests) {
      const tag = g.relationship_tag || "Ungrouped";
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(g);
    }

    // Build a flat queue of guests, grouped by tag
    const queue: Guest[] = [];
    for (const tag of Object.keys(groups).sort()) {
      queue.push(...groups[tag]);
    }

    if (queue.length === 0) {
      setSaving(false);
      return;
    }

    // Collect tables that have open seats, sorted by number
    const openTables = initialTables
      .map((t) => ({
        ...t,
        seated: guestsByTable[t.id]?.length || 0,
      }))
      .filter((t) => t.seated < t.capacity)
      .sort((a, b) => a.number - b.number);

    const assignments: { guestId: string; tableId: string }[] = [];
    let tableIdx = 0;
    const seatedCounts: Record<string, number> = {};
    for (const t of openTables) {
      seatedCounts[t.id] = t.seated;
    }

    for (const guest of queue) {
      // Find next table with room
      let found = false;
      const startIdx = tableIdx;
      do {
        const t = openTables[tableIdx % openTables.length];
        if (seatedCounts[t.id] < t.capacity) {
          assignments.push({ guestId: guest.id, tableId: t.id });
          seatedCounts[t.id]++;
          if (seatedCounts[t.id] >= t.capacity) {
            tableIdx = (tableIdx + 1) % openTables.length;
          }
          found = true;
          break;
        }
        tableIdx = (tableIdx + 1) % openTables.length;
      } while (tableIdx !== startIdx);

      if (!found) break; // no more room
    }

    // Batch update
    for (const { guestId, tableId } of assignments) {
      await supabase
        .from("guests")
        .update({ table_id: tableId })
        .eq("id", guestId);
    }

    setSaving(false);
    router.refresh();
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <>
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {seatedGuests.length}/{confirmedGuests.length}
            </div>
            <p className="text-xs text-muted-foreground">Seated / Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{initialTables.length}</div>
            <p className="text-xs text-muted-foreground">Tables</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {tablesWithOpenSeats}
            </div>
            <p className="text-xs text-muted-foreground">Open Seats</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {unassignedConfirmed}
            </div>
            <p className="text-xs text-muted-foreground">Unassigned Confirmed</p>
          </CardContent>
        </Card>
      </div>

      {/* Table math helper */}
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Armchair className="h-4 w-4" />
        {confirmedGuests.length} confirmed guests / 8 ={" "}
        <span className="font-semibold text-foreground">
          {recommendedTables} tables
        </span>{" "}
        recommended
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={openAddTable} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Table
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleAutoSuggest}
          disabled={saving || unassignedGuests.length === 0 || initialTables.length === 0}
        >
          <Wand2 className="h-4 w-4" />
          {saving ? "Assigning..." : "Auto-Assign"}
        </Button>
        {selectedGuestId && (
          <Badge variant="secondary" className="gap-1 py-1.5 px-3">
            <Users className="h-3 w-3" />
            Click a table to seat{" "}
            <span className="font-semibold">
              {(() => {
                const g = initialGuests.find(
                  (g) => g.id === selectedGuestId
                );
                return g ? `${g.first_name} ${g.last_name}` : "";
              })()}
            </span>
            <button
              className="ml-1 hover:text-foreground"
              onClick={() => setSelectedGuestId(null)}
            >
              <CircleOff className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>

      {/* Main two-panel layout */}
      <div className="flex gap-6 items-start">
        {/* Left panel: tables grid (70%) */}
        <div className="flex-[7] min-w-0">
          {initialTables.length === 0 ? (
            <Card>
              <CardContent className="py-16 flex flex-col items-center text-center">
                <LayoutGrid className="h-12 w-12 text-primary/40 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Design your perfect seating</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Add tables, then click guests from the sidebar to assign them. We&apos;ll help you group by family and friends.
                </p>
                <Button onClick={openAddTable} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Table
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {initialTables.map((table) => {
                const seated = guestsByTable[table.id] || [];
                const isFull = seated.length >= table.capacity;
                const canAccept =
                  selectedGuestId && !isFull;

                return (
                  <Card
                    key={table.id}
                    className={`transition-all ${
                      canAccept
                        ? "ring-2 ring-primary cursor-pointer hover:shadow-md"
                        : ""
                    } ${isFull ? "opacity-80" : ""}`}
                    onClick={() => {
                      if (canAccept && selectedGuestId) {
                        handleAssignGuest(selectedGuestId, table.id);
                      }
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {table.name || `Table ${table.number}`}
                          <span className="ml-2 text-xs font-normal text-muted-foreground capitalize">
                            {table.shape}
                          </span>
                        </CardTitle>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={isFull ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {seated.length}/{table.capacity}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditTable(table);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTable(table.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {seated.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2">
                          No guests assigned
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {seated.map((guest) => (
                            <li
                              key={guest.id}
                              className="flex items-center justify-between text-sm group/guest hover:bg-muted/50 rounded px-1 -mx-1 py-0.5"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="truncate">
                                  {guest.first_name} {guest.last_name}
                                </span>
                                {guest.dietary_restrictions && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1 py-0 shrink-0"
                                  >
                                    {guest.dietary_restrictions}
                                  </Badge>
                                )}
                                {guest.relationship_tag && (
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] px-1 py-0 shrink-0 ${tagColor(
                                      guest.relationship_tag
                                    )}`}
                                  >
                                    {guest.relationship_tag}
                                  </Badge>
                                )}
                              </div>
                              <button
                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover/guest:opacity-100 transition-opacity shrink-0 ml-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnassignGuest(guest.id);
                                }}
                                title="Remove from table"
                              >
                                <CircleOff className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel: unassigned guests sidebar (30%) */}
        <div className="flex-[3] min-w-[240px] max-w-[360px]">
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Unassigned Guests
                <Badge variant="secondary" className="ml-2 text-xs">
                  {unassignedGuests.length}
                </Badge>
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search guests..."
                  className="pl-8 h-8 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[60vh]">
                {Object.keys(unassignedByTag).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    {unassignedGuests.length === 0
                      ? "All guests are seated!"
                      : "No guests match your search."}
                  </p>
                ) : (
                  <div className="space-y-4 pr-2">
                    {Object.entries(unassignedByTag)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([tag, guests]) => (
                        <div key={tag}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${tagColor(
                                tag === "Ungrouped" ? null : tag
                              )}`}
                            >
                              {tag}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              ({guests.length})
                            </span>
                          </div>
                          <ul className="space-y-0.5">
                            {guests.map((guest) => (
                              <li
                                key={guest.id}
                                className={`flex items-center gap-1.5 text-sm rounded px-2 py-1 cursor-pointer transition-colors ${
                                  selectedGuestId === guest.id
                                    ? "bg-primary/10 ring-1 ring-primary"
                                    : "hover:bg-muted/50"
                                }`}
                                onClick={() =>
                                  setSelectedGuestId(
                                    selectedGuestId === guest.id
                                      ? null
                                      : guest.id
                                  )
                                }
                              >
                                <span className="truncate">
                                  {guest.first_name} {guest.last_name}
                                </span>
                                {guest.rsvp_status === "confirmed" && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1 py-0 bg-green-100 text-green-800 shrink-0"
                                  >
                                    RSVP
                                  </Badge>
                                )}
                                {guest.dietary_restrictions && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1 py-0 shrink-0"
                                  >
                                    {guest.dietary_restrictions}
                                  </Badge>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add / Edit Table Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingTable ? "Edit Table" : "Add Table"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Table Name (optional)</Label>
              <Input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="e.g. Head Table, Family Table"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={tableCapacity}
                  onChange={(e) => setTableCapacity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Shape</Label>
                <Select
                  value={tableShape}
                  onValueChange={(v) => setTableShape(v ?? "round")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round">Round</SelectItem>
                    <SelectItem value="rectangle">Rectangle</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="sweetheart">Sweetheart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTableDialog(false);
                  resetTableForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTable}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingTable
                  ? "Update Table"
                  : "Add Table"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
