"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  DollarSign,
  Clock,
  Package,
  AlertTriangle,
  Heart,
  CreditCard,
  Users,
  Music,
  Mic,
  Shirt,
  Utensils,
  Phone,
  CloudRain,
  UserX,
  Thermometer,
  Car,
  Cake,
  Brain,
  ListChecks,
  Scissors,
  Timer,
  Camera,
  FileText,
  Plane,
  ShieldAlert,
  MoreHorizontal,
  Undo2,
  CalendarPlus,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { EmergencyKitChecklist } from "./emergency-kit";
import {
  BUDGET_HACKS,
  DAY_OF_TIPS,
  THINGS_TO_PREPARE,
  KIT_CATEGORIES,
  defaultItemKey,
  type TipEntry,
  type PreparationEntry,
  type EmergencyKitState,
  type TipsInteractions,
} from "./data";

const INTERACTIONS_SECTION = "tips_interactions";

// Icon resolution by name (so data.ts stays JSON-serializable friendly).
const ICONS: Record<string, React.ElementType> = {
  Heart,
  CreditCard,
  Users,
  Music,
  Mic,
  Shirt,
  Utensils,
  Phone,
  Clock,
  CloudRain,
  UserX,
  AlertTriangle,
  Thermometer,
  Car,
  Cake,
  Brain,
  ListChecks,
  Scissors,
  Timer,
  Camera,
  FileText,
  Plane,
  ShieldAlert,
};

interface TipsContentProps {
  weddingId: string;
  weddingDate: string | null;
  venueIndoorOutdoor: string | null;
  initialKitState: EmergencyKitState;
  initialInteractions: TipsInteractions;
}

function computeOffsetDate(
  weddingDate: string | null,
  offsetWeeks: number | undefined
): string | null {
  if (!weddingDate || offsetWeeks == null) return null;
  const target = new Date(weddingDate + "T00:00:00");
  target.setDate(target.getDate() - offsetWeeks * 7);
  // Clamp to today or later — no point backdating.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (target.getTime() < today.getTime()) {
    return today.toISOString().slice(0, 10);
  }
  return target.toISOString().slice(0, 10);
}

function formatShortDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type SectionKey = "budget" | "dayof" | "kit" | "prepare";

export function TipsContent({
  weddingId,
  weddingDate,
  venueIndoorOutdoor,
  initialKitState,
  initialInteractions,
}: TipsContentProps) {
  const isIndoorOnly = venueIndoorOutdoor === "indoor";
  const [interactions, setInteractions] =
    useState<TipsInteractions>(initialInteractions);
  const [kitState, setKitState] =
    useState<EmergencyKitState>(initialKitState);
  const [kitShowExtended, setKitShowExtended] = useState(false);
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    budget: false,
    dayof: false,
    kit: false,
    prepare: false,
  });

  // Kit counts for the accordion header — "packed / total" reflects
  // current state (visible defaults + custom items) so the badge updates
  // live as items are checked, hidden, or the extended toggle flips.
  const kitCounts = useMemo(() => {
    const hidden = new Set(kitState.hidden);
    const packed = new Set(kitState.packed);
    let total = 0;
    let packedCount = 0;
    for (const cat of KIT_CATEGORIES) {
      const items = kitShowExtended
        ? [...cat.essentials, ...cat.extended]
        : cat.essentials;
      for (const item of items) {
        const key = defaultItemKey(cat.id, item);
        if (hidden.has(key)) continue;
        total++;
        if (packed.has(key)) packedCount++;
      }
    }
    for (const custom of kitState.custom) {
      total++;
      if (custom.packed) packedCount++;
    }
    return { total, packedCount };
  }, [kitState, kitShowExtended]);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipInitialSave = useRef(true);

  // Autosave interactions (debounced).
  useEffect(() => {
    if (skipInitialSave.current) {
      skipInitialSave.current = false;
      return;
    }
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const supabase = createClient();
      await supabase.from("wedding_day_details").upsert(
        {
          wedding_id: weddingId,
          section: INTERACTIONS_SECTION,
          data: interactions as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "wedding_id,section" }
      );
    }, 500);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [interactions, weddingId]);

  const dismiss = useCallback((tipId: string, tipTitle: string) => {
    setInteractions((prev) => ({
      ...prev,
      dismissed: prev.dismissed.includes(tipId)
        ? prev.dismissed
        : [...prev.dismissed, tipId],
    }));
    toast("Tip hidden", {
      description: tipTitle,
      action: {
        label: "Undo",
        onClick: () =>
          setInteractions((prev) => ({
            ...prev,
            dismissed: prev.dismissed.filter((id) => id !== tipId),
          })),
      },
    });
  }, []);

  const restoreAll = useCallback(() => {
    setInteractions((prev) => ({ ...prev, dismissed: [] }));
  }, []);

  const addToTimeline = useCallback(
    async (
      tipId: string,
      title: string,
      description?: string,
      eventDate?: string | null
    ) => {
      const supabase = createClient();
      const { error } = await supabase.from("timeline_events").insert({
        wedding_id: weddingId,
        type: "pre_wedding",
        title,
        description: description ?? null,
        priority: "normal",
        event_date: eventDate ?? null,
      });
      if (error) {
        toast.error("Could not add to Timeline", {
          description: error.message,
        });
        return;
      }
      const pretty = formatShortDate(eventDate ?? null);
      toast.success("Added to Timeline", {
        description: pretty
          ? `Scheduled for ${pretty}`
          : "Set a date in the Timeline page.",
        action: {
          label: "Open Timeline",
          onClick: () => {
            window.location.href = "/timeline";
          },
        },
      });
      setInteractions((prev) => ({
        ...prev,
        dismissed: prev.dismissed.includes(tipId)
          ? prev.dismissed
          : [...prev.dismissed, tipId],
      }));
    },
    [weddingId]
  );

  const dismissed = useMemo(
    () => new Set(interactions.dismissed),
    [interactions.dismissed]
  );

  // Counts of visible vs total (used on each section header as a "live" badge)
  const budgetVisible = BUDGET_HACKS.filter((t) => !dismissed.has(t.id));
  const dayofVisible = DAY_OF_TIPS.filter((t) => !dismissed.has(t.id));
  // Context filter: hide outdoor-only prep tips for indoor weddings.
  // Dismissed tips also filter out. All hidden tips are surfaced in the
  // bottom drawer so nothing silently disappears.
  const prepareVisible = THINGS_TO_PREPARE.filter(
    (t) => !dismissed.has(t.id) && !(isIndoorOnly && t.hideWhenIndoor)
  );

  const toggle = (key: SectionKey) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-3">
      {/* Budget */}
      <SectionShell
        isOpen={open.budget}
        onToggle={() => toggle("budget")}
        icon={
          <DollarSign className="size-4 text-green-700 dark:text-green-400" />
        }
        iconBg="bg-green-100 dark:bg-green-900/30"
        title="Budget Hacks"
        subtitle="Small moves that add up to real savings"
        count={budgetVisible.length}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {budgetVisible.map((tip) => (
            <TipCard
              key={tip.id}
              tip={tip}
              iconSlot={
                <DollarSign className="size-3.5 text-green-700 dark:text-green-400" />
              }
              iconBg="bg-green-100 dark:bg-green-900/30"
              showMetaAsSubtitle
              onDismiss={() => dismiss(tip.id, tip.title)}
              onAddToTimeline={() => addToTimeline(tip.id, tip.title, tip.meta)}
            />
          ))}
        </div>
      </SectionShell>

      {/* Day-of tips */}
      <SectionShell
        isOpen={open.dayof}
        onToggle={() => toggle("dayof")}
        icon={<Clock className="size-4 text-blue-700 dark:text-blue-400" />}
        iconBg="bg-blue-100 dark:bg-blue-900/30"
        title="Day-of Tips"
        subtitle="Field-tested reminders from couples who wished they'd known"
        count={dayofVisible.length}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {dayofVisible.map((tip) => {
            const Icon = tip.iconName ? ICONS[tip.iconName] : Clock;
            return (
              <TipCard
                key={tip.id}
                tip={tip}
                iconSlot={
                  <Icon className="size-3.5 text-blue-700 dark:text-blue-400" />
                }
                iconBg="bg-blue-100 dark:bg-blue-900/30"
                onDismiss={() => dismiss(tip.id, tip.title)}
                onAddToTimeline={() => addToTimeline(tip.id, tip.title)}
              />
            );
          })}
        </div>
      </SectionShell>

      {/* Emergency Kit */}
      <SectionShell
        isOpen={open.kit}
        onToggle={() => toggle("kit")}
        icon={
          <Package className="size-4 text-purple-700 dark:text-purple-400" />
        }
        iconBg="bg-purple-100 dark:bg-purple-900/30"
        title="Emergency Kit"
        subtitle="A small portable bag for the unexpected during the event"
        count={`${kitCounts.packedCount}/${kitCounts.total}`}
      >
        <EmergencyKitChecklist
          weddingId={weddingId}
          state={kitState}
          onStateChange={setKitState}
          showExtended={kitShowExtended}
          onShowExtendedChange={setKitShowExtended}
        />
      </SectionShell>

      {/* Things to prepare for (merged What-If + Pitfalls + Legal/Honeymoon) */}
      <SectionShell
        isOpen={open.prepare}
        onToggle={() => toggle("prepare")}
        icon={
          <AlertTriangle className="size-4 text-amber-700 dark:text-amber-400" />
        }
        iconBg="bg-amber-100 dark:bg-amber-900/30"
        title="Things to Prepare For"
        subtitle="Plan ahead so small problems don't become big ones"
        count={prepareVisible.length}
      >
        <PrepareTimeline
          entries={prepareVisible}
          onDismiss={(tip) => dismiss(tip.id, tip.title)}
          onAddToTimeline={(tip) =>
            addToTimeline(
              tip.id,
              tip.title,
              tip.body,
              computeOffsetDate(weddingDate, tip.offsetWeeks)
            )
          }
        />
      </SectionShell>

      {/* Hidden drawer: both auto-filtered (e.g. indoor) and user-dismissed
          tips live here so couples can see what's out of view and bring
          anything back. Empty when there's nothing to hide. */}
      <HiddenDrawer
        dismissed={interactions.dismissed}
        contextHidden={
          isIndoorOnly
            ? THINGS_TO_PREPARE.filter(
                (t) => t.hideWhenIndoor && !interactions.dismissed.includes(t.id)
              )
            : []
        }
        contextReason={isIndoorOnly ? "Your venue is indoor" : ""}
        onRestoreOne={(tipId) =>
          setInteractions((prev) => ({
            ...prev,
            dismissed: prev.dismissed.filter((id) => id !== tipId),
          }))
        }
        onRestoreAll={restoreAll}
      />
    </div>
  );
}

function lookupTipTitle(tipId: string): string | null {
  return (
    BUDGET_HACKS.find((t) => t.id === tipId)?.title ??
    DAY_OF_TIPS.find((t) => t.id === tipId)?.title ??
    THINGS_TO_PREPARE.find((t) => t.id === tipId)?.title ??
    null
  );
}

function HiddenDrawer({
  dismissed,
  contextHidden,
  contextReason,
  onRestoreOne,
  onRestoreAll,
}: {
  dismissed: string[];
  contextHidden: PreparationEntry[];
  contextReason: string;
  onRestoreOne: (tipId: string) => void;
  onRestoreAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const total = dismissed.length + contextHidden.length;
  if (total === 0) return null;

  // Build dismissed details with resolved titles; skip unknowns silently.
  const dismissedDetails = dismissed
    .map((id) => ({ id, title: lookupTipTitle(id) }))
    .filter((d): d is { id: string; title: string } => d.title !== null);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card size="sm" className="bg-muted/30">
        <CollapsibleTrigger className="w-full">
          <CardContent className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <ChevronDown
                className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
              />
              {total} tip{total === 1 ? "" : "s"} hidden from your view
            </span>
            <span className="text-muted-foreground/70">
              {open ? "Hide list" : "See what's hidden"}
            </span>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 text-xs">
            {dismissedDetails.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    You hid these
                  </span>
                  {dismissedDetails.length > 1 ? (
                    <button
                      type="button"
                      onClick={onRestoreAll}
                      className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                    >
                      Restore all
                    </button>
                  ) : null}
                </div>
                <ul className="space-y-1">
                  {dismissedDetails.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-3 py-1 border-b border-border/40 last:border-0"
                    >
                      <span className="truncate">{d.title}</span>
                      <button
                        type="button"
                        onClick={() => onRestoreOne(d.id)}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <Undo2 className="h-3 w-3" />
                        Restore
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {contextHidden.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Auto-hidden · {contextReason}
                </div>
                <ul className="space-y-1">
                  {contextHidden.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 py-1 border-b border-border/40 last:border-0"
                    >
                      <span className="truncate">{t.title}</span>
                      <span className="text-muted-foreground/60 shrink-0 text-[11px] italic">
                        not shown
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-muted-foreground/70 italic pt-1">
                  These are filtered based on your wedding info. Update your
                  venue type in Settings if this doesn&apos;t apply.
                </p>
              </div>
            ) : null}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ── Section shell (accordion) ───────────────────────────────────────────

function SectionShell({
  isOpen,
  onToggle,
  icon,
  iconBg,
  title,
  subtitle,
  count,
  children,
}: {
  isOpen: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  count?: number | string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card>
        <CollapsibleTrigger className="w-full text-left">
          <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}
            >
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{title}</span>
                {count != null ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {count}
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {subtitle}
              </p>
            </div>
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-2 border-t">{children}</div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ── Tip card (budget / day-of) ──────────────────────────────────────────

function TipCard({
  tip,
  iconSlot,
  iconBg,
  showMetaAsSubtitle,
  onDismiss,
  onAddToTimeline,
}: {
  tip: TipEntry;
  iconSlot: React.ReactNode;
  iconBg: string;
  showMetaAsSubtitle?: boolean;
  onDismiss: () => void;
  onAddToTimeline: () => void;
}) {
  return (
    <Card size="sm" className="group relative">
      <CardContent className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${iconBg}`}
        >
          {iconSlot}
        </div>
        <div className="space-y-1 flex-1 min-w-0">
          <p className="font-medium leading-snug pr-6">{tip.title}</p>
          {showMetaAsSubtitle && tip.meta ? (
            <p className="text-xs text-muted-foreground">{tip.meta}</p>
          ) : null}
        </div>
        <TipActions
          onDismiss={onDismiss}
          onAddToTimeline={onAddToTimeline}
        />
      </CardContent>
    </Card>
  );
}

// ── Timeline-grouped "Things to prepare for" ─────────────────────────────

function PrepareTimeline({
  entries,
  onDismiss,
  onAddToTimeline,
}: {
  entries: PreparationEntry[];
  onDismiss: (entry: PreparationEntry) => void;
  onAddToTimeline: (entry: PreparationEntry) => void;
}) {
  const groups: {
    id: PreparationEntry["timeframe"];
    label: string;
    note: string;
    // Only the "now-actionable" group opens by default. The rest stay
    // collapsed so the page isn't a wall of text on first visit.
    defaultOpen: boolean;
  }[] = [
    { id: "weeks_out", label: "Weeks out", note: "Plan + prevent", defaultOpen: true },
    { id: "week_of", label: "Week of", note: "Final buffer", defaultOpen: false },
    { id: "day_of", label: "Day of", note: "Acute issues", defaultOpen: false },
  ];

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const groupEntries = entries.filter((e) => e.timeframe === group.id);
        if (groupEntries.length === 0) return null;
        return (
          <PrepareGroup
            key={group.id}
            label={group.label}
            note={group.note}
            count={groupEntries.length}
            defaultOpen={group.defaultOpen}
          >
            <div className="grid gap-2.5 sm:grid-cols-2 pt-2">
              {groupEntries.map((entry) => (
                <PrepareCard
                  key={entry.id}
                  entry={entry}
                  onDismiss={() => onDismiss(entry)}
                  onAddToTimeline={() => onAddToTimeline(entry)}
                />
              ))}
            </div>
          </PrepareGroup>
        );
      })}
    </div>
  );
}

function PrepareGroup({
  label,
  note,
  count,
  defaultOpen,
  children,
}: {
  label: string;
  note: string;
  count: number;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full text-left">
        <div className="flex items-center gap-2 py-1.5 border-b border-border/50 group">
          <ChevronDown
            className={`size-3.5 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </h3>
          <span className="text-[10px] text-muted-foreground/70">
            · {note}
          </span>
          <Badge
            variant="secondary"
            className="ml-auto text-[10px] h-4 px-1.5"
          >
            {count}
          </Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

function PrepareCard({
  entry,
  onDismiss,
  onAddToTimeline,
}: {
  entry: PreparationEntry;
  onDismiss: () => void;
  onAddToTimeline: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ICONS[entry.iconName] ?? AlertTriangle;
  return (
    <Card className="group relative">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left"
        aria-expanded={expanded}
      >
        <CardContent className="flex gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Icon className="size-4" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-medium leading-snug pr-6 text-sm">
              {entry.title}
            </p>
            <p
              className={`text-xs text-muted-foreground leading-relaxed ${
                expanded ? "" : "line-clamp-1"
              }`}
            >
              {expanded ? entry.body : entry.lead}
            </p>
          </div>
        </CardContent>
      </button>
      <TipActions onDismiss={onDismiss} onAddToTimeline={onAddToTimeline} />
    </Card>
  );
}

// ── Actions menu (kebab) ────────────────────────────────────────────────

function TipActions({
  onDismiss,
  onAddToTimeline,
}: {
  onDismiss: () => void;
  onAddToTimeline: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 aria-expanded:opacity-100 data-[state=open]:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
        aria-label="Tip actions"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-xs">
        <DropdownMenuItem onClick={onAddToTimeline}>
          <CalendarPlus className="h-3.5 w-3.5 mr-2" />
          Add to Timeline
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDismiss}>
          <Undo2 className="h-3.5 w-3.5 mr-2" />
          Hide this tip
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
