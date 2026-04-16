"use client";

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
import { X, Plus } from "lucide-react";
import type { CeremonyData, ProcessionalEntry, ReadingEntry } from "./day-planner-types";
export type { CeremonyData } from "./day-planner-types";
export { getDefaultCeremonyData } from "./day-planner-types";

// ── Component ──────────────────────────────────────────────────────────

interface CeremonySectionProps {
  data: CeremonyData;
  onChange: (data: CeremonyData) => void;
}

export function CeremonySection({ data, onChange }: CeremonySectionProps) {
  // ── Processional helpers ──
  function updateProcessional(id: string, field: keyof ProcessionalEntry, value: string) {
    onChange({
      ...data,
      processional: data.processional.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      ),
    });
  }

  function addProcessional() {
    onChange({
      ...data,
      processional: [
        ...data.processional,
        { id: crypto.randomUUID(), role: "", name: "" },
      ],
    });
  }

  function removeProcessional(id: string) {
    onChange({
      ...data,
      processional: data.processional.filter((e) => e.id !== id),
    });
  }

  // ── Readings helpers ──
  function updateReading(id: string, field: keyof ReadingEntry, value: string) {
    onChange({
      ...data,
      readings: data.readings.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    });
  }

  function addReading() {
    onChange({
      ...data,
      readings: [
        ...data.readings,
        { id: crypto.randomUUID(), reader: "", title: "", notes: "" },
      ],
    });
  }

  function removeReading(id: string) {
    onChange({
      ...data,
      readings: data.readings.filter((r) => r.id !== id),
    });
  }

  return (
    <div className="space-y-8">
      {/* Processional Order */}
      <div>
        <h4 className="text-sm font-medium mb-1">Processional Order</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Who walks down the aisle and in what order? List them top to bottom.
        </p>
        <div className="space-y-2">
          {data.processional.map((entry, i) => (
            <div key={entry.id} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/50 w-5 text-right shrink-0">
                {i + 1}
              </span>
              <Input
                placeholder="Role (e.g., Mother of the Bride)"
                value={entry.role}
                onChange={(e) => updateProcessional(entry.id, "role", e.target.value)}
                className="flex-1 h-9 text-sm"
              />
              <Input
                placeholder="Name"
                value={entry.name}
                onChange={(e) => updateProcessional(entry.id, "name", e.target.value)}
                className="flex-1 h-9 text-sm"
              />
              <button
                onClick={() => removeProcessional(entry.id)}
                className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addProcessional}
          className="mt-3 gap-1.5 text-xs"
        >
          <Plus className="h-3 w-3" />
          Add to processional
        </Button>
      </div>

      {/* Readings */}
      <div>
        <h4 className="text-sm font-medium mb-1">Readings</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Any readings or poems during the ceremony? Add the reader and what they'll read.
        </p>
        {data.readings.length === 0 ? (
          <p className="text-xs text-muted-foreground/50 italic mb-3">
            No readings added yet. Many ceremonies include 1-2 readings.
          </p>
        ) : (
          <div className="space-y-3">
            {data.readings.map((reading) => (
              <div key={reading.id} className="flex items-start gap-2">
                <div className="flex-1 space-y-1.5">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Reader name"
                      value={reading.reader}
                      onChange={(e) => updateReading(reading.id, "reader", e.target.value)}
                      className="h-9 text-sm"
                    />
                    <Input
                      placeholder="Reading title or source"
                      value={reading.title}
                      onChange={(e) => updateReading(reading.id, "title", e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <Input
                    placeholder="Notes (optional)"
                    value={reading.notes}
                    onChange={(e) => updateReading(reading.id, "notes", e.target.value)}
                    className="h-9 text-sm text-muted-foreground"
                  />
                </div>
                <button
                  onClick={() => removeReading(reading.id)}
                  className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 mt-1.5 shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={addReading}
          className="mt-3 gap-1.5 text-xs"
        >
          <Plus className="h-3 w-3" />
          Add reading
        </Button>
      </div>

      {/* Vows Style */}
      <div>
        <h4 className="text-sm font-medium mb-1">Vows</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Are you writing your own vows, using traditional ones, or a mix?
        </p>
        <div className="flex flex-wrap gap-2">
          {([
            { value: "custom", label: "Write your own" },
            { value: "traditional", label: "Traditional" },
            { value: "mix", label: "Mix of both" },
          ] as const).map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ ...data, vows_style: option.value })}
              className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                data.vows_style === option.value
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border/50 text-muted-foreground hover:border-primary/30"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Unity Ceremony */}
      <div>
        <h4 className="text-sm font-medium mb-1">Unity Ceremony</h4>
        <p className="text-xs text-muted-foreground mb-3">
          A symbolic ritual during the ceremony. Totally optional — many couples skip this.
        </p>
        <Select
          value={data.unity_ceremony || undefined}
          onValueChange={(v) => onChange({ ...data, unity_ceremony: v as CeremonyData["unity_ceremony"] })}
        >
          <SelectTrigger className="w-full sm:w-64 h-9 text-sm">
            <SelectValue placeholder="Choose one (or skip)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="sand">Sand ceremony</SelectItem>
            <SelectItem value="candle">Candle lighting</SelectItem>
            <SelectItem value="handfasting">Handfasting</SelectItem>
            <SelectItem value="wine_box">Wine box ceremony</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {data.unity_ceremony && data.unity_ceremony !== "none" && (
          <Textarea
            placeholder="Any details or notes about your unity ceremony..."
            value={data.unity_notes}
            onChange={(e) => onChange({ ...data, unity_notes: e.target.value })}
            className="mt-3 text-sm min-h-[80px]"
          />
        )}
      </div>

      {/* Recessional */}
      <div>
        <h4 className="text-sm font-medium mb-1">Recessional</h4>
        <p className="text-xs text-muted-foreground mb-3">
          How does everyone exit after the ceremony?
        </p>
        <div className="flex flex-wrap gap-2">
          {([
            { value: "together", label: "Couple exits together" },
            { value: "bridal_party_first", label: "Bridal party exits first" },
          ] as const).map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ ...data, recessional_style: option.value })}
              className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                data.recessional_style === option.value
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border/50 text-muted-foreground hover:border-primary/30"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Officiant Notes */}
      <div>
        <h4 className="text-sm font-medium mb-1">Notes for your officiant</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Anything specific you want your officiant to know — tone, topics to include or avoid, cultural elements, etc.
        </p>
        <Textarea
          placeholder="e.g., Keep it under 20 minutes. No religious references. Mention how we met at the coffee shop."
          value={data.officiant_notes}
          onChange={(e) => onChange({ ...data, officiant_notes: e.target.value })}
          className="text-sm min-h-[100px]"
        />
      </div>
    </div>
  );
}
