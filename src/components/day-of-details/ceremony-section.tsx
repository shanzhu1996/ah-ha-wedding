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
import { X, Plus, Wand2 } from "lucide-react";
import type { CeremonyData, ProcessionalEntry, ReadingEntry } from "./types";

// Quick-fill presets for empty fields only (non-destructive).
const CEREMONY_PRESETS: Record<
  string,
  { vows_style: CeremonyData["vows_style"]; unity_ceremony: CeremonyData["unity_ceremony"]; recessional_style: CeremonyData["recessional_style"] }
> = {
  traditional: {
    vows_style: "traditional",
    unity_ceremony: "none",
    recessional_style: "together",
  },
  modern: {
    vows_style: "custom",
    unity_ceremony: "none",
    recessional_style: "together",
  },
};

interface CeremonySectionProps {
  data: CeremonyData;
  onChange: (data: CeremonyData) => void;
}

export function CeremonySection({ data, onChange }: CeremonySectionProps) {
  function applyPreset(preset: keyof typeof CEREMONY_PRESETS) {
    const p = CEREMONY_PRESETS[preset];
    // Only fill empty fields — never overwrite user choices.
    onChange({
      ...data,
      vows_style: data.vows_style || p.vows_style,
      unity_ceremony: data.unity_ceremony || p.unity_ceremony,
      recessional_style: data.recessional_style || p.recessional_style,
    });
  }

  const anyMainFieldSet =
    !!data.vows_style || !!data.unity_ceremony || !!data.recessional_style;

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
      processional: [...data.processional, { id: crypto.randomUUID(), role: "", name: "" }],
    });
  }

  function removeProcessional(id: string) {
    onChange({ ...data, processional: data.processional.filter((e) => e.id !== id) });
  }

  function updateReading(id: string, field: keyof ReadingEntry, value: string) {
    onChange({
      ...data,
      readings: data.readings.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    });
  }

  function addReading() {
    onChange({
      ...data,
      readings: [...data.readings, { id: crypto.randomUUID(), reader: "", title: "", notes: "" }],
    });
  }

  function removeReading(id: string) {
    onChange({ ...data, readings: data.readings.filter((r) => r.id !== id) });
  }

  return (
    <div className="space-y-8">
      {/* Quick fill — non-destructive, fills empty fields only */}
      {!anyMainFieldSet && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Wand2 className="h-3 w-3" /> Quick fill:
          </span>
          <button
            type="button"
            onClick={() => applyPreset("traditional")}
            className="text-xs px-2.5 py-1 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Traditional
          </button>
          <button
            type="button"
            onClick={() => applyPreset("modern")}
            className="text-xs px-2.5 py-1 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Modern
          </button>
          <span className="text-[10px] text-muted-foreground/60">
            Fills empty fields — never overwrites your choices.
          </span>
        </div>
      )}

      {/* Processional Order */}
      <div>
        <h4 className="text-sm font-medium mb-1">Processional Order</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Who walks down the aisle and in what order? List them top to bottom.
        </p>
        <div className="space-y-2">
          {(data.processional || []).map((entry, i) => (
            <div key={entry.id} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/50 w-5 text-right shrink-0">{i + 1}</span>
              <Input placeholder="Role" value={entry.role} onChange={(e) => updateProcessional(entry.id, "role", e.target.value)} className="flex-1 h-9 text-sm" />
              <Input placeholder="Name" value={entry.name} onChange={(e) => updateProcessional(entry.id, "name", e.target.value)} className="flex-1 h-9 text-sm" />
              <button onClick={() => removeProcessional(entry.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addProcessional} className="mt-3 gap-1.5 text-xs">
          <Plus className="h-3 w-3" />Add to processional
        </Button>
      </div>

      {/* Readings */}
      <div>
        <h4 className="text-sm font-medium mb-1">Readings</h4>
        <p className="text-xs text-muted-foreground mb-3">Any readings or poems during the ceremony?</p>
        {(data.readings || []).length === 0 && (
          <p className="text-xs text-muted-foreground/50 italic mb-3">No readings added yet. Many ceremonies include 1–2 readings.</p>
        )}
        <div className="space-y-3">
          {(data.readings || []).map((r) => (
            <div key={r.id} className="flex items-start gap-2">
              <div className="flex-1 space-y-1.5">
                <div className="flex gap-2">
                  <Input placeholder="Reader name" value={r.reader} onChange={(e) => updateReading(r.id, "reader", e.target.value)} className="h-9 text-sm" />
                  <Input placeholder="Reading title" value={r.title} onChange={(e) => updateReading(r.id, "title", e.target.value)} className="h-9 text-sm" />
                </div>
                <Input placeholder="Notes (optional)" value={r.notes} onChange={(e) => updateReading(r.id, "notes", e.target.value)} className="h-9 text-sm text-muted-foreground" />
              </div>
              <button onClick={() => removeReading(r.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 mt-1.5 shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addReading} className="mt-3 gap-1.5 text-xs">
          <Plus className="h-3 w-3" />Add reading
        </Button>
      </div>

      {/* Vows */}
      <div>
        <h4 className="text-sm font-medium mb-1">Vows</h4>
        <p className="text-xs text-muted-foreground mb-3">Writing your own, traditional, or a mix?</p>
        <div className="flex flex-wrap gap-2">
          {([
            { value: "custom", label: "Write your own" },
            { value: "traditional", label: "Traditional" },
            { value: "mix", label: "Mix of both" },
          ] as const).map((opt) => (
            <button key={opt.value} onClick={() => onChange({ ...data, vows_style: opt.value })}
              className={`px-4 py-2 rounded-lg border text-sm transition-colors ${data.vows_style === opt.value ? "border-primary bg-primary/5 text-foreground" : "border-border/50 text-muted-foreground hover:border-primary/30"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Unity Ceremony */}
      <div>
        <h4 className="text-sm font-medium mb-1">Unity Ceremony</h4>
        <p className="text-xs text-muted-foreground mb-3">Totally optional — many couples skip this.</p>
        <Select value={data.unity_ceremony || undefined} onValueChange={(v) => onChange({ ...data, unity_ceremony: (v ?? "none") as CeremonyData["unity_ceremony"] })}>
          <SelectTrigger className="w-full sm:w-64 h-9 text-sm"><SelectValue placeholder="Choose one (or skip)" /></SelectTrigger>
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
          <Textarea placeholder="Details about your unity ceremony..." value={data.unity_notes} onChange={(e) => onChange({ ...data, unity_notes: e.target.value })} className="mt-3 text-sm min-h-[80px]" />
        )}
      </div>

      {/* Recessional */}
      <div>
        <h4 className="text-sm font-medium mb-1">Recessional</h4>
        <p className="text-xs text-muted-foreground mb-3">How does everyone exit?</p>
        <div className="flex flex-wrap gap-2">
          {([
            { value: "together", label: "Couple exits together" },
            { value: "bridal_party_first", label: "Bridal party exits first" },
          ] as const).map((opt) => (
            <button key={opt.value} onClick={() => onChange({ ...data, recessional_style: opt.value })}
              className={`px-4 py-2 rounded-lg border text-sm transition-colors ${data.recessional_style === opt.value ? "border-primary bg-primary/5 text-foreground" : "border-border/50 text-muted-foreground hover:border-primary/30"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Officiant Notes */}
      <div>
        <h4 className="text-sm font-medium mb-1">Notes for your officiant</h4>
        <p className="text-xs text-muted-foreground mb-3">Tone, topics to include or avoid, cultural elements, etc.</p>
        <Textarea placeholder="e.g., Keep it under 20 minutes. Mention how we met at the coffee shop." value={data.officiant_notes} onChange={(e) => onChange({ ...data, officiant_notes: e.target.value })} className="text-sm min-h-[100px]" />
      </div>

      {/* Cultural/Religious */}
      <div>
        <h4 className="text-sm font-medium mb-1">Cultural or religious traditions</h4>
        <p className="text-xs text-muted-foreground mb-3">Breaking of the glass, tea ceremony, jumping the broom, or any traditions you want to include.</p>
        <Textarea placeholder="Describe any cultural or religious elements for your ceremony..." value={data.cultural_notes} onChange={(e) => onChange({ ...data, cultural_notes: e.target.value })} className="text-sm min-h-[80px]" />
      </div>
    </div>
  );
}
