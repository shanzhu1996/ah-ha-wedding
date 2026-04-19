"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  Cross,
  Wrench,
  Apple,
  Plus,
  X,
  Package,
  Loader2,
  Printer,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  KIT_CATEGORIES,
  defaultItemKey,
  type KitCategoryId,
  type KitCategoryDef,
  type CustomKitItem,
  type EmergencyKitState,
} from "./data";

const SECTION_KEY = "emergency_kit";
const LEGACY_STORAGE_KEY = "wedding-emergency-kit-checked";

const ICON_MAP = { Sparkles, Cross, Wrench, Apple } as const;

interface EmergencyKitProps {
  weddingId: string;
  state: EmergencyKitState;
  onStateChange: (updater: (prev: EmergencyKitState) => EmergencyKitState) => void;
  showExtended: boolean;
  onShowExtendedChange: (v: boolean) => void;
}

export function EmergencyKitChecklist({
  weddingId,
  state,
  onStateChange,
  showExtended,
  onShowExtendedChange,
}: EmergencyKitProps) {
  const [saving, setSaving] = useState(false);
  const [addingTo, setAddingTo] = useState<KitCategoryId | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipInitialSave = useRef(true);

  // ── One-time migration from the old localStorage-backed version. If the
  // saved state is empty AND there's a legacy blob, translate its keys
  // (which used old category names like "Hygiene::Deodorant") to the new
  // merged categories and persist. Non-destructive: we only migrate checked
  // items from a reasonable key shape.
  useEffect(() => {
    const hasAnyState =
      state.packed.length > 0 ||
      state.hidden.length > 0 ||
      state.custom.length > 0;
    if (hasAnyState) return;
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return;
      const legacy = JSON.parse(raw) as Record<string, boolean>;
      const legacyCatToNewCat: Record<string, KitCategoryId> = {
        Hygiene: "freshen_up",
        Hair: "freshen_up",
        Makeup: "freshen_up",
        "First Aid": "first_aid",
        Tools: "fix_it",
        Wardrobe: "fix_it",
        Outdoor: "fuel_comfort",
        Sustenance: "fuel_comfort",
      };
      const migratedPacked: string[] = [];
      for (const oldKey of Object.keys(legacy)) {
        if (!legacy[oldKey]) continue;
        const [oldCat, itemName] = oldKey.split("::");
        const newCat = legacyCatToNewCat[oldCat];
        if (!newCat || !itemName) continue;
        const newKey = defaultItemKey(newCat, itemName);
        // Only include if the item still exists as a default in the new list.
        const catDef = KIT_CATEGORIES.find((c) => c.id === newCat);
        if (!catDef) continue;
        if (
          catDef.essentials.includes(itemName) ||
          catDef.extended.includes(itemName)
        ) {
          if (!migratedPacked.includes(newKey)) migratedPacked.push(newKey);
        }
      }
      if (migratedPacked.length > 0) {
        onStateChange((prev) => ({ ...prev, packed: migratedPacked }));
      }
      // Clean up — migration is one-shot.
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore malformed legacy data
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Autosave to wedding_day_details ──────────────────────────────────
  useEffect(() => {
    if (skipInitialSave.current) {
      skipInitialSave.current = false;
      return;
    }
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSaving(true);
    saveTimeout.current = setTimeout(async () => {
      const supabase = createClient();
      await supabase.from("wedding_day_details").upsert(
        {
          wedding_id: weddingId,
          section: SECTION_KEY,
          data: state as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "wedding_id,section" }
      );
      setSaving(false);
    }, 600);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [state, weddingId]);

  // ── State mutation helpers ───────────────────────────────────────────
  const togglePacked = useCallback((key: string) => {
    onStateChange((prev) => {
      const next = new Set(prev.packed);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, packed: Array.from(next) };
    });
  }, []);

  const toggleCustomPacked = useCallback((id: string) => {
    onStateChange((prev) => ({
      ...prev,
      custom: prev.custom.map((c) =>
        c.id === id ? { ...c, packed: !c.packed } : c
      ),
    }));
  }, []);

  const hideDefault = useCallback((key: string) => {
    onStateChange((prev) => {
      const hidden = new Set(prev.hidden);
      hidden.add(key);
      const packed = prev.packed.filter((k) => k !== key);
      return { ...prev, hidden: Array.from(hidden), packed };
    });
  }, []);

  const addCustom = useCallback(
    (category: KitCategoryId, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      onStateChange((prev) => ({
        ...prev,
        custom: [
          ...prev.custom,
          {
            id:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            category,
            name: trimmed,
            packed: false,
          },
        ],
      }));
    },
    []
  );

  const removeCustom = useCallback((id: string) => {
    onStateChange((prev) => ({
      ...prev,
      custom: prev.custom.filter((c) => c.id !== id),
    }));
  }, []);

  // ── Derived counts ───────────────────────────────────────────────────
  const visibleItems = useMemo(() => {
    const byCat: Record<KitCategoryId, { key: string; name: string; packed: boolean; isCustom: boolean; customId?: string }[]> = {
      freshen_up: [],
      first_aid: [],
      fix_it: [],
      fuel_comfort: [],
    };
    const hidden = new Set(state.hidden);
    const packed = new Set(state.packed);
    for (const cat of KIT_CATEGORIES) {
      const defaults = showExtended
        ? [...cat.essentials, ...cat.extended]
        : cat.essentials;
      for (const item of defaults) {
        const key = defaultItemKey(cat.id, item);
        if (hidden.has(key)) continue;
        byCat[cat.id].push({
          key,
          name: item,
          packed: packed.has(key),
          isCustom: false,
        });
      }
    }
    for (const custom of state.custom) {
      byCat[custom.category].push({
        key: `custom::${custom.id}`,
        name: custom.name,
        packed: custom.packed,
        isCustom: true,
        customId: custom.id,
      });
    }
    return byCat;
  }, [state, showExtended]);

  const totals = useMemo(() => {
    let total = 0;
    let packed = 0;
    for (const cat of KIT_CATEGORIES) {
      const list = visibleItems[cat.id];
      total += list.length;
      packed += list.filter((i) => i.packed).length;
    }
    return { total, packed };
  }, [visibleItems]);

  const progressPct =
    totals.total > 0 ? Math.round((totals.packed / totals.total) * 100) : 0;

  const assignee = state.assignee ?? {};
  const updateAssignee = (patch: Partial<{ name: string; contact: string }>) =>
    onStateChange((prev) => ({
      ...prev,
      assignee: { ...(prev.assignee ?? {}), ...patch },
    }));

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Progress + Print */}
      <Card size="sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Kit progress</span>
            <Badge
              variant={
                totals.packed === totals.total && totals.total > 0
                  ? "default"
                  : "secondary"
              }
            >
              {totals.packed} / {totals.total} items
            </Badge>
            {saving ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving…
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3 min-w-[180px] flex-1 max-w-xs">
            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
              {progressPct}%
            </span>
          </div>
          <Link
            href="/print/emergency-kit"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md border border-border/60 hover:bg-muted transition-colors"
            title="Print a hand-off sheet for the kit keeper"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Link>
        </CardContent>
      </Card>

      {/* Kit keeper */}
      <Card size="sm" className="bg-muted/20">
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <UserRound className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Kit keeper</span>
            <span className="text-xs text-muted-foreground">
              Who&apos;s carrying this on the day? Usually the MOH or a
              trusted friend.
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={assignee.name ?? ""}
              onChange={(e) => updateAssignee({ name: e.target.value })}
              placeholder="Name"
              className="text-sm h-8"
            />
            <Input
              value={assignee.contact ?? ""}
              onChange={(e) => updateAssignee({ contact: e.target.value })}
              placeholder="Phone or email (optional)"
              className="text-sm h-8"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
        <Label
          htmlFor="extended-toggle"
          className="flex items-center gap-2 cursor-pointer text-sm"
        >
          <Switch
            id="extended-toggle"
            checked={showExtended}
            onCheckedChange={onShowExtendedChange}
          />
          Show the full kit
          <span className="text-xs text-muted-foreground">
            {showExtended ? "(all items)" : "(essentials only)"}
          </span>
        </Label>
        <p className="text-xs text-muted-foreground max-w-md text-right">
          Bulky items (iron, steamer, hair dryer)?{" "}
          <Link
            href="/packing"
            className="underline hover:text-foreground transition-colors"
          >
            Add those to Packing
          </Link>
          .
        </p>
      </div>

      {/* Categories grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {KIT_CATEGORIES.map((category) => {
          const Icon =
            ICON_MAP[category.iconName as keyof typeof ICON_MAP] ?? Sparkles;
          const items = visibleItems[category.id];
          const catPacked = items.filter((i) => i.packed).length;
          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${category.colorClass}`}
                    >
                      <Icon className="size-4" />
                    </div>
                    {category.name}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground tabular-nums">
                    {catPacked}/{items.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <ul className="space-y-2">
                  {items.length === 0 ? (
                    <li className="text-xs text-muted-foreground italic py-1">
                      All items removed. Add a custom one below, or turn on
                      &quot;Show the full kit&quot;.
                    </li>
                  ) : null}
                  {items.map((item) => (
                    <li key={item.key}>
                      <div className="group flex items-center gap-2.5 text-sm">
                        <Checkbox
                          checked={item.packed}
                          onCheckedChange={() => {
                            if (item.isCustom && item.customId) {
                              toggleCustomPacked(item.customId);
                            } else {
                              togglePacked(item.key);
                            }
                          }}
                          id={`kit-${item.key}`}
                        />
                        <label
                          htmlFor={`kit-${item.key}`}
                          className={`flex-1 cursor-pointer select-none ${
                            item.packed
                              ? "text-muted-foreground line-through"
                              : ""
                          }`}
                        >
                          {item.name}
                          {item.isCustom ? (
                            <span className="ml-1.5 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                              custom
                            </span>
                          ) : null}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (item.isCustom && item.customId) {
                              removeCustom(item.customId);
                            } else {
                              hideDefault(item.key);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/60 hover:text-destructive"
                          title={
                            item.isCustom
                              ? "Delete this item"
                              : "Remove from my kit"
                          }
                          aria-label="Remove item"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {addingTo === category.id ? (
                  <div className="flex gap-2 pt-1">
                    <Input
                      autoFocus
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g. Contact lens case"
                      className="text-sm h-8"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addCustom(category.id, newItemName);
                          setNewItemName("");
                        } else if (e.key === "Escape") {
                          setAddingTo(null);
                          setNewItemName("");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        addCustom(category.id, newItemName);
                        setNewItemName("");
                      }}
                      disabled={!newItemName.trim()}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddingTo(null);
                        setNewItemName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTo(category.id)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 pt-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add custom item
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer hint for hidden items */}
      {state.hidden.length > 0 ? (
        <Card size="sm" className="bg-muted/30">
          <CardContent className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              {state.hidden.length} default item
              {state.hidden.length === 1 ? "" : "s"} hidden from your kit
            </span>
            <button
              type="button"
              onClick={() =>
                onStateChange((prev) => ({ ...prev, hidden: [] }))
              }
              className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              Restore all
            </button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// Backwards-compat re-export so the existing import in page.tsx resolves
// during the transition. The page will switch to fetching the wedding
// context and passing it down, at which point this alias becomes the
// primary type used.
export type { KitCategoryDef };
