"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { X, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReceptionData, ParentDance, SpeechEntry } from "./types";

interface ReceptionSectionProps {
  data: ReceptionData;
  onChange: (data: ReceptionData) => void;
}

export function ReceptionSection({ data, onChange }: ReceptionSectionProps) {
  const set = (patch: Partial<ReceptionData>) => onChange({ ...data, ...patch });

  function updateParentDance(id: string, patch: Partial<ParentDance>) {
    set({ parent_dances: data.parent_dances.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
  }
  function addParentDance() {
    set({ parent_dances: [...data.parent_dances, { id: crypto.randomUUID(), who: "", song: "", artist: "" }] });
  }
  function removeParentDance(id: string) {
    set({ parent_dances: data.parent_dances.filter((d) => d.id !== id) });
  }

  function addSpeech() {
    set({ speeches: [...(data.speeches || []), { id: crypto.randomUUID(), speaker: "" }] });
  }
  function updateSpeech(id: string, speaker: string) {
    set({ speeches: (data.speeches || []).map((s) => (s.id === id ? { ...s, speaker } : s)) });
  }
  function removeSpeech(id: string) {
    set({ speeches: (data.speeches || []).filter((s) => s.id !== id) });
  }

  return (
    <div className="space-y-8">
      {/* Grand Entrance */}
      <div>
        <h4 className="text-sm font-medium mb-1">Grand Entrance</h4>
        <p className="text-xs text-muted-foreground mb-3">Make a dramatic entrance into the reception?</p>
        <div className="flex items-center gap-2 mb-3">
          <Checkbox checked={data.grand_entrance} onCheckedChange={(v) => set({ grand_entrance: !!v })} />
          <span className="text-sm">Make a grand entrance</span>
        </div>
        {data.grand_entrance && (
          <Input placeholder="Entrance song" value={data.grand_entrance_song} onChange={(e) => set({ grand_entrance_song: e.target.value })} className="h-9 text-sm max-w-md" />
        )}
      </div>

      {/* First Dance */}
      <div>
        <h4 className="text-sm font-medium mb-1">First Dance</h4>
        <p className="text-xs text-muted-foreground mb-3">Your first dance as a married couple.</p>
        <div className="flex gap-2 max-w-lg">
          <Input placeholder="Song title" value={data.first_dance_song} onChange={(e) => set({ first_dance_song: e.target.value })} className="h-9 text-sm flex-1" />
          <Input placeholder="Artist" value={data.first_dance_artist} onChange={(e) => set({ first_dance_artist: e.target.value })} className="h-9 text-sm flex-1" />
        </div>
        <Textarea placeholder="Notes (e.g., choreographed? surprise mashup?)" value={data.first_dance_notes} onChange={(e) => set({ first_dance_notes: e.target.value })} className="mt-2 text-sm min-h-[60px] max-w-lg" />
      </div>

      {/* Parent Dances */}
      <div>
        <h4 className="text-sm font-medium mb-1">Parent Dances</h4>
        <p className="text-xs text-muted-foreground mb-3">Special dances with parents or family.</p>
        <div className="space-y-2">
          {(data.parent_dances || []).map((d) => (
            <div key={d.id} className="flex items-center gap-2">
              <Input placeholder="Who (e.g., Bride & Father)" value={d.who} onChange={(e) => updateParentDance(d.id, { who: e.target.value })} className="flex-1 h-9 text-sm" />
              <Input placeholder="Song" value={d.song} onChange={(e) => updateParentDance(d.id, { song: e.target.value })} className="flex-1 h-9 text-sm" />
              <Input placeholder="Artist" value={d.artist} onChange={(e) => updateParentDance(d.id, { artist: e.target.value })} className="w-32 h-9 text-sm" />
              <button onClick={() => removeParentDance(d.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addParentDance} className="mt-3 gap-1.5 text-xs">
          <Plus className="h-3 w-3" />Add parent dance
        </Button>
      </div>

      {/* Speeches */}
      <div>
        <h4 className="text-sm font-medium mb-1">Speeches & Toasts</h4>
        <p className="text-xs text-muted-foreground mb-3">Who's speaking and in what order? List top to bottom.</p>
        <div className="space-y-2">
          {(data.speeches || []).map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/50 w-5 text-right shrink-0">{i + 1}</span>
              <Input placeholder="Speaker name & role" value={s.speaker} onChange={(e) => updateSpeech(s.id, e.target.value)} className="flex-1 h-9 text-sm" />
              <button onClick={() => removeSpeech(s.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addSpeech} className="mt-3 gap-1.5 text-xs">
          <Plus className="h-3 w-3" />Add speaker
        </Button>
      </div>

      {/* Vendor Meals */}
      <div>
        <h4 className="text-sm font-medium mb-1">Vendor Meals</h4>
        <p className="text-xs text-muted-foreground mb-3">When should vendors eat? Usually during speeches or between courses.</p>
        <Textarea placeholder="e.g., Vendors eat during speeches. DJ eats first, then photographer." value={data.vendor_meals_note} onChange={(e) => set({ vendor_meals_note: e.target.value })} className="text-sm min-h-[60px]" />
      </div>

      {/* Activities */}
      <div>
        <h4 className="text-sm font-medium mb-1">Reception Activities</h4>
        <p className="text-xs text-muted-foreground mb-3">Which traditions are you including?</p>
        <div className="flex flex-wrap gap-4">
          {([
            ["bouquet_toss", "Bouquet toss"],
            ["garter_toss", "Garter toss"],
            ["anniversary_dance", "Anniversary dance"],
            ["shoe_game", "Shoe game"],
            ["cake_cutting", "Cake cutting"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox checked={(data as any)[key]} onCheckedChange={(v) => set({ [key]: !!v } as any)} />
              {label}
            </label>
          ))}
        </div>
        {data.cake_cutting && (
          <Input placeholder="Cake cutting song" value={data.cake_cutting_song} onChange={(e) => set({ cake_cutting_song: e.target.value })} className="mt-3 h-9 text-sm max-w-md" />
        )}
      </div>

      {/* Last Dance */}
      <div>
        <h4 className="text-sm font-medium mb-1">Last Dance</h4>
        <div className="flex gap-2 max-w-lg">
          <Input placeholder="Song title" value={data.last_dance_song} onChange={(e) => set({ last_dance_song: e.target.value })} className="h-9 text-sm flex-1" />
          <Input placeholder="Artist" value={data.last_dance_artist} onChange={(e) => set({ last_dance_artist: e.target.value })} className="h-9 text-sm flex-1" />
        </div>
      </div>

      {/* Exit */}
      <div>
        <h4 className="text-sm font-medium mb-1">Exit / Send-off</h4>
        <p className="text-xs text-muted-foreground mb-3">How do you want to make your grand exit?</p>
        <Select value={data.exit_style || undefined} onValueChange={(v) => set({ exit_style: (v ?? "none") as ReceptionData["exit_style"] })}>
          <SelectTrigger className="w-full sm:w-64 h-9 text-sm"><SelectValue placeholder="Select exit style" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None / just leave</SelectItem>
            <SelectItem value="sparklers">Sparklers</SelectItem>
            <SelectItem value="bubbles">Bubbles</SelectItem>
            <SelectItem value="confetti">Confetti</SelectItem>
            <SelectItem value="ribbon_wands">Ribbon wands</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {data.exit_style && data.exit_style !== "none" && (
          <Input placeholder="Exit song" value={data.exit_song} onChange={(e) => set({ exit_song: e.target.value })} className="mt-3 h-9 text-sm max-w-md" />
        )}
      </div>

      {/* Seating link */}
      <div className="pt-2">
        <Link href="/seating" className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary transition-colors">
          Arrange your tables → Open Seating
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Cultural */}
      <div>
        <h4 className="text-sm font-medium mb-1">Cultural or religious traditions</h4>
        <p className="text-xs text-muted-foreground mb-3">Hora, money dance, or any reception traditions you want to include.</p>
        <Textarea placeholder="Describe any cultural or religious reception elements..." value={data.cultural_notes} onChange={(e) => set({ cultural_notes: e.target.value })} className="text-sm min-h-[80px]" />
      </div>
    </div>
  );
}
