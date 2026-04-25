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
  Coffee,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  Package,
  Coffee,
  Gift,
};

interface TipsContentProps {
  weddingId: string;
  weddingDate: string | null;
  venueIndoorOutdoor: string | null;
  /** Flag-gated cultural tips (A4). When true, tea-ceremony prep cards show. */
  hasTeaCeremony: boolean;
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

// ── Cluster definitions ──────────────────────────────────────────────────
// Each top-level section is broken into 2-4 collapsible sub-clusters so
// users can scan structure (cluster labels + counts) before drilling into
// long lists. All clusters default-collapsed.

type ClusterMeta = { label: string; hint: string };

type PrepCluster = "plan_ahead" | "coming_up" | "final_weeks" | "backup";
const PREP_CLUSTERS: Record<PrepCluster, ClusterMeta> = {
  plan_ahead: { label: "Plan ahead", hint: "3+ months out" },
  coming_up: { label: "Coming up", hint: "1–3 months out" },
  final_weeks: { label: "Final weeks", hint: "≤ 4 weeks" },
  backup: { label: "Backup plans", hint: "if things go sideways" },
};

function prepClusterFor(p: PreparationEntry): PrepCluster {
  if (p.offsetWeeks == null) return "backup";
  if (p.offsetWeeks >= 12) return "plan_ahead";
  if (p.offsetWeeks >= 4) return "coming_up";
  return "final_weeks";
}

type DayofCluster = "care_for_you" | "brief_team" | "lock_down";
const DAYOF_CLUSTERS: Record<DayofCluster, ClusterMeta> = {
  care_for_you: { label: "Self-care", hint: "" },
  brief_team: { label: "Your team", hint: "" },
  lock_down: { label: "Logistics", hint: "" },
};

const DAYOF_TO_CLUSTER: Record<string, DayofCluster> = {
  "dayof-10min-alone": "care_for_you",
  "dayof-eat": "care_for_you",
  "dayof-phone-away": "care_for_you",
  "dayof-people-wrangler": "brief_team",
  "dayof-dj-transitions": "brief_team",
  "dayof-mic-for-vows": "brief_team",
  "dayof-timeline-cards": "brief_team",
  "dayof-lock-cardbox": "lock_down",
  "dayof-someone-pays-vendors": "lock_down",
  "dayof-outfit-weights": "lock_down",
};

type BudgetCluster = "florals_decor" | "smart_shopping";
const BUDGET_CLUSTERS: Record<BudgetCluster, ClusterMeta> = {
  florals_decor: { label: "Florals & decor", hint: "" },
  smart_shopping: { label: "Smart shopping", hint: "" },
};

const BUDGET_TO_CLUSTER: Record<string, BudgetCluster> = {
  "budget-flower-cake": "florals_decor",
  "budget-repurpose-ceremony-flowers": "florals_decor",
  "budget-seasonal-flowers": "florals_decor",
  "budget-greenery": "florals_decor",
  "budget-display-plus-sheet": "smart_shopping",
  "budget-bulk-amazon": "smart_shopping",
  "budget-striking-venue": "smart_shopping",
  "budget-skip-wedding-label": "smart_shopping",
};

// Generic group + sort helper.
function groupBy<T, K extends string>(
  items: T[],
  classify: (item: T) => K,
  order: K[],
  sortWithin?: (a: T, b: T) => number
): { cluster: K; items: T[] }[] {
  const map = new Map<K, T[]>();
  for (const it of items) {
    const k = classify(it);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(it);
  }
  if (sortWithin) {
    for (const arr of map.values()) arr.sort(sortWithin);
  }
  return order
    .map((k) => ({ cluster: k, items: map.get(k) ?? [] }))
    .filter((g) => g.items.length > 0);
}

function prepSortWithin(a: PreparationEntry, b: PreparationEntry): number {
  const aw = a.offsetWeeks ?? -1;
  const bw = b.offsetWeeks ?? -1;
  if (aw !== bw) return bw - aw;
  return a.title.localeCompare(b.title);
}

function timeframeBadge(p: PreparationEntry): string {
  if (p.offsetWeeks == null) return "";
  const w = p.offsetWeeks;
  if (w >= 8) return `${Math.round(w / 4)}mo out`;
  return `${w}w out`;
}

export function TipsContent({
  weddingId,
  weddingDate,
  venueIndoorOutdoor,
  hasTeaCeremony,
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
  // Cluster open state — flat string keys "<section>:<cluster>".
  // All clusters default-collapsed; users drill in via 2 clicks.
  const [clusterOpen, setClusterOpen] = useState<Record<string, boolean>>({});
  const toggleCluster = (key: string) =>
    setClusterOpen((prev) => ({ ...prev, [key]: !prev[key] }));

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
    (t) =>
      !dismissed.has(t.id) &&
      !(isIndoorOnly && t.hideWhenIndoor) &&
      !(t.requiresTeaCeremony && !hasTeaCeremony)
  );

  const toggle = (key: SectionKey) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  // Days-until for time-based "past due" demotion in prep cards.
  const daysUntil = useMemo(() => {
    if (!weddingDate) return null;
    const wd = new Date(weddingDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((wd.getTime() - today.getTime()) / 86_400_000);
  }, [weddingDate]);

  // Pre-compute cluster groupings.
  const prepGroups = useMemo(
    () =>
      groupBy<PreparationEntry, PrepCluster>(
        prepareVisible,
        prepClusterFor,
        ["plan_ahead", "coming_up", "final_weeks", "backup"],
        prepSortWithin
      ),
    [prepareVisible]
  );
  const dayofGroups = useMemo(
    () =>
      groupBy<TipEntry, DayofCluster>(
        dayofVisible,
        (t) => DAYOF_TO_CLUSTER[t.id] ?? "lock_down",
        ["care_for_you", "brief_team", "lock_down"]
      ),
    [dayofVisible]
  );
  const budgetGroups = useMemo(
    () =>
      groupBy<TipEntry, BudgetCluster>(
        budgetVisible,
        (t) => BUDGET_TO_CLUSTER[t.id] ?? "smart_shopping",
        ["florals_decor", "smart_shopping"]
      ),
    [budgetVisible]
  );

  return (
    <div className="space-y-3">
      {/* 1. Things to Prepare — most actionable, time-anchored content */}
      <SectionShell
        isOpen={open.prepare}
        onToggle={() => toggle("prepare")}
        icon={
          <AlertTriangle className="size-4 text-amber-700 dark:text-amber-400" />
        }
        iconBg="bg-amber-100 dark:bg-amber-900/30"
        title="Things to Prepare"
        count={prepareVisible.length}
      >
        <div className="space-y-1.5">
          {prepGroups.map(({ cluster, items }) => {
            const meta = PREP_CLUSTERS[cluster];
            const key = `prepare:${cluster}`;
            const tone: ClusterTone =
              cluster === "backup"
                ? "rose"
                : cluster === "final_weeks"
                  ? "amber"
                  : "neutral";
            return (
              <ClusterRow
                key={key}
                isOpen={!!clusterOpen[key]}
                onToggle={() => toggleCluster(key)}
                label={meta.label}
                hint={meta.hint}
                count={items.length}
                tone={tone}
              >
                <ul className="divide-y divide-border/40">
                  {items.map((entry) => (
                    <PrepRow
                      key={entry.id}
                      entry={entry}
                      tone={tone}
                      daysUntil={daysUntil}
                      onDismiss={() => dismiss(entry.id, entry.title)}
                      onAddToTimeline={() =>
                        addToTimeline(
                          entry.id,
                          entry.title,
                          entry.body,
                          computeOffsetDate(weddingDate, entry.offsetWeeks)
                        )
                      }
                    />
                  ))}
                </ul>
              </ClusterRow>
            );
          })}
        </div>
      </SectionShell>

      {/* 2. Day-of Reminders (renamed from "Day-of Tips" — no clash with /day-of-details) */}
      <SectionShell
        isOpen={open.dayof}
        onToggle={() => toggle("dayof")}
        icon={<Clock className="size-4 text-blue-700 dark:text-blue-400" />}
        iconBg="bg-blue-100 dark:bg-blue-900/30"
        title="Day-of Reminders"
        count={dayofVisible.length}
      >
        <div className="space-y-1.5">
          {dayofGroups.map(({ cluster, items }) => {
            const meta = DAYOF_CLUSTERS[cluster];
            const key = `dayof:${cluster}`;
            return (
              <ClusterRow
                key={key}
                isOpen={!!clusterOpen[key]}
                onToggle={() => toggleCluster(key)}
                label={meta.label}
                hint={meta.hint}
                count={items.length}
                tone="blue"
              >
                <ul className="divide-y divide-border/40">
                  {items.map((tip) => {
                    const Icon = tip.iconName ? ICONS[tip.iconName] : Clock;
                    return (
                      <TipRow
                        key={tip.id}
                        tip={tip}
                        Icon={Icon}
                        tone="blue"
                        onDismiss={() => dismiss(tip.id, tip.title)}
                        onAddToTimeline={() => addToTimeline(tip.id, tip.title)}
                      />
                    );
                  })}
                </ul>
              </ClusterRow>
            );
          })}
        </div>
      </SectionShell>

      {/* 3. Emergency Kit — interactive packing checklist (own component) */}
      <SectionShell
        isOpen={open.kit}
        onToggle={() => toggle("kit")}
        icon={
          <Package className="size-4 text-purple-700 dark:text-purple-400" />
        }
        iconBg="bg-purple-100 dark:bg-purple-900/30"
        title="Emergency Kit"
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

      {/* 4. Budget Hacks — ambient browse, last in priority order */}
      <SectionShell
        isOpen={open.budget}
        onToggle={() => toggle("budget")}
        icon={
          <DollarSign className="size-4 text-green-700 dark:text-green-400" />
        }
        iconBg="bg-green-100 dark:bg-green-900/30"
        title="Budget Hacks"
        count={budgetVisible.length}
      >
        <div className="space-y-1.5">
          {budgetGroups.map(({ cluster, items }) => {
            const meta = BUDGET_CLUSTERS[cluster];
            const key = `budget:${cluster}`;
            return (
              <ClusterRow
                key={key}
                isOpen={!!clusterOpen[key]}
                onToggle={() => toggleCluster(key)}
                label={meta.label}
                hint={meta.hint}
                count={items.length}
                tone="green"
              >
                <ul className="divide-y divide-border/40">
                  {items.map((tip) => (
                    <TipRow
                      key={tip.id}
                      tip={tip}
                      Icon={DollarSign}
                      tone="green"
                      showMeta
                      onDismiss={() => dismiss(tip.id, tip.title)}
                      onAddToTimeline={() =>
                        addToTimeline(tip.id, tip.title, tip.meta)
                      }
                    />
                  ))}
                </ul>
              </ClusterRow>
            );
          })}
        </div>
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
  subtitle?: string;
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
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
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

// ── Cluster + row components ────────────────────────────────────────────

type ClusterTone = "neutral" | "amber" | "rose" | "blue" | "green" | "purple";

const TONE_BG: Record<ClusterTone, string> = {
  neutral: "bg-muted",
  amber: "bg-amber-100 dark:bg-amber-900/30",
  rose: "bg-rose-100 dark:bg-rose-900/30",
  blue: "bg-blue-100 dark:bg-blue-900/30",
  green: "bg-green-100 dark:bg-green-900/30",
  purple: "bg-purple-100 dark:bg-purple-900/30",
};

const TONE_FG: Record<ClusterTone, string> = {
  neutral: "text-muted-foreground",
  amber: "text-amber-700 dark:text-amber-400",
  rose: "text-rose-700 dark:text-rose-400",
  blue: "text-blue-700 dark:text-blue-400",
  green: "text-green-700 dark:text-green-400",
  purple: "text-purple-700 dark:text-purple-400",
};

function ItemIcon({
  Icon,
  tone,
}: {
  Icon: React.ElementType;
  tone: ClusterTone;
}) {
  return (
    <div
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full",
        TONE_BG[tone]
      )}
    >
      <Icon className={cn("size-3.5", TONE_FG[tone])} />
    </div>
  );
}

function ClusterRow({
  isOpen,
  onToggle,
  label,
  hint,
  count,
  tone,
  children,
}: {
  isOpen: boolean;
  onToggle: () => void;
  label: string;
  hint: string;
  count: number;
  tone: ClusterTone;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger className="w-full text-left">
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors",
            isOpen && "bg-muted/20"
          )}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {label}
          </span>
          {hint && (
            <span className="text-[10px] text-muted-foreground/60">
              {hint}
            </span>
          )}
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] tabular-nums ml-auto",
              tone === "rose" &&
                "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
              tone === "amber" &&
                "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            )}
          >
            {count}
          </Badge>
          <ChevronDown
            className={cn(
              "size-3.5 text-muted-foreground/50 transition-transform shrink-0",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-2 pr-1 pt-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Prep row — prepare item with expand-to-body, past-due demotion, kebab.
function PrepRow({
  entry,
  tone,
  daysUntil,
  onDismiss,
  onAddToTimeline,
}: {
  entry: PreparationEntry;
  tone: ClusterTone;
  daysUntil: number | null;
  onDismiss: () => void;
  onAddToTimeline: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ICONS[entry.iconName] ?? AlertTriangle;
  // Time-based dim: if the offset week has already passed, demote.
  const isPastDue =
    daysUntil !== null &&
    entry.offsetWeeks !== undefined &&
    entry.offsetWeeks * 7 > daysUntil;
  const badge = timeframeBadge(entry);
  return (
    <li
      className={cn(
        "group relative flex gap-3 py-2.5",
        isPastDue && "opacity-55"
      )}
    >
      <ItemIcon Icon={Icon} tone={tone} />
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex-1 min-w-0 text-left pr-7"
        aria-expanded={expanded}
      >
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-medium text-sm">{entry.title}</span>
          {badge && (
            <span className="text-[10px] text-muted-foreground/70 tabular-nums">
              {badge}
            </span>
          )}
          {isPastDue && (
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
              past due
            </span>
          )}
        </div>
        <p
          className={cn(
            "text-xs text-muted-foreground mt-0.5 leading-relaxed",
            !expanded && "line-clamp-1"
          )}
        >
          {expanded ? entry.body : entry.lead}
        </p>
      </button>
      <TipActions onDismiss={onDismiss} onAddToTimeline={onAddToTimeline} />
    </li>
  );
}

// Generic tip row — used by Day-of Reminders and Budget Hacks. Shorter
// content (no expandable body), optional `meta` line for budget hints.
function TipRow({
  tip,
  Icon,
  tone,
  showMeta,
  onDismiss,
  onAddToTimeline,
}: {
  tip: TipEntry;
  Icon: React.ElementType;
  tone: ClusterTone;
  showMeta?: boolean;
  onDismiss: () => void;
  onAddToTimeline: () => void;
}) {
  return (
    <li className="group relative flex gap-3 py-2.5">
      <ItemIcon Icon={Icon} tone={tone} />
      <div className="flex-1 min-w-0 pr-7">
        <div className="text-sm leading-snug">{tip.title}</div>
        {showMeta && tip.meta && (
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {tip.meta}
          </div>
        )}
      </div>
      <TipActions onDismiss={onDismiss} onAddToTimeline={onAddToTimeline} />
    </li>
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
  // Mobile has no hover state, so the opacity-0 default hides the menu
  // entirely. Keep it subtly visible (opacity-40) on mobile; desktop
  // keeps the hover-to-reveal polish.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="absolute top-2 right-2 opacity-40 sm:opacity-0 sm:group-hover:opacity-100 aria-expanded:opacity-100 data-[state=open]:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
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
