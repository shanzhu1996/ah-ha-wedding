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
import { X } from "lucide-react";
import type { ReceptionData, ParentDance, SpeechEntry } from "./day-planner-types";
export type { ReceptionData } from "./day-planner-types";
export { getDefaultReceptionData } from "./day-planner-types";

// ── Helpers ────────────────────────────────────────────────────────────

function update<T extends ReceptionData>(
  data: T,
  onChange: (d: T) => void,
  patch: Partial<T>,
) {
  onChange({ ...data, ...patch });
}

// ── Component ──────────────────────────────────────────────────────────

interface ReceptionSectionProps {
  data: ReceptionData;
  onChange: (data: ReceptionData) => void;
}

export function ReceptionSection({ data, onChange }: ReceptionSectionProps) {
  const set = (patch: Partial<ReceptionData>) => update(data, onChange, patch);

  // ── Parent dance helpers ──
  function updateParentDance(id: string, patch: Partial<ParentDance>) {
    set({
      parent_dances: data.parent_dances.map((d) =>
        d.id === id ? { ...d, ...patch } : d,
      ),
    });
  }

  function addParentDance() {
    set({
      parent_dances: [
        ...data.parent_dances,
        { id: crypto.randomUUID(), who: "", song: "", artist: "" },
      ],
    });
  }

  function removeParentDance(id: string) {
    set({ parent_dances: data.parent_dances.filter((d) => d.id !== id) });
  }

  // ── Speech helpers ──
  function addSpeech() {
    set({
      speeches: [
        ...data.speeches,
        {
          id: crypto.randomUUID(),
          speaker: "",
          order: data.speeches.length + 1,
        },
      ],
    });
  }

  function updateSpeech(id: string, patch: Partial<SpeechEntry>) {
    set({
      speeches: data.speeches.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    });
  }

  function removeSpeech(id: string) {
    const updated = data.speeches
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, order: i + 1 }));
    set({ speeches: updated });
  }

  return (
    <div className="space-y-8">
      {/* ── Grand Entrance ── */}
      <section>
        <h4 className="text-sm font-medium mb-3">Grand Entrance</h4>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={data.grand_entrance}
            onCheckedChange={(checked) =>
              set({ grand_entrance: checked === true })
            }
          />
          <span className="text-sm">Make a grand entrance?</span>
        </label>
        {data.grand_entrance && (
          <div className="mt-3">
            <Input
              placeholder="Entrance song"
              value={data.grand_entrance_song}
              onChange={(e) => set({ grand_entrance_song: e.target.value })}
            />
          </div>
        )}
      </section>

      {/* ── First Dance ── */}
      <section>
        <h4 className="text-sm font-medium mb-3">First Dance</h4>
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Song title"
            value={data.first_dance_song}
            onChange={(e) => set({ first_dance_song: e.target.value })}
          />
          <Input
            placeholder="Artist"
            value={data.first_dance_artist}
            onChange={(e) => set({ first_dance_artist: e.target.value })}
          />
        </div>
        <Textarea
          className="mt-3"
          placeholder="Notes (e.g., start with slow dance, then surprise choreography)"
          value={data.first_dance_notes}
          onChange={(e) => set({ first_dance_notes: e.target.value })}
          rows={2}
        />
      </section>

      {/* ── Parent Dances ── */}
      <section>
        <h4 className="text-sm font-medium mb-3">Parent Dances</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Add dances with parents or other family members.
        </p>
        <div className="space-y-3">
          {data.parent_dances.map((dance) => (
            <div key={dance.id} className="flex items-start gap-2">
              <Input
                className="flex-1"
                placeholder="Who (e.g., Bride & Father)"
                value={dance.who}
                onChange={(e) =>
                  updateParentDance(dance.id, { who: e.target.value })
                }
              />
              <Input
                className="flex-1"
                placeholder="Song"
                value={dance.song}
                onChange={(e) =>
                  updateParentDance(dance.id, { song: e.target.value })
                }
              />
              <Input
                className="flex-1"
                placeholder="Artist"
                value={dance.artist}
                onChange={(e) =>
                  updateParentDance(dance.id, { artist: e.target.value })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 mt-0.5"
                onClick={() => removeParentDance(dance.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={addParentDance}
        >
          + Add parent dance
        </Button>
      </section>

      {/* ── Speeches & Toasts ── */}
      <section>
        <h4 className="text-sm font-medium mb-3">Speeches &amp; Toasts</h4>
        <p className="text-xs text-muted-foreground mb-3">
          List speakers in the order they will speak.
        </p>
        <div className="space-y-3">
          {data.speeches.map((speech, index) => (
            <div key={speech.id} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">
                {index + 1}.
              </span>
              <Input
                className="flex-1"
                placeholder="Speaker name"
                value={speech.speaker}
                onChange={(e) =>
                  updateSpeech(speech.id, { speaker: e.target.value })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => removeSpeech(speech.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={addSpeech}
        >
          + Add speaker
        </Button>
      </section>

      {/* ── Reception Activities ── */}
      <section>
        <h4 className="text-sm font-medium mb-3">Reception Activities</h4>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={data.bouquet_toss}
              onCheckedChange={(checked) =>
                set({ bouquet_toss: checked === true })
              }
            />
            <span className="text-sm">Bouquet Toss</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={data.garter_toss}
              onCheckedChange={(checked) =>
                set({ garter_toss: checked === true })
              }
            />
            <span className="text-sm">Garter Toss</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={data.cake_cutting}
              onCheckedChange={(checked) =>
                set({ cake_cutting: checked === true })
              }
            />
            <span className="text-sm">Cake Cutting</span>
          </label>
        </div>
        {data.cake_cutting && (
          <div className="mt-3">
            <Input
              placeholder="Cake cutting song"
              value={data.cake_cutting_song}
              onChange={(e) => set({ cake_cutting_song: e.target.value })}
            />
          </div>
        )}
      </section>

      {/* ── Last Dance ── */}
      <section>
        <h4 className="text-sm font-medium mb-3">Last Dance</h4>
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Song title"
            value={data.last_dance_song}
            onChange={(e) => set({ last_dance_song: e.target.value })}
          />
          <Input
            placeholder="Artist"
            value={data.last_dance_artist}
            onChange={(e) => set({ last_dance_artist: e.target.value })}
          />
        </div>
      </section>

      {/* ── Exit / Send-off ── */}
      <section>
        <h4 className="text-sm font-medium mb-3">Exit / Send-off</h4>
        <p className="text-xs text-muted-foreground mb-3">
          How would you like to make your grand exit?
        </p>
        <Select
          value={data.exit_style || undefined}
          onValueChange={(val) =>
            set({
              exit_style: (val ?? "none") as ReceptionData["exit_style"],
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select exit style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="sparklers">Sparklers</SelectItem>
            <SelectItem value="bubbles">Bubbles</SelectItem>
            <SelectItem value="confetti">Confetti</SelectItem>
            <SelectItem value="ribbon_wands">Ribbon Wands</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {data.exit_style && data.exit_style !== "none" && (
          <div className="mt-3">
            <Input
              placeholder="Exit song"
              value={data.exit_song}
              onChange={(e) => set({ exit_song: e.target.value })}
            />
          </div>
        )}
      </section>
    </div>
  );
}
