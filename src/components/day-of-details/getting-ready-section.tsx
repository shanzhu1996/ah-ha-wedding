"use client";

import { useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Camera,
  Eye,
  Users2,
  UserPlus,
  Flame,
  MapPin,
  Clock,
  Plus,
  X,
  StickyNote,
  UserCircle,
  ChevronDown,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type {
  GettingReadyData,
  GettingReadyStation,
  PhotoGroupData,
  FamilyPhotosData,
  PhotoSubgroup,
  ScheduleData,
} from "./types";
import { DEFAULT_DETAIL_SHOTS, effectiveStations } from "./types";
import {
  CollapsibleSection,
  type SectionSummaryChip,
} from "./collapsible-section";
import { InlineChip, InlineRow } from "./moment-uniform-fields";

interface GettingReadySectionProps {
  data: GettingReadyData;
  onChange: (data: GettingReadyData) => void;
  /** Schedule tab data — the source of truth for Hair & makeup start time. */
  scheduleData?: ScheduleData;
  /** Click handler for the time pill that jumps to the Schedule tab. */
  onNavigateToSchedule?: () => void;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);
}

export function GettingReadySection({
  data,
  onChange,
  scheduleData,
  onNavigateToSchedule,
}: GettingReadySectionProps) {
  function update(patch: Partial<GettingReadyData>) {
    onChange({ ...data, ...patch });
  }

  // ── Stations ────────────────────────────────────────────────────────
  const stations = useMemo(() => effectiveStations(data), [data]);
  // Default collapsed so the section reads as an overview. Couple expands
  // a group to edit. Newly-added groups open automatically via addStation.
  const [stationsOpen, setStationsOpen] = useState<Record<string, boolean>>(
    () => Object.fromEntries(stations.map((s) => [s.id, false]))
  );
  const newStationWhoRefs = useRef<Record<string, HTMLTextAreaElement | null>>(
    {}
  );
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);

  function updateStations(next: GettingReadyStation[]) {
    update({ stations: next });
  }
  function addStation() {
    const id = newId();
    updateStations([...stations, { id, who: "", location: "" }]);
    setStationsOpen((o) => ({ ...o, [id]: true }));
    setPendingFocusId(id);
  }
  function removeStation(id: string) {
    updateStations(stations.filter((s) => s.id !== id));
  }
  function updateStation(id: string, patch: Partial<GettingReadyStation>) {
    updateStations(stations.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function toggleStationOpen(id: string) {
    setStationsOpen((o) => ({ ...o, [id]: !o[id] }));
  }

  // ── Detail shots ────────────────────────────────────────────────────
  const [customShotDraft, setCustomShotDraft] = useState("");
  function toggleDefaultShot(shot: string) {
    const curr = data.detail_shots;
    update({
      detail_shots: curr.includes(shot)
        ? curr.filter((s) => s !== shot)
        : [...curr, shot],
    });
  }
  function addCustomShot() {
    const v = customShotDraft.trim();
    if (!v) return;
    if ((data.custom_detail_shots || []).includes(v)) {
      setCustomShotDraft("");
      return;
    }
    update({ custom_detail_shots: [...(data.custom_detail_shots || []), v] });
    setCustomShotDraft("");
  }
  function removeCustomShot(shot: string) {
    update({
      custom_detail_shots: (data.custom_detail_shots || []).filter(
        (s) => s !== shot
      ),
    });
  }

  // ── First look (derived) ────────────────────────────────────────────
  const firstLookPlanned = !!(
    data.first_look_time?.trim() || data.first_look_location?.trim()
  );
  function updateFirstLook(patch: {
    first_look_time?: string;
    first_look_location?: string;
  }) {
    const nextTime = patch.first_look_time ?? data.first_look_time;
    const nextLocation = patch.first_look_location ?? data.first_look_location;
    update({
      ...patch,
      first_look: !!(nextTime?.trim() || nextLocation?.trim()),
    });
  }

  // ── Bridal party + family photos (shared subgroup pattern) ──────────
  function updateBridalPhotos(patch: Partial<PhotoGroupData>) {
    update({
      bridal_party_photos: { ...data.bridal_party_photos, ...patch },
    });
  }
  function updateFamilyPhotos(patch: Partial<FamilyPhotosData>) {
    update({ family_photos: { ...data.family_photos, ...patch } });
  }
  const [bridalNotesOpen, setBridalNotesOpen] = useState(false);
  const [familyNotesOpen, setFamilyNotesOpen] = useState(false);

  // ── Summary chips ───────────────────────────────────────────────────

  const hairMakeupChips: SectionSummaryChip[] = (() => {
    const chips: SectionSummaryChip[] = [];
    if (stations.length > 0) {
      chips.push({
        label: `${stations.length} group${stations.length > 1 ? "s" : ""}`,
        tone: "neutral",
      });
    }
    if (data.hair_makeup_notes?.trim()) {
      chips.push({ label: "has notes", tone: "muted" });
    }
    return chips;
  })();
  // Schedule owns the Hair & makeup start time. Prefer the entry literally
  // titled "Hair & makeup begins"; fall back to the earliest getting_ready
  // entry so a renamed/new timeline still shows something meaningful.
  const hairMakeupTime = useMemo(() => {
    const entries = scheduleData?.entries ?? [];
    const byTitle = entries.find((e) =>
      e.title?.toLowerCase().includes("hair & makeup")
    );
    if (byTitle?.time?.trim()) return byTitle.time;
    const firstLinked = entries.find(
      (e) => e.linkedSection === "getting_ready" && e.time?.trim()
    );
    return firstLinked?.time;
  }, [scheduleData]);

  const totalShots =
    data.detail_shots.length + (data.custom_detail_shots?.length || 0);
  const detailShotsChips: SectionSummaryChip[] =
    totalShots > 0
      ? [
          {
            label: `${totalShots} shot${totalShots > 1 ? "s" : ""}`,
            tone: "accent",
          },
        ]
      : [];

  const firstLookChips: SectionSummaryChip[] = firstLookPlanned
    ? [
        {
          label: data.first_look_location?.trim()
            ? `planned · ${data.first_look_location.trim()}`
            : "planned",
          tone: "accent",
        },
      ]
    : [];
  const firstLookTime = firstLookPlanned
    ? data.first_look_time?.trim() || undefined
    : undefined;

  const bridalChips: SectionSummaryChip[] = (() => {
    const subgroups = data.bridal_party_photos.subgroups || [];
    if (subgroups.length === 0) return [];
    return [
      {
        label: `${subgroups.length} group${subgroups.length > 1 ? "s" : ""}`,
        tone: "neutral",
      },
    ];
  })();

  const familyChips: SectionSummaryChip[] = (() => {
    const chips: SectionSummaryChip[] = [];
    const subgroups = data.family_photos.subgroups || [];
    if (subgroups.length > 0) {
      chips.push({
        label: `${subgroups.length} group${subgroups.length > 1 ? "s" : ""}`,
        tone: "neutral",
      });
    }
    const wrangler = data.family_photos.wrangler?.trim();
    if (wrangler) {
      chips.push({ label: `wrangler: ${wrangler}`, tone: "accent" });
    } else if (subgroups.length > 0) {
      chips.push({ label: "needs wrangler", tone: "muted" });
    }
    return chips;
  })();

  const culturalChips: SectionSummaryChip[] = data.cultural_notes?.trim()
    ? [{ label: "has notes", tone: "muted" }]
    : [];

  return (
    <div className="space-y-2">
      {/* 1. Hair & makeup */}
      <CollapsibleSection
        icon={<Sparkles />}
        title="Hair & makeup"
        hint="who's getting styled and where"
        time={hairMakeupTime}
        timeFromSchedule={!!hairMakeupTime}
        onNavigateToSchedule={onNavigateToSchedule}
        summaryChips={hairMakeupChips}
      >
        <div className="space-y-2">
          {stations.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No groups yet — add one to get started.
            </p>
          ) : (
            stations.map((station, idx) => (
              <StationCard
                key={station.id}
                station={station}
                index={idx}
                open={stationsOpen[station.id] ?? false}
                onToggle={() => toggleStationOpen(station.id)}
                onChange={(patch) => updateStation(station.id, patch)}
                onRemove={() => removeStation(station.id)}
                whoRef={(el) => {
                  newStationWhoRefs.current[station.id] = el;
                  if (el && pendingFocusId === station.id) {
                    el.focus();
                    setPendingFocusId(null);
                  }
                }}
              />
            ))
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={addStation}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add group
          </Button>
        </div>
        <Textarea
          value={data.hair_makeup_notes}
          onChange={(e) => update({ hair_makeup_notes: e.target.value })}
          placeholder="Order of people, staggered times, special requests — e.g., stylist arrives 9:30, bride goes last"
          rows={2}
          className="text-sm mt-4"
        />
      </CollapsibleSection>

      {/* 2. Detail shots */}
      <CollapsibleSection
        icon={<Camera />}
        title="Detail shots"
        hint="close-up keepsake photos before you get dressed"
        summaryChips={detailShotsChips}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DEFAULT_DETAIL_SHOTS.map((shot) => (
            <label
              key={shot}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <Checkbox
                checked={data.detail_shots.includes(shot)}
                onCheckedChange={() => toggleDefaultShot(shot)}
              />
              <span
                className={cn(
                  !data.detail_shots.includes(shot) && "text-muted-foreground"
                )}
              >
                {shot}
              </span>
            </label>
          ))}
        </div>
        {(data.custom_detail_shots?.length ?? 0) > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground/70">
              Custom shots
            </p>
            <ul className="space-y-1">
              {(data.custom_detail_shots || []).map((shot) => (
                <li
                  key={shot}
                  className="flex items-center justify-between gap-2 text-sm pl-1"
                >
                  <span>{shot}</span>
                  <button
                    type="button"
                    onClick={() => removeCustomShot(shot)}
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
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={customShotDraft}
            onChange={(e) => setCustomShotDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomShot();
              }
            }}
            placeholder={`Add custom shot, e.g., "grandma's heirloom ring"`}
            className="h-9 text-sm flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addCustomShot}
            disabled={!customShotDraft.trim()}
            className="gap-1.5 text-xs shrink-0"
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
      </CollapsibleSection>

      {/* 3. First look */}
      <CollapsibleSection
        icon={<Eye />}
        title="First look"
        hint="see each other before the aisle · optional"
        time={firstLookTime}
        summaryChips={firstLookChips}
        emptyLabel="Not planning one"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <Input
              value={data.first_look_time}
              onChange={(e) =>
                updateFirstLook({ first_look_time: e.target.value })
              }
              placeholder="Time, e.g., 1:30 PM"
              className="h-9 text-sm tabular-nums"
            />
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <Input
              value={data.first_look_location}
              onChange={(e) =>
                updateFirstLook({ first_look_location: e.target.value })
              }
              placeholder="Location"
              className="h-9 text-sm"
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/70 mt-2">
          Leave both empty to skip — planners say first looks save ~90 min
          of day-of photos when you do one.
        </p>
      </CollapsibleSection>

      {/* 4. Bridal party photos */}
      <CollapsibleSection
        icon={<Users2 />}
        title="Bridal party photos"
        hint="who's in each shot — photographer handles where and when"
        summaryChips={bridalChips}
      >
        <div className="space-y-3">
          <SubgroupList
            subgroups={data.bridal_party_photos.subgroups || []}
            onChange={(next) => updateBridalPhotos({ subgroups: next })}
            suggestedLabels={["Full bridal party", "Bridesmaids", "Groomsmen"]}
            addLabel="Add photo group"
          />

          <div className="pt-1">
            {!bridalNotesOpen && (
              <InlineChip
                icon={<StickyNote />}
                label="Shot ideas / posing notes"
                value={data.bridal_party_photos.notes?.trim() || ""}
                onClick={() => setBridalNotesOpen(true)}
              />
            )}
            {bridalNotesOpen && (
              <InlineRow
                icon={<StickyNote />}
                label="Shot ideas / posing notes"
                onDone={() => setBridalNotesOpen(false)}
                onClear={() => {
                  updateBridalPhotos({ notes: "" });
                  setBridalNotesOpen(false);
                }}
                canClear={!!data.bridal_party_photos.notes?.trim()}
              >
                <Textarea
                  autoFocus={!data.bridal_party_photos.notes}
                  value={data.bridal_party_photos.notes}
                  onChange={(e) =>
                    updateBridalPhotos({ notes: e.target.value })
                  }
                  placeholder="Must-have shots, group poses…"
                  rows={2}
                  className="text-sm"
                />
              </InlineRow>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* 5. Family photos */}
      <CollapsibleSection
        icon={<UserPlus />}
        title="Family photos"
        hint="posed lineups, one group at a time — photographer handles where and when"
        summaryChips={familyChips}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <UserCircle className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <Input
              value={data.family_photos.wrangler}
              onChange={(e) =>
                updateFamilyPhotos({ wrangler: e.target.value })
              }
              placeholder="Wrangler — someone who calls names (planners say family scatters)"
              className="h-9 text-sm"
            />
          </div>

          <SubgroupList
            subgroups={data.family_photos.subgroups || []}
            onChange={(next) => updateFamilyPhotos({ subgroups: next })}
            suggestedLabels={[
              "Immediate family",
              "Extended family",
              "Bride's side",
              "Groom's side",
            ]}
            addLabel="Add family group"
          />

          <div className="pt-1">
            {!familyNotesOpen && (
              <InlineChip
                icon={<StickyNote />}
                label="Sensitive notes"
                value={data.family_photos.notes?.trim() || ""}
                onClick={() => setFamilyNotesOpen(true)}
              />
            )}
            {familyNotesOpen && (
              <InlineRow
                icon={<StickyNote />}
                label="Sensitive notes"
                hint="divorced parents seated apart, estranged relatives, etc."
                onDone={() => setFamilyNotesOpen(false)}
                onClear={() => {
                  updateFamilyPhotos({ notes: "" });
                  setFamilyNotesOpen(false);
                }}
                canClear={!!data.family_photos.notes?.trim()}
              >
                <Textarea
                  autoFocus={!data.family_photos.notes}
                  value={data.family_photos.notes}
                  onChange={(e) =>
                    updateFamilyPhotos({ notes: e.target.value })
                  }
                  placeholder="Anything the photographer shouldn't miss — or should avoid"
                  rows={2}
                  className="text-sm"
                />
              </InlineRow>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* 6. Cultural or religious prep */}
      <CollapsibleSection
        icon={<Flame />}
        title="Cultural or religious prep"
        hint="traditions during getting-ready"
        summaryChips={culturalChips}
        emptyLabel="None — skip if not applicable"
      >
        <Textarea
          value={data.cultural_notes}
          onChange={(e) => update({ cultural_notes: e.target.value })}
          placeholder="e.g., Henna application, prayer before ceremony, tea ceremony prep…"
          rows={3}
          className="text-sm"
        />
      </CollapsibleSection>
    </div>
  );
}

// ── Station card ─────────────────────────────────────────────────────
// Collapse design that avoids the who-preview dup: when expanded, the
// header's middle region goes blank (no title text) because the body's
// textarea is the editing surface. Collapsed header shows time + who
// preview + optional location chip for fast scanning.
function StationCard({
  station,
  index,
  open,
  onToggle,
  onChange,
  onRemove,
  whoRef,
}: {
  station: GettingReadyStation;
  index: number;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<GettingReadyStation>) => void;
  onRemove: () => void;
  whoRef?: (el: HTMLTextAreaElement | null) => void;
}) {
  const who = station.who?.trim();
  const location = station.location?.trim();
  const fallbackLabel = `Group ${index + 1}`;

  return (
    <div className="rounded-lg border border-border/80 bg-card group/station">
      <div className="flex items-stretch">
        <div className="flex-1 min-w-0">
          {open ? (
            <div className="px-3 py-3 space-y-2.5">
              <div className="flex items-start gap-2">
                <UserCircle className="h-[18px] w-[18px] text-primary shrink-0 mt-1.5" />
                <Textarea
                  ref={whoRef}
                  value={station.who}
                  onChange={(e) => onChange({ who: e.target.value })}
                  placeholder="Who's getting styled — e.g., Bride + 3 bridesmaids, stylist Jane"
                  rows={2}
                  className="text-sm font-medium"
                />
              </div>
              <div className="pl-[26px]">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  <Input
                    value={station.location}
                    onChange={(e) => onChange({ location: e.target.value })}
                    placeholder="Location, e.g., Hotel suite"
                    className="h-9 text-sm"
                  />
                </div>
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
                  !who && "text-muted-foreground/70"
                )}
              >
                {who || fallbackLabel}
              </span>
              {location && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-muted/60 text-foreground/70 truncate max-w-[40%]">
                  {location}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Controls column — chevron + kebab, stays at top-right in both
            collapsed and expanded states so there's no wasted header row. */}
        <div className="flex items-start shrink-0 pt-1.5 pr-1">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={open ? "Collapse group" : "Expand group"}
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
              aria-label={`More options for ${fallbackLabel}`}
              title="More options"
              className="p-1 rounded text-muted-foreground/40 hover:text-foreground transition-colors data-[popup-open]:text-foreground"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="min-w-[180px]">
              <DropdownMenuItem variant="destructive" onClick={onRemove}>
                <Trash2 className="h-3.5 w-3.5" />
                Remove group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// ── Photo subgroup list ──────────────────────────────────────────────
function SubgroupList({
  subgroups,
  onChange,
  suggestedLabels,
  addLabel,
}: {
  subgroups: PhotoSubgroup[];
  onChange: (next: PhotoSubgroup[]) => void;
  /** Shown as the placeholder of the first few added subgroups. */
  suggestedLabels: string[];
  addLabel: string;
}) {
  // Default collapsed so the section reads as an overview — couple
  // expands a group to edit its members. Freshly added groups open.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(subgroups.map((s) => [s.id, false]))
  );
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);

  function add() {
    const id = newId();
    onChange([
      ...subgroups,
      { id, label: "", members: "" },
    ]);
    setOpen((o) => ({ ...o, [id]: true }));
    setPendingFocusId(id);
  }
  function remove(id: string) {
    onChange(subgroups.filter((s) => s.id !== id));
  }
  function updateOne(id: string, patch: Partial<PhotoSubgroup>) {
    onChange(subgroups.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  return (
    <div className="space-y-2">
      {subgroups.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No groups yet — add one to list members.
        </p>
      ) : (
        subgroups.map((sg, idx) => (
          <SubgroupPill
            key={sg.id}
            subgroup={sg}
            placeholder={
              suggestedLabels[idx] || suggestedLabels[suggestedLabels.length - 1]
            }
            open={open[sg.id] ?? false}
            onToggle={() => setOpen((o) => ({ ...o, [sg.id]: !o[sg.id] }))}
            onChange={(patch) => updateOne(sg.id, patch)}
            onRemove={() => remove(sg.id)}
            autoFocusMembers={pendingFocusId === sg.id}
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

function SubgroupPill({
  subgroup,
  placeholder,
  open,
  onToggle,
  onChange,
  onRemove,
  autoFocusMembers,
  onFocused,
}: {
  subgroup: PhotoSubgroup;
  placeholder: string;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<PhotoSubgroup>) => void;
  onRemove: () => void;
  autoFocusMembers?: boolean;
  onFocused?: () => void;
}) {
  const membersPreview = subgroup.members?.trim() || "";

  return (
    <div className="rounded-lg border border-border/80 bg-card group/sg">
      <div className="flex items-stretch">
        <div className="flex-1 flex items-center gap-1 px-2 py-2 min-w-0">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={open ? "Collapse group" : "Expand group"}
            className="p-1 rounded hover:bg-muted text-muted-foreground/60 hover:text-foreground shrink-0"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform motion-reduce:transition-none",
                open && "rotate-180"
              )}
            />
          </button>
          <Input
            value={subgroup.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder={placeholder}
            className="h-8 text-sm font-medium border-transparent focus-visible:border-border shadow-none px-1 flex-1 min-w-0"
          />
          {!open && membersPreview && (
            <span className="text-xs text-muted-foreground truncate max-w-[45%]">
              {membersPreview}
            </span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="More options for group"
            title="More options"
            className="px-2 text-muted-foreground/40 hover:text-foreground transition-colors rounded-r-lg data-[popup-open]:text-foreground"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="min-w-[180px]">
            <DropdownMenuItem variant="destructive" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" />
              Remove group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-border/50">
          <Textarea
            ref={(el) => {
              if (el && autoFocusMembers) {
                el.focus();
                onFocused?.();
              }
            }}
            value={subgroup.members}
            onChange={(e) => onChange({ members: e.target.value })}
            placeholder="Names — e.g., Anna, Beth, Carol"
            rows={2}
            className="text-sm"
          />
        </div>
      )}
    </div>
  );
}
