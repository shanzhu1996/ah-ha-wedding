"use client";

import { useMemo, useState } from "react";
import {
  MapPin,
  Hourglass,
  Music,
  Gamepad2,
  UtensilsCrossed,
  Camera,
  Flame,
  Wand2,
  Plus,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CocktailData } from "./types";
import { PHOTOGRAPHER_FOCUS_OPTIONS } from "./types";
import {
  CollapsibleSection,
  type SectionSummaryChip,
} from "./collapsible-section";
import { MusicLink, summarizeSongs } from "./music-link";
import { AutosaveIndicator } from "./save-indicator";
import type { WeddingSong } from "./day-stepper";

const LOCATION_LABEL: Record<
  NonNullable<CocktailData["location"]>,
  string
> = {
  "": "",
  same_venue: "Same venue",
  different_area: "Different area",
  outdoor: "Outdoor",
};

const DURATION_LABEL: Record<
  NonNullable<CocktailData["duration"]>,
  string
> = {
  "": "",
  "45": "45 min",
  "60": "60 min",
  "90": "90 min",
  custom: "Custom",
};

const MOOD_LABEL: Record<
  NonNullable<CocktailData["music_mood"]>,
  string
> = {
  "": "",
  background_jazz: "Background jazz",
  acoustic: "Acoustic",
  dj_playlist: "DJ playlist",
  live_band: "Live band",
};

interface CocktailSectionProps {
  data: CocktailData;
  onChange: (data: CocktailData) => void;
  songs?: WeddingSong[];
}

export function CocktailSection({
  data,
  onChange,
  songs = [],
}: CocktailSectionProps) {
  function update(patch: Partial<CocktailData>) {
    onChange({ ...data, ...patch });
  }

  function applyStandardPreset() {
    update({
      location: data.location || "same_venue",
      duration: data.duration || "60",
      music_mood: data.music_mood || "acoustic",
    });
  }

  const anyFieldSet = !!data.location || !!data.duration || !!data.music_mood;

  // ── Summary chips ───────────────────────────────────────────────────

  const locationLabel = data.location ? LOCATION_LABEL[data.location] : "";
  const locationChips: SectionSummaryChip[] = data.location
    ? [
        {
          label:
            locationLabel &&
            data.location !== "same_venue" &&
            data.location_detail?.trim()
              ? `${locationLabel} · ${data.location_detail.trim()}`
              : locationLabel,
          tone: "accent",
        },
      ]
    : [];

  const durationLabel = (() => {
    if (!data.duration) return "";
    if (data.duration === "custom") {
      const m = data.duration_custom?.trim();
      return m ? `${m} min` : "Custom";
    }
    return DURATION_LABEL[data.duration] || "";
  })();
  const durationChips: SectionSummaryChip[] = durationLabel
    ? [{ label: durationLabel, tone: "accent" }]
    : [];

  const cocktailSongSummary = summarizeSongs("cocktail_hour", songs, "playlist");
  const musicChips: SectionSummaryChip[] = useMemo(() => {
    const chips: SectionSummaryChip[] = [];
    if (data.music_mood) {
      chips.push({
        label: MOOD_LABEL[data.music_mood] || "",
        tone: "accent",
      });
    }
    if (cocktailSongSummary) {
      chips.push({ label: `♪ ${cocktailSongSummary}`, tone: "accent" });
    }
    return chips;
  }, [data.music_mood, cocktailSongSummary]);

  const activeActivities: string[] = [];
  if (data.activities_lawn_games) activeActivities.push("Lawn games");
  if (data.activities_photo_booth) activeActivities.push("Photo booth");
  if (data.activities_live_music) activeActivities.push("Live music");
  activeActivities.push(...(data.custom_activities || []));
  const activitiesChips: SectionSummaryChip[] =
    activeActivities.length > 0
      ? [
          {
            label:
              activeActivities.length <= 2
                ? activeActivities.join(" · ")
                : `${activeActivities[0]} · ${activeActivities[1]} +${activeActivities.length - 2}`,
            tone: "accent",
          },
        ]
      : [];

  const cateringChips: SectionSummaryChip[] = data.catering_notes?.trim()
    ? [{ label: "has notes", tone: "muted" }]
    : [];

  const focusValues = data.photographer_focus || [];
  const focusLabels = PHOTOGRAPHER_FOCUS_OPTIONS.filter((o) =>
    focusValues.includes(o.value)
  ).map((o) => o.label);
  const photosChips: SectionSummaryChip[] = (() => {
    const chips: SectionSummaryChip[] = [];
    if (focusLabels.length > 0) {
      chips.push({
        label:
          focusLabels.length <= 2
            ? focusLabels.join(" · ")
            : `${focusLabels[0]} · ${focusLabels[1]} +${focusLabels.length - 2}`,
        tone: "accent",
      });
    }
    if (data.photographer_notes?.trim()) {
      chips.push({ label: "has notes", tone: "muted" });
    }
    return chips;
  })();

  const culturalChips: SectionSummaryChip[] = data.cultural_notes?.trim()
    ? [{ label: "has notes", tone: "muted" }]
    : [];

  return (
    <div className="space-y-2">
      {!anyFieldSet && (
        <div className="flex items-center gap-2 flex-wrap pb-2">
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Wand2 className="h-3 w-3" /> Quick fill:
          </span>
          <button
            type="button"
            onClick={applyStandardPreset}
            className="text-xs px-2.5 py-1 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Standard (same venue · 60min · acoustic)
          </button>
          <span className="text-[10px] text-muted-foreground/60">
            Fills empty fields only.
          </span>
        </div>
      )}

      {/* 1. Location */}
      <CollapsibleSection
        icon={<MapPin />}
        title="Location"
        hint="where cocktail hour takes place"
        summaryChips={locationChips}
        emptyLabel="Not chosen yet"
      >
        <div className="space-y-3">
          <SegmentedChoice
            options={[
              { value: "same_venue", label: "Same venue" },
              { value: "different_area", label: "Different area" },
              { value: "outdoor", label: "Outdoor" },
            ]}
            value={data.location}
            onChange={(v) =>
              update({ location: v as CocktailData["location"] })
            }
          />
          {data.location && data.location !== "same_venue" && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              <Input
                value={data.location_detail}
                onChange={(e) => update({ location_detail: e.target.value })}
                placeholder={
                  data.location === "outdoor"
                    ? "Which outdoor spot? e.g., Rooftop patio"
                    : "Which area? e.g., Garden terrace"
                }
                className="h-9 text-sm"
              />
              <AutosaveIndicator value={data.location_detail} />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* 2. Duration */}
      <CollapsibleSection
        icon={<Hourglass />}
        title="Duration"
        hint="how long to mingle and drink"
        summaryChips={durationChips}
        emptyLabel="Not chosen yet"
      >
        <div className="space-y-3">
          <SegmentedChoice
            options={[
              { value: "45", label: "45 min" },
              { value: "60", label: "60 min" },
              { value: "90", label: "90 min" },
              { value: "custom", label: "Custom" },
            ]}
            value={data.duration}
            onChange={(v) =>
              update({ duration: v as CocktailData["duration"] })
            }
          />
          {data.duration === "custom" && (
            <div className="flex items-center gap-2">
              <Hourglass className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={data.duration_custom}
                onChange={(e) =>
                  update({ duration_custom: e.target.value })
                }
                placeholder="Minutes, e.g., 75"
                className="h-9 text-sm w-32 tabular-nums"
              />
              <span className="text-xs text-muted-foreground">min</span>
              <AutosaveIndicator value={data.duration_custom} />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* 3. Music */}
      <CollapsibleSection
        icon={<Music />}
        title="Music"
        hint="the vibe and playlist that carries the hour"
        summaryChips={musicChips}
        emptyLabel="No mood chosen"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <Music className="h-[18px] w-[18px] text-primary self-center" />
              <span className="text-[15px] font-semibold text-foreground leading-none">
                Mood
              </span>
              <span className="text-[13px] text-muted-foreground">
                — what vibe you&apos;re going for
              </span>
            </div>
            <SegmentedChoice
              options={[
                { value: "background_jazz", label: "Background jazz" },
                { value: "acoustic", label: "Acoustic" },
                { value: "dj_playlist", label: "DJ playlist" },
                { value: "live_band", label: "Live band" },
              ]}
              value={data.music_mood}
              onChange={(v) =>
                update({ music_mood: v as CocktailData["music_mood"] })
              }
            />
          </div>
          <MusicLink
            phase="cocktail_hour"
            songs={songs}
            expected="playlist"
            label="Cocktail playlist"
            hint="~15 songs, background vibes while guests mingle"
          />
        </div>
      </CollapsibleSection>

      {/* 4. Activities */}
      <CollapsibleSection
        icon={<Gamepad2 />}
        title="Activities"
        hint="optional entertainment while guests mingle"
        summaryChips={activitiesChips}
        emptyLabel="None selected"
      >
        <ActivitiesField data={data} update={update} />
      </CollapsibleSection>

      {/* 5. Catering */}
      <CollapsibleSection
        icon={<UtensilsCrossed />}
        title="Catering notes"
        hint="food and drink setup"
        summaryChips={cateringChips}
      >
        <Textarea
          value={data.catering_notes}
          onChange={(e) => update({ catering_notes: e.target.value })}
          placeholder="Passed hors d'oeuvres, stationed apps, signature cocktails…"
          className="text-sm min-h-[88px]"
        />
      </CollapsibleSection>

      {/* 6. Photographer focus */}
      <CollapsibleSection
        icon={<Camera />}
        title="Photographer focus during cocktail hour"
        hint="what to capture while guests mingle — pick any"
        summaryChips={photosChips}
        emptyLabel="Not specified"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PHOTOGRAPHER_FOCUS_OPTIONS.map((opt) => {
              const checked = focusValues.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      const next = v === true
                        ? [...focusValues, opt.value]
                        : focusValues.filter((x) => x !== opt.value);
                      update({ photographer_focus: next });
                    }}
                  />
                  <span
                    className={cn(
                      !checked && "text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </span>
                </label>
              );
            })}
          </div>
          <Textarea
            value={data.photographer_notes}
            onChange={(e) =>
              update({ photographer_notes: e.target.value })
            }
            placeholder="Notes — e.g., Couple off 5:15–5:30 for sunset portraits, then join guests"
            className="text-sm min-h-[72px]"
          />
        </div>
      </CollapsibleSection>

      {/* 7. Cultural or religious */}
      <CollapsibleSection
        icon={<Flame />}
        title="Cultural or religious elements"
        hint="toasts, traditions, or customs for this hour"
        summaryChips={culturalChips}
        emptyLabel="None — skip if not applicable"
      >
        <Textarea
          value={data.cultural_notes}
          onChange={(e) => update({ cultural_notes: e.target.value })}
          placeholder="Special toasts, traditions, or customs…"
          className="text-sm min-h-[80px]"
        />
      </CollapsibleSection>
    </div>
  );
}

// ── Activities (defaults + custom list) ──────────────────────────────

function ActivitiesField({
  data,
  update,
}: {
  data: CocktailData;
  update: (patch: Partial<CocktailData>) => void;
}) {
  const [draft, setDraft] = useState("");

  function addCustom() {
    const v = draft.trim();
    if (!v) return;
    if ((data.custom_activities || []).includes(v)) {
      setDraft("");
      return;
    }
    update({
      custom_activities: [...(data.custom_activities || []), v],
    });
    setDraft("");
  }
  function removeCustom(activity: string) {
    update({
      custom_activities: (data.custom_activities || []).filter(
        (a) => a !== activity
      ),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={data.activities_lawn_games}
            onCheckedChange={(v) =>
              update({ activities_lawn_games: v === true })
            }
          />
          <span
            className={cn(
              !data.activities_lawn_games && "text-muted-foreground"
            )}
          >
            Lawn games
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={data.activities_photo_booth}
            onCheckedChange={(v) =>
              update({ activities_photo_booth: v === true })
            }
          />
          <span
            className={cn(
              !data.activities_photo_booth && "text-muted-foreground"
            )}
          >
            Photo booth
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={data.activities_live_music}
            onCheckedChange={(v) =>
              update({ activities_live_music: v === true })
            }
          />
          <span
            className={cn(
              !data.activities_live_music && "text-muted-foreground"
            )}
          >
            Live music
          </span>
        </label>
      </div>

      {(data.custom_activities?.length ?? 0) > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground/70">
            Custom activities
          </p>
          <ul className="space-y-1">
            {(data.custom_activities || []).map((activity) => (
              <li
                key={activity}
                className="flex items-center justify-between gap-2 text-sm pl-1"
              >
                <span>{activity}</span>
                <button
                  type="button"
                  onClick={() => removeCustom(activity)}
                  className="text-muted-foreground/50 hover:text-destructive transition-colors"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add custom activity, e.g., Tarot reader, cigar bar"
          className="h-9 text-sm flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={addCustom}
          disabled={!draft.trim()}
          className="gap-1.5 text-xs shrink-0"
        >
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>
    </div>
  );
}

// ── Segmented choice ─────────────────────────────────────────────────

function SegmentedChoice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-4 py-2 rounded-lg border text-sm transition-colors",
              selected
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border/50 text-muted-foreground hover:border-primary/30"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
