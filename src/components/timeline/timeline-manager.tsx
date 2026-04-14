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
  { idealMonthsBefore: 12, title: "Start dress shopping", description: "Gowns take 6-9 months to order + 2 months for alterations." },
  { idealMonthsBefore: 10, title: "Book engagement photoshoot", description: "Great for save-the-dates and wedding website." },
  { idealMonthsBefore: 10, title: "Finalize guest list draft", description: "This drives venue size, catering count, and stationery orders." },
  { idealMonthsBefore: 8, title: "Send save-the-dates", description: "Earlier for destination weddings." },
  { idealMonthsBefore: 8, title: "Set up wedding registry", description: "Guests will want this for engagement parties and showers." },
  { idealMonthsBefore: 8, title: "Book hotel room blocks", description: "Popular hotels sell out fast. Don't leave this late." },
  { idealMonthsBefore: 7, title: "Start planning honeymoon", description: "Book flights and accommodations." },
  { idealMonthsBefore: 6, title: "Order wedding invitations", description: "Full stationery suite: invites, RSVP, detail cards." },
  { idealMonthsBefore: 5, title: "Order bridesmaids dresses", description: "Allow time for ordering and alterations." },
  { idealMonthsBefore: 4, title: "Schedule hair and makeup trial", description: "Test your look before committing." },
  { idealMonthsBefore: 4, title: "Purchase wedding bands", description: "Allow time for sizing and engraving." },
  { idealMonthsBefore: 3, title: "Send wedding invitations", description: "8-10 weeks before the wedding." },
  { idealMonthsBefore: 3, title: "Begin writing vows", description: "Use dedicated vow books, not loose paper." },
  { idealMonthsBefore: 2, title: "Apply for marriage license", description: "Check your state's requirements and validity period." },
  { idealMonthsBefore: 2, title: "Finalize ceremony details with officiant", description: "Script, readings, unity ceremony." },
  { idealMonthsBefore: 2, title: "Start seating chart", description: "Begin early even before all RSVPs are in — this takes the most time." },
  { idealMonthsBefore: 1.5, title: "RSVP deadline", description: "Follow up with non-responders a few days after." },
  { idealMonthsBefore: 1, title: "Final dress fitting", description: "Break in your wedding shoes starting now." },
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

function generateDayOfTimeline(ceremonyTime: string = "17:00") {
  const [h] = ceremonyTime.split(":").map(Number);
  const offset = h - 17;

  const events = [
    { time: 8 + offset, min: 0, title: "Hair & makeup team arrives", description: "Artists set up in bridal suite." },
    { time: 8 + offset, min: 30, title: "Bridesmaids begin hair & makeup", description: "~75 min per person (30 hair + 30 makeup + 15 buffer)." },
    { time: 10 + offset, min: 30, title: "Bride begins hair & makeup", description: "2.5-3 hours total. Schedule last to stay fresh." },
    { time: 12 + offset, min: 0, title: "Bride ready — getting into dress", description: "Have someone help with buttons/zipper." },
    { time: 12 + offset, min: 30, title: "Detail shots", description: "Photographer captures rings, shoes, invitation, dress, flowers." },
    { time: 13 + offset, min: 0, title: "First look (if applicable)", description: "Private moment + couple portraits." },
    { time: 14 + offset, min: 0, title: "Wedding party photos", description: "All combinations: bridesmaids, groomsmen, full party." },
    { time: 14 + offset, min: 30, title: "Family formal photos", description: "Have your people-wrangler gather family members." },
    { time: 15 + offset, min: 0, title: "Break / hydrate / eat", description: "Take 10 minutes alone with your partner." },
    { time: 15 + offset, min: 15, title: "Couple eats lunch", description: "You WILL forget to eat. Have someone bring you food." },
    { time: 16 + offset, min: 15, title: "Guests begin arriving", description: "Ushers seat guests. Music playing." },
    { time: 16 + offset, min: 50, title: "Family seated, wedding party in position", description: "Officiant, groom, groomsmen take places." },
    { time: 17 + offset, min: 0, title: "Ceremony begins", description: "Processional." },
    { time: 17 + offset, min: 25, title: "Ceremony ends", description: "Recessional. ~20-30 min for civil, longer for religious." },
    { time: 17 + offset, min: 30, title: "Sign marriage license", description: "With witnesses and officiant." },
    { time: 17 + offset, min: 30, title: "Cocktail hour begins", description: "60 minutes. Couple does additional photos." },
    { time: 18 + offset, min: 30, title: "Guests seated in reception", description: "DJ announces transitions." },
    { time: 18 + offset, min: 40, title: "Grand entrance", description: "Wedding party, then couple." },
    { time: 18 + offset, min: 50, title: "First dance", description: "" },
    { time: 19 + offset, min: 0, title: "Welcome toast / blessing", description: "" },
    { time: 19 + offset, min: 10, title: "Dinner service begins", description: "60-90 min depending on service style." },
    { time: 19 + offset, min: 15, title: "Vendor meals served", description: "Vendor meals go out when guests are served. Don't forget!" },
    { time: 19 + offset, min: 30, title: "Toasts and speeches", description: "Best man, maid of honor, parents. 1-3 min each." },
    { time: 20 + offset, min: 15, title: "Parent dances", description: "Father-daughter, mother-son." },
    { time: 20 + offset, min: 30, title: "Dance floor opens", description: "High-energy song to kick it off." },
    { time: 21 + offset, min: 15, title: "Bouquet / garter toss", description: "Optional. About 45 min into dancing." },
    { time: 21 + offset, min: 30, title: "Cake cutting", description: "~1 hour before reception ends." },
    { time: 21 + offset, min: 45, title: "Couple eats dinner", description: "If you haven't eaten yet, do it now. Ask your coordinator to plate something." },
    { time: 22 + offset, min: 15, title: "Last dance", description: "" },
    { time: 22 + offset, min: 30, title: "Grand exit", description: "Sparklers, bubbles, or other send-off." },
    { time: 22 + offset, min: 40, title: "Distribute vendor tips", description: "Designated person hands out labeled tip envelopes to each vendor." },
    { time: 22 + offset, min: 45, title: "Couple eats late night snack", description: "Have food waiting in your hotel room or getaway car." },
    { time: 22 + offset, min: 30, title: "Vendor breakdown begins", description: "Assigned person oversees." },
  ];

  return events.map((e, i) => ({
    type: "day_of" as const,
    event_date: null,
    event_time: `${String(Math.max(0, e.time)).padStart(2, "0")}:${String(e.min).padStart(2, "0")}`,
    title: e.title,
    description: e.description,
    assigned_to: null,
    sort_order: i,
    completed: false,
    priority: "normal" as Priority,
  }));
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

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
      events = generateDayOfTimeline();
    }

    const rows = events.map((e) => ({ ...e, wedding_id: weddingId }));
    await supabase.from("timeline_events").insert(rows);

    setGenerating(false);
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
            <div className="space-y-2">
              {preWeddingEvents.map((event) => {
                const pConfig =
                  priorityConfig[event.priority as Priority] ||
                  priorityConfig.normal;
                const isEditing = editingId === event.id;
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
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="day_of" className="mt-6">
          {dayOfEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No day-of timeline yet.</p>
                <p className="text-sm mt-1">
                  Click &ldquo;Auto-Generate&rdquo; to create an
                  hour-by-hour schedule.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {dayOfEvents.map((event) => {
                const isEditing = editingId === event.id;
                return (
                  <AssignContextMenu
                    key={event.id}
                    eventId={event.id}
                    partner1Name={partner1Name}
                    partner2Name={partner2Name}
                    onAssign={quickAssign}
                  >
                  <div
                    className="flex items-start gap-3 p-4 border rounded-lg group hover:bg-muted/30"
                  >
                    {isEditing ? (
                      <Input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="w-24 h-8 text-sm font-mono shrink-0"
                      />
                    ) : (
                      <div
                        className="w-16 text-sm font-mono text-muted-foreground shrink-0 pt-0.5 cursor-pointer hover:text-foreground"
                        onClick={() => startEditing(event)}
                      >
                        {event.event_time
                          ? format(
                              new Date(`2000-01-01T${event.event_time}`),
                              "h:mm a"
                            )
                          : "—"}
                      </div>
                    )}
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
