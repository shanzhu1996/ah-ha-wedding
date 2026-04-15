"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  subMonths,
  subWeeks,
  addDays,
  differenceInDays,
  differenceInCalendarDays,
  isBefore,
} from "date-fns";
import {
  Plus,
  Sparkles,
  Check,
  Circle,
  Trash2,
  CalendarDays,
  Clock,
  AlertTriangle,
  AlertCircle,
  Flame,
  UserPlus,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { ConfettiCanvas, triggerConfetti } from "@/components/ui/confetti";

interface TimelineEvent {
  id: string;
  type: string;
  event_date: string | null;
  event_time: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  sort_order: number;
  completed: boolean;
  priority: string;
}

interface TimelineManagerProps {
  events: TimelineEvent[];
  weddingId: string;
  weddingDate: string | null;
  guestCount: number | null;
  bridalPartySize: number | null;
  partner1Name: string;
  partner2Name: string;
}

type Priority = "critical" | "high" | "normal" | "low";

const priorityConfig: Record<
  Priority,
  { label: string; color: string; icon: typeof Flame; bgColor: string; borderColor: string }
> = {
  critical: {
    label: "Critical",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: Flame,
  },
  high: {
    label: "High",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: AlertTriangle,
  },
  normal: {
    label: "Normal",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Circle,
  },
  low: {
    label: "Low",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: Circle,
  },
};

interface TaskDef {
  idealMonthsBefore: number;
  title: string;
  description: string;
}

const TASK_DEFINITIONS: TaskDef[] = [
  { idealMonthsBefore: 12, title: "Start outfit shopping", description: "Wedding outfits can take 6-9 months to order + alterations." },
  { idealMonthsBefore: 10, title: "Book engagement photoshoot", description: "Great for save-the-dates and wedding website." },
  { idealMonthsBefore: 10, title: "Finalize guest list draft", description: "This drives venue size, catering count, and stationery orders." },
  { idealMonthsBefore: 8, title: "Send save-the-dates", description: "Earlier for destination weddings." },
  { idealMonthsBefore: 8, title: "Set up wedding registry", description: "Guests will want this for engagement parties and showers." },
  { idealMonthsBefore: 8, title: "Book hotel room blocks", description: "Popular hotels sell out fast. Don't leave this late." },
  { idealMonthsBefore: 7, title: "Start planning honeymoon", description: "Book flights and accommodations." },
  { idealMonthsBefore: 6, title: "Order wedding invitations", description: "Full stationery suite: invites, RSVP, detail cards." },
  { idealMonthsBefore: 5, title: "Order wedding party attire", description: "Allow time for ordering and alterations." },
  { idealMonthsBefore: 4, title: "Schedule hair and makeup trial", description: "Test your look before committing." },
  { idealMonthsBefore: 4, title: "Purchase wedding bands", description: "Allow time for sizing and engraving." },
  { idealMonthsBefore: 3, title: "Send wedding invitations", description: "8-10 weeks before the wedding." },
  { idealMonthsBefore: 3, title: "Begin writing vows", description: "Use dedicated vow books, not loose paper." },
  { idealMonthsBefore: 2, title: "Apply for marriage license", description: "Check your state's requirements and validity period." },
  { idealMonthsBefore: 2, title: "Finalize ceremony details with officiant", description: "Script, readings, unity ceremony." },
  { idealMonthsBefore: 2, title: "Start seating chart", description: "Begin early even before all RSVPs are in — this takes the most time." },
  { idealMonthsBefore: 1.5, title: "RSVP deadline", description: "Follow up with non-responders a few days after." },
  { idealMonthsBefore: 1, title: "Final outfit fitting", description: "Break in your wedding shoes starting now." },
  { idealMonthsBefore: 1, title: "Confirm all vendor details", description: "Delivery times, setup needs, final payments." },
  { idealMonthsBefore: 1, title: "Submit final headcount to caterer", description: "Include vendor meals." },
  { idealMonthsBefore: 1, title: "Prepare emergency kit", description: "Start a week early to catch missing items." },
  { idealMonthsBefore: 1, title: "Prepare vendor tip envelopes", description: "Cash in labeled envelopes." },
  { idealMonthsBefore: 0.5, title: "Confirm arrival times with every vendor", description: "One final check." },
  { idealMonthsBefore: 0.5, title: "Print programs, menus, escort cards, table numbers", description: "All day-of paper goods." },
  { idealMonthsBefore: 0.5, title: "Finalize playlist with DJ", description: "Must-play, do-not-play, and announcement scripts." },
  { idealMonthsBefore: 0.25, title: "Rehearsal and rehearsal dinner", description: "Confirm all wedding party members have their attire." },
  { idealMonthsBefore: 0.25, title: "Pack wedding day bags and boxes", description: "Use the Packing module to organize." },
  { idealMonthsBefore: 0.25, title: "Delegate day-of responsibilities", description: "Who handles tips, photos wrangling, card box, etc." },
  { idealMonthsBefore: 0.03, title: "Deliver welcome bags to hotel", description: "For out-of-town guests." },
  { idealMonthsBefore: 0.03, title: "Drop off decor at venue (if allowed)", description: "Confirm venue access time." },
  { idealMonthsBefore: 0, title: "Wedding day!", description: "Eat breakfast. Hydrate. Enjoy every moment." },
];

function generatePreWeddingTimeline(weddingDate: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weddingDay = new Date(weddingDate);
  weddingDay.setHours(0, 0, 0, 0);

  const totalDaysAvailable = Math.max(1, differenceInCalendarDays(weddingDay, today));
  const totalIdealDays = 365; // 12 months ideal timeline

  // Compression ratio: 1.0 = no compression, >1 = compressed
  const compressionRatio = totalIdealDays / totalDaysAvailable;

  return TASK_DEFINITIONS.map((task, i) => {
    // Calculate the ideal date (X months before wedding)
    const idealDaysBeforeWedding = task.idealMonthsBefore * 30;
    const idealDate = addDays(weddingDay, -idealDaysBeforeWedding);

    // Calculate compressed date: proportionally distribute within available time
    // Tasks keep their relative position but compressed into the available window
    const proportionalDaysBefore = idealDaysBeforeWedding / compressionRatio;
    const compressedDate = addDays(weddingDay, -Math.round(proportionalDaysBefore));

    // Use compressed date, but never earlier than today and never after wedding
    const scheduledDate = compressedDate < today ? today : compressedDate;
    const finalDate = scheduledDate > weddingDay ? weddingDay : scheduledDate;

    // Determine priority based on how compressed/overdue the task is
    let priority: Priority;
    const daysLate = differenceInDays(today, idealDate);

    if (task.idealMonthsBefore === 0) {
      priority = "normal"; // Wedding day itself
    } else if (daysLate > 60) {
      // Ideal date was 2+ months ago — critical
      priority = "critical";
    } else if (daysLate > 0) {
      // Ideal date is in the past — high priority
      priority = "high";
    } else if (daysLate > -30) {
      // Ideal date is within the next month — normal but upcoming
      priority = "normal";
    } else {
      // Ideal date is 1+ months away — low priority, plenty of time
      priority = "low";
    }

    // Build description with urgency context
    let desc = task.description;
    if (priority === "critical") {
      desc = `Ideally done ${Math.round(daysLate / 30)} months ago. ${desc}`;
    } else if (priority === "high") {
      desc = `${daysLate} days past ideal. ${desc}`;
    }

    return {
      type: "pre_wedding" as const,
      event_date: format(finalDate, "yyyy-MM-dd"),
      event_time: null,
      title: task.title,
      description: desc,
      assigned_to: null,
      sort_order: i,
      completed: false,
      priority,
    };
  });
}

type DayOfPhase =
  | "getting_ready"
  | "photos"
  | "ceremony"
  | "cocktail_hour"
  | "reception"
  | "exit_wrapup";

const PHASE_CONFIG: Record<DayOfPhase, { label: string; color: string; dot: string; bg: string }> = {
  getting_ready: { label: "Getting Ready", color: "text-pink-600", dot: "bg-pink-400", bg: "bg-pink-50" },
  photos: { label: "Photos", color: "text-violet-600", dot: "bg-violet-400", bg: "bg-violet-50" },
  ceremony: { label: "Ceremony", color: "text-amber-600", dot: "bg-amber-400", bg: "bg-amber-50" },
  cocktail_hour: { label: "Cocktail Hour", color: "text-emerald-600", dot: "bg-emerald-400", bg: "bg-emerald-50" },
  reception: { label: "Reception", color: "text-blue-600", dot: "bg-blue-400", bg: "bg-blue-50" },
  exit_wrapup: { label: "Exit & Wrap-up", color: "text-gray-600", dot: "bg-gray-400", bg: "bg-gray-50" },
};

function getPhaseForEvent(title: string): DayOfPhase {
  const t = title.toLowerCase();
  if (
    t.includes("hair") ||
    t.includes("makeup") ||
    t.includes("h&mu") ||
    t.includes("getting dressed") ||
    t.includes("detail shots") ||
    t.includes("artists set up")
  )
    return "getting_ready";
  if (
    t.includes("first look") ||
    t.includes("party photos") ||
    t.includes("family formal") ||
    t.includes("couple portraits") ||
    t.includes("break") ||
    t.includes("couple eats lunch") ||
    t.includes("hydrate")
  )
    return "photos";
  if (
    t.includes("guests begin arriving") ||
    t.includes("family seated") ||
    t.includes("ceremony") ||
    t.includes("processional") ||
    t.includes("recessional") ||
    t.includes("marriage license")
  )
    return "ceremony";
  if (t.includes("cocktail hour")) return "cocktail_hour";
  if (
    t.includes("grand entrance") ||
    t.includes("first dance") ||
    t.includes("toast") ||
    t.includes("blessing") ||
    t.includes("dinner service") ||
    t.includes("speech") ||
    t.includes("parent dance") ||
    t.includes("dance floor") ||
    t.includes("bouquet") ||
    t.includes("garter") ||
    t.includes("cake cutting") ||
    t.includes("last dance") ||
    t.includes("vendor meals") ||
    t.includes("guests seated in reception") ||
    t.includes("couple eats dinner")
  )
    return "reception";
  if (
    t.includes("grand exit") ||
    t.includes("vendor tip") ||
    t.includes("late night snack") ||
    t.includes("vendor breakdown") ||
    t.includes("distribute")
  )
    return "exit_wrapup";
  return "reception";
}

function formatTimeStr(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function computeHmuTimes(ceremonyTime: string, bridalPartySize: number, hmuArtistCount: number) {
  const [cH, cM] = ceremonyTime.split(":").map(Number);
  const ceremonyMinutes = cH * 60 + cM;
  const partySessions = Math.ceil(bridalPartySize / hmuArtistCount);
  const partyMinutes = partySessions * 75;
  const primaryPartnerMinutes = 180;
  const bufferBeforeCeremony = 60;

  const primaryReadyAt = ceremonyMinutes - bufferBeforeCeremony;
  const primaryStartsAt = primaryReadyAt - primaryPartnerMinutes;
  const partyStartsAt = primaryStartsAt - partyMinutes;
  const hmuArrival = partyStartsAt - 30;

  return { hmuArrival, partyStartsAt, primaryStartsAt, primaryReadyAt, partyMinutes, ceremonyMinutes };
}

function generateDayOfTimeline(
  ceremonyTime: string = "17:00",
  bridalPartySize: number = 4,
  hmuArtistCount: number = 2,
  partner1Name: string = "Partner 1",
) {
  const { hmuArrival, partyStartsAt, primaryStartsAt, primaryReadyAt, partyMinutes, ceremonyMinutes } =
    computeHmuTimes(ceremonyTime, bridalPartySize, hmuArtistCount);

  const events = [
    { offset: hmuArrival - ceremonyMinutes, title: "Hair & makeup team arrives", description: "Artists set up in getting-ready suite." },
    { offset: partyStartsAt - ceremonyMinutes, title: "Wedding party begins hair & makeup", description: `${bridalPartySize} people, ${hmuArtistCount} artist${hmuArtistCount > 1 ? "s" : ""} — ~${partyMinutes} min total.` },
    { offset: primaryStartsAt - ceremonyMinutes, title: `${partner1Name} begins hair & makeup`, description: "3 hours total. Scheduled last to stay fresh." },
    { offset: primaryReadyAt - ceremonyMinutes, title: `${partner1Name} ready — getting dressed`, description: "Have someone help with buttons/zipper." },
    { offset: primaryReadyAt + 30 - ceremonyMinutes, title: "Detail shots", description: "Photographer captures rings, shoes, invitation, outfits, flowers." },
    { offset: -4 * 60, title: "First look (if applicable)", description: "Private moment + couple portraits." },
    { offset: -3 * 60, title: "Wedding party photos", description: "All combinations: bridesmaids, groomsmen, full party." },
    { offset: -2 * 60 - 30, title: "Family formal photos", description: "Have your people-wrangler gather family members." },
    { offset: -2 * 60, title: "Break / hydrate / eat", description: "Take 10 minutes alone with your partner." },
    { offset: -105, title: "Couple eats lunch", description: "You WILL forget to eat. Have someone bring you food." },
    { offset: -45, title: "Guests begin arriving", description: "Ushers seat guests. Music playing." },
    { offset: -10, title: "Family seated, wedding party in position", description: "Officiant and wedding party take places." },
    { offset: 0, title: "Ceremony begins", description: "Processional." },
    { offset: 25, title: "Ceremony ends", description: "Recessional. ~20-30 min for civil, longer for religious." },
    { offset: 30, title: "Sign marriage license", description: "With witnesses and officiant." },
    { offset: 30, title: "Cocktail hour begins", description: "60 minutes. Couple does additional photos." },
    { offset: 90, title: "Guests seated in reception", description: "DJ announces transitions." },
    { offset: 100, title: "Grand entrance", description: "Wedding party, then couple." },
    { offset: 110, title: "First dance", description: "" },
    { offset: 120, title: "Welcome toast / blessing", description: "" },
    { offset: 130, title: "Dinner service begins", description: "60-90 min depending on service style." },
    { offset: 135, title: "Vendor meals served", description: "Vendor meals go out when guests are served. Don't forget!" },
    { offset: 150, title: "Toasts and speeches", description: "Honor attendants, parents. 1-3 min each." },
    { offset: 195, title: "Parent dances", description: "Dance with your parents or loved ones." },
    { offset: 210, title: "Dance floor opens", description: "High-energy song to kick it off." },
    { offset: 255, title: "Bouquet toss", description: "Optional. Or skip entirely — many couples do!" },
    { offset: 270, title: "Cake cutting", description: "~1 hour before reception ends." },
    { offset: 285, title: "Couple eats dinner", description: "If you haven't eaten yet, do it now. Ask your coordinator to plate something." },
    { offset: 315, title: "Last dance", description: "" },
    { offset: 330, title: "Grand exit", description: "Sparklers, bubbles, or other send-off." },
    { offset: 330, title: "Vendor breakdown begins", description: "Assigned person oversees." },
    { offset: 340, title: "Distribute vendor tips", description: "Designated person hands out labeled tip envelopes to each vendor." },
    { offset: 345, title: "Couple eats late night snack", description: "Have food waiting in your hotel room or getaway car." },
  ];

  const sorted = events
    .map((e, i) => ({ ...e, origIdx: i }))
    .sort((a, b) => a.offset - b.offset || a.origIdx - b.origIdx);

  return sorted.map((e, i) => {
    const totalMin = ceremonyMinutes + e.offset;
    const clampedMin = Math.max(0, Math.min(totalMin, 23 * 60 + 59));
    return {
      type: "day_of" as const,
      event_date: null,
      event_time: formatTimeStr(clampedMin),
      title: e.title,
      description: e.description,
      assigned_to: null,
      sort_order: i,
      completed: false,
      priority: "normal" as Priority,
    };
  });
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority as Priority] || priorityConfig.normal;
  if (priority === "normal" || priority === "low") return null;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${config.color} ${config.bgColor}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function AssignDot({ assignedTo }: { assignedTo: string | null }) {
  if (!assignedTo) return null;
  const color =
    assignedTo === "partner1"
      ? "bg-violet-400"
      : assignedTo === "partner2"
      ? "bg-teal-400"
      : "bg-amber-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${color} shrink-0`} />;
}

function AssignMenu({
  partner1Name,
  partner2Name,
  onSelect,
  pos,
  onClose,
}: {
  partner1Name: string;
  partner2Name: string;
  onSelect: (value: string | null) => void;
  pos: { x: number; y: number };
  onClose: () => void;
}) {
  // Clamp position so menu doesn't go off-screen
  const menuStyle = {
    left: Math.min(pos.x, typeof window !== "undefined" ? window.innerWidth - 180 : pos.x),
    top: Math.min(pos.y, typeof window !== "undefined" ? window.innerHeight - 200 : pos.y),
  };

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div
        className="fixed z-50 bg-card border rounded-lg shadow-lg py-1 min-w-[160px] animate-fade-in-up"
        style={menuStyle}
      >
        <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Assign to
        </div>
        <button
          onClick={() => onSelect("partner1")}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
          {partner1Name}
        </button>
        <button
          onClick={() => onSelect("partner2")}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />
          {partner2Name}
        </button>
        <button
          onClick={() => onSelect("together")}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          Both
        </button>
        <div className="border-t my-1" />
        <button
          onClick={() => onSelect(null)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-left text-muted-foreground"
        >
          Unassign
        </button>
      </div>
    </>
  );
}

function AssignContextMenu({
  eventId,
  partner1Name,
  partner2Name,
  onAssign,
  children,
}: {
  eventId: string;
  partner1Name: string;
  partner2Name: string;
  onAssign: (id: string, value: string | null) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function handleContext(e: React.MouseEvent) {
    e.preventDefault();
    setPos({ x: e.clientX, y: e.clientY });
    setOpen(true);
  }

  function handleButtonClick(e: React.MouseEvent) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: rect.left, y: rect.bottom + 4 });
    setOpen(true);
  }

  return (
    <>
      <div onContextMenu={handleContext} className="relative group/assign">
        {children}
        {/* Assign button — rendered inside the row's action area */}
      </div>
      {open && (
        <AssignMenu
          partner1Name={partner1Name}
          partner2Name={partner2Name}
          onSelect={(value) => {
            onAssign(eventId, value);
            setOpen(false);
          }}
          pos={pos}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function TimelineManager({
  events: initialEvents,
  weddingId,
  weddingDate,
  guestCount,
  bridalPartySize,
  partner1Name,
  partner2Name,
}: TimelineManagerProps) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState("pre_wedding");
  const [assignFilter, setAssignFilter] = useState<string>("all");
  const [showAssignHint, setShowAssignHint] = useState(() => {
    if (typeof window === "undefined") return true;
    return !localStorage.getItem("ahha-assign-hint-dismissed");
  });
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => {
    const now = new Date();
    const currentMonthKey = format(now, "yyyy-MM");
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthKey = format(nextMonth, "yyyy-MM");
    return new Set([currentMonthKey, nextMonthKey]);
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  // Day-of settings
  const [ceremonyHour, setCeremonyHour] = useState("5");
  const [ceremonyMinute, setCeremonyMinute] = useState("00");
  const [ceremonyAmPm, setCeremonyAmPm] = useState("PM");
  const [dayOfPartySize, setDayOfPartySize] = useState(bridalPartySize ?? 4);
  const [dayOfArtistCount, setDayOfArtistCount] = useState(2);
  const [dayOfRegenerating, setDayOfRegenerating] = useState(false);

  const allPreWedding = initialEvents.filter((e) => e.type === "pre_wedding");
  const dayOfEvents = initialEvents.filter((e) => e.type === "day_of");

  // Assignment counts
  const p1Count = allPreWedding.filter((e) => e.assigned_to === "partner1").length;
  const p2Count = allPreWedding.filter((e) => e.assigned_to === "partner2").length;
  const togetherCount = allPreWedding.filter((e) => e.assigned_to === "together").length;
  const unassignedCount = allPreWedding.filter((e) => !e.assigned_to).length;

  // Filtered by assignment
  const preWeddingEvents = assignFilter === "all"
    ? allPreWedding
    : assignFilter === "unassigned"
    ? allPreWedding.filter((e) => !e.assigned_to)
    : allPreWedding.filter((e) => e.assigned_to === assignFilter);

  // Stats
  const criticalCount = allPreWedding.filter(
    (e) => e.priority === "critical" && !e.completed
  ).length;
  const highCount = allPreWedding.filter(
    (e) => e.priority === "high" && !e.completed
  ).length;
  const completedCount = allPreWedding.filter((e) => e.completed).length;
  const daysUntilWedding = weddingDate
    ? differenceInCalendarDays(
        new Date(weddingDate + "T00:00:00"),
        new Date()
      )
    : null;

  function getCeremonyTime24() {
    let h = parseInt(ceremonyHour, 10);
    if (ceremonyAmPm === "PM" && h !== 12) h += 12;
    if (ceremonyAmPm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${ceremonyMinute}`;
  }

  const hmuInfo = computeHmuTimes(getCeremonyTime24(), dayOfPartySize, dayOfArtistCount);

  async function generateTimeline(type: "pre_wedding" | "day_of") {
    if (!weddingDate && type === "pre_wedding") return;
    setGenerating(true);
    const supabase = createClient();

    await supabase
      .from("timeline_events")
      .delete()
      .eq("wedding_id", weddingId)
      .eq("type", type);

    let events;
    if (type === "pre_wedding") {
      events = generatePreWeddingTimeline(new Date(weddingDate + "T00:00:00"));
    } else {
      events = generateDayOfTimeline(getCeremonyTime24(), dayOfPartySize, dayOfArtistCount, partner1Name);
    }

    const rows = events.map((e) => ({ ...e, wedding_id: weddingId }));
    await supabase.from("timeline_events").insert(rows);

    setGenerating(false);
    router.refresh();
  }

  async function regenerateDayOf() {
    setDayOfRegenerating(true);
    const supabase = createClient();

    await supabase
      .from("timeline_events")
      .delete()
      .eq("wedding_id", weddingId)
      .eq("type", "day_of");

    const events = generateDayOfTimeline(getCeremonyTime24(), dayOfPartySize, dayOfArtistCount, partner1Name);
    const rows = events.map((e) => ({ ...e, wedding_id: weddingId }));
    await supabase.from("timeline_events").insert(rows);

    setDayOfRegenerating(false);
    router.refresh();
  }

  const [menuEventId, setMenuEventId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");

  async function toggleComplete(id: string, completed: boolean) {
    const supabase = createClient();
    await supabase
      .from("timeline_events")
      .update({ completed: !completed })
      .eq("id", id);

    // If marking complete (not unchecking), check if all pre-wedding tasks are now done
    if (!completed) {
      const incompleteCount = allPreWedding.filter(
        (e) => !e.completed && e.id !== id
      ).length;
      if (incompleteCount === 0 && allPreWedding.length > 0) {
        triggerConfetti();
      }
    }

    router.refresh();
  }

  async function quickAssign(id: string, value: string | null) {
    const supabase = createClient();
    await supabase
      .from("timeline_events")
      .update({ assigned_to: value })
      .eq("id", id);
    router.refresh();
  }

  async function deleteEvent(id: string) {
    const supabase = createClient();
    await supabase.from("timeline_events").delete().eq("id", id);
    router.refresh();
  }

  function startEditing(event: TimelineEvent) {
    setEditingId(event.id);
    setEditDate(event.event_date || "");
    setEditTime(event.event_time || "");
    setEditTitle(event.title);
    setEditAssignedTo(event.assigned_to || "");
  }

  async function saveEdit(id: string, type: "pre_wedding" | "day_of") {
    const supabase = createClient();
    const update: Record<string, string | null> = {
      title: editTitle,
      assigned_to: editAssignedTo || null,
    };
    if (type === "pre_wedding") {
      update.event_date = editDate || null;
    } else {
      update.event_time = editTime || null;
    }
    await supabase.from("timeline_events").update(update).eq("id", id);
    setEditingId(null);
    router.refresh();
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function addEvent() {
    const supabase = createClient();
    await supabase.from("timeline_events").insert({
      wedding_id: weddingId,
      type: tab,
      event_date: eventDate || null,
      event_time: eventTime || null,
      title,
      description: description || null,
      assigned_to: assignedTo || null,
      sort_order:
        tab === "pre_wedding"
          ? preWeddingEvents.length
          : dayOfEvents.length,
      completed: false,
      priority: "normal",
    });
    setShowDialog(false);
    setTitle("");
    setDescription("");
    setEventDate("");
    setEventTime("");
    setAssignedTo("");
    router.refresh();
  }

  return (
    <>
      <ConfettiCanvas />
      <Tabs value={tab} onValueChange={(v) => setTab(v ?? "pre_wedding")}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pre_wedding" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Pre-Wedding
            </TabsTrigger>
            <TabsTrigger value="day_of" className="gap-2">
              <Clock className="h-4 w-4" />
              Day-Of
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
            <Button
              onClick={() =>
                generateTimeline(tab as "pre_wedding" | "day_of")
              }
              disabled={
                generating || (tab === "pre_wedding" && !weddingDate)
              }
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {generating ? "Generating..." : "Auto-Generate"}
            </Button>
          </div>
        </div>

        <TabsContent value="pre_wedding" className="mt-6 space-y-4">
          {/* Priority summary */}
          {allPreWedding.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {daysUntilWedding !== null && daysUntilWedding > 0 && (
                <Badge variant="outline" className="text-sm py-1 px-3">
                  {daysUntilWedding} days until wedding
                </Badge>
              )}
              {criticalCount > 0 && (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1">
                  <Flame className="h-3 w-3" />
                  {criticalCount} critical
                </Badge>
              )}
              {highCount > 0 && (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {highCount} high priority
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1">
                <Check className="h-3 w-3" />
                {completedCount} / {allPreWedding.length} done
              </Badge>
            </div>
          )}

          {/* Assignment filter */}
          {allPreWedding.length > 0 && (
            <div className="flex gap-2 flex-wrap text-xs">
              <button
                onClick={() => setAssignFilter("all")}
                className={`px-3 py-1.5 rounded-full border transition-colors ${
                  assignFilter === "all" ? "bg-foreground text-background border-foreground" : "bg-card hover:bg-muted"
                }`}
              >
                All ({allPreWedding.length})
              </button>
              <button
                onClick={() => setAssignFilter("partner1")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
                  assignFilter === "partner1" ? "bg-violet-500 text-white border-violet-500" : "bg-card hover:bg-muted"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-violet-400" />
                {partner1Name} ({p1Count})
              </button>
              <button
                onClick={() => setAssignFilter("partner2")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
                  assignFilter === "partner2" ? "bg-teal-500 text-white border-teal-500" : "bg-card hover:bg-muted"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-teal-400" />
                {partner2Name} ({p2Count})
              </button>
              <button
                onClick={() => setAssignFilter("together")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
                  assignFilter === "together" ? "bg-amber-500 text-white border-amber-500" : "bg-card hover:bg-muted"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Both ({togetherCount})
              </button>
              {unassignedCount > 0 && (
                <button
                  onClick={() => setAssignFilter("unassigned")}
                  className={`px-3 py-1.5 rounded-full border transition-colors ${
                    assignFilter === "unassigned" ? "bg-muted-foreground text-background border-muted-foreground" : "bg-card hover:bg-muted text-muted-foreground"
                  }`}
                >
                  Unassigned ({unassignedCount})
                </button>
              )}
            </div>
          )}

          {/* First-time hint */}
          {showAssignHint && allPreWedding.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-800">
              <UserPlus className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                Hover over a task and click <UserPlus className="h-3 w-3 inline" /> to assign it, or right-click for options.
              </span>
              <button
                onClick={() => {
                  setShowAssignHint(false);
                  localStorage.setItem("ahha-assign-hint-dismissed", "1");
                }}
                className="text-blue-500 hover:text-blue-700 text-xs font-medium shrink-0"
              >
                Got it
              </button>
            </div>
          )}

          {preWeddingEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No pre-wedding timeline yet.</p>
                <p className="text-sm mt-1">
                  Click &ldquo;Auto-Generate&rdquo; to create a smart
                  timeline based on your wedding date. Tasks will be
                  compressed to fit your remaining time.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {(() => {
                // Group events by month
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const weekFromNow = addDays(today, 7);

                const monthGroups = new Map<string, { label: string; key: string; events: TimelineEvent[] }>();
                for (const event of preWeddingEvents) {
                  const dateStr = event.event_date;
                  const monthKey = dateStr ? format(new Date(dateStr + "T00:00:00"), "yyyy-MM") : "no-date";
                  const monthLabel = dateStr ? format(new Date(dateStr + "T00:00:00"), "MMMM yyyy") : "No Date";
                  if (!monthGroups.has(monthKey)) {
                    monthGroups.set(monthKey, { label: monthLabel, key: monthKey, events: [] });
                  }
                  monthGroups.get(monthKey)!.events.push(event);
                }

                // Sort month groups chronologically
                const sortedGroups = Array.from(monthGroups.values()).sort((a, b) => {
                  if (a.key === "no-date") return 1;
                  if (b.key === "no-date") return -1;
                  return a.key.localeCompare(b.key);
                });

                // Sort events within each month: overdue first, then by date, completed last
                for (const group of sortedGroups) {
                  group.events.sort((a, b) => {
                    // Completed always last
                    if (a.completed !== b.completed) return a.completed ? 1 : -1;
                    // Among incomplete: overdue first
                    const aDate = a.event_date ? new Date(a.event_date + "T00:00:00") : null;
                    const bDate = b.event_date ? new Date(b.event_date + "T00:00:00") : null;
                    const aOverdue = aDate && !a.completed && isBefore(aDate, today);
                    const bOverdue = bDate && !b.completed && isBefore(bDate, today);
                    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
                    // Then by date ascending
                    if (aDate && bDate) return aDate.getTime() - bDate.getTime();
                    if (aDate) return -1;
                    if (bDate) return 1;
                    return 0;
                  });
                }

                function toggleMonth(key: string) {
                  setExpandedMonths((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) {
                      next.delete(key);
                    } else {
                      next.add(key);
                    }
                    return next;
                  });
                }

                return sortedGroups.map((group) => {
                  const isExpanded = expandedMonths.has(group.key);
                  const completedInGroup = group.events.filter((e) => e.completed).length;
                  const totalInGroup = group.events.length;
                  const allDone = completedInGroup === totalInGroup && totalInGroup > 0;
                  const pct = totalInGroup > 0 ? Math.round((completedInGroup / totalInGroup) * 100) : 0;

                  return (
                    <div key={group.key} className="border rounded-lg overflow-hidden">
                      {/* Month header */}
                      <button
                        onClick={() => toggleMonth(group.key)}
                        className="flex items-center gap-3 w-full px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="font-semibold text-sm flex-1">{group.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {completedInGroup}/{totalInGroup} done
                        </span>
                        {/* Progress bar */}
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct === 100 ? "bg-green-500" : pct > 50 ? "bg-blue-500" : "bg-muted-foreground/40"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>

                      {/* Month content */}
                      {isExpanded && (
                        <div className="p-2 space-y-2">
                          {allDone ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-sm text-green-600">
                              <Check className="h-4 w-4" />
                              All done!
                            </div>
                          ) : (
                            group.events.map((event) => {
                              const pConfig =
                                priorityConfig[event.priority as Priority] ||
                                priorityConfig.normal;
                              const isEditing = editingId === event.id;
                              const eventDateObj = event.event_date
                                ? new Date(event.event_date + "T00:00:00")
                                : null;
                              const isOverdue =
                                eventDateObj &&
                                !event.completed &&
                                isBefore(eventDateObj, today);
                              const isDueSoon =
                                eventDateObj &&
                                !event.completed &&
                                !isOverdue &&
                                isBefore(eventDateObj, weekFromNow);

                              return (
                                <AssignContextMenu
                                  key={event.id}
                                  eventId={event.id}
                                  partner1Name={partner1Name}
                                  partner2Name={partner2Name}
                                  onAssign={quickAssign}
                                >
                                <div
                                  className={`flex items-start gap-3 p-4 border rounded-lg group transition-colors ${
                                    event.completed
                                      ? "bg-muted/50 border-border"
                                      : `${pConfig.bgColor} ${pConfig.borderColor}`
                                  }`}
                                >
                                  <button
                                    onClick={() =>
                                      toggleComplete(event.id, event.completed)
                                    }
                                    className="mt-0.5 shrink-0"
                                  >
                                    {event.completed ? (
                                      <Check className="h-5 w-5 text-primary" />
                                    ) : (
                                      <Circle
                                        className={`h-5 w-5 ${
                                          event.priority === "critical"
                                            ? "text-red-400"
                                            : event.priority === "high"
                                            ? "text-amber-400"
                                            : "text-muted-foreground"
                                        }`}
                                      />
                                    )}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <Input
                                          value={editTitle}
                                          onChange={(e) => setEditTitle(e.target.value)}
                                          className="h-8 text-sm font-medium"
                                        />
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Input
                                            type="date"
                                            value={editDate}
                                            onChange={(e) => setEditDate(e.target.value)}
                                            className="h-8 text-sm w-40"
                                          />
                                          <Button
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => saveEdit(event.id, "pre_wedding")}
                                          >
                                            Save
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs"
                                            onClick={cancelEdit}
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <AssignDot assignedTo={event.assigned_to} />
                                          <span
                                            className={`font-medium cursor-pointer hover:underline ${
                                              event.completed
                                                ? "line-through text-muted-foreground"
                                                : ""
                                            }`}
                                            onClick={() => startEditing(event)}
                                          >
                                            {event.title}
                                          </span>
                                          <PriorityBadge priority={event.priority} />
                                          {event.event_date && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs shrink-0 cursor-pointer hover:bg-muted"
                                              onClick={() => startEditing(event)}
                                            >
                                              {format(
                                                new Date(event.event_date + "T00:00:00"),
                                                "MMM d, yyyy"
                                              )}
                                            </Badge>
                                          )}
                                          {isOverdue && (
                                            <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                              Overdue
                                            </span>
                                          )}
                                          {isDueSoon && (
                                            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                              Due soon
                                            </span>
                                          )}
                                        </div>
                                        {event.description && (
                                          <p className="text-sm text-muted-foreground mt-0.5">
                                            {event.description}
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      title="Assign"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuEventId(event.id);
                                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                        setMenuPos({ x: rect.left, y: rect.bottom + 4 });
                                      }}
                                    >
                                      <UserPlus className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => deleteEvent(event.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                </AssignContextMenu>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </TabsContent>

        <TabsContent value="day_of" className="mt-6 space-y-6">
          {/* Settings bar */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Ceremony time</Label>
                  <div className="flex items-center gap-1">
                    <Select value={ceremonyHour} onValueChange={(v) => setCeremonyHour(v ?? "5")}>
                      <SelectTrigger className="w-[60px] h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                          <SelectItem key={h} value={String(h)}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground font-medium">:</span>
                    <Select value={ceremonyMinute} onValueChange={(v) => setCeremonyMinute(v ?? "00")}>
                      <SelectTrigger className="w-[60px] h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["00", "15", "30", "45"].map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={ceremonyAmPm} onValueChange={(v) => setCeremonyAmPm(v ?? "PM")}>
                      <SelectTrigger className="w-[65px] h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Party members getting H&MU</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={dayOfPartySize}
                    onChange={(e) => setDayOfPartySize(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-[70px] h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">H&MU artists</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={dayOfArtistCount}
                    onChange={(e) => setDayOfArtistCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-[70px] h-8 text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={regenerateDayOf}
                  disabled={dayOfRegenerating}
                  className="gap-1.5 h-8"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${dayOfRegenerating ? "animate-spin" : ""}`} />
                  {dayOfRegenerating ? "Regenerating..." : "Regenerate"}
                </Button>
              </div>
              {/* Calculated info */}
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                <span>
                  Hair & makeup starts at{" "}
                  <span className="font-semibold text-foreground">
                    {format(new Date(`2000-01-01T${formatTimeStr(Math.max(0, hmuInfo.partyStartsAt))}`), "h:mm a")}
                  </span>
                </span>
                <span>
                  {partner1Name} ready by{" "}
                  <span className="font-semibold text-foreground">
                    {format(new Date(`2000-01-01T${formatTimeStr(Math.max(0, hmuInfo.primaryReadyAt))}`), "h:mm a")}
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>

          {dayOfEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No day-of timeline yet.</p>
                <p className="text-sm mt-1">
                  Click &ldquo;Auto-Generate&rdquo; or &ldquo;Regenerate&rdquo; to create an
                  hour-by-hour schedule.
                </p>
              </CardContent>
            </Card>
          ) : (
            (() => {
              // Group events by phase
              const phaseOrder: DayOfPhase[] = [
                "getting_ready", "photos", "ceremony", "cocktail_hour", "reception", "exit_wrapup",
              ];
              const grouped: { phase: DayOfPhase; events: TimelineEvent[] }[] = [];
              let currentPhase: DayOfPhase | null = null;

              for (const event of dayOfEvents) {
                const phase = getPhaseForEvent(event.title);
                if (phase !== currentPhase) {
                  currentPhase = phase;
                  grouped.push({ phase, events: [event] });
                } else {
                  grouped[grouped.length - 1].events.push(event);
                }
              }

              // Sort groups by phase order (preserve first-occurrence order within phase order)
              grouped.sort((a, b) => {
                const ai = phaseOrder.indexOf(a.phase);
                const bi = phaseOrder.indexOf(b.phase);
                return ai - bi;
              });

              return (
                <div className="relative">
                  {grouped.map((group, gi) => {
                    const phaseConfig = PHASE_CONFIG[group.phase];
                    return (
                      <div key={`${group.phase}-${gi}`} className="mb-2">
                        {/* Phase header */}
                        <div className="flex items-center gap-3 mb-3 mt-1">
                          <div className={`h-3 w-3 rounded-full ${phaseConfig.dot} ring-2 ring-background shadow-sm`} />
                          <h3 className={`text-sm font-bold uppercase tracking-wider ${phaseConfig.color}`}>
                            {phaseConfig.label}
                          </h3>
                          <div className="flex-1 h-px bg-border" />
                        </div>

                        {/* Events in this phase */}
                        <div className="ml-[5px] border-l-2 border-border pl-6 space-y-0">
                          {group.events.map((event, ei) => {
                            const isEditing = editingId === event.id;
                            const isLast = ei === group.events.length - 1;
                            return (
                              <AssignContextMenu
                                key={event.id}
                                eventId={event.id}
                                partner1Name={partner1Name}
                                partner2Name={partner2Name}
                                onAssign={quickAssign}
                              >
                              <div className={`relative flex items-start gap-3 py-3 px-3 group rounded-lg hover:bg-muted/30 transition-colors ${isLast ? "mb-3" : ""}`}>
                                {/* Timeline dot */}
                                <div className={`absolute -left-[33px] top-[18px] h-2.5 w-2.5 rounded-full border-2 border-background ${phaseConfig.dot} shadow-sm`} />

                                {/* Time column */}
                                {isEditing ? (
                                  <Input
                                    type="time"
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    className="w-24 h-8 text-sm font-mono shrink-0"
                                  />
                                ) : (
                                  <div
                                    className="w-[68px] text-sm font-mono text-muted-foreground shrink-0 pt-0.5 cursor-pointer hover:text-foreground tabular-nums"
                                    onClick={() => startEditing(event)}
                                  >
                                    {event.event_time
                                      ? format(
                                          new Date(`2000-01-01T${event.event_time}`),
                                          "h:mm a"
                                        )
                                      : "\u2014"}
                                  </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <Input
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="h-8 text-sm font-medium"
                                      />
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs"
                                          onClick={() => saveEdit(event.id, "day_of")}
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 text-xs"
                                          onClick={cancelEdit}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <AssignDot assignedTo={event.assigned_to} />
                                        <span
                                          className="font-medium cursor-pointer hover:underline"
                                          onClick={() => startEditing(event)}
                                        >
                                          {event.title}
                                        </span>
                                      </div>
                                      {event.description && (
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                          {event.description}
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Assign"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMenuEventId(event.id);
                                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                      setMenuPos({ x: rect.left, y: rect.bottom + 4 });
                                    }}
                                  >
                                    <UserPlus className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => deleteEvent(event.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              </AssignContextMenu>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </TabsContent>
      </Tabs>

      {/* Shared assign menu (triggered by button click) */}
      {menuEventId && (
        <AssignMenu
          partner1Name={partner1Name}
          partner2Name={partner2Name}
          onSelect={(value) => {
            quickAssign(menuEventId, value);
            setMenuEventId(null);
          }}
          pos={menuPos}
          onClose={() => setMenuEventId(null)}
        />
      )}

      {/* Add Event Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Timeline Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {tab === "pre_wedding" ? (
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select
                  value={assignedTo || "unassigned"}
                  onValueChange={(v) => setAssignedTo(v === "unassigned" ? "" : (v ?? ""))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value="partner1">{partner1Name}</SelectItem>
                    <SelectItem value="partner2">{partner2Name}</SelectItem>
                    <SelectItem value="together">Together</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={addEvent} disabled={!title}>
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
