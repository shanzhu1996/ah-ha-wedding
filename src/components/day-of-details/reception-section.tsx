"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
import {
  X,
  Plus,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Music,
  UtensilsCrossed,
  Users2,
  Mic,
  LogOut,
  ShieldCheck,
  StickyNote,
  PartyPopper,
  Flame,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import type {
  ReceptionData,
  ParentDance,
  SpeechEntry,
  ExitPlan,
  MomentExtras,
  CustomReceptionMoment,
  ScheduleData,
  ScheduleEntry,
  TossMomentId,
  ReceptionPhase,
  LogisticsData,
} from "./types";
import {
  speechesTotalMinutes,
  RECEPTION_MOMENT_TITLES,
  RECEPTION_TOSS_IDS,
  phaseForMoment,
  addMinutesToTime,
} from "./types";
import { MomentCard, type MomentSummaryChip } from "./moment-card";
import { MomentUniformFields } from "./moment-uniform-fields";
import { MomentMusicBlock } from "./moment-music-block";
import { MusicLink, summarizeSongs } from "./music-link";
import {
  CollapsibleSection,
  type SectionSummaryChip,
} from "./collapsible-section";
import type { WeddingSong } from "./day-stepper";
import {
  resolveReceptionMoments,
  findScheduleEntryForMoment,
} from "./reception-moments";

// ── Moment descriptions — 1-liner explaining each ───────────────────────
const MOMENT_DESCRIPTIONS: Record<string, string> = {
  grand_entrance:
    "The formal welcome into the reception — the MC announces you and guests rise as you walk in, usually with music.",
  first_dance: "Your first dance as a married couple.",
  dinner:
    "Timing and flow of dinner, including when vendors eat.",
  parent_dances: "Special dances with parents or family members.",
  speeches:
    "Who's speaking and in what order. Tight time estimates here save the whole timeline.",
  cake_cutting:
    "The couple slices the cake together — often with a fun song and camera flashes.",
  last_dance:
    "The final song of the night — last chance to get everyone on the floor.",
  exit:
    "How you leave — sparklers, bubbles, ribbon wands, or just a clean walk-off.",
  bouquet_toss:
    "Single guests gather and the bouquet is tossed to the crowd. Tradition says the catcher marries next.",
  garter_toss:
    "The groom removes and tosses the bride's garter to single gentlemen.",
  anniversary_dance:
    "All married couples dance; the MC dismisses them from the floor by years married, shortest first — the longest-married couple wins.",
  shoe_game:
    "Couple sits back-to-back holding each other's shoes. Questions are asked — they raise whichever shoe fits.",
  slideshow:
    "A photo/video montage playing during or after dinner — childhood photos, the couple's story, or guest contributions. Needs a screen + AV cue.",
  dessert_bar:
    "A table of assorted sweets (macarons, mini tarts, candy) revealed mid-dancing. Couples sometimes introduce it with a short MC cue.",
};

interface ReceptionSectionProps {
  data: ReceptionData;
  onChange: (data: ReceptionData) => void;
  /** Schedule data — used to pull Schedule-derived times onto moment pills. */
  scheduleData?: ScheduleData;
  /** Mutator for Schedule data (used by Dancing Quick-add buttons to
   *  insert/remove toss entries). Optional — buttons disable without it. */
  onScheduleChange?: (data: ScheduleData) => void;
  /** Callback when the user clicks "Set in Schedule" — jumps to Schedule tab. */
  onNavigateToSchedule?: () => void;
  /** Read-only Logistics data — source of truth for Vendor meals surfaced
   *  on the Dinner moment card. */
  logisticsData?: LogisticsData;
  /** Click handler for the "Edit in Logistics" link on the Dinner pill. */
  onNavigateToLogistics?: () => void;
  /** Full song list (wedding_songs). Music tab is the source of truth;
   *  Day-of displays read-only references via MusicLink. */
  songs?: WeddingSong[];
  /** Which phase this instance is rendering — "reception" (entrance →
   *  cake cutting) or "dancing" (last dance → exit). Custom moments show
   *  in "reception" only. Defaults to "reception" for backward compat. */
  phaseFilter?: ReceptionPhase;
}


// ── Component ──────────────────────────────────────────────────────────

export function ReceptionSection({
  data,
  onChange,
  scheduleData,
  onScheduleChange,
  onNavigateToSchedule,
  logisticsData,
  onNavigateToLogistics,
  songs = [],
  phaseFilter = "reception",
}: ReceptionSectionProps) {
  const set = (patch: Partial<ReceptionData>) => onChange({ ...data, ...patch });

  // ── Toss helpers (Schedule is the source of truth) ──────────────────
  // Clicking a Quick-add button inserts / removes a Schedule entry titled
  // like the toss. The Dancing timeline reads from Schedule, so the pill
  // appears automatically.

  function parseTimeToMinutes(t: string | undefined): number {
    if (!t) return NaN;
    const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
    if (!m) return NaN;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const period = m[3]?.toUpperCase();
    if (period === "PM" && h < 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + min;
  }
  function formatMinutesToTime(mins: number): string {
    const h24 = Math.floor(mins / 60) % 24;
    const m = ((mins % 60) + 60) % 60;
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }
  /** Smart default time per extra moment, anchored to the nearest sensible
   *  Schedule entry (dinner, cake cutting, last dance). Returns "" when no
   *  anchor is available — couple sets it manually on Schedule tab. */
  function defaultTossTime(id: TossMomentId): string {
    const shift = (anchorId: string, mins: number): string => {
      const t = findScheduleEntryForMoment(anchorId, scheduleData)?.time;
      const base = parseTimeToMinutes(t);
      if (Number.isNaN(base)) return "";
      return formatMinutesToTime(base + mins);
    };
    switch (id) {
      // Reception-phase extras — anchor to dinner
      case "shoe_game":
        return shift("dinner", 30);
      case "slideshow":
        return shift("dinner", 15);
      // Dancing-phase extras — anchor to last dance (mid-dancing reveals)
      case "anniversary_dance":
        return shift("last_dance", -40);
      case "bouquet_toss":
        return shift("last_dance", -20);
      case "garter_toss":
        return shift("last_dance", -15);
      case "dessert_bar": {
        // Prefer cake cutting + 45 min; fallback to last dance − 60 min.
        const fromCake = shift("cake_cutting", 45);
        if (fromCake) return fromCake;
        return shift("last_dance", -60);
      }
      default:
        return shift("last_dance", -20);
    }
  }
  function tossInSchedule(id: TossMomentId): ScheduleEntry | undefined {
    return findScheduleEntryForMoment(id, scheduleData);
  }
  function addTossToSchedule(id: TossMomentId) {
    if (!onScheduleChange || !scheduleData) return;
    if (tossInSchedule(id)) return;
    const entry: ScheduleEntry = {
      id: crypto.randomUUID(),
      title: RECEPTION_MOMENT_TITLES[id],
      time: defaultTossTime(id),
      notes: "",
      linkedSection: "reception",
    };
    onScheduleChange({
      ...scheduleData,
      entries: [...scheduleData.entries, entry],
    });
  }
  function removeTossFromSchedule(id: TossMomentId) {
    if (!onScheduleChange || !scheduleData) return;
    const existing = tossInSchedule(id);
    if (!existing) return;
    onScheduleChange({
      ...scheduleData,
      entries: scheduleData.entries.filter((e) => e.id !== existing.id),
    });
  }
  /**
   * One-click split for a Schedule entry that two Reception moments are
   * fuzzy-matching to (e.g., legacy seed "Grand entrance & first dance").
   * Renames the original to `keepTitle` and inserts a new entry with
   * `newTitle` at original.time + offsetMinutes.
   */
  function splitScheduleEntry(
    entryId: string,
    keepTitle: string,
    newTitle: string,
    offsetMinutes: number
  ) {
    if (!onScheduleChange || !scheduleData) return;
    const idx = scheduleData.entries.findIndex((e) => e.id === entryId);
    if (idx < 0) return;
    const original = scheduleData.entries[idx];
    const updatedOriginal: ScheduleEntry = {
      ...original,
      title: keepTitle,
      user_touched: true,
    };
    const newEntry: ScheduleEntry = {
      id: crypto.randomUUID(),
      time: addMinutesToTime(original.time, offsetMinutes),
      title: newTitle,
      notes: "",
      linkedSection: original.linkedSection,
      user_touched: true,
    };
    const entries = [...scheduleData.entries];
    entries[idx] = updatedOriginal;
    entries.splice(idx + 1, 0, newEntry);
    onScheduleChange({ ...scheduleData, entries });
  }

  // Keep latest data reachable from toast Undo callbacks (which capture stale
  // `data` at toast-show time). Undo writes should always merge into current.
  const dataRef = useRef(data);
  dataRef.current = data;

  const allResolvedMoments = useMemo(
    () => resolveReceptionMoments(data, scheduleData),
    [data, scheduleData]
  );
  // Filter by phase — custom moments default to "reception" phase for now.
  const resolvedMoments = useMemo(
    () =>
      allResolvedMoments.filter((m) => {
        if (m.isCustom) return phaseFilter === "reception";
        return phaseForMoment(m.id) === phaseFilter;
      }),
    [allResolvedMoments, phaseFilter]
  );
  /**
   * Has any song been planned (in Music tab) for this phase? When true,
   * the "No music for this moment" toggle is hidden — it's contradictory
   * to show a silence opt-in when songs are already queued up.
   */
  const hasSongsFor = (phase: string) =>
    songs.some((s) => s.phase === phase && !s.is_do_not_play);
  const momentOrder = useMemo(
    () => resolvedMoments.map((m) => m.id),
    [resolvedMoments]
  );
  /** id → effective time (Schedule-first). Used for pill headers. */
  const effectiveTimeById = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const m of resolvedMoments) map[m.id] = m.time;
    return map;
  }, [resolvedMoments]);
  /** id → whether the moment's time comes from Schedule (vs local fallback/custom). */
  const timeIsFromScheduleById = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const m of resolvedMoments) {
      if (m.isCustom) { map[m.id] = false; continue; }
      map[m.id] = !!findScheduleEntryForMoment(m.id, scheduleData)?.time?.trim();
    }
    return map;
  }, [resolvedMoments, scheduleData]);
  /**
   * id → title of the earlier moment that's claiming the same Schedule entry.
   * Surfaces when fuzzy-matching collides on a single combined entry like
   * the legacy seed "Grand entrance & first dance" — both moments' keywords
   * hit it, so they share a time. The second (or later) moment renders a
   * "split in Schedule" hint to disambiguate.
   */
  const sharedScheduleHintByMoment = useMemo(() => {
    const result: Record<string, string | undefined> = {};
    const claimed: Record<string, string> = {};
    for (const m of resolvedMoments) {
      if (m.isCustom) continue;
      const entry = findScheduleEntryForMoment(m.id, scheduleData);
      if (!entry) continue;
      if (claimed[entry.id]) {
        result[m.id] = claimed[entry.id];
      } else {
        claimed[entry.id] = m.title;
      }
    }
    return result;
  }, [resolvedMoments, scheduleData]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = momentOrder.indexOf(String(active.id));
    const newIndex = momentOrder.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(momentOrder, oldIndex, newIndex);
    set({ moment_order: next });
  }

  function updateExtras(id: string, patch: Partial<MomentExtras>) {
    const current = data.moment_extras?.[id] ?? {};
    const nextExtras = {
      ...(data.moment_extras || {}),
      [id]: { ...current, ...patch },
    };
    set({ moment_extras: nextExtras });
  }

  function updateCustomMoment(id: string, patch: Partial<CustomReceptionMoment>) {
    set({
      custom_moments: (data.custom_moments || []).map((m) =>
        m.id === id ? { ...m, ...patch } : m
      ),
    });
  }

  function addCustomMoment() {
    const id = crypto.randomUUID();
    const next = [
      ...(data.custom_moments || []),
      { id, title: "New moment", time: "" } as CustomReceptionMoment,
    ];
    set({ custom_moments: next });
  }

  function removeCustomMoment(id: string) {
    const snapshot = (data.custom_moments || []).find((m) => m.id === id);
    const orderIndex = (data.moment_order || []).indexOf(id);
    if (!snapshot) return;
    set({
      custom_moments: (data.custom_moments || []).filter((m) => m.id !== id),
      moment_order: (data.moment_order || []).filter((x) => x !== id),
    });
    toast.success(`Removed "${snapshot.title || "Untitled moment"}"`, {
      action: {
        label: "Undo",
        onClick: () => {
          const current = dataRef.current;
          const customs = (current.custom_moments || []).filter(
            (m) => m.id !== id
          );
          const order = (current.moment_order || []).filter((x) => x !== id);
          const nextOrder =
            orderIndex >= 0
              ? [...order.slice(0, orderIndex), id, ...order.slice(orderIndex)]
              : [...order, id];
          onChange({
            ...current,
            custom_moments: [...customs, snapshot],
            moment_order: nextOrder,
          });
        },
      },
    });
  }

  /** Hide a built-in moment from the timeline. Data is preserved. */
  function hideBuiltInMoment(id: string) {
    const existing = data.hidden_moments || [];
    if (existing.includes(id)) return;
    set({ hidden_moments: [...existing, id] });
    toast.success(`"${stockTitleFor(id)}" hidden`, {
      description: "Your details are saved — restore it from Hidden moments.",
      action: {
        label: "Undo",
        onClick: () => {
          const current = dataRef.current;
          onChange({
            ...current,
            hidden_moments: (current.hidden_moments || []).filter(
              (x) => x !== id
            ),
          });
        },
      },
    });
  }

  /** Restore a previously hidden built-in moment. */
  function restoreBuiltInMoment(id: string) {
    const existing = data.hidden_moments || [];
    if (!existing.includes(id)) return;
    set({ hidden_moments: existing.filter((x) => x !== id) });
  }

  /** Rename helper: built-ins go through display_title, customs through title. */
  function renameMoment(id: string, newTitle: string) {
    const isCustom = (data.custom_moments || []).some((m) => m.id === id);
    if (isCustom) {
      updateCustomMoment(id, { title: newTitle });
    } else {
      updateExtras(id, { display_title: newTitle });
    }
  }

  /** Resolve the label for a hidden built-in (stock label, ignoring display_title). */
  function stockTitleFor(id: string): string {
    return (
      RECEPTION_MOMENT_TITLES[id as keyof typeof RECEPTION_MOMENT_TITLES] ?? id
    );
  }

  // Parent dances + speeches mutators (unchanged)
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
    set({ speeches: [...(data.speeches || []), { id: crypto.randomUUID(), speaker: "", estimated_minutes: 3 }] });
  }
  function updateSpeech(id: string, patch: Partial<SpeechEntry>) {
    set({ speeches: (data.speeches || []).map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }
  function removeSpeech(id: string) {
    set({ speeches: (data.speeches || []).filter((s) => s.id !== id) });
  }

  // Phase-filtered extras list + summary chip precomputed for readability.
  const extrasForPhase = RECEPTION_TOSS_IDS.filter(
    (id) => phaseForMoment(id) === phaseFilter
  );
  const extrasAddedLabels = extrasForPhase
    .filter((id) => tossInSchedule(id))
    .map((id) => RECEPTION_MOMENT_TITLES[id]);
  const extrasSummaryChips: SectionSummaryChip[] =
    extrasAddedLabels.length === 0
      ? []
      : [
          {
            label:
              extrasAddedLabels.length <= 2
                ? extrasAddedLabels.join(" · ")
                : `${extrasAddedLabels[0]} · ${extrasAddedLabels[1]} +${extrasAddedLabels.length - 2}`,
            tone: "accent",
          },
        ];

  return (
    <div className="space-y-6">
      {/* Dancing phase: surface the Open dancing playlist at top — Music
          tab owns it; this is a read-only pointer so couples don't have to
          hunt across tabs to manage the main dance floor. */}
      {phaseFilter === "dancing" && (
        <MusicLink
          phase="open_dancing"
          songs={songs || []}
          expected="playlist"
          label="Open dancing playlist"
          hint="~30–45 songs that keep the floor moving"
        />
      )}

      {/* Timeline */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={momentOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {momentOrder.map((id) => {
              const sharedWith = sharedScheduleHintByMoment[id];
              if (!sharedWith) return renderMoment(id);
              const m = resolvedMoments.find((x) => x.id === id);
              const entry = findScheduleEntryForMoment(id, scheduleData);
              const canSplit = !!(m && entry && onScheduleChange);
              return (
                <div key={id} className="space-y-1">
                  {renderMoment(id)}
                  <div className="ml-9 text-[11px] text-muted-foreground/70 inline-flex items-center gap-1.5 flex-wrap">
                    <span>Same time as &ldquo;{sharedWith}&rdquo;.</span>
                    {canSplit ? (
                      <button
                        type="button"
                        onClick={() =>
                          splitScheduleEntry(entry!.id, sharedWith, m!.title, 5)
                        }
                        className="text-primary hover:underline font-medium"
                      >
                        Split in Schedule →
                      </button>
                    ) : (
                      <span>Edit in Schedule to split.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {phaseFilter === "reception" && (
        <Button
          variant="outline"
          size="sm"
          onClick={addCustomMoment}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3 w-3" />
          Add a moment
        </Button>
      )}

      {/* Hidden moments — surface-level restore (filtered to current phase) */}
      {(data.hidden_moments || []).filter((id) => phaseForMoment(id) === phaseFilter).length > 0 && (
        <div className="pt-3 border-t border-border/40">
          <div className="flex items-baseline gap-3 mb-2">
            <h4 className="text-xs font-semibold tracking-[0.12em] uppercase text-foreground/80">
              Hidden moments
            </h4>
            <span className="text-[11px] text-muted-foreground/70">
              Details preserved · click to restore
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(data.hidden_moments || [])
              .filter((id) => phaseForMoment(id) === phaseFilter)
              .map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => restoreBuiltInMoment(id)}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-border/70 bg-background text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  {stockTitleFor(id)}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Seating link — only in Reception phase */}
      {phaseFilter === "reception" && (
        <div className="pt-2">
          <Link
            href="/seating"
            className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary transition-colors"
          >
            Arrange your tables → Open Seating
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Phase-scoped extras: Reception tab gets reception-phase extras,
          Dancing tab gets dancing-phase extras. Shared rendering, just
          a different ID set + labeling per phase. */}
      {extrasForPhase.length > 0 && (
        <CollapsibleSection
          icon={<PartyPopper />}
          title={phaseFilter === "dancing" ? "Dancing extras" : "Reception extras"}
          hint={
            phaseFilter === "dancing"
              ? "tap to add as a moment — time comes from Schedule"
              : "dinner-time interactions and reveals — time comes from Schedule"
          }
          summaryChips={extrasSummaryChips}
          emptyLabel="None added"
        >
          <TooltipProvider delay={150}>
            <div className="flex flex-wrap gap-2">
              {extrasForPhase.map((id) => {
                const added = !!tossInSchedule(id);
                const description = MOMENT_DESCRIPTIONS[id];
                return (
                  <div
                    key={id}
                    className="inline-flex items-center gap-1"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        added
                          ? removeTossFromSchedule(id)
                          : addTossToSchedule(id)
                      }
                      disabled={!onScheduleChange}
                      title={
                        added
                          ? "Click to remove from timeline + Schedule"
                          : "Click to add — a Schedule entry will be created"
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors",
                        added
                          ? "border-primary/50 bg-primary/5 text-foreground hover:border-primary"
                          : "border-border/80 bg-background text-foreground/70 hover:border-primary/40 hover:text-primary",
                        !onScheduleChange && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {added ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      ) : (
                        <Plus className="h-3 w-3 shrink-0" />
                      )}
                      {RECEPTION_MOMENT_TITLES[id]}
                    </button>
                    {description && (
                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          aria-label={`What is ${RECEPTION_MOMENT_TITLES[id]}?`}
                          className="p-1 rounded-full text-muted-foreground/50 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs leading-relaxed">
                          {description}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
          <p className="text-[11px] text-muted-foreground/70 mt-3">
            Adds a Schedule entry so the vendor team knows when it
            happens. Defaults are smart but adjustable on the Schedule
            tab.
          </p>
        </CollapsibleSection>
      )}

      {phaseFilter === "reception" && (
        <CollapsibleSection
          icon={<Flame />}
          title="Cultural or religious traditions"
          hint="hora, money dance, or any reception traditions to include"
          summaryChips={
            data.cultural_notes?.trim()
              ? [{ label: "has notes", tone: "muted" }]
              : []
          }
          emptyLabel="None — skip if not applicable"
        >
          <Textarea
            placeholder="Describe any cultural or religious reception elements…"
            value={data.cultural_notes}
            onChange={(e) => set({ cultural_notes: e.target.value })}
            className="text-sm min-h-[80px]"
          />
        </CollapsibleSection>
      )}
    </div>
  );

  // ── Moment renderers ────────────────────────────────────────────────

  function renderMoment(id: string) {
    // Custom moment
    const custom = data.custom_moments?.find((m) => m.id === id);
    if (custom) {
      return renderCustomMoment(custom);
    }
    const title = RECEPTION_MOMENT_TITLES[id as keyof typeof RECEPTION_MOMENT_TITLES] ?? id;
    const extras = data.moment_extras?.[id];
    switch (id) {
      case "grand_entrance":
        return renderGrandEntrance(title, extras);
      case "first_dance":
        return renderFirstDance(title, extras);
      case "dinner":
        return renderDinner(title, extras);
      case "parent_dances":
        return renderParentDances(title, extras);
      case "speeches":
        return renderSpeeches(title, extras);
      case "cake_cutting":
        return renderCakeCutting(title, extras);
      case "last_dance":
        return renderLastDance(title, extras);
      case "exit":
        return renderExit(title, extras);
      case "bouquet_toss":
      case "garter_toss":
      case "anniversary_dance":
      case "shoe_game":
      case "slideshow":
      case "dessert_bar":
        return renderToss(id as TossMomentId, title, extras);
      default:
        return null;
    }
  }

  /** Build MomentSummaryChip[] from mixed inputs. Falsy/blank items are dropped. */
  function chips(
    items: Array<
      | string
      | null
      | undefined
      | false
      | { label: string; tone?: MomentSummaryChip["tone"] }
    >
  ): MomentSummaryChip[] {
    const out: MomentSummaryChip[] = [];
    for (const x of items) {
      if (!x) continue;
      if (typeof x === "string") {
        const trimmed = x.trim();
        if (trimmed) out.push({ label: trimmed, tone: "neutral" });
      } else {
        const trimmed = x.label.trim();
        if (trimmed) out.push({ label: trimmed, tone: x.tone ?? "neutral" });
      }
    }
    return out;
  }

  /** Common extras chips added to every moment's summary. */
  function extrasChips(extras: MomentExtras | undefined): MomentSummaryChip[] {
    const out: MomentSummaryChip[] = [];
    if (extras?.skip_music) out.push({ label: "no music", tone: "muted" });
    if (extras?.mc_needed) out.push({ label: "needs MC", tone: "accent" });
    if (extras?.guest_action?.trim())
      out.push({ label: extras.guest_action.trim(), tone: "muted" });
    if (extras?.notes?.trim())
      out.push({ label: "has notes", tone: "muted" });
    return out;
  }

  /** Renders the 1-line description at the top of an expanded moment card. */
  function Description({ momentId, fallback }: { momentId: string; fallback?: string }) {
    const text = MOMENT_DESCRIPTIONS[momentId] ?? fallback;
    if (!text) return null;
    return (
      <p className="text-xs text-muted-foreground leading-relaxed -mt-1">
        {text}
      </p>
    );
  }

  // ── Specific built-in moment cards ──────────────────────────────────

  function renderGrandEntrance(title: string, extras: MomentExtras | undefined) {
    const summary = chips([
      summarizeSongs("grand_entrance", songs, "single"),
      ...extrasChips(extras),
    ]);
    return (
      <MomentCard
        key="grand_entrance"
        id="grand_entrance"
        title={title}
        time={effectiveTimeById["grand_entrance"]}
        timeFromSchedule={timeIsFromScheduleById["grand_entrance"]}
        onNavigateToSchedule={onNavigateToSchedule}
        summaryChips={summary}
        onRename={(t) => renameMoment("grand_entrance", t)}
        onRemove={() => hideBuiltInMoment("grand_entrance")}
        removeLabel="Hide from timeline"
      >
        <div className="space-y-5">
          <Description momentId="grand_entrance" />
          <div className="space-y-2">
            <MusicLink
              phase="grand_entrance"
              songs={songs}
              expected="single"
              label="Entrance song"
              hint="you walk in to this"
            />
            {!hasSongsFor("grand_entrance") && (
              <SkipMusicToggle
                skip={extras?.skip_music ?? false}
                onChange={(v) =>
                  updateExtras("grand_entrance", { skip_music: v })
                }
              />
            )}
          </div>
          <MomentUniformFields
            momentId="grand_entrance"
            extras={extras}
            onChange={(patch) => updateExtras("grand_entrance", patch)}
            receptionData={data}
            scheduleOwnsTime={timeIsFromScheduleById["grand_entrance"]}
            onNavigateToSchedule={onNavigateToSchedule}
          />
        </div>
      </MomentCard>
    );
  }

  function renderFirstDance(title: string, extras: MomentExtras | undefined) {
    const summary = chips([
      summarizeSongs("first_dance", songs, "single"),
      ...extrasChips(extras),
    ]);
    return (
      <MomentCard
        key="first_dance"
        id="first_dance"
        title={title}
        time={effectiveTimeById["first_dance"]}
        timeFromSchedule={timeIsFromScheduleById["first_dance"]}
        onNavigateToSchedule={onNavigateToSchedule}
        summaryChips={summary}
        onRename={(t) => renameMoment("first_dance", t)}
        onRemove={() => hideBuiltInMoment("first_dance")}
        removeLabel="Hide from timeline"
      >
        <div className="space-y-5">
          <Description momentId="first_dance" />
          <div className="space-y-2">
            <MusicLink
              phase="first_dance"
              songs={songs}
              expected="single"
              label="First dance song"
              hint="song + artist, managed in Music tab"
            />
            {!hasSongsFor("first_dance") && (
              <SkipMusicToggle
                skip={extras?.skip_music ?? false}
                onChange={(v) => updateExtras("first_dance", { skip_music: v })}
              />
            )}
          </div>
          <PrimaryField
            icon={<StickyNote className="h-4 w-4 text-primary/80" />}
            label="Choreo notes"
            hint="optional — e.g., choreographed, surprise mashup"
          >
            <Textarea
              placeholder="Anything the couple wants remembered about this dance"
              value={data.first_dance_notes}
              onChange={(e) => set({ first_dance_notes: e.target.value })}
              className="text-sm min-h-[52px]"
            />
          </PrimaryField>
          <MomentUniformFields
            momentId="first_dance"
            extras={extras}
            onChange={(patch) => updateExtras("first_dance", patch)}
            receptionData={data}
            scheduleOwnsTime={timeIsFromScheduleById["first_dance"]}
            onNavigateToSchedule={onNavigateToSchedule}
          />
        </div>
      </MomentCard>
    );
  }

  function renderDinner(title: string, extras: MomentExtras | undefined) {
    const vendorMeals = logisticsData?.vendor_meals_timing?.trim();
    const summary = chips([
      summarizeSongs("dinner", songs, "playlist"),
      vendorMeals ? "vendor meals noted" : null,
      ...extrasChips(extras),
    ]);
    return (
      <MomentCard
        key="dinner"
        id="dinner"
        title={title}
        time={effectiveTimeById["dinner"]}
        timeFromSchedule={timeIsFromScheduleById["dinner"]}
        onNavigateToSchedule={onNavigateToSchedule}
        summaryChips={summary}
        onRename={(t) => renameMoment("dinner", t)}
        onRemove={() => hideBuiltInMoment("dinner")}
        removeLabel="Hide from timeline"
      >
        <div className="space-y-5">
          <Description momentId="dinner" />

          <div className="space-y-2">
            <MusicLink
              phase="dinner"
              songs={songs}
              expected="playlist"
              label="Dinner music"
              hint="background playlist, managed in Music tab"
            />
            {!hasSongsFor("dinner") && (
              <SkipMusicToggle
                skip={extras?.skip_music ?? false}
                onChange={(v) => updateExtras("dinner", { skip_music: v })}
                label="No music during dinner"
              />
            )}
          </div>

          <PrimaryField
            icon={<UtensilsCrossed className="h-4 w-4 text-primary/80" />}
            label="Vendor meals"
            hint="when vendors eat — managed in Logistics"
          >
            <button
              type="button"
              onClick={onNavigateToLogistics}
              disabled={!onNavigateToLogistics}
              className={cn(
                "group/vm w-full flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors text-left",
                vendorMeals
                  ? "border-primary/30 bg-primary/[0.04] hover:border-primary/60"
                  : "border-dashed border-border/80 bg-background hover:border-primary/40",
                !onNavigateToLogistics && "opacity-60 cursor-not-allowed"
              )}
            >
              {vendorMeals ? (
                <span className="text-sm text-foreground flex-1 min-w-0 truncate whitespace-nowrap">
                  {vendorMeals}
                </span>
              ) : (
                <>
                  <Plus className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                  <span className="text-sm text-muted-foreground flex-1">
                    Not set
                  </span>
                </>
              )}
              {onNavigateToLogistics && (
                <span className="inline-flex items-center gap-1 text-xs text-primary/70 group-hover/vm:text-primary transition-colors shrink-0">
                  {vendorMeals ? "Edit" : "Add"} in Logistics
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              )}
            </button>
          </PrimaryField>

          <MomentUniformFields
            momentId="dinner"
            extras={extras}
            onChange={(patch) => updateExtras("dinner", patch)}
            receptionData={data}
            scheduleOwnsTime={timeIsFromScheduleById["dinner"]}
            onNavigateToSchedule={onNavigateToSchedule}
          />
        </div>
      </MomentCard>
    );
  }

  function renderParentDances(title: string, extras: MomentExtras | undefined) {
    const count = (data.parent_dances || []).filter(
      (d) => d.who?.trim() || d.song?.trim()
    ).length;
    const summary = chips([
      count > 0 ? `${count} dance${count > 1 ? "s" : ""}` : null,
      ...extrasChips(extras),
    ]);
    return (
      <MomentCard
        key="parent_dances"
        id="parent_dances"
        title={title}
        time={effectiveTimeById["parent_dances"]}
        timeFromSchedule={timeIsFromScheduleById["parent_dances"]}
        onNavigateToSchedule={onNavigateToSchedule}
        summaryChips={summary}
        onRename={(t) => renameMoment("parent_dances", t)}
        onRemove={() => hideBuiltInMoment("parent_dances")}
        removeLabel="Hide from timeline"
      >
        <div className="space-y-5">
          <Description momentId="parent_dances" />
          <PrimaryField
            icon={<Users2 className="h-4 w-4 text-primary/80" />}
            label="Dance pairs"
            hint="each pairing and their song"
          >
            <div className="space-y-2">
              {(data.parent_dances || []).map((d) => (
                <div key={d.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Input
                    placeholder="Who (e.g., Bride & Father)"
                    value={d.who}
                    onChange={(e) =>
                      updateParentDance(d.id, { who: e.target.value })
                    }
                    className="h-9 text-sm sm:flex-1"
                  />
                  <Input
                    placeholder="Song"
                    value={d.song}
                    onChange={(e) =>
                      updateParentDance(d.id, { song: e.target.value })
                    }
                    className="h-9 text-sm sm:flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Artist"
                      value={d.artist}
                      onChange={(e) =>
                        updateParentDance(d.id, { artist: e.target.value })
                      }
                      className="flex-1 sm:flex-none sm:w-32 h-9 text-sm"
                    />
                    <button
                      onClick={() => removeParentDance(d.id)}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addParentDance}
              className="mt-3 gap-1.5 text-xs"
            >
              <Plus className="h-3 w-3" />
              Add parent dance
            </Button>
          </PrimaryField>
          <MomentUniformFields
            momentId="parent_dances"
            extras={extras}
            onChange={(patch) => updateExtras("parent_dances", patch)}
            receptionData={data}
            scheduleOwnsTime={timeIsFromScheduleById["parent_dances"]}
            onNavigateToSchedule={onNavigateToSchedule}
          />
        </div>
      </MomentCard>
    );
  }

  function renderSpeeches(title: string, extras: MomentExtras | undefined) {
    const n = (data.speeches || []).length;
    const summary = chips([
      n > 0 ? `${n} speaker${n > 1 ? "s" : ""} · ~${speechesTotalMinutes(data.speeches)} min` : null,
      ...extrasChips(extras),
    ]);
    return (
      <MomentCard
        key="speeches"
        id="speeches"
        title={title}
        time={effectiveTimeById["speeches"]}
        timeFromSchedule={timeIsFromScheduleById["speeches"]}
        onNavigateToSchedule={onNavigateToSchedule}
        summaryChips={summary}
        onRename={(t) => renameMoment("speeches", t)}
        onRemove={() => hideBuiltInMoment("speeches")}
        removeLabel="Hide from timeline"
      >
        <div className="space-y-5">
          <Description momentId="speeches" />
          <PrimaryField
            icon={<Mic className="h-4 w-4 text-primary/80" />}
            label="Speakers"
            hint="order and estimated length — tight estimates save the timeline"
          >
            <div className="space-y-3">
              {(data.speeches || []).map((s, i) => {
                const minutes = s.estimated_minutes ?? 3;
                const isCustom = ![2, 3, 5].includes(minutes);
                return (
                  <div key={s.id} className="rounded-md border border-border/40 bg-background p-2 space-y-1.5">
                    {/* Mobile: 3-col grid so fields stack cleanly. Desktop: single flex row. */}
                    <div className="grid grid-cols-[auto_1fr_auto] gap-2 sm:flex sm:items-center sm:flex-nowrap">
                      <span className="text-xs text-muted-foreground/50 w-5 text-right self-center sm:shrink-0">
                        {i + 1}
                      </span>
                      <Input
                        placeholder="Speaker name"
                        value={s.speaker}
                        onChange={(e) => updateSpeech(s.id, { speaker: e.target.value })}
                        className="h-9 text-sm sm:flex-1 sm:min-w-[140px]"
                      />
                      <button
                        onClick={() => removeSpeech(s.id)}
                        className="self-center text-muted-foreground/40 hover:text-destructive transition-colors p-1 sm:order-[99] sm:shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <Input
                        placeholder="Role (e.g., Maid of Honor)"
                        value={s.role ?? ""}
                        onChange={(e) => updateSpeech(s.id, { role: e.target.value })}
                        className="col-span-3 h-9 text-sm sm:col-auto sm:flex-1 sm:min-w-[140px]"
                      />
                      <div className="col-span-3 flex items-center gap-1 sm:col-auto sm:shrink-0">
                        {[2, 3, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => updateSpeech(s.id, { estimated_minutes: n })}
                            className={cn(
                              "h-7 px-2 rounded-md text-xs tabular-nums transition-colors border",
                              minutes === n && !isCustom
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border bg-background text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {n}m
                          </button>
                        ))}
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          value={isCustom ? minutes : ""}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            if (Number.isFinite(n) && n > 0) updateSpeech(s.id, { estimated_minutes: n });
                          }}
                          placeholder="…"
                          className={cn("h-7 w-14 text-xs tabular-nums px-1.5", isCustom && "ring-1 ring-primary")}
                        />
                      </div>
                    </div>
                    <Input
                      placeholder={`MC intro (optional — default: "Please welcome to the mic, ${s.speaker || "…"}${s.role ? ", " + s.role : ""}.")`}
                      value={s.intro_line ?? ""}
                      onChange={(e) => updateSpeech(s.id, { intro_line: e.target.value })}
                      className="h-8 text-xs text-muted-foreground"
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={addSpeech} className="gap-1.5 text-xs">
                <Plus className="h-3 w-3" />Add speaker
              </Button>
              {(data.speeches || []).length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  Total: ~{speechesTotalMinutes(data.speeches)} min
                </span>
              )}
            </div>
          </PrimaryField>
          <MomentUniformFields
            momentId="speeches"
            extras={extras}
            onChange={(patch) => updateExtras("speeches", patch)}
            receptionData={data}
            scheduleOwnsTime={timeIsFromScheduleById["speeches"]}
            onNavigateToSchedule={onNavigateToSchedule}
          />
        </div>
      </MomentCard>
    );
  }

  function renderCakeCutting(title: string, extras: MomentExtras | undefined) {
    const summary = chips([
      summarizeSongs("cake_cutting", songs, "single"),
      ...extrasChips(extras),
    ]);
    return (
      <MomentCard
        key="cake_cutting"
        id="cake_cutting"
        title={title}
        time={effectiveTimeById["cake_cutting"]}
        timeFromSchedule={timeIsFromScheduleById["cake_cutting"]}
        onNavigateToSchedule={onNavigateToSchedule}
        summaryChips={summary}
        onRename={(t) => renameMoment("cake_cutting", t)}
        onRemove={() => hideBuiltInMoment("cake_cutting")}
        removeLabel="Hide from timeline"
      >
        <div className="space-y-5">
          <Description momentId="cake_cutting" />
          <div className="space-y-2">
            <MusicLink
              phase="cake_cutting"
              songs={songs}
              expected="single"
              label="Cake cutting song"
              hint="plays as you slice"
            />
            {!hasSongsFor("cake_cutting") && (
              <SkipMusicToggle
                skip={extras?.skip_music ?? false}
                onChange={(v) => updateExtras("cake_cutting", { skip_music: v })}
              />
            )}
          </div>
          <MomentUniformFields
            momentId="cake_cutting"
            extras={extras}
            onChange={(patch) => updateExtras("cake_cutting", patch)}
            receptionData={data}
            scheduleOwnsTime={timeIsFromScheduleById["cake_cutting"]}
            onNavigateToSchedule={onNavigateToSchedule}
          />
        </div>
      </MomentCard>
    );
  }

  function renderLastDance(title: string, extras: MomentExtras | undefined) {
    const summary = chips([
      summarizeSongs("last_dance", songs, "single"),
      ...extrasChips(extras),
    ]);
    return (
      <MomentCard
        key="last_dance"
        id="last_dance"
        title={title}
        time={effectiveTimeById["last_dance"]}
        timeFromSchedule={timeIsFromScheduleById["last_dance"]}
        onNavigateToSchedule={onNavigateToSchedule}
        summaryChips={summary}
        onRename={(t) => renameMoment("last_dance", t)}
        onRemove={() => hideBuiltInMoment("last_dance")}
        removeLabel="Hide from timeline"
      >
        <div className="space-y-5">
          <Description momentId="last_dance" />
          <div className="space-y-2">
            <MusicLink
              phase="last_dance"
              songs={songs}
              expected="single"
              label="Last dance song"
              hint="the night's final song — last chance on the floor"
            />
            {!hasSongsFor("last_dance") && (
              <SkipMusicToggle
                skip={extras?.skip_music ?? false}
                onChange={(v) => updateExtras("last_dance", { skip_music: v })}
              />
            )}
          </div>
          <MomentUniformFields
            momentId="last_dance"
            extras={extras}
            onChange={(patch) => updateExtras("last_dance", patch)}
            receptionData={data}
            scheduleOwnsTime={timeIsFromScheduleById["last_dance"]}
            onNavigateToSchedule={onNavigateToSchedule}
          />
        </div>
      </MomentCard>
    );
  }

  function renderExit(title: string, extras: MomentExtras | undefined) {
    const summary = chips([
      data.exit_style && data.exit_style !== "none" ? data.exit_style.replace(/_/g, " ") : null,
      data.exit_song?.trim(),
      ...extrasChips(extras),
    ]);
    return (
      <MomentCard
        key="exit"
        id="exit"
        title={title}
        time={effectiveTimeById["exit"]}
        timeFromSchedule={timeIsFromScheduleById["exit"]}
        onNavigateToSchedule={onNavigateToSchedule}
        summaryChips={summary}
        onRename={(t) => renameMoment("exit", t)}
        onRemove={() => hideBuiltInMoment("exit")}
        removeLabel="Hide from timeline"
      >
        <div className="space-y-5">
          <Description momentId="exit" />
          <PrimaryField
            icon={<LogOut className="h-4 w-4 text-primary/80" />}
            label="Exit style"
            hint="how you leave — planners say this is the biggest footgun"
          >
            <Select
              value={data.exit_style || undefined}
              onValueChange={(v) =>
                set({ exit_style: (v ?? "none") as ReceptionData["exit_style"] })
              }
            >
              <SelectTrigger className="w-full sm:w-64 h-10 text-sm">
                <SelectValue placeholder="Select exit style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None / just leave</SelectItem>
                <SelectItem value="sparklers">Sparklers</SelectItem>
                <SelectItem value="bubbles">Bubbles</SelectItem>
                <SelectItem value="confetti">Confetti</SelectItem>
                <SelectItem value="ribbon_wands">Ribbon wands</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </PrimaryField>
          {data.exit_style && data.exit_style !== "none" && (
            <>
              <PrimaryField
                icon={<Music className="h-4 w-4 text-primary/80" />}
                label="Exit song"
                hint="what plays as you walk out"
              >
                <MomentMusicBlock
                  skip={extras?.skip_music ?? false}
                  onSkipChange={(v) =>
                    updateExtras("exit", { skip_music: v })
                  }
                >
                  <Input
                    placeholder='e.g., "End of the Road" by Boyz II Men'
                    value={data.exit_song}
                    onChange={(e) => set({ exit_song: e.target.value })}
                    className="h-10 text-sm"
                  />
                </MomentMusicBlock>
              </PrimaryField>
              <PrimaryField
                icon={<ShieldCheck className="h-4 w-4 text-primary/80" />}
                label="Exit details"
                hint="confirm these 2 weeks out — biggest footgun"
              >
                <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-2.5">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={data.exit_plan?.venue_policy_confirmed ?? false}
                      onCheckedChange={(v) =>
                        set({
                          exit_plan: {
                            ...(data.exit_plan || { point_person: "", rain_backup: "", notes: "", venue_policy_confirmed: false }),
                            venue_policy_confirmed: !!v,
                          } as ExitPlan,
                        })
                      }
                    />
                    Venue confirmed OK with flames / litter / timing
                  </label>
                  <Input
                    placeholder="Point person (who lights / hands out / signals the exit)"
                    value={data.exit_plan?.point_person ?? ""}
                    onChange={(e) =>
                      set({
                        exit_plan: {
                          ...(data.exit_plan || { point_person: "", rain_backup: "", notes: "", venue_policy_confirmed: false }),
                          point_person: e.target.value,
                        } as ExitPlan,
                      })
                    }
                    className="h-9 text-sm"
                  />
                  <Input
                    placeholder="Rain / backup plan"
                    value={data.exit_plan?.rain_backup ?? ""}
                    onChange={(e) =>
                      set({
                        exit_plan: {
                          ...(data.exit_plan || { point_person: "", rain_backup: "", notes: "", venue_policy_confirmed: false }),
                          rain_backup: e.target.value,
                        } as ExitPlan,
                      })
                    }
                    className="h-9 text-sm"
                  />
                  <Input
                    placeholder="Other notes (count, storage, staging…)"
                    value={data.exit_plan?.notes ?? ""}
                    onChange={(e) =>
                      set({
                        exit_plan: {
                          ...(data.exit_plan || { point_person: "", rain_backup: "", notes: "", venue_policy_confirmed: false }),
                          notes: e.target.value,
                        } as ExitPlan,
                      })
                    }
                    className="h-9 text-sm"
                  />
                </div>
              </PrimaryField>
            </>
          )}
          <MomentUniformFields
            momentId="exit"
            extras={extras}
            onChange={(patch) => updateExtras("exit", patch)}
            receptionData={data}
            scheduleOwnsTime={timeIsFromScheduleById["exit"]}
            onNavigateToSchedule={onNavigateToSchedule}
          />
        </div>
      </MomentCard>
    );
  }

  function renderToss(id: TossMomentId, title: string, extras: MomentExtras | undefined) {
    const tossSummary: MomentSummaryChip[] = chips([
      extras?.song?.trim(),
      ...extrasChips(extras),
    ]);
    return (
      <MomentCard
        key={id}
        id={id}
        title={title}
        time={effectiveTimeById[id]}
        timeFromSchedule={timeIsFromScheduleById[id]}
        onNavigateToSchedule={onNavigateToSchedule}
        summaryChips={tossSummary}
        onRename={(t) => renameMoment(id, t)}
        onRemove={() => removeTossFromSchedule(id)}
        removeLabel="Remove from timeline"
      >
        <div className="space-y-5">
          <Description momentId={id} />
          <PrimaryField
            icon={<Music className="h-4 w-4 text-primary/80" />}
            label="Music cue"
            hint="optional — song title or playlist note"
          >
            <MomentMusicBlock
              skip={extras?.skip_music ?? false}
              onSkipChange={(v) => updateExtras(id, { skip_music: v })}
            >
              <Input
                placeholder="Song — or describe the playlist"
                value={extras?.song ?? ""}
                onChange={(e) => updateExtras(id, { song: e.target.value })}
                className="h-10 text-sm"
              />
            </MomentMusicBlock>
          </PrimaryField>
          <MomentUniformFields
            momentId={id}
            extras={extras}
            onChange={(patch) => updateExtras(id, patch)}
            receptionData={data}
            scheduleOwnsTime={timeIsFromScheduleById[id]}
            onNavigateToSchedule={onNavigateToSchedule}
          />
        </div>
      </MomentCard>
    );
  }

  function renderCustomMoment(m: CustomReceptionMoment) {
    const extrasFromCustom: MomentExtras = {
      time: m.time,
      skip_music: m.skip_music,
      song: m.song,
      mc_needed: m.mc_needed,
      mc_line: m.mc_line,
      guest_action: m.guest_action,
      notes: m.notes,
    };
    const summary = chips([
      m.song?.trim(),
      ...extrasChips(extrasFromCustom),
    ]);
    const isNewlyAdded = !m.title || m.title === "New moment";
    return (
      <MomentCard
        key={m.id}
        id={m.id}
        title={m.title || "Untitled moment"}
        time={m.time}
        summaryChips={summary}
        defaultOpen={isNewlyAdded}
        defaultEditingTitle={isNewlyAdded}
        onRename={(t) => renameMoment(m.id, t)}
        onRemove={() => removeCustomMoment(m.id)}
        removeLabel="Delete this moment"
      >
        <div className="space-y-5">
          <p className="text-xs text-muted-foreground leading-relaxed -mt-1">
            A moment that&apos;s unique to your reception — anything from a tea
            ceremony to a surprise performance. Rename the title by clicking it.
          </p>
          <PrimaryField
            icon={<Music className="h-4 w-4 text-primary/80" />}
            label="Song"
            hint="optional — a signature song for this moment"
          >
          <MomentMusicBlock
            skip={m.skip_music ?? false}
            onSkipChange={(v) => updateCustomMoment(m.id, { skip_music: v })}
          >
            <Input
              placeholder="Song (optional)"
              value={m.song ?? ""}
              onChange={(e) => updateCustomMoment(m.id, { song: e.target.value })}
              className="h-10 text-sm"
            />
          </MomentMusicBlock>
          </PrimaryField>
          <MomentUniformFields
            momentId={m.id}
            extras={extrasFromCustom}
            onChange={(patch) => updateCustomMoment(m.id, patch)}
            receptionData={data}
          />
        </div>
      </MomentCard>
    );
  }
}

// ── "Skip music for this moment" toggle — kept for edge cases where
//    couples want explicit silence (so the DJ knows it's intentional).
function SkipMusicToggle({
  skip,
  onChange,
  label = "No music for this moment",
}: {
  skip: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
      <Checkbox
        checked={skip}
        onCheckedChange={(v) => onChange(!!v)}
      />
      {label}
      <span className="text-muted-foreground/50">
        · silence is intentional, vendors will know
      </span>
    </label>
  );
}

// ── Shared primary-field layout (Variant A+) ─────────────────────────────
// Larger label + icon so primary fields visually outrank the optional chips
// below. Icon size is forced via !important to override caller's h-4 w-4.
function PrimaryField({
  icon,
  label,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="flex items-center self-center [&>svg]:!h-[18px] [&>svg]:!w-[18px] [&>svg]:!text-primary">
          {icon}
        </span>
        <label className="text-[15px] font-semibold text-foreground leading-none">
          {label}
        </label>
        {hint && (
          <span className="text-[13px] text-muted-foreground">— {hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

