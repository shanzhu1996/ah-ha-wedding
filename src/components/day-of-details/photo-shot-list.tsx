"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { PhotoShotListData, PhotoShot } from "./types";

interface PhotoShotListProps {
  data: PhotoShotListData;
  onChange: (data: PhotoShotListData) => void;
}

type CategoryKey = keyof PhotoShotListData;

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "pre_ceremony", label: "Pre-Ceremony" },
  { key: "ceremony_family", label: "Ceremony & Family" },
  { key: "reception", label: "Reception" },
];

function ShotRow({
  shot,
  onUpdate,
  onDelete,
}: {
  shot: PhotoShot;
  onUpdate: (patch: Partial<PhotoShot>) => void;
  onDelete: (() => void) | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={shot.included}
        onCheckedChange={(checked) => onUpdate({ included: checked === true })}
      />
      <Input
        value={shot.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        className={`text-sm flex-1 ${
          !shot.included ? "line-through text-muted-foreground/50" : ""
        }`}
        placeholder="Shot description"
      />
      <Input
        value={shot.notes}
        onChange={(e) => onUpdate({ notes: e.target.value })}
        className="text-xs text-muted-foreground flex-1"
        placeholder="Notes"
      />
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="text-muted-foreground/50 hover:text-destructive transition-colors shrink-0"
          aria-label="Delete shot"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function PhotoShotList({ data, onChange }: PhotoShotListProps) {
  function updateShot(
    categoryKey: CategoryKey,
    shotId: string,
    patch: Partial<PhotoShot>
  ) {
    onChange({
      ...data,
      [categoryKey]: data[categoryKey].map((s) =>
        s.id === shotId ? { ...s, ...patch } : s
      ),
    });
  }

  function deleteShot(categoryKey: CategoryKey, shotId: string) {
    onChange({
      ...data,
      [categoryKey]: data[categoryKey].filter((s) => s.id !== shotId),
    });
  }

  function addCustomShot(categoryKey: CategoryKey) {
    const newShot: PhotoShot = {
      id: crypto.randomUUID(),
      label: "",
      notes: "",
      included: true,
      isCustom: true,
    };
    onChange({
      ...data,
      [categoryKey]: [...data[categoryKey], newShot],
    });
  }

  return (
    <div className="space-y-8">
      {CATEGORIES.map(({ key, label }) => {
        const shots = data[key];
        const includedCount = shots.filter((s) => s.included).length;

        return (
          <div key={key}>
            <h4 className="text-sm font-medium mb-3">
              {label}{" "}
              <span className="text-muted-foreground font-normal">
                ({includedCount} shots)
              </span>
            </h4>
            <div className="space-y-1.5">
              {shots.map((shot) => (
                <ShotRow
                  key={shot.id}
                  shot={shot}
                  onUpdate={(patch) => updateShot(key, shot.id, patch)}
                  onDelete={
                    shot.isCustom ? () => deleteShot(key, shot.id) : null
                  }
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => addCustomShot(key)}
            >
              + Add custom shot
            </Button>
          </div>
        );
      })}
    </div>
  );
}
