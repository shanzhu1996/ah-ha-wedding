"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { CocktailData } from "./types";

interface CocktailSectionProps {
  data: CocktailData;
  onChange: (data: CocktailData) => void;
}

function RadioCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
        selected
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border/50 text-muted-foreground hover:border-primary/30"
      }`}
    >
      {label}
    </button>
  );
}

export function CocktailSection({ data, onChange }: CocktailSectionProps) {
  function update(patch: Partial<CocktailData>) {
    onChange({ ...data, ...patch });
  }

  return (
    <div className="space-y-8">
      {/* Location */}
      <div>
        <h4 className="text-sm font-medium mb-1">Location</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Where will cocktail hour take place?
        </p>
        <div className="flex flex-wrap gap-2">
          <RadioCard
            label="Same venue"
            selected={data.location === "same_venue"}
            onClick={() => update({ location: "same_venue" })}
          />
          <RadioCard
            label="Different area"
            selected={data.location === "different_area"}
            onClick={() => update({ location: "different_area" })}
          />
          <RadioCard
            label="Outdoor"
            selected={data.location === "outdoor"}
            onClick={() => update({ location: "outdoor" })}
          />
        </div>
      </div>

      {/* Duration */}
      <div>
        <h4 className="text-sm font-medium mb-1">Duration</h4>
        <p className="text-xs text-muted-foreground mb-3">
          How long should cocktail hour last?
        </p>
        <div className="flex flex-wrap gap-2">
          <RadioCard
            label="45 min"
            selected={data.duration === "45"}
            onClick={() => update({ duration: "45" })}
          />
          <RadioCard
            label="60 min"
            selected={data.duration === "60"}
            onClick={() => update({ duration: "60" })}
          />
          <RadioCard
            label="90 min"
            selected={data.duration === "90"}
            onClick={() => update({ duration: "90" })}
          />
        </div>
      </div>

      {/* Activities */}
      <div>
        <h4 className="text-sm font-medium mb-1">Activities</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Select any entertainment you'd like during cocktail hour
        </p>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={data.activities_lawn_games}
              onCheckedChange={(checked) =>
                update({ activities_lawn_games: checked === true })
              }
            />
            Lawn games
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={data.activities_photo_booth}
              onCheckedChange={(checked) =>
                update({ activities_photo_booth: checked === true })
              }
            />
            Photo booth
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={data.activities_live_music}
              onCheckedChange={(checked) =>
                update({ activities_live_music: checked === true })
              }
            />
            Live music
          </label>
        </div>
      </div>

      {/* Music Mood */}
      <div>
        <h4 className="text-sm font-medium mb-1">Music Mood</h4>
        <p className="text-xs text-muted-foreground mb-3">
          What vibe are you going for?
        </p>
        <div className="flex flex-wrap gap-2">
          <RadioCard
            label="Background jazz"
            selected={data.music_mood === "background_jazz"}
            onClick={() => update({ music_mood: "background_jazz" })}
          />
          <RadioCard
            label="Acoustic"
            selected={data.music_mood === "acoustic"}
            onClick={() => update({ music_mood: "acoustic" })}
          />
          <RadioCard
            label="DJ playlist"
            selected={data.music_mood === "dj_playlist"}
            onClick={() => update({ music_mood: "dj_playlist" })}
          />
          <RadioCard
            label="Live band"
            selected={data.music_mood === "live_band"}
            onClick={() => update({ music_mood: "live_band" })}
          />
        </div>
      </div>

      {/* Catering Notes */}
      <div>
        <h4 className="text-sm font-medium mb-1">Catering Notes</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Describe the food and drink setup
        </p>
        <Textarea
          value={data.catering_notes}
          onChange={(e) => update({ catering_notes: e.target.value })}
          placeholder="Passed hors d'oeuvres, stationed apps, signature cocktails..."
          rows={3}
        />
      </div>

      {/* Photos during cocktail hour */}
      <div>
        <h4 className="text-sm font-medium mb-1">
          Photos during cocktail hour?
        </h4>
        <p className="text-xs text-muted-foreground mb-3">
          Will the photographer capture candids or portraits during this time?
        </p>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={data.photos_during}
            onCheckedChange={(checked) =>
              update({ photos_during: checked === true })
            }
          />
          Yes, include photos during cocktail hour
        </label>
        {data.photos_during && (
          <Textarea
            className="mt-3"
            value={data.photos_notes}
            onChange={(e) => update({ photos_notes: e.target.value })}
            placeholder="Specific shots, couple portraits, guest candids..."
            rows={2}
          />
        )}
      </div>

      {/* Cultural / Religious Elements */}
      <div>
        <h4 className="text-sm font-medium mb-1">
          Cultural / Religious Elements
        </h4>
        <p className="text-xs text-muted-foreground mb-3">
          Any traditions or customs to incorporate during cocktail hour?
        </p>
        <Textarea
          value={data.cultural_notes}
          onChange={(e) => update({ cultural_notes: e.target.value })}
          placeholder="Special toasts, traditions, or customs..."
          rows={3}
        />
      </div>
    </div>
  );
}
