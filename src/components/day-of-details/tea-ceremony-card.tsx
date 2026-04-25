"use client";

import { useMemo } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  CollapsibleSection,
  type SectionSummaryChip,
} from "./collapsible-section";
import type { TeaCeremonyData, TeaElder } from "./types";

const TEA_SET_LABELS: Record<NonNullable<TeaCeremonyData["tea_set_source"]>, string> = {
  "": "",
  bring_own: "Bringing our own",
  rental: "Rental service",
  venue_provided: "Venue provides",
};

interface Props {
  data: TeaCeremonyData;
  onChange: (data: TeaCeremonyData) => void;
}

/**
 * Tea Ceremony card — renders as a CollapsibleSection in the Ceremony tab.
 * Only shown when weddings.has_tea_ceremony=true. Conductor ("大妗姐"),
 * elder serving order, red-envelope amounts (privacy-handled at print),
 * and notes.
 */
export function TeaCeremonyCard({ data, onChange }: Props) {
  function update(patch: Partial<TeaCeremonyData>) {
    onChange({ ...data, ...patch });
  }

  function updateElder(id: string, patch: Partial<TeaElder>) {
    update({
      elders: data.elders.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  }

  function addElder() {
    update({
      elders: [
        ...data.elders,
        { id: crypto.randomUUID(), relation: "", name: "", envelope_amount: "", notes: "" },
      ],
    });
  }

  function removeElder(id: string) {
    update({ elders: data.elders.filter((e) => e.id !== id) });
  }

  function moveElder(id: string, direction: "up" | "down") {
    const idx = data.elders.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= data.elders.length) return;
    const next = [...data.elders];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    update({ elders: next });
  }

  const namedElders = data.elders.filter((e) => e.relation?.trim() || e.name?.trim());

  // ── Summary chips ─────────────────────────────────────────────────
  const chips: SectionSummaryChip[] = useMemo(() => {
    const c: SectionSummaryChip[] = [];
    if (namedElders.length > 0) {
      c.push({ label: `${namedElders.length} to serve`, tone: "neutral" });
    }
    if (data.host?.trim()) {
      c.push({ label: `Host: ${data.host.trim()}`, tone: "muted" });
    }
    return c;
  }, [namedElders.length, data.host]);

  return (
    <CollapsibleSection
      icon={<span className="text-[17px] leading-none">🍵</span>}
      title="Tea Ceremony"
      hint="敬茶 · Honor elders with tea"
      summaryChips={chips}
      emptyLabel="Plan the order"
    >
      <div className="space-y-5">
        {/* Basics row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground">
              Location
            </label>
            <Input
              placeholder="Bridal suite, hotel, family home…"
              value={data.location}
              onChange={(e) => update({ location: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground">
              Host / 大妗姐
            </label>
            <Input
              placeholder="Who conducts the ceremony"
              value={data.host}
              onChange={(e) => update({ host: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground">
              Tea type
            </label>
            <Input
              placeholder="Long Jing, 龙凤呈祥, etc."
              value={data.tea_type}
              onChange={(e) => update({ tea_type: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground">
              Tea set
            </label>
            <Select
              value={data.tea_set_source || ""}
              onValueChange={(v) =>
                update({ tea_set_source: (v as TeaCeremonyData["tea_set_source"]) || "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bring_own">
                  {TEA_SET_LABELS.bring_own}
                </SelectItem>
                <SelectItem value="rental">{TEA_SET_LABELS.rental}</SelectItem>
                <SelectItem value="venue_provided">
                  {TEA_SET_LABELS.venue_provided}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Elder order table */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <div>
              <h4 className="text-sm font-medium">Serving order</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tradition: groom's side → bride's side, elders first. Reorder freely.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addElder}
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              Add elder
            </Button>
          </div>

          {data.elders.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-3">
              No elders added yet. Click "Add elder" to start.
            </p>
          ) : (
            <div className="space-y-2">
              {data.elders.map((elder, i) => (
                <div
                  key={elder.id}
                  className="rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-5 text-center">
                      {i + 1}
                    </span>
                    <Input
                      placeholder="Relation (e.g. Groom's father)"
                      value={elder.relation}
                      onChange={(e) =>
                        updateElder(elder.id, { relation: e.target.value })
                      }
                      className="flex-1 h-9"
                    />
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveElder(elder.id, "up")}
                        disabled={i === 0}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <GripVertical className="h-3.5 w-3.5 rotate-180" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveElder(elder.id, "down")}
                        disabled={i === data.elders.length - 1}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeElder(elder.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-7">
                    <Input
                      placeholder="Name (optional)"
                      value={elder.name}
                      onChange={(e) =>
                        updateElder(elder.id, { name: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder="Envelope ($88)"
                      value={elder.envelope_amount}
                      onChange={(e) =>
                        updateElder(elder.id, { envelope_amount: e.target.value })
                      }
                      className="h-8 text-sm"
                      title="Private by default — hidden when printing unless you choose to include"
                    />
                    <Input
                      placeholder="Notes (dietary, etc.)"
                      value={elder.notes}
                      onChange={(e) =>
                        updateElder(elder.id, { notes: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            Envelope amounts are private by default — they stay hidden when printing.
          </p>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-[12px] font-medium text-muted-foreground">
            General notes
          </label>
          <Textarea
            placeholder="Logistics, elder absences, backup plans…"
            value={data.notes}
            onChange={(e) => update({ notes: e.target.value })}
            rows={2}
          />
        </div>
      </div>
    </CollapsibleSection>
  );
}
