"use client";

import { useState } from "react";
import {
  Sparkles,
  Users2,
  PartyPopper,
  EyeOff,
  Plus,
  StickyNote,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { PhotoShotListData, PhotoShot } from "./types";
import {
  CollapsibleSection,
  type SectionSummaryChip,
} from "./collapsible-section";

interface PhotoShotListProps {
  data: PhotoShotListData;
  onChange: (data: PhotoShotListData) => void;
}

type CategoryKey = "pre_ceremony" | "ceremony_family" | "reception";

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "pre_ceremony",
    label: "Pre-ceremony",
    hint: "details, getting ready, first look",
    icon: <Sparkles />,
  },
  {
    key: "ceremony_family",
    label: "Ceremony & family",
    hint: "vows, recessional, posed family groupings",
    icon: <Users2 />,
  },
  {
    key: "reception",
    label: "Reception",
    hint: "dances, cake, speeches, candids",
    icon: <PartyPopper />,
  },
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
  const hasNote = !!shot.notes?.trim();
  const [noteOpen, setNoteOpen] = useState(false);
  const showNoteInput = noteOpen || hasNote;

  return (
    <div className="flex items-center gap-2 py-0.5 flex-wrap sm:flex-nowrap">
      <Checkbox
        checked={shot.included}
        onCheckedChange={(checked) => onUpdate({ included: checked === true })}
      />
      <Input
        value={shot.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        className={cn(
          "text-sm flex-1 min-w-0",
          !shot.included && "line-through text-muted-foreground/50"
        )}
        placeholder="Shot description"
      />
      {!showNoteInput && (
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-border/80 bg-background text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors shrink-0"
          aria-label="Add note"
        >
          <StickyNote className="h-3 w-3" />
          Note
        </button>
      )}
      {/* Note input: inline on desktop, wraps to row 2 on mobile via order-last + w-full */}
      {showNoteInput && (
        <Input
          autoFocus={noteOpen && !hasNote}
          value={shot.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          onBlur={() => {
            if (!shot.notes?.trim()) setNoteOpen(false);
          }}
          className="text-xs text-muted-foreground w-full order-last sm:order-none sm:w-56 shrink-0"
          placeholder="Note — e.g., wide angle"
        />
      )}
      {onDelete ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="More options for shot"
            title="More options"
            className="p-1 rounded text-muted-foreground/40 hover:text-foreground transition-colors data-[popup-open]:text-foreground"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="min-w-[160px]">
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Remove shot
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        // Invisible spacer to keep rows aligned with custom-shot rows.
        <span aria-hidden className="w-7 shrink-0" />
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

  const doNotShootChips: SectionSummaryChip[] = data.do_not_shoot_notes?.trim()
    ? [{ label: "has notes", tone: "muted" }]
    : [];

  return (
    <div className="space-y-2">
      {CATEGORIES.map(({ key, label, hint, icon }) => {
        const shots = data[key] || [];
        const includedCount = shots.filter((s) => s.included).length;
        const customCount = shots.filter((s) => s.isCustom).length;
        const chips: SectionSummaryChip[] = [];
        if (includedCount > 0) {
          chips.push({
            label: `${includedCount} included`,
            tone: "accent",
          });
        }
        if (customCount > 0) {
          chips.push({
            label: `${customCount} custom`,
            tone: "muted",
          });
        }
        return (
          <CollapsibleSection
            key={key}
            icon={icon}
            title={label}
            hint={hint}
            summaryChips={chips}
            defaultOpen
            emptyLabel="No shots"
          >
            <div className="space-y-1">
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
              className="mt-3 gap-1.5 text-xs"
              onClick={() => addCustomShot(key)}
            >
              <Plus className="h-3 w-3" />
              Add custom shot
            </Button>
          </CollapsibleSection>
        );
      })}

      <CollapsibleSection
        icon={<EyeOff />}
        title="Do not shoot"
        hint="sensitive dynamics — divorced family, exclusions, topics to skip"
        summaryChips={doNotShootChips}
        emptyLabel="None — skip if not applicable"
      >
        <Textarea
          value={data.do_not_shoot_notes}
          onChange={(e) => onChange({ ...data, do_not_shoot_notes: e.target.value })}
          placeholder="e.g., Parents of the bride are divorced — please don't photograph them together. Avoid uncle Tom at the head table photos."
          className="text-sm min-h-[96px]"
        />
        <p className="text-[11px] text-muted-foreground/70 mt-2">
          Shared with the photographer in the vendor booklet so they know
          what to avoid.
        </p>
      </CollapsibleSection>
    </div>
  );
}
