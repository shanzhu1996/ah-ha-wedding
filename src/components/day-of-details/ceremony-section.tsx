"use client";

import { useMemo, useState } from "react";
import {
  Footprints,
  BookOpen,
  Heart,
  Infinity as InfinityIcon,
  DoorOpen,
  Mic,
  Flame,
  Plus,
  Wand2,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Users2,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type {
  CeremonyData,
  ProcessionalEntry,
  ReadingEntry,
  TeaCeremonyData,
} from "./types";
import { getDefaultTeaCeremonyData } from "./types";
import {
  CollapsibleSection,
  type SectionSummaryChip,
} from "./collapsible-section";
import { MusicLink, summarizeSongs } from "./music-link";
import { AutosaveIndicator } from "./save-indicator";
import { TeaCeremonyCard } from "./tea-ceremony-card";
import type { WeddingSong } from "./day-stepper";

// Non-destructive presets — only fill empty fields.
const CEREMONY_PRESETS: Record<
  string,
  {
    vows_style: CeremonyData["vows_style"];
    unity_ceremony: CeremonyData["unity_ceremony"];
  }
> = {
  traditional: { vows_style: "traditional", unity_ceremony: "none" },
  modern: { vows_style: "custom", unity_ceremony: "none" },
};

const VOWS_LABEL: Record<NonNullable<CeremonyData["vows_style"]>, string> = {
  "": "",
  custom: "Write your own",
  traditional: "Traditional",
  mix: "Mix of both",
};

const UNITY_LABEL: Record<
  NonNullable<CeremonyData["unity_ceremony"]>,
  string
> = {
  "": "",
  none: "None",
  sand: "Sand ceremony",
  candle: "Candle lighting",
  handfasting: "Handfasting",
  wine_box: "Wine box ceremony",
  other: "Other",
};

interface CeremonySectionProps {
  data: CeremonyData;
  onChange: (data: CeremonyData) => void;
  songs?: WeddingSong[];
  /** Flag-gated cultural card (A4). When true, the Tea Ceremony card is
   *  rendered above the "Cultural or religious traditions" section. */
  hasTeaCeremony?: boolean;
  teaCeremonyData?: TeaCeremonyData;
  onTeaCeremonyChange?: (data: TeaCeremonyData) => void;
}

export function CeremonySection({
  data,
  onChange,
  songs = [],
  hasTeaCeremony = false,
  teaCeremonyData,
  onTeaCeremonyChange,
}: CeremonySectionProps) {
  function update(patch: Partial<CeremonyData>) {
    onChange({ ...data, ...patch });
  }

  function applyPreset(preset: keyof typeof CEREMONY_PRESETS) {
    const p = CEREMONY_PRESETS[preset];
    update({
      vows_style: data.vows_style || p.vows_style,
      unity_ceremony: data.unity_ceremony || p.unity_ceremony,
    });
  }

  const anyMainFieldSet = !!data.vows_style || !!data.unity_ceremony;

  // ── Summary chips ───────────────────────────────────────────────────

  const processional = data.processional || [];
  const namedProcessional = processional.filter((p) => p.name?.trim());
  const processionalSongSummary = summarizeSongs("processional", songs, "single");
  const processionalChips: SectionSummaryChip[] = useMemo(() => {
    const chips: SectionSummaryChip[] = [];
    if (namedProcessional.length > 0) {
      chips.push({
        label: `${namedProcessional.length} in order`,
        tone: "neutral",
      });
    }
    if (processionalSongSummary) {
      chips.push({ label: `♪ ${processionalSongSummary}`, tone: "accent" });
    }
    return chips;
  }, [namedProcessional.length, processionalSongSummary]);

  const recessional = data.recessional || [];
  const namedRecessional = recessional.filter((p) => p.name?.trim());
  const recessionalSongSummary = summarizeSongs("recessional", songs, "single");
  const recessionalChips: SectionSummaryChip[] = useMemo(() => {
    const chips: SectionSummaryChip[] = [];
    if (namedRecessional.length > 0) {
      chips.push({
        label: `${namedRecessional.length} in order`,
        tone: "neutral",
      });
    }
    if (recessionalSongSummary) {
      chips.push({ label: `♪ ${recessionalSongSummary}`, tone: "accent" });
    }
    return chips;
  }, [namedRecessional.length, recessionalSongSummary]);

  const readings = data.readings || [];
  const namedReadings = readings.filter(
    (r) => r.reader?.trim() || r.title?.trim()
  );
  const readingsChips: SectionSummaryChip[] =
    namedReadings.length > 0
      ? [
          {
            label: `${namedReadings.length} reading${
              namedReadings.length > 1 ? "s" : ""
            }`,
            tone: "neutral",
          },
        ]
      : [];

  const vowsChips: SectionSummaryChip[] = data.vows_style
    ? [{ label: VOWS_LABEL[data.vows_style] || "", tone: "accent" }]
    : [];

  const unityChips: SectionSummaryChip[] =
    data.unity_ceremony && data.unity_ceremony !== "none"
      ? [{ label: UNITY_LABEL[data.unity_ceremony] || "", tone: "accent" }]
      : [];

  const officiantChips: SectionSummaryChip[] = data.officiant_notes?.trim()
    ? [{ label: "has notes", tone: "muted" }]
    : [];

  const culturalChips: SectionSummaryChip[] = data.cultural_notes?.trim()
    ? [{ label: "has notes", tone: "muted" }]
    : [];

  return (
    <div className="space-y-2">
      {/* Quick fill — only visible until the couple touches something */}
      {!anyMainFieldSet && (
        <div className="flex items-center gap-2 flex-wrap pb-2">
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

      {/* 1. Processional */}
      <CollapsibleSection
        icon={<Footprints />}
        title="Processional"
        hint="who walks down the aisle and in what order"
        summaryChips={processionalChips}
      >
        <div className="space-y-5">
          <AisleWalkList
            entries={processional}
            onChange={(next) => update({ processional: next })}
            addLabel="Add to processional"
            removeLabel="Remove from processional"
            emptyCopy="No one listed yet — add people below in walking order."
            heading="Walking order"
            headingHint="who walks in, first to last"
          />
          <MusicLink
            phase="processional"
            songs={songs}
            expected="single"
            label="Walking-in song"
            hint="what plays as the couple walks the aisle"
          />
        </div>
      </CollapsibleSection>

      {/* 2. Readings */}
      <CollapsibleSection
        icon={<BookOpen />}
        title="Readings"
        hint="readings or poems during the ceremony"
        summaryChips={readingsChips}
        emptyLabel="No readings — many ceremonies have 1–2"
      >
        <ReadingList
          entries={readings}
          onChange={(next) => update({ readings: next })}
        />
      </CollapsibleSection>

      {/* 3. Vows */}
      <CollapsibleSection
        icon={<Heart />}
        title="Vows"
        hint="writing your own, traditional, or a mix"
        summaryChips={vowsChips}
        emptyLabel="Not chosen yet"
      >
        <SegmentedChoice
          options={[
            { value: "custom", label: "Write your own" },
            { value: "traditional", label: "Traditional" },
            { value: "mix", label: "Mix of both" },
          ]}
          value={data.vows_style}
          onChange={(v) =>
            update({ vows_style: v as CeremonyData["vows_style"] })
          }
        />
      </CollapsibleSection>

      {/* 4. Unity ceremony */}
      <CollapsibleSection
        icon={<InfinityIcon />}
        title="Unity ceremony"
        hint="optional — many couples skip this"
        summaryChips={unityChips}
        emptyLabel="None — skip if not applicable"
      >
        <div className="space-y-3">
          <Select
            value={data.unity_ceremony || undefined}
            onValueChange={(v) =>
              update({
                unity_ceremony: (v ?? "none") as CeremonyData["unity_ceremony"],
              })
            }
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
            <div className="space-y-1">
              <Textarea
                value={data.unity_notes}
                onChange={(e) => update({ unity_notes: e.target.value })}
                placeholder="Details about your unity ceremony…"
                className="text-sm min-h-[72px]"
              />
              <div className="flex justify-end h-4">
                <AutosaveIndicator value={data.unity_notes} />
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* 5. Recessional */}
      <CollapsibleSection
        icon={<DoorOpen />}
        title="Recessional"
        hint="who exits and in what order"
        summaryChips={recessionalChips}
        emptyLabel="Not planned yet"
      >
        <div className="space-y-5">
          <AisleWalkList
            entries={recessional}
            onChange={(next) => update({ recessional: next })}
            addLabel="Add to recessional"
            removeLabel="Remove from recessional"
            emptyCopy="No one listed yet — add people below in exit order."
            heading="Exit order"
            headingHint="who exits, first to last"
          />
          <MusicLink
            phase="recessional"
            songs={songs}
            expected="single"
            label="Walking-out song"
            hint="celebratory exit after the kiss"
          />
        </div>
      </CollapsibleSection>

      {/* 6. Officiant notes */}
      <CollapsibleSection
        icon={<Mic />}
        title="Notes for your officiant"
        hint="tone, topics to include or avoid, cultural elements"
        summaryChips={officiantChips}
      >
        <Textarea
          value={data.officiant_notes}
          onChange={(e) => update({ officiant_notes: e.target.value })}
          placeholder="e.g., Keep it under 20 minutes. Mention how we met at the coffee shop."
          className="text-sm min-h-[96px]"
        />
      </CollapsibleSection>

      {/* Tea Ceremony — flag-gated cultural card (A4). Rendered above the
          generic "Cultural traditions" textarea since it IS a cultural
          tradition and deserves structured fields. */}
      {hasTeaCeremony && onTeaCeremonyChange && (
        <TeaCeremonyCard
          data={teaCeremonyData ?? getDefaultTeaCeremonyData()}
          onChange={onTeaCeremonyChange}
        />
      )}

      {/* 7. Cultural or religious traditions */}
      <CollapsibleSection
        icon={<Flame />}
        title="Other cultural / religious traditions"
        hint="anything not already structured above — breaking of the glass, jumping the broom, etc."
        summaryChips={culturalChips}
        emptyLabel="None — skip if not applicable"
      >
        <Textarea
          value={data.cultural_notes}
          onChange={(e) => update({ cultural_notes: e.target.value })}
          placeholder="Describe any cultural or religious elements for your ceremony…"
          className="text-sm min-h-[80px]"
        />
      </CollapsibleSection>
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

// ── Aisle walk list (shared by Processional + Recessional) ───────────

function AisleWalkList({
  entries,
  onChange,
  addLabel,
  removeLabel,
  emptyCopy,
  heading,
  headingHint,
}: {
  entries: ProcessionalEntry[];
  onChange: (next: ProcessionalEntry[]) => void;
  addLabel: string;
  removeLabel: string;
  emptyCopy: string;
  heading: string;
  headingHint?: string;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(entries.map((e) => [e.id, false]))
  );
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);

  function add() {
    const id = crypto.randomUUID();
    onChange([...entries, { id, role: "", name: "" }]);
    setOpen((o) => ({ ...o, [id]: true }));
    setPendingFocusId(id);
  }
  function remove(id: string) {
    onChange(entries.filter((e) => e.id !== id));
  }
  function updateEntry(id: string, patch: Partial<ProcessionalEntry>) {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2 flex-wrap">
        <Users2 className="h-[18px] w-[18px] text-primary self-center" />
        <span className="text-[15px] font-semibold text-foreground leading-none">
          {heading}
        </span>
        {headingHint && (
          <span className="text-[13px] text-muted-foreground">
            — {headingHint}
          </span>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{emptyCopy}</p>
      ) : (
        entries.map((entry, idx) => (
          <AisleWalkPill
            key={entry.id}
            entry={entry}
            index={idx}
            open={open[entry.id] ?? false}
            onToggle={() =>
              setOpen((o) => ({ ...o, [entry.id]: !o[entry.id] }))
            }
            onChange={(patch) => updateEntry(entry.id, patch)}
            onRemove={() => remove(entry.id)}
            removeLabel={removeLabel}
            autoFocusRole={pendingFocusId === entry.id}
            onFocused={() => setPendingFocusId(null)}
          />
        ))
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={add}
        className="gap-1.5 text-xs"
      >
        <Plus className="h-3 w-3" />
        {addLabel}
      </Button>
    </div>
  );
}

function AisleWalkPill({
  entry,
  index,
  open,
  onToggle,
  onChange,
  onRemove,
  removeLabel,
  autoFocusRole,
  onFocused,
}: {
  entry: ProcessionalEntry;
  index: number;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ProcessionalEntry>) => void;
  onRemove: () => void;
  removeLabel: string;
  autoFocusRole?: boolean;
  onFocused?: () => void;
}) {
  const role = entry.role?.trim();
  const name = entry.name?.trim();
  const fallback = role || `Person ${index + 1}`;

  return (
    <div className="rounded-lg border border-border/80 bg-card group/entry">
      <div className="flex items-stretch">
        <div className="flex-1 min-w-0">
          {open ? (
            <div className="px-3 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs tabular-nums text-muted-foreground/60 w-5 text-right shrink-0">
                  {index + 1}.
                </span>
                <Input
                  ref={(el) => {
                    if (el && autoFocusRole) {
                      el.focus();
                      onFocused?.();
                    }
                  }}
                  value={entry.role}
                  onChange={(e) => onChange({ role: e.target.value })}
                  placeholder="Role — e.g., Mother of the bride"
                  className="h-9 text-sm flex-1"
                />
              </div>
              <div className="pl-[28px]">
                <Input
                  value={entry.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  placeholder="Name — e.g., Sarah Smith"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left min-w-0"
            >
              <span className="text-xs tabular-nums text-muted-foreground/60 w-5 text-right shrink-0">
                {index + 1}.
              </span>
              <span
                className={cn(
                  "text-sm font-medium truncate",
                  !role && !name && "text-muted-foreground/70"
                )}
              >
                {role ? (
                  <>
                    {role}
                    {name && (
                      <span className="font-normal text-muted-foreground/80">
                        {" — "}
                        {name}
                      </span>
                    )}
                  </>
                ) : (
                  fallback
                )}
              </span>
            </button>
          )}
        </div>

        <div
          className={cn(
            "flex items-start shrink-0 pt-1.5 pr-1",
            open && "max-sm:flex-col max-sm:items-end"
          )}
        >
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={open ? "Collapse entry" : "Expand entry"}
            className="p-1 rounded text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform motion-reduce:transition-none",
                open && "rotate-180"
              )}
            />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`More options for ${fallback}`}
              title="More options"
              className="p-1 rounded text-muted-foreground/40 hover:text-foreground transition-colors data-[popup-open]:text-foreground"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="min-w-[180px]"
            >
              <DropdownMenuItem variant="destructive" onClick={onRemove}>
                <Trash2 className="h-3.5 w-3.5" />
                {removeLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// ── Readings list (reader + title on one row, no notes) ──────────────

function ReadingList({
  entries,
  onChange,
}: {
  entries: ReadingEntry[];
  onChange: (next: ReadingEntry[]) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(entries.map((e) => [e.id, false]))
  );
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);

  function add() {
    const id = crypto.randomUUID();
    onChange([...entries, { id, reader: "", title: "" }]);
    setOpen((o) => ({ ...o, [id]: true }));
    setPendingFocusId(id);
  }
  function remove(id: string) {
    onChange(entries.filter((e) => e.id !== id));
  }
  function updateEntry(id: string, patch: Partial<ReadingEntry>) {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  return (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No readings yet — most ceremonies have 1–2.
        </p>
      ) : (
        entries.map((entry, idx) => (
          <ReadingPill
            key={entry.id}
            entry={entry}
            index={idx}
            open={open[entry.id] ?? false}
            onToggle={() =>
              setOpen((o) => ({ ...o, [entry.id]: !o[entry.id] }))
            }
            onChange={(patch) => updateEntry(entry.id, patch)}
            onRemove={() => remove(entry.id)}
            autoFocusReader={pendingFocusId === entry.id}
            onFocused={() => setPendingFocusId(null)}
          />
        ))
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={add}
        className="gap-1.5 text-xs"
      >
        <Plus className="h-3 w-3" />
        Add reading
      </Button>
    </div>
  );
}

function ReadingPill({
  entry,
  index,
  open,
  onToggle,
  onChange,
  onRemove,
  autoFocusReader,
  onFocused,
}: {
  entry: ReadingEntry;
  index: number;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ReadingEntry>) => void;
  onRemove: () => void;
  autoFocusReader?: boolean;
  onFocused?: () => void;
}) {
  const reader = entry.reader?.trim();
  const title = entry.title?.trim();
  const fallback = `Reading ${index + 1}`;

  return (
    <div className="rounded-lg border border-border/80 bg-card group/entry">
      <div className="flex items-stretch">
        <div className="flex-1 min-w-0">
          {open ? (
            <div className="px-3 py-3">
              <div className="flex items-center gap-2">
                <Input
                  ref={(el) => {
                    if (el && autoFocusReader) {
                      el.focus();
                      onFocused?.();
                    }
                  }}
                  value={entry.reader}
                  onChange={(e) => onChange({ reader: e.target.value })}
                  placeholder="Reader — e.g., Grandma"
                  className="h-9 text-sm w-2/5 min-w-0"
                />
                <span className="text-xs text-muted-foreground/60 shrink-0">—</span>
                <Input
                  value={entry.title}
                  onChange={(e) => onChange({ title: e.target.value })}
                  placeholder="Reading title — e.g., On Love by Khalil Gibran"
                  className="h-9 text-sm flex-1 min-w-0"
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left min-w-0"
            >
              <span
                className={cn(
                  "text-sm font-medium truncate",
                  !reader && !title && "text-muted-foreground/70"
                )}
              >
                {reader || title ? (
                  <>
                    {reader || "(no reader)"}
                    {title && (
                      <span className="font-normal text-muted-foreground/80">
                        {" — "}
                        {title}
                      </span>
                    )}
                  </>
                ) : (
                  fallback
                )}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-start shrink-0 pt-1.5 pr-1">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={open ? "Collapse reading" : "Expand reading"}
            className="p-1 rounded text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform motion-reduce:transition-none",
                open && "rotate-180"
              )}
            />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`More options for ${fallback}`}
              title="More options"
              className="p-1 rounded text-muted-foreground/40 hover:text-foreground transition-colors data-[popup-open]:text-foreground"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="min-w-[180px]"
            >
              <DropdownMenuItem variant="destructive" onClick={onRemove}>
                <Trash2 className="h-3.5 w-3.5" />
                Remove reading
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
