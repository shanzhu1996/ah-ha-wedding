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
  ChevronDown,
  ChevronRight,
  Music,
  UtensilsCrossed,
  Users2,
  Mic,
  LogOut,
  ShieldCheck,
  StickyNote,
} from "lucide-react";
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
  TossMomentId,
  ReceptionPhase,
} from "./types";
import {
  speechesTotalMinutes,
  RECEPTION_MOMENT_TITLES,
  phaseForMoment,
} from "./types";
import { MomentCard, type MomentSummaryChip } from "./moment-card";
import { MomentUniformFields } from "./moment-uniform-fields";
import { MomentMusicBlock } from "./moment-music-block";
import { MusicLink, summarizeSongs } from "./music-link";
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
};

interface ReceptionSectionProps {
  data: ReceptionData;
  onChange: (data: ReceptionData) => void;
  /** Schedule data — used to pull Schedule-derived times onto moment pills. */
  scheduleData?: ScheduleData;
  /** Callback when the user clicks "Set in Schedule" — jumps to Schedule tab. */
  onNavigateToSchedule?: () => void;
  /** Full song list (wedding_songs). Music tab is the source of truth;
   *  Day-of displays read-only references via MusicLink. */
  songs?: WeddingSong[];
  /** Which phase this instance is rendering — "reception" (entrance →
   *  cake cutting) or "dancing" (last dance → exit). Custom moments show
   *  in "reception" only. Defaults to "reception" for backward compat. */
  phaseFilter?: ReceptionPhase;
}

// ── Summary helpers ─────────────────────────────────────────────────────

function buildReceptionSummary(
  data: ReceptionData,
  phase: ReceptionPhase
): string[] {
  const chips: string[] = [];
  if (phase === "reception") {
    const filledParentDances = (data.parent_dances || []).filter(
      (d) => d.who?.trim() || d.song?.trim()
    );
    if (filledParentDances.length > 0) {
      chips.push(
        `${filledParentDances.length} parent dance${filledParentDances.length > 1 ? "s" : ""}`
      );
    }
    if ((data.speeches || []).length > 0) {
      const n = data.speeches.length;
      chips.push(`${n} speech${n > 1 ? "es" : ""} · ~${speechesTotalMinutes(data.speeches)} min`);
    }
  } else if (phase === "dancing") {
    if (data.exit_style && data.exit_style !== "none") {
      chips.push(`${data.exit_style.replace(/_/g, " ")} exit`);
    }
  }
  return chips;
}

// ── Component ──────────────────────────────────────────────────────────

export function ReceptionSection({
  data,
  onChange,
  scheduleData,
  onNavigateToSchedule,
  songs = [],
  phaseFilter = "reception",
}: ReceptionSectionProps) {
  const set = (patch: Partial<ReceptionData>) => onChange({ ...data, ...patch });

  // Keep latest data reachable from toast Undo callbacks (which capture stale
  // `data` at toast-show time). Undo writes should always merge into current.
  const dataRef = useRef(data);
  dataRef.current = data;

  const summary = buildReceptionSummary(data, phaseFilter);
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

  // Reception Notes collapse
  const [notesOpen, setNotesOpen] = useState(
    () =>
      !!data.cultural_notes?.trim() ||
      data.bouquet_toss ||
      data.garter_toss ||
      data.anniversary_dance ||
      data.shoe_game
  );

  return (
    <div className="space-y-6">
      {/* Hero summary */}
      {summary.length > 0 && (
        <div className="rounded-lg border border-primary/15 bg-primary/5 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-primary/70 mb-1.5">
            {phaseFilter === "dancing" ? "Dancing so far" : "Reception so far"}
          </p>
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-foreground/80">
            {summary.map((chip, i) => (
              <span key={i} className="inline-flex items-center">
                {chip}
                {i < summary.length - 1 && (
                  <span className="ml-2 text-primary/30">·</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={momentOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {momentOrder.map((id) => renderMoment(id))}
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

      {/* Notes block — phase-specific contents */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setNotesOpen((o) => !o)}
          aria-expanded={notesOpen}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {notesOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {phaseFilter === "dancing" ? "Dancing extras" : "Reception notes"}
          {!notesOpen && (
            <span className="text-xs text-muted-foreground/60 font-normal ml-1">
              {phaseFilter === "dancing"
                ? "bouquet toss, garter toss, anniversary dance, shoe game"
                : "cultural traditions"}
            </span>
          )}
        </button>

        {notesOpen && (
          <div className="mt-4 space-y-6 border-l-2 border-border/40 pl-5">
            {phaseFilter === "dancing" && (
              <div>
                <h4 className="text-sm font-medium mb-1">Dancing extras</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Turn these on to add them as moments in the timeline above.
                </p>
                <div className="flex flex-wrap gap-4">
                  {([
                    ["bouquet_toss", "Bouquet toss"],
                    ["garter_toss", "Garter toss"],
                    ["anniversary_dance", "Anniversary dance"],
                    ["shoe_game", "Shoe game"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={data[key]}
                        onCheckedChange={(v) => set({ [key]: !!v } as Partial<ReceptionData>)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {phaseFilter === "reception" && (
              <div>
                <h4 className="text-sm font-medium mb-1">Cultural or religious traditions</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Hora, money dance, or any reception traditions you want to include.
                </p>
                <Textarea
                  placeholder="Describe any cultural or religious reception elements..."
                  value={data.cultural_notes}
                  onChange={(e) => set({ cultural_notes: e.target.value })}
                  className="text-sm min-h-[80px]"
                />
              </div>
            )}
          </div>
        )}
      </div>
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
            <SkipMusicToggle
              skip={extras?.skip_music ?? false}
              onChange={(v) =>
                updateExtras("grand_entrance", { skip_music: v })
              }
            />
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
            <SkipMusicToggle
              skip={extras?.skip_music ?? false}
              onChange={(v) => updateExtras("first_dance", { skip_music: v })}
            />
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
    const summary = chips([
      summarizeSongs("dinner", songs, "playlist"),
      data.vendor_meals_note?.trim() ? "vendor meals noted" : null,
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
            <SkipMusicToggle
              skip={extras?.skip_music ?? false}
              onChange={(v) => updateExtras("dinner", { skip_music: v })}
              label="No music during dinner"
            />
          </div>

          <PrimaryField
            icon={<UtensilsCrossed className="h-4 w-4 text-primary/80" />}
            label="Vendor meals"
            hint="when vendors eat, usually during speeches"
          >
            <Textarea
              placeholder="e.g., Vendors eat during speeches. DJ eats first, then photographer."
              value={data.vendor_meals_note}
              onChange={(e) => set({ vendor_meals_note: e.target.value })}
              className="text-sm min-h-[60px]"
            />
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
                <div key={d.id} className="flex items-center gap-2">
                  <Input
                    placeholder="Who (e.g., Bride & Father)"
                    value={d.who}
                    onChange={(e) =>
                      updateParentDance(d.id, { who: e.target.value })
                    }
                    className="flex-1 h-9 text-sm"
                  />
                  <Input
                    placeholder="Song"
                    value={d.song}
                    onChange={(e) =>
                      updateParentDance(d.id, { song: e.target.value })
                    }
                    className="flex-1 h-9 text-sm"
                  />
                  <Input
                    placeholder="Artist"
                    value={d.artist}
                    onChange={(e) =>
                      updateParentDance(d.id, { artist: e.target.value })
                    }
                    className="w-32 h-9 text-sm"
                  />
                  <button
                    onClick={() => removeParentDance(d.id)}
                    className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
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
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <span className="text-xs text-muted-foreground/50 w-5 text-right shrink-0">
                        {i + 1}
                      </span>
                      <Input
                        placeholder="Speaker name"
                        value={s.speaker}
                        onChange={(e) => updateSpeech(s.id, { speaker: e.target.value })}
                        className="flex-1 min-w-[140px] h-9 text-sm"
                      />
                      <Input
                        placeholder="Role (e.g., Maid of Honor)"
                        value={s.role ?? ""}
                        onChange={(e) => updateSpeech(s.id, { role: e.target.value })}
                        className="flex-1 min-w-[140px] h-9 text-sm"
                      />
                      <div className="flex items-center gap-1 shrink-0">
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
                      <button onClick={() => removeSpeech(s.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
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
            <SkipMusicToggle
              skip={extras?.skip_music ?? false}
              onChange={(v) => updateExtras("cake_cutting", { skip_music: v })}
            />
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
            <SkipMusicToggle
              skip={extras?.skip_music ?? false}
              onChange={(v) => updateExtras("last_dance", { skip_music: v })}
            />
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
        onRemove={() => set({ [id]: false } as Partial<ReceptionData>)}
        removeLabel="Hide from timeline"
      >
        <div className="space-y-5">
          <Description momentId={id} />
          <PrimaryField
            icon={<Music className="h-4 w-4 text-primary/80" />}
            label="Toss song"
            hint="optional — many couples have a signature"
          >
            <MomentMusicBlock
              skip={extras?.skip_music ?? false}
              onSkipChange={(v) => updateExtras(id, { skip_music: v })}
            >
              <Input
                placeholder='e.g., "Single Ladies" by Beyoncé'
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

// ── Shared primary-field layout (Variant A) ──────────────────────────────
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
        <span className="flex items-center">{icon}</span>
        <label className="text-sm font-medium text-foreground">{label}</label>
        {hint && (
          <span className="text-xs text-muted-foreground">— {hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

