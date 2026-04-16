"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  UserPlus,
  ChevronRight,
  Pencil,
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
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
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


interface TaskDef {
  idealMonthsBefore: number;
  title: string;
  description: string;
  link?: string;
  optional?: boolean;
}

const TASK_DEFINITIONS: TaskDef[] = [
  // 10-12 months
  { idealMonthsBefore: 12, title: "Start outfit shopping", description: "Wedding outfits can take 6-9 months to order + 2 months for alterations. Start early so you're not rushed.", link: "/shopping" },
  { idealMonthsBefore: 10, title: "Build your moodboard", description: "Collect visual inspiration for colors, flowers, and style. You'll share this with your florist, photographer, and planner.", link: "/moodboard" },
  { idealMonthsBefore: 10, title: "Finalize guest list draft", description: "This number drives everything — venue size, catering count, invitation orders, and budget. Start with a rough list and refine.", link: "/guests" },
  { idealMonthsBefore: 10, title: "Book engagement photoshoot", description: "Great photos for save-the-dates and your wedding website. Also a chance to get comfortable in front of a camera.", optional: true },

  // 8-10 months
  { idealMonthsBefore: 10, title: "Order save-the-dates", description: "Save-the-dates are simple cards you mail early to let guests know your wedding date — so they can book travel and time off. Order them about 2 months before you plan to send them.", link: "/shopping" },
  { idealMonthsBefore: 8, title: "Send save-the-dates", description: "Mail your save-the-dates to everyone on your guest list. Include your names, wedding date, city, and wedding website URL. Send earlier for destination weddings." },
  { idealMonthsBefore: 8, title: "Create your wedding website", description: "Your wedding website is a free page where guests find everything — date, venue, dress code, hotel info, registry link, and RSVP form. Send the URL with your save-the-dates. Most couples use The Knot, Zola, Joy, or build their own.", link: "/website" },
  { idealMonthsBefore: 8, title: "Set up wedding registry", description: "Guests will want this for engagement parties and showers. Most couples register at 2-3 stores.", optional: true },
  { idealMonthsBefore: 8, title: "Book hotel room blocks", description: "Popular hotels near your venue sell out fast, especially on weekends. Reserve a block so guests get a group rate." },

  // 6-7 months
  { idealMonthsBefore: 7, title: "Start planning honeymoon", description: "Book flights and accommodations early for better prices, especially if traveling internationally.", optional: true },
  { idealMonthsBefore: 6, title: "Order wedding invitations", description: "Your invitation suite includes the main invitation, an RSVP card (where guests confirm if they're coming), and a details card (directions, hotels, dress code). Order 6-7 months before the wedding — printing takes 4-6 weeks.", link: "/shopping" },
  { idealMonthsBefore: 6, title: "Share moodboard with vendors", description: "Send your moodboard to your florist, photographer, and stationer so everyone designs toward the same vision.", link: "/moodboard" },

  // 4-5 months
  { idealMonthsBefore: 5, title: "Order wedding party attire", description: "Give your wedding party enough time for ordering, shipping, and alterations.", link: "/shopping" },
  { idealMonthsBefore: 4, title: "Schedule hair and makeup trial", description: "Test your look before the big day. Bring your headpiece/veil and inspiration photos to the trial." },
  { idealMonthsBefore: 4, title: "Purchase wedding bands", description: "Allow time for sizing, engraving, and any custom work. Try to buy at least 3 months before.", link: "/shopping" },
  { idealMonthsBefore: 4, title: "Schedule cake and food tasting", description: "Most caterers and bakers offer tastings. Bring your partner — this is one of the fun parts!" },
  { idealMonthsBefore: 4, title: "Book rehearsal dinner venue", description: "The rehearsal dinner happens the night before your wedding, right after the ceremony rehearsal. It's a dinner for your wedding party, immediate family, and usually out-of-town guests. Book a restaurant or private space.", optional: true },

  // 3 months
  { idealMonthsBefore: 3, title: "Send wedding invitations", description: "Mail invitations 8-10 weeks before the wedding. Include an RSVP card with a deadline 3-4 weeks before the wedding. Pro tip: weigh one complete invitation at the post office — odd sizes and enclosures may need extra postage.", link: "/shopping" },
  { idealMonthsBefore: 3, title: "Begin writing vows", description: "If writing your own, start now. Use dedicated vow books, not your phone. Aim for 1-2 minutes each." },
  { idealMonthsBefore: 3, title: "Order wedding favors and party gifts", description: "Favors are small thank-you gifts for your guests (candy, candles, etc. — many couples skip these). Wedding party gifts are for your bridesmaids, groomsmen, parents, and anyone who helped. These are more important.", link: "/shopping" },
  { idealMonthsBefore: 3, title: "Research marriage license requirements", description: "Every state/county has different rules — ID requirements, waiting periods, expiration dates. Don't wait until the last minute." },

  // 2 months
  { idealMonthsBefore: 2, title: "Apply for marriage license", description: "Go to your county clerk's office together. Bring valid ID. Some licenses expire in 30-90 days, so time it right." },
  { idealMonthsBefore: 2, title: "Finalize ceremony with officiant", description: "Review the ceremony script with your officiant. Decide on readings, vows (will you write your own?), and any special traditions — like a unity ceremony (where you light a candle, pour sand, or do something symbolic together as a couple).", link: "/vendors" },
  { idealMonthsBefore: 2, title: "Start seating chart draft", description: "Start a rough draft now — group people who know each other (family together, college friends together). You'll finalize after your RSVP deadline when you know who's actually coming.", link: "/seating" },
  { idealMonthsBefore: 2, title: "Plan your music", description: "Create your must-play list, do-not-play list, and songs for key moments — processional, first dance, parent dances.", link: "/music" },
  { idealMonthsBefore: 2, title: "Arrange guest transportation", description: "Shuttles from hotel to venue, parking instructions, or ride-share codes for guests.", optional: true },
  { idealMonthsBefore: 1.5, title: "Final outfit fitting", description: "Make sure everything fits perfectly. Start breaking in your wedding shoes at home — seriously.", link: "/shopping" },
  { idealMonthsBefore: 1.5, title: "Prepare emergency kit", description: "A bag of 50+ items you'll be grateful to have on the wedding day: sewing kit, stain remover pen, pain relief, safety pins, breath mints, phone charger, snacks, and much more. Check our full checklist on the Tips page.", link: "/tips" },

  // 1 month — RSVP deadline triggers the final chain
  { idealMonthsBefore: 1, title: "RSVP deadline", description: "The date by which guests must confirm if they're coming. Set it about 4 weeks before the wedding. This is the most important deadline — everything after depends on the final count: caterer headcount, seating chart, escort cards, and menu.", link: "/guests" },
  { idealMonthsBefore: 0.85, title: "Follow up with non-responders", description: "Call or text anyone who hasn't RSVP'd within a few days of the deadline. They probably forgot — a friendly nudge is fine. You need the final number ASAP.", link: "/guests" },
  { idealMonthsBefore: 0.75, title: "Submit final headcount to caterer", description: "Now that RSVPs are in, give the caterer the final number. Don't forget vendor meals — photographer, DJ, coordinator, and other vendors need to eat too. Ask your caterer when they need this." },
  { idealMonthsBefore: 0.75, title: "Finalize seating chart", description: "Now that you know who's coming, finalize table assignments. This feeds into your escort cards and place cards. Double-check dietary restrictions are noted for each table.", link: "/seating" },
  { idealMonthsBefore: 0.75, title: "Confirm all vendor details", description: "Contact every vendor to confirm arrival times, setup needs, and final payments. Use your vendor page to track everything.", link: "/vendors" },
  { idealMonthsBefore: 0.75, title: "Prepare vendor tip envelopes", description: "Cash in labeled envelopes. Assign a trusted person to distribute them on the wedding day — NOT you." },

  // 6 weeks — order stationery that needs lead time
  { idealMonthsBefore: 1.5, title: "Order day-of stationery", description: "If using a professional stationer for escort cards, menus, or programs — order now with your estimated guest count. Calligraphy and custom printing takes 3-4 weeks. Order 10-15% extra blanks for last-minute changes. If DIY printing, you can wait until after RSVPs.", link: "/shopping" },

  // 3 weeks — get ahead so the final week is calm
  { idealMonthsBefore: 0.75, title: "Finalize playlist with DJ", description: "Send your must-play list, do-not-play list, and announcement scripts. Confirm pronunciation of names. The earlier you do this, the less you'll worry about it.", link: "/music" },
  { idealMonthsBefore: 0.75, title: "Generate vendor booklets", description: "A vendor booklet is a printed reference sheet you give each vendor — it has the full day-of timeline, your contact info, venue address, and their specific details. One booklet per vendor. Generate them now so you're not doing it last-minute.", link: "/booklets" },
  { idealMonthsBefore: 0.75, title: "Prepare welcome bags", description: "Water, snacks, local treats, and a weekend itinerary card for out-of-town guests. Assemble them now — you can drop them off later.", optional: true },

  // 2 weeks — final printing and confirmations
  { idealMonthsBefore: 0.5, title: "Finalize and print remaining stationery", description: "After seating is finalized: fill in any blank escort cards, print table numbers, finalize signage (welcome sign, bar menu). If you DIY'd everything, print it all now. Proofread everything twice.", link: "/shopping" },
  { idealMonthsBefore: 0.5, title: "Confirm arrival times with every vendor", description: "One final check with every vendor. Share the day-of timeline and vendor booklets with all of them." },
  { idealMonthsBefore: 0.5, title: "Send day-of timeline to wedding party", description: "Everyone in the wedding party should know when to arrive, where to be, and what to wear.", link: "/share" },
  { idealMonthsBefore: 0.5, title: "Delegate day-of responsibilities", description: "You should NOT be making decisions on your wedding day. Assign someone to: distribute vendor tip envelopes, wrangle family for photos, watch the gift/card box, handle emergencies, and collect your belongings at the end of the night.", link: "/share" },
  { idealMonthsBefore: 0.5, title: "Pack wedding day bags and boxes", description: "Organize everything into labeled boxes — ceremony items, reception decor, personal items, emergency kit. Do this early so you're not scrambling the night before.", link: "/packing" },
  { idealMonthsBefore: 0.5, title: "Clean rings and prepare personal items", description: "Get your engagement ring and wedding bands professionally cleaned. Lay out everything you need for the wedding day: outfit, shoes, jewelry, vow books, marriage license." },

  // 1 week — keep it light, almost everything is done
  { idealMonthsBefore: 0.25, title: "Rehearsal and rehearsal dinner", description: "The rehearsal is a practice run of the ceremony — everyone walks through their positions. The rehearsal dinner is immediately after, usually for the wedding party, close family, and out-of-town guests." },
  { idealMonthsBefore: 0.25, title: "Drop off decor and boxes at venue", description: "If the venue allows early access, deliver your packed boxes and decor. Less to carry on the wedding morning.", link: "/packing" },
  { idealMonthsBefore: 0.25, title: "Deliver welcome bags to hotel", description: "Drop off the welcome bags you assembled earlier to the hotel front desk.", optional: true },
  { idealMonthsBefore: 0.15, title: "Rest and enjoy", description: "You've done the work. Tonight, get a good night's sleep. Tomorrow is the best day of your life." },

  // Wedding day
  { idealMonthsBefore: 0, title: "Wedding day!", description: "Eat breakfast. Hydrate. Enjoy every single moment. You planned for this — now live it." },
];

const taskLinkMap = new Map<string, { link?: string; optional?: boolean }>();
TASK_DEFINITIONS.forEach((t) => taskLinkMap.set(t.title, { link: t.link, optional: t.optional }));

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

    return {
      type: "pre_wedding" as const,
      event_date: format(finalDate, "yyyy-MM-dd"),
      event_time: null,
      title: task.title,
      description: task.description,
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
  if (priority === "critical") {
    return (
      <span className="text-[11px] text-muted-foreground italic">
        Usually done earlier — do this soon
      </span>
    );
  }
  if (priority === "high") {
    return (
      <span className="text-[11px] text-muted-foreground italic">
        Coming up soon
      </span>
    );
  }
  return null;
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
  pos: { x: number; y: number; buttonTop: number };
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div
        className="fixed z-50 bg-card border rounded-lg shadow-lg py-1 min-w-[160px] animate-fade-in-up"
        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
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

function AssignContextMenuWrapper({
  eventId,
  onRightClick,
  children,
}: {
  eventId: string;
  onRightClick: (eventId: string, x: number, y: number) => void;
  children: React.ReactNode;
}) {
  function handleContext(e: React.MouseEvent) {
    e.preventDefault();
    onRightClick(eventId, e.clientX, e.clientY);
  }

  return (
    <div onContextMenu={handleContext}>
      {children}
    </div>
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
  const [assignFilter, setAssignFilter] = useState<string>("all");
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
  const [assignedTo, setAssignedTo] = useState("");

  const allPreWedding = initialEvents.filter((e) => e.type === "pre_wedding");

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
  const completedCount = allPreWedding.filter((e) => e.completed).length;
  const daysUntilWedding = weddingDate
    ? differenceInCalendarDays(
        new Date(weddingDate + "T00:00:00"),
        new Date()
      )
    : null;

  async function generateTimeline() {
    if (!weddingDate) return;
    setGenerating(true);
    const supabase = createClient();

    // Pre-wedding: smart merge — preserve completed + assigned
    const newEvents = generatePreWeddingTimeline(new Date(weddingDate + "T00:00:00"));

    const { data: existing } = await supabase
      .from("timeline_events")
      .select("*")
      .eq("wedding_id", weddingId)
      .eq("type", "pre_wedding");

    const existingByTitle = new Map<string, typeof existing extends (infer T)[] | null ? T : never>();
    (existing || []).forEach((e) => existingByTitle.set(e.title, e));

    for (const newEvent of newEvents) {
      const existingEvent = existingByTitle.get(newEvent.title);
      if (existingEvent) {
        await supabase
          .from("timeline_events")
          .update({
            description: newEvent.description,
            event_date: newEvent.event_date,
            priority: newEvent.priority,
            sort_order: newEvent.sort_order,
          })
          .eq("id", existingEvent.id);
        existingByTitle.delete(newEvent.title);
      } else {
        await supabase.from("timeline_events").insert({
          ...newEvent,
          wedding_id: weddingId,
        });
      }
    }

    setGenerating(false);
    router.refresh();
  }

  const [menuEventId, setMenuEventId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0, buttonTop: 0 });

  function handleRightClickAssign(eventId: string, x: number, y: number) {
    setMenuEventId(eventId);
    setMenuPos({ x: x - 160, y: y, buttonTop: y });
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
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
    setEditTitle(event.title);
    setEditAssignedTo(event.assigned_to || "");
  }

  async function saveEdit(id: string) {
    const supabase = createClient();
    await supabase
      .from("timeline_events")
      .update({
        title: editTitle,
        event_date: editDate || null,
        assigned_to: editAssignedTo || null,
      })
      .eq("id", id);
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
      type: "pre_wedding",
      event_date: eventDate || null,
      title,
      description: description || null,
      assigned_to: assignedTo || null,
      sort_order: preWeddingEvents.length,
      completed: false,
      priority: "normal",
    });
    setShowDialog(false);
    setTitle("");
    setDescription("");
    setEventDate("");
    setAssignedTo("");
    router.refresh();
  }

  async function addEventInMonth(monthKey: string) {
    if (!weddingDate) return;
    const supabase = createClient();
    // Default date: 15th of that month
    const defaultDate = monthKey === "no-date" ? null : `${monthKey}-15`;
    const { data: inserted } = await supabase
      .from("timeline_events")
      .insert({
        wedding_id: weddingId,
        type: "pre_wedding",
        event_date: defaultDate,
        title: "",
        description: null,
        assigned_to: null,
        sort_order: preWeddingEvents.length,
        completed: false,
        priority: "normal",
      })
      .select()
      .single();
    if (inserted) {
      setEditingId(inserted.id);
      setEditDate(inserted.event_date || "");
      setEditTitle("");
      setEditAssignedTo("");
    }
    router.refresh();
  }

  return (
    <>
      <ConfettiCanvas />
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
              Timeline
            </h1>
            {allPreWedding.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {daysUntilWedding !== null && daysUntilWedding > 0 && (
                  <span className="font-medium text-foreground/80">{daysUntilWedding} days</span>
                )}
                {daysUntilWedding !== null && daysUntilWedding > 0 && (
                  <span className="text-muted-foreground/50"> · </span>
                )}
                <span><span className="font-medium text-foreground/80">{completedCount}</span> of {allPreWedding.length} done</span>
              </p>
            )}
          </div>
          {weddingDate && (
            <Button
              onClick={generateTimeline}
              disabled={generating}
              variant={allPreWedding.length === 0 ? "default" : "outline"}
              size="sm"
              className="gap-1.5 text-xs shrink-0"
            >
              <Sparkles className="h-3 w-3" />
              {generating ? "Generating..." : allPreWedding.length === 0 ? "Generate timeline" : "Auto-Generate"}
            </Button>
          )}
        </div>

        {/* Filter dropdown — only show if there's at least 1 assigned task */}
        {allPreWedding.length > 0 && (p1Count + p2Count + togetherCount) > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Filter:</span>
            <Select value={assignFilter} onValueChange={(v) => setAssignFilter(v ?? "all")}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({allPreWedding.length})</SelectItem>
                <SelectItem value="partner1">{partner1Name} ({p1Count})</SelectItem>
                <SelectItem value="partner2">{partner2Name} ({p2Count})</SelectItem>
                <SelectItem value="together">Both ({togetherCount})</SelectItem>
                {unassignedCount > 0 && (
                  <SelectItem value="unassigned">Unassigned ({unassignedCount})</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Empty state */}
        {preWeddingEvents.length === 0 && (
          <div className="text-center py-16">
            <CalendarDays className="h-6 w-6 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {allPreWedding.length === 0
                ? "Click \"Generate timeline\" to create a smart checklist based on your wedding date."
                : "No tasks match this filter."
              }
            </p>
          </div>
        )}

        {/* Timeline by month */}
        {preWeddingEvents.length > 0 && (() => {
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

          const sortedGroups = Array.from(monthGroups.values()).sort((a, b) => {
            if (a.key === "no-date") return 1;
            if (b.key === "no-date") return -1;
            return a.key.localeCompare(b.key);
          });

          for (const group of sortedGroups) {
            group.events.sort((a, b) => {
              if (a.completed !== b.completed) return a.completed ? 1 : -1;
              const aDate = a.event_date ? new Date(a.event_date + "T00:00:00") : null;
              const bDate = b.event_date ? new Date(b.event_date + "T00:00:00") : null;
              const aOverdue = aDate && !a.completed && isBefore(aDate, today);
              const bOverdue = bDate && !b.completed && isBefore(bDate, today);
              if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
              if (aDate && bDate) return aDate.getTime() - bDate.getTime();
              if (aDate) return -1;
              if (bDate) return 1;
              return 0;
            });
          }

          function toggleMonth(key: string) {
            setExpandedMonths((prev) => {
              const next = new Set(prev);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              return next;
            });
          }

          return (
            <div className="space-y-8">
              {sortedGroups.map((group) => {
                const isExpanded = expandedMonths.has(group.key);
                const completedInGroup = group.events.filter((e) => e.completed).length;
                const totalInGroup = group.events.length;

                return (
                  <div key={group.key}>
                    {/* Month header — Day-of Details style */}
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
                      <button
                        onClick={() => toggleMonth(group.key)}
                        className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] uppercase text-foreground/80 hover:text-foreground transition-colors"
                      >
                        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} />
                        {group.label}
                      </button>
                      <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                        {completedInGroup}/{totalInGroup}
                      </span>
                    </div>

                    {/* Month content */}
                    {isExpanded && (
                      <div className="border-l-2 border-primary/25 ml-1">
                        {group.events.map((event) => {
                          const isEditing = editingId === event.id;
                          const eventDateObj = event.event_date ? new Date(event.event_date + "T00:00:00") : null;
                          const isOverdue = eventDateObj && !event.completed && isBefore(eventDateObj, today);
                          const isDueSoon = eventDateObj && !event.completed && !isOverdue && isBefore(eventDateObj, weekFromNow);
                          const taskMeta = taskLinkMap.get(event.title);

                          return (
                            <AssignContextMenuWrapper
                              key={event.id}
                              eventId={event.id}
                              onRightClick={handleRightClickAssign}
                            >
                              <div
                                className={cn(
                                  "group relative flex items-start gap-3 py-2 pl-5 pr-2 -ml-px rounded-r-lg transition-colors",
                                  isEditing ? "bg-primary/[0.03]" : "hover:bg-muted/20"
                                )}
                              >
                                {/* Timeline dot — aligned with title baseline */}
                                <div className={cn(
                                  "absolute left-[-5px] top-[14px] h-2 w-2 rounded-full ring-2 ring-background",
                                  event.completed ? "bg-primary" : isOverdue ? "bg-red-500" : "bg-primary/70"
                                )} />

                                {/* Checkbox — aligned with title */}
                                <button
                                  onClick={() => toggleComplete(event.id, event.completed)}
                                  className="shrink-0 group/check mt-[3px]"
                                  title={event.completed ? "Mark as not done" : "Mark as done"}
                                >
                                  {event.completed ? (
                                    <span className="relative">
                                      <Check className="h-4 w-4 text-primary group-hover/check:hidden" />
                                      <Circle className="h-4 w-4 text-muted-foreground hidden group-hover/check:block" />
                                    </span>
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                                  )}
                                </button>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  {isEditing ? (
                                    <div className="space-y-1.5">
                                      <Input
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="h-8 text-sm"
                                        placeholder="Task title"
                                        autoFocus
                                      />
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Input
                                          type="date"
                                          value={editDate}
                                          onChange={(e) => setEditDate(e.target.value)}
                                          className="h-8 text-xs w-36"
                                        />
                                        <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(event.id)}>
                                          Done
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelEdit}>
                                          Cancel
                                        </Button>
                                        <button
                                          onClick={() => deleteEvent(event.id)}
                                          className="ml-auto text-muted-foreground/40 hover:text-destructive transition-colors p-1"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                          className={cn(
                                            "text-sm font-medium cursor-pointer text-foreground",
                                            event.completed && "line-through text-muted-foreground"
                                          )}
                                          onClick={() => startEditing(event)}
                                        >
                                          {event.title || "Untitled"}
                                        </span>
                                        {taskMeta?.optional && (
                                          <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                                            Optional
                                          </span>
                                        )}
                                        {event.event_date && (
                                          <span
                                            className={cn(
                                              "text-[10px] shrink-0 cursor-pointer px-1.5 py-0.5 rounded border font-medium tabular-nums",
                                              isOverdue
                                                ? "border-red-300 bg-red-50 text-red-700"
                                                : isDueSoon
                                                ? "border-amber-300 bg-amber-50 text-amber-800"
                                                : "border-border/60 text-muted-foreground"
                                            )}
                                            onClick={() => startEditing(event)}
                                          >
                                            {format(new Date(event.event_date + "T00:00:00"), "MMM d")}
                                            {isOverdue && " · overdue"}
                                            {isDueSoon && " · this week"}
                                          </span>
                                        )}
                                      </div>
                                      {event.description && (
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                          {event.description}
                                          {taskMeta?.link && (() => {
                                            const labelMap: Record<string, string> = {
                                              "/shopping": "Shopping List",
                                              "/moodboard": "Moodboard",
                                              "/guests": "Guest List",
                                              "/website": "Website",
                                              "/seating": "Seating",
                                              "/music": "Music",
                                              "/vendors": "Vendors",
                                              "/tips": "Tips",
                                              "/booklets": "Booklets",
                                              "/packing": "Packing",
                                              "/share": "Share",
                                              "/day-of-details": "Day-of Details",
                                            };
                                            const label = labelMap[taskMeta.link] || "Open";
                                            return (
                                              <>
                                                {" "}
                                                <Link href={taskMeta.link} className="text-primary font-medium hover:underline whitespace-nowrap">
                                                  → {label}
                                                </Link>
                                              </>
                                            );
                                          })()}
                                        </p>
                                      )}
                                      {/* Inline assign options */}
                                      {menuEventId === event.id && (
                                        <div className="flex items-center gap-2 pt-2 flex-wrap animate-fade-in-up">
                                          <span className="text-[10px] text-muted-foreground/60">Assign:</span>
                                          <button onClick={() => { quickAssign(event.id, "partner1"); setMenuEventId(null); }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border hover:bg-violet-50 hover:border-violet-200 transition-colors">
                                            <span className="h-2 w-2 rounded-full bg-violet-400" />{partner1Name}
                                          </button>
                                          <button onClick={() => { quickAssign(event.id, "partner2"); setMenuEventId(null); }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border hover:bg-teal-50 hover:border-teal-200 transition-colors">
                                            <span className="h-2 w-2 rounded-full bg-teal-400" />{partner2Name}
                                          </button>
                                          <button onClick={() => { quickAssign(event.id, "together"); setMenuEventId(null); }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border hover:bg-amber-50 hover:border-amber-200 transition-colors">
                                            <span className="h-2 w-2 rounded-full bg-amber-400" />Both
                                          </button>
                                          {event.assigned_to && (
                                            <button onClick={() => { quickAssign(event.id, null); setMenuEventId(null); }} className="px-2 py-0.5 rounded-full text-[11px] text-muted-foreground hover:bg-muted transition-colors">
                                              Unassign
                                            </button>
                                          )}
                                          <button onClick={() => setMenuEventId(null)} className="ml-auto text-xs text-muted-foreground/50 hover:text-foreground">✕</button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>

                                {/* Right column: assign dot + hover actions */}
                                {!isEditing && (
                                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                    {event.assigned_to && (() => {
                                      const isP1 = event.assigned_to === "partner1";
                                      const isP2 = event.assigned_to === "partner2";
                                      const isBoth = event.assigned_to === "together";
                                      const color = isP1 ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                                        : isP2 ? "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                                        : isBoth ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                        : "border-muted bg-muted text-muted-foreground";
                                      const sameInitial = partner1Name.charAt(0).toUpperCase() === partner2Name.charAt(0).toUpperCase();
                                      const p1Label = sameInitial ? partner1Name.slice(0, 2) : partner1Name.charAt(0);
                                      const p2Label = sameInitial ? partner2Name.slice(0, 2) : partner2Name.charAt(0);
                                      const label = isP1 ? p1Label : isP2 ? p2Label : isBoth ? `${p1Label}&${p2Label}` : "?";
                                      const fullName = isP1 ? partner1Name : isP2 ? partner2Name : isBoth ? `${partner1Name} & ${partner2Name}` : event.assigned_to;
                                      return (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setMenuEventId(menuEventId === event.id ? null : event.id);
                                          }}
                                          className={`inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full text-[11px] font-bold border transition-colors ${color}`}
                                          title={`Assigned to ${fullName} — click to reassign`}
                                        >
                                          {label}
                                        </button>
                                      );
                                    })()}
                                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {!event.assigned_to && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setMenuEventId(menuEventId === event.id ? null : event.id);
                                          }}
                                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                          title="Assign"
                                        >
                                          <UserPlus className="h-4 w-4" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => startEditing(event)}
                                        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                        title="Edit"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </AssignContextMenuWrapper>
                          );
                        })}
                        {/* Add here */}
                        <button
                          onClick={() => addEventInMonth(group.key)}
                          className="flex items-center gap-1.5 mt-2 ml-5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add here
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>


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
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
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
