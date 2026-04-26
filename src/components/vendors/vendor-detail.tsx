"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Video,
  Disc3,
  Music2,
  UtensilsCrossed,
  Flower2,
  Cake,
  Scissors,
  BookHeart,
  Warehouse,
  Building,
  Car,
  ClipboardList,
  Image,
  MoreHorizontal,
  Save,
  Trash2,
  HelpCircle,
  MessageSquare,
  Lightbulb,
  CircleDot,
  Check,
  Plus,
  ShoppingCart,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { TimePicker } from "@/components/ui/time-picker";
import {
  PaymentSchedule,
  type PaymentItem,
} from "@/components/budget/payment-schedule";
import { VENDOR_TYPE_TO_CATEGORY } from "@/lib/vendor-categories";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VendorData {
  id: string;
  type: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  contract_amount: number | null;
  deposit_amount: number | null;
  deposit_paid: boolean;
  balance_due_date: string | null;
  arrival_time: string | null;
  setup_location: string | null;
  breakdown_time: string | null;
  meals_needed: number | null;
  dietary_notes: string | null;
  notes: string | null;
  extra_details: Record<string, unknown> | null;
  comm_completed_steps: string[];
}

interface CoveredShoppingItem {
  id: string;
  category: string;
  item_name: string;
  status: string;
  notes: string | null;
}

interface VendorDetailProps {
  vendor: VendorData | null;
  vendorType: string;
  weddingId: string;
  weddingDate: string | null;
  initialPayments?: PaymentItem[];
  /** Shopping items the couple has flagged as provided by this vendor. */
  coveredItems?: CoveredShoppingItem[];
}

// ---------------------------------------------------------------------------
// Vendor type icon / label config
// ---------------------------------------------------------------------------

const vendorTypeConfig: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  photographer: { label: "Photographer", icon: Camera },
  videographer: { label: "Videographer", icon: Video },
  dj: { label: "DJ", icon: Disc3 },
  band: { label: "Band", icon: Music2 },
  caterer: { label: "Caterer", icon: UtensilsCrossed },
  florist: { label: "Florist", icon: Flower2 },
  baker: { label: "Baker / Dessert", icon: Cake },
  hair_makeup: { label: "Hair & Makeup", icon: Scissors },
  officiant: { label: "Officiant", icon: BookHeart },
  rentals: { label: "Rentals", icon: Warehouse },
  venue: { label: "Venue", icon: Building },
  transportation: { label: "Transportation", icon: Car },
  coordinator: { label: "Coordinator", icon: ClipboardList },
  photo_booth: { label: "Photo Booth", icon: Image },
  other: { label: "Other", icon: MoreHorizontal },
};

// ---------------------------------------------------------------------------
// Questions to Ask (per vendor type)
// ---------------------------------------------------------------------------

interface VendorQuestion {
  question: string;
  why?: string;
}

const VENDOR_QUESTIONS: Record<string, VendorQuestion[]> = {
  photographer: [
    { question: "How many hours of coverage are included?", why: "Most packages are 6-10 hours. Make sure it covers getting ready through your exit." },
    { question: "Will you be the one shooting, or could it be an associate?", why: "Some studios send different photographers than who you met with." },
    { question: "Do you have a second shooter? What do they cover?", why: "A second shooter captures different angles and the other partner getting ready simultaneously." },
    { question: "What is your turnaround time for the full gallery?", why: "Typical is 4-8 weeks. Ask if you will get a sneak peek within a few days." },
    { question: "Can we see a full wedding gallery, not just highlights?", why: "Highlight reels show their best 50 shots. A full gallery shows consistency." },
    { question: "What happens if you are sick or have an emergency on our wedding day?", why: "Professional photographers have backup plans. Ask who would replace them." },
    { question: "Do you provide a shot list template we can customize?" },
  ],
  videographer: [
    { question: "Do you offer a highlight reel, full edit, or both?", why: "Highlight reels (3-5 min) are great for sharing. Full edits capture everything." },
    { question: "How do you capture audio for the vows?", why: "Lapel mics on both partners ensure vows are heard clearly. Built-in camera mics pick up wind and ambient noise." },
    { question: "Is drone footage included?", why: "Aerial venue shots are stunning. Check if your venue allows drones." },
    { question: "How long until we receive the final video?" },
    { question: "Can we see a full wedding video, not just a trailer?" },
  ],
  dj: [
    { question: "Will you also MC and make announcements?", why: "Not all DJs MC. If they do not, you need someone else to announce dinner, toasts, dances, etc." },
    { question: "Do you bring your own sound and lighting equipment?", why: "Clarify what is included vs. what you would rent separately. Uplighting is often an add-on." },
    { question: "Can we hear you at a live event before booking?", why: "Reading a crowd is a skill. Watching them live tells you more than a demo mix." },
    { question: "What is your overtime rate?", why: "If the party is going strong at 10pm, know the cost before deciding to extend." },
    { question: "Do you take breaks? What plays during breaks?" },
    { question: "How do you handle song requests from guests?" },
  ],
  caterer: [
    { question: "Is a tasting included? How many people can attend?", why: "Most caterers offer tastings. Ask if the tasting reflects your actual wedding menu, not just their best sellers." },
    { question: "What is the difference between your service charge and gratuity?", why: "Service charge goes to the company. Gratuity goes to the staff who serve you. They are different line items." },
    { question: "What is the bartender-to-guest ratio?", why: "Industry standard is 1 bartender per 50 guests. Long bar lines kill the vibe." },
    { question: "Do you provide plates, flatware, glassware, and linens?", why: "Some caterers include everything. Others do not, which adds to your rental budget." },
    { question: "Is there a cake cutting fee?", why: "Some venues charge $1-3 per slice to plate and serve a cake from an outside baker." },
    { question: "How do you handle dietary restrictions and allergies?", why: "Ask how early they need your final guest list with dietary notes." },
    { question: "Have you worked at our venue before?", why: "A caterer familiar with your venue knows the kitchen, layout, and any rules." },
  ],
  florist: [
    { question: "Do you deliver, set up, AND break down?", why: "If not, you need someone to handle flower placement on the wedding day." },
    { question: "Can you repurpose ceremony arrangements at the reception?", why: "Moving aisle flowers to the sweetheart table or bar saves money and doubles the impact." },
    { question: "What flowers are in season for our wedding date?", why: "In-season blooms are 2-3x cheaper and look fresher." },
    { question: "Do you provide vases and containers, or do we rent separately?", why: "This can significantly affect your rental budget." },
    { question: "Can you decorate the cake with fresh flowers instead of sugar flowers?", why: "Often cheaper than what the baker charges for fondant flowers, and looks beautiful." },
    { question: "How do you handle substitutions if a flower becomes unavailable?" },
  ],
  baker: [
    { question: "Is a tasting included in the price?" },
    { question: "Can we do a smaller display cake plus sheet cake from the kitchen?", why: "This saves 40-60% on cake cost. Guests cannot tell the difference in taste." },
    { question: "Do you deliver and set up the cake?", why: "Tiered cakes are fragile. Professional delivery is worth it." },
    { question: "How far in advance do you need the final design?" },
    { question: "What is your cancellation and deposit policy?" },
  ],
  hair_makeup: [
    { question: "Is the trial run included in the wedding day price?", why: "Some charge separately for the trial ($100-300). Ask upfront." },
    { question: "Do you travel to the venue or do we come to you?", why: "Getting to a salon and back eats into your morning timeline. On-site is much easier." },
    { question: "How many artists will come on the wedding day?", why: "With 1 artist, a party of 5 takes 6+ hours. 2 artists cuts the time nearly in half." },
    { question: "What products do you use? Can you leave a touch-up kit?", why: "Knowing the products means you can do your own touch-ups during the reception." },
    { question: "How long do you stay for touch-ups before the ceremony?" },
    { question: "Can you do a practice run with my veil or headpiece?" },
  ],
  officiant: [
    { question: "Have you officiated at our venue before?" },
    { question: "Can we write our own vows? Any guidelines on length?", why: "Some officiants have preferences. 1-2 minutes per person is typical." },
    { question: "How long will the ceremony be?", why: "Most civil ceremonies are 15-20 minutes. Religious ceremonies can be 45-60 minutes." },
    { question: "Will you attend the rehearsal?", why: "Rehearsal ensures timing and positioning are smooth." },
    { question: "Do you handle filing the marriage license?", why: "Some officiants file it for you. Others hand it back and you file it yourself." },
    { question: "What are your fees for rehearsal, travel, and custom ceremony writing?" },
  ],
  venue: [
    { question: "What is the noise curfew?", why: "If music must stop at 10pm, your reception timeline changes significantly." },
    { question: "Are there required or preferred vendors?", why: "Some venues require their in-house caterer or have a preferred vendor list." },
    { question: "What is the rain or weather backup plan?", why: "For outdoor ceremonies, get this in writing." },
    { question: "Is a day-of venue coordinator included?", why: "Some venues provide one. If not, you will want to hire your own." },
    { question: "What is the load-in and cleanup window?", why: "A 2-hour setup window is very different from 6 hours." },
    { question: "What restrictions exist? (open flame, confetti, rice, sparklers, fireworks)", why: "Knowing this early prevents last-minute disappointments." },
    { question: "Is there a separate getting-ready space for each partner?" },
  ],
  coordinator: [
    { question: "What is included -- full planning, month-of, or day-of only?", why: "These are very different services at very different price points." },
    { question: "How many planning meetings do we get before the wedding?" },
    { question: "Do you create the timeline or just execute ours?", why: "A good coordinator builds the timeline WITH you, then runs it on the day." },
    { question: "Will you personally be on site, or will it be an assistant?", why: "Make sure the person you are hiring is the person who shows up." },
    { question: "How do you handle vendor coordination and communication?" },
  ],
  rentals: [
    { question: "Is delivery, setup, and pickup included in the price?" },
    { question: "What is the damage or breakage policy?", why: "Know what you are liable for before signing." },
    { question: "Can we do a site visit together to plan the layout?" },
    { question: "What happens if something is missing or damaged on delivery?" },
  ],
  transportation: [
    { question: "Is gratuity included in the quoted price?" },
    { question: "What happens if the event runs late?" },
    { question: "Can we see the actual vehicle before booking?", why: "Photos can be misleading. Ask to see the specific car, bus, or limo you will get." },
    { question: "Is there a minimum booking time?" },
  ],
  photo_booth: [
    { question: "Are props included? Can we customize them?" },
    { question: "Do guests get digital copies, prints, or both?" },
    { question: "How much space does the booth require?" },
    { question: "Is there an attendant on site?" },
  ],
  other: [
    { question: "What exactly is included in your package?" },
    { question: "What do you need from us, and by when?" },
    { question: "What is your cancellation and refund policy?" },
    { question: "Do you have liability insurance?" },
  ],
};

// ---------------------------------------------------------------------------
// Communication Guide (per vendor type)
// ---------------------------------------------------------------------------

interface CommStep {
  when: string;
  what: string;
  tip?: string;
}

const VENDOR_COMMUNICATION_GUIDE: Record<string, CommStep[]> = {
  photographer: [
    { when: "After booking", what: "Send a mood board of shots and styles you love", tip: "Include examples of editing styles you love -- light and airy vs dark and moody. Send 10-15 reference photos." },
    { when: "3 months before", what: "Discuss engagement shoot logistics if included", tip: "Use the engagement shoot to get comfortable in front of the camera. Wear something you feel great in." },
    { when: "1 month before", what: "Share your shot list and family groupings", tip: "List every must-have group photo by name. Assign a family member to wrangle people for group shots." },
    { when: "1 week before", what: "Send the final timeline with vendor arrival times", tip: "Include first look timing, golden hour window, and any surprises the photographer should capture." },
  ],
  videographer: [
    { when: "After booking", what: "Share reference videos showing the style you want", tip: "Link 2-3 wedding videos on YouTube or Vimeo that match your vision for pacing and music style." },
    { when: "1 month before", what: "Coordinate with photographer on ceremony positioning", tip: "Both need clear sightlines. Discuss who gets priority angles to avoid stepping on each other." },
    { when: "1 week before", what: "Send the final timeline and list of key moments", tip: "Flag anything non-standard: surprise performances, special toasts, choreographed dances." },
  ],
  caterer: [
    { when: "3-4 months before", what: "Schedule and attend the tasting", tip: "Bring your partner and one trusted person. Take notes and photos of each dish to remember later." },
    { when: "6-8 weeks before", what: "Provide dietary restrictions and special meals", tip: "Sort your guest list by meal choice (beef, fish, vegetarian) and flag all allergies with table numbers." },
    { when: "2 weeks before", what: "Submit final headcount and meal selections", tip: "Most caterers require final numbers 10-14 days out. Double-check against your RSVP list." },
    { when: "1 week before", what: "Confirm delivery time, setup, and point of contact", tip: "Give the caterer your coordinator's phone number as the day-of contact, not yours." },
  ],
  dj: [
    { when: "After booking", what: "Share music genres, vibe, and energy level preferences", tip: "Describe the arc: mellow during dinner, building energy for dancing. Mention 3-5 songs that define your style." },
    { when: "2-3 weeks before", what: "Submit must-play and do-not-play lists", tip: "Keep must-play to 15-20 songs max. A good DJ reads the room better than a rigid playlist." },
    { when: "1 week before", what: "Send the reception flow with exact timing", tip: "Include timing for grand entrance, toasts, first dance, parent dances, cake cutting, and last dance." },
  ],
  florist: [
    { when: "After booking", what: "Create and share a visual mood board with venue photos", tip: "Include venue photos so the florist can design arrangements that complement the space and lighting." },
    { when: "2 months before", what: "Finalize all arrangement details and quantities", tip: "Confirm bouquets, boutonnieres, centerpieces, ceremony arch, and any extras like pew markers." },
    { when: "1 month before", what: "Discuss ceremony-to-reception repurposing plan", tip: "If repurposing, assign someone (coordinator or groomsman) to move arrangements during cocktail hour." },
    { when: "1 week before", what: "Confirm delivery schedule and setup locations", tip: "Walk through exact placement for each arrangement with your coordinator. Provide a diagram if possible." },
  ],
  baker: [
    { when: "After booking", what: "Schedule and complete the cake tasting", tip: "Try at least 3-4 flavor combinations. Bring photos of designs you love and your color palette." },
    { when: "2 months before", what: "Finalize design, flavors, and tier count", tip: "Confirm the design accounts for your venue temperature -- fondant can melt in heat, buttercream can soften." },
    { when: "2 weeks before", what: "Confirm delivery time and setup details", tip: "Provide a photo of the exact table and spot where the cake will be displayed, with measurements." },
  ],
  hair_makeup: [
    { when: "After booking", what: "Schedule and complete your trial", tip: "Bring inspiration photos, wear a top with a similar neckline, and bring your veil or headpiece to test with." },
    { when: "1 month before", what: "Confirm bridal party count and styling order", tip: "Work backward from ceremony time. Hair and makeup takes 45-90 minutes per person depending on complexity." },
    { when: "1 week before", what: "Send the getting-ready timeline and venue address", tip: "Include a photo of the getting-ready space so the artist can plan their station setup and lighting." },
  ],
  officiant: [
    { when: "After booking", what: "Discuss ceremony structure and personal touches", tip: "Share your story highlights -- how you met, the proposal, inside jokes. The best ceremonies feel personal." },
    { when: "2 months before", what: "Draft and review the ceremony script together", tip: "Read it aloud to each other. Written words and spoken words feel very different. Time it with a stopwatch." },
    { when: "1 week before", what: "Confirm rehearsal time and marriage license details", tip: "Bring the license to the rehearsal so the officiant can review it and know where to sign." },
  ],
  rentals: [
    { when: "After booking", what: "Confirm item list and quantities based on guest count", tip: "Order 5-10% extra place settings for last-minute additions and breakage during the event." },
    { when: "1 month before", what: "Finalize any additions or changes", tip: "Check with your florist and coordinator for any last-minute decor rental needs like easels or lanterns." },
    { when: "1 week before", what: "Confirm delivery and pickup windows with the venue", tip: "Make sure the rental company has venue access info, loading dock details, and a day-of contact number." },
  ],
  venue: [
    { when: "After booking", what: "Get a detailed venue map and full list of restrictions", tip: "Ask about noise curfews, open flame rules, confetti policies, and whether sparklers or fireworks are allowed." },
    { when: "2 months before", what: "Schedule a walkthrough with your coordinator and key vendors", tip: "Bring your florist and photographer if possible. They will spot layout and lighting issues you would miss." },
    { when: "1 week before", what: "Confirm load-in schedule, parking, and emergency contacts", tip: "Create a one-page venue info sheet for all vendors with address, parking instructions, and contact info." },
  ],
  transportation: [
    { when: "After booking", what: "Confirm all pickup locations, times, and passenger counts", tip: "Map out every ride: bridal party to venue, couple to reception, guests to hotel. Include exact addresses." },
    { when: "1 month before", what: "Reconfirm details and provide updated addresses", tip: "Do a test drive to check timing, especially if the ceremony and reception are in different locations." },
    { when: "1 week before", what: "Send final timeline with contact numbers for all parties", tip: "Give the driver your coordinator's number, not the couple's. You should not be fielding logistics calls." },
  ],
  coordinator: [
    { when: "After booking", what: "Share all vendor contracts and contact information", tip: "Create a shared folder with every signed contract, invoice, and vendor detail so nothing is siloed." },
    { when: "Monthly", what: "Regular check-ins on progress and upcoming decisions", tip: "Keep a running list of questions between meetings so you use the time efficiently." },
    { when: "1 week before", what: "Final walkthrough, timeline review, and emergency plan", tip: "The coordinator should have every vendor's cell number, a printed timeline, and a rain plan." },
  ],
  photo_booth: [
    { when: "After booking", what: "Choose backdrop, props, and print template design", tip: "Match the print template to your wedding colors and include your names, date, and a hashtag." },
    { when: "1 month before", what: "Confirm setup location and power requirements", tip: "The booth needs a dedicated outlet and enough space for a queue line. Check with the venue." },
    { when: "1 week before", what: "Send final timeline and setup window", tip: "Photo booths work best during dancing. Open it after dinner for maximum engagement and fun." },
  ],
  other: [
    { when: "After booking", what: "Clarify deliverables, timeline, and communication preferences", tip: "Put everything in writing so there are no assumptions on either side." },
    { when: "1 month before", what: "Check in on progress and confirm details", tip: "A quick email or call keeps everyone aligned and prevents last-minute surprises." },
    { when: "1 week before", what: "Send final timeline, venue info, and day-of contact", tip: "Every vendor should know where to go, when to arrive, and who to call if they have questions." },
  ],
};

// ---------------------------------------------------------------------------
// Negotiation tips (shared across all vendor types)
// ---------------------------------------------------------------------------

const GENERAL_NEGOTIATION_TIPS = [
  "Ask about off-peak discounts (Fridays, Sundays, winter months can save 20-40%).",
  "Get at least 3 quotes and mention you are comparing.",
  "Ask what can be removed or adjusted to fit your budget.",
  "Be respectful -- vendors go above and beyond for couples who treat them as partners, not just service providers.",
];

const VENDOR_NEGOTIATION_TIPS: Record<string, string[]> = {
  photographer: [
    "Ask if they offer a shorter coverage package -- 6 hours instead of 8 can save $500+.",
    "Ask about weekday engagement shoot pricing -- it is often cheaper than weekend.",
    "Ask if you can skip the album and just get digital files.",
  ],
  videographer: [
    "Ask if they offer a highlight reel only package without the full-length edit.",
    "Ask about bundling with their photography partner if they have one.",
    "Ask about off-peak or off-season discounts.",
  ],
  caterer: [
    "Ask about buffet vs. plated pricing -- buffet can be 20-30% cheaper.",
    "Ask if you can supply your own alcohol and pay a corkage fee instead of open bar markup.",
    "Ask about brunch or lunch reception pricing -- significantly cheaper than dinner.",
    "Ask if the service charge is negotiable or if gratuity can be adjusted.",
  ],
  florist: [
    "Ask about in-season flowers -- they cost 2-3x less than imported out-of-season.",
    "Use more greenery (eucalyptus, ferns) and fewer blooms -- greenery is much cheaper per stem.",
    "Ask about repurposing ceremony flowers to the reception -- one arrangement, two uses.",
    "Ask if they offer package deals for bouquets + centerpieces together.",
  ],
  dj: [
    "Ask about ceremony + reception bundle pricing -- cheaper than booking separately.",
    "Ask if lighting (uplighting, dance floor lights) is included or a separate add-on.",
    "Ask about off-peak (daytime, Sunday) rates.",
  ],
  baker: [
    "Ask about a display cake (1-2 tiers) + sheet cake in the kitchen -- saves 40-60%.",
    "Ask your florist to decorate the cake with fresh flowers instead of paying the baker for sugar flowers.",
    "Consider a dessert table instead of a tiered cake -- more variety, often cheaper.",
  ],
  venue: [
    "Ask about Friday or Sunday pricing vs. Saturday -- can save 20-40%.",
    "Ask what is included in the rental fee -- sometimes tables, chairs, linens, and a coordinator are included.",
    "Ask if you can bring your own alcohol -- venue markup on drinks is often the biggest hidden cost.",
  ],
  hair_makeup: [
    "Ask about a group rate for the whole wedding party.",
    "Ask if the trial is included or an add-on -- bundling saves money.",
    "Ask about a la carte pricing -- you may not need every service for every person.",
  ],
  rentals: [
    "Ask about package pricing for tables + chairs + linens together.",
    "Ask if there is a discount for multi-day rentals (if setting up the day before).",
  ],
  officiant: [
    "Ask about off-peak or off-season discounts.",
    "Get at least 3 quotes and mention you are comparing.",
    "Ask what can be removed or adjusted to fit your budget.",
  ],
  coordinator: [
    "Ask about off-peak or off-season discounts.",
    "Get at least 3 quotes and mention you are comparing.",
    "Ask what can be removed or adjusted to fit your budget.",
  ],
  transportation: [
    "Ask about off-peak or off-season discounts.",
    "Get at least 3 quotes and mention you are comparing.",
    "Ask what can be removed or adjusted to fit your budget.",
  ],
  photo_booth: [
    "Ask about off-peak or off-season discounts.",
    "Get at least 3 quotes and mention you are comparing.",
    "Ask what can be removed or adjusted to fit your budget.",
  ],
  other: [
    "Ask about off-peak or off-season discounts.",
    "Get at least 3 quotes and mention you are comparing.",
    "Ask what can be removed or adjusted to fit your budget.",
  ],
};

function getNegotiationTips(vendorType: string): string[] {
  const specific = VENDOR_NEGOTIATION_TIPS[vendorType] || [];
  return [...specific, ...GENERAL_NEGOTIATION_TIPS];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVendorConfig(type: string) {
  return vendorTypeConfig[type] ?? vendorTypeConfig.other;
}

/** Given a wedding date and a relative timeframe like "2 months before", return a Date or null. */
function resolveDate(weddingDate: string | null, relative: string): Date | null {
  if (!weddingDate) return null;
  const wd = new Date(weddingDate + "T00:00:00");
  if (isNaN(wd.getTime())) return null;

  const lower = relative.toLowerCase();

  // "after booking" or "monthly" — no calculable date
  if (lower.includes("after booking") || lower === "monthly") return null;

  // Match patterns like "1 week before", "2-3 months before", "6-8 weeks before", "1-2 days out"
  const match = lower.match(/(\d+)(?:\s*-\s*\d+)?\s*(day|week|month|year)/);
  if (!match) return null;

  const amount = parseInt(match[1]);
  const unit = match[2];

  const result = new Date(wd);
  switch (unit) {
    case "day":
      result.setDate(result.getDate() - amount);
      break;
    case "week":
      result.setDate(result.getDate() - amount * 7);
      break;
    case "month":
      result.setMonth(result.getMonth() - amount);
      break;
    case "year":
      result.setFullYear(result.getFullYear() - amount);
      break;
  }
  return result;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Next-action helper — surfaces the most urgent unpaid payment so the
// detail page opens with "what's owed and when" instead of a long form.
// ---------------------------------------------------------------------------

type ActionStatus = "overdue" | "today" | "soon" | "scheduled" | "no_date";

function getPaymentNextAction(payments: PaymentItem[]): {
  description: string;
  amount: number;
  dueLabel: string;
  status: ActionStatus;
} | null {
  const unpaid = payments.filter((p) => !p.paid && p.item_type !== "tip");
  if (unpaid.length === 0) return null;

  const sorted = [...unpaid].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });
  const next = sorted[0];

  let dueLabel = "no due date set";
  let status: ActionStatus = "no_date";

  if (next.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(next.due_date + "T00:00:00");
    const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
    if (days < 0) {
      const abs = Math.abs(days);
      dueLabel = `${abs} day${abs === 1 ? "" : "s"} overdue`;
      status = "overdue";
    } else if (days === 0) {
      dueLabel = "due today";
      status = "today";
    } else if (days === 1) {
      dueLabel = "due tomorrow";
      status = "soon";
    } else if (days <= 14) {
      dueLabel = `due in ${days} days`;
      status = "soon";
    } else {
      dueLabel = `due ${formatDate(due)}`;
      status = "scheduled";
    }
  }

  return {
    description: next.description,
    amount: next.amount,
    dueLabel,
    status,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VendorDetail({ vendor, vendorType, weddingId, weddingDate, initialPayments = [], coveredItems = [] }: VendorDetailProps) {
  const router = useRouter();
  const isNew = !vendor;
  const config = getVendorConfig(vendorType);
  const Icon = config.icon;

  // ---- Form state ----
  const [companyName, setCompanyName] = useState(vendor?.company_name ?? "");
  const [contactName, setContactName] = useState(vendor?.contact_name ?? "");
  const [phone, setPhone] = useState(vendor?.phone ?? "");
  const [email, setEmail] = useState(vendor?.email ?? "");
  const [contractAmount, setContractAmount] = useState(
    vendor?.contract_amount != null ? String(vendor.contract_amount) : ""
  );
  const [arrivalTime, setArrivalTime] = useState(vendor?.arrival_time ?? "");
  const [setupLocation, setSetupLocation] = useState(
    vendor?.setup_location ?? ""
  );
  const [breakdownTime, setBreakdownTime] = useState(
    vendor?.breakdown_time ?? ""
  );
  const [mealsNeeded, setMealsNeeded] = useState(
    vendor?.meals_needed != null ? String(vendor.meals_needed) : ""
  );
  const [dietaryNotes, setDietaryNotes] = useState(vendor?.dietary_notes ?? "");
  const [notes, setNotes] = useState(vendor?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>(
    vendor?.comm_completed_steps ?? []
  );

  // Toggle a Communication Guide milestone done/undone — stored as the
  // `when` string ("After booking", "1 month before") so completion
  // survives template reordering.
  async function toggleCommStep(when: string) {
    if (!vendor) return;
    const next = completedSteps.includes(when)
      ? completedSteps.filter((s) => s !== when)
      : [...completedSteps, when];
    setCompletedSteps(next);
    const supabase = createClient();
    await supabase
      .from("vendors")
      .update({ comm_completed_steps: next })
      .eq("id", vendor.id);
  }

  // ---- Save (create or update) ----
  async function handleSave() {
    if (!companyName.trim()) return;
    setSaving(true);
    const supabase = createClient();

    const contract = contractAmount ? parseFloat(contractAmount) : null;

    const payload = {
      company_name: companyName,
      contact_name: contactName || null,
      phone: phone || null,
      email: email || null,
      contract_amount: contract,
      arrival_time: arrivalTime || null,
      setup_location: setupLocation || null,
      breakdown_time: breakdownTime || null,
      meals_needed: mealsNeeded ? parseInt(mealsNeeded) : null,
      dietary_notes: dietaryNotes || null,
      notes: notes || null,
    };

    if (isNew) {
      const { data } = await supabase
        .from("vendors")
        .insert({ ...payload, wedding_id: weddingId, type: vendorType })
        .select("id")
        .single();
      // Scaffold payment schedule: Deposit ($0, editable) + Final balance (= contract)
      if (data) {
        const category = VENDOR_TYPE_TO_CATEGORY[
          vendorType as keyof typeof VENDOR_TYPE_TO_CATEGORY
        ] ?? "Other";
        await supabase.from("budget_items").insert([
          {
            wedding_id: weddingId,
            category,
            description: "Deposit",
            amount: 0,
            due_date: null,
            paid: false,
            paid_at: null,
            item_type: "deposit",
            vendor_id: data.id,
            shopping_item_id: null,
          },
          {
            wedding_id: weddingId,
            category,
            description: "Final balance",
            amount: contract ?? 0,
            due_date: null,
            paid: false,
            paid_at: null,
            item_type: "balance",
            vendor_id: data.id,
            shopping_item_id: null,
          },
        ]);
      }
      setSaving(false);
      if (data) {
        toast.success("Vendor added");
        router.push(`/vendors/${data.id}`);
        router.refresh();
      }
    } else {
      const { error } = await supabase.from("vendors").update(payload).eq("id", vendor.id);
      setSaving(false);
      if (error) {
        toast.error("Could not save", { description: error.message });
        return;
      }
      toast.success("Saved");
      router.refresh();
    }
  }

  // ---- Delete ----
  async function handleDelete() {
    if (!vendor) return;
    if (!confirm("Are you sure you want to delete this vendor?")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("vendors").delete().eq("id", vendor.id);
    router.push("/vendors");
  }

  // ---- Data for tabs ----
  const questions = VENDOR_QUESTIONS[vendorType] ?? VENDOR_QUESTIONS.other;
  const commGuide =
    VENDOR_COMMUNICATION_GUIDE[vendorType] ??
    VENDOR_COMMUNICATION_GUIDE.other;

  // ---- Next action for booked vendors (most urgent unpaid payment) ----
  const nextAction = !isNew ? getPaymentNextAction(initialPayments) : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/vendors"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Vendors
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
              {vendor?.company_name || config.label}
            </h1>
            <Badge variant="secondary" className="mt-1">
              {isNew ? "Not booked yet" : config.label}
            </Badge>
          </div>
        </div>
        {isNew && (
          <Button
            onClick={() => setShowAddDialog(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add {config.label}
          </Button>
        )}
      </div>

      {/* Next-action callout — most urgent unpaid payment surfaced up top */}
      {nextAction && (
        <div
          className={cn(
            "rounded-xl border p-3.5 flex items-center gap-3",
            nextAction.status === "overdue" &&
              "border-destructive/40 bg-destructive/5",
            nextAction.status === "today" &&
              "border-amber-400/60 bg-amber-50",
            (nextAction.status === "soon" ||
              nextAction.status === "scheduled" ||
              nextAction.status === "no_date") &&
              "border-primary/30 bg-primary/[0.04]"
          )}
        >
          <CircleDot
            className={cn(
              "h-4 w-4 shrink-0",
              nextAction.status === "overdue" && "text-destructive",
              nextAction.status === "today" && "text-amber-600",
              (nextAction.status === "soon" ||
                nextAction.status === "scheduled") &&
                "text-primary",
              nextAction.status === "no_date" && "text-muted-foreground"
            )}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
              Next up
            </p>
            <p className="text-sm font-medium mt-0.5">
              ${nextAction.amount.toLocaleString()}{" "}
              {nextAction.description.toLowerCase()} · {nextAction.dueLabel}
            </p>
          </div>
        </div>
      )}

      {/* Tabs — different for booked vs unbooked */}
      <Tabs defaultValue={isNew ? "questions" : "details"} className="space-y-6">
        <TabsList>
          {!isNew && (
            <TabsTrigger value="details" className="gap-1.5">
              <Save className="h-4 w-4" />
              Details
            </TabsTrigger>
          )}
          {isNew && (
            <TabsTrigger value="questions" className="gap-1.5">
              <HelpCircle className="h-4 w-4" />
              Questions to Ask
            </TabsTrigger>
          )}
          {!isNew && (
            <TabsTrigger value="communication" className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Communication Guide
            </TabsTrigger>
          )}
        </TabsList>

        {/* ============================================================= */}
        {/* TAB 1 — Details (editable form)                                */}
        {/* ============================================================= */}
        <TabsContent value="details" className="space-y-6">
          {/* Contact info */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Main point of contact"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vendor@example.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract & Payment section */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Contract total
                </h3>
                <div className="max-w-xs space-y-2">
                  <Label htmlFor="contractAmount" className="sr-only">
                    Contract total
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      id="contractAmount"
                      type="number"
                      value={contractAmount}
                      onChange={(e) => setContractAmount(e.target.value)}
                      className="pl-7"
                      placeholder="3,000"
                    />
                  </div>
                </div>
              </div>

              {!isNew && vendor && (
                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Payment schedule
                  </h3>
                  <PaymentSchedule
                    vendorId={vendor.id}
                    weddingId={weddingId}
                    category={
                      VENDOR_TYPE_TO_CATEGORY[
                        vendorType as keyof typeof VENDOR_TYPE_TO_CATEGORY
                      ] ?? "Other"
                    }
                    contractAmount={
                      contractAmount ? parseFloat(contractAmount) : null
                    }
                    items={initialPayments}
                    variant="expanded"
                  />
                </div>
              )}

              {isNew && (
                <p className="text-xs text-muted-foreground italic">
                  Payment schedule will be set up after you save.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Logistics section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Day-of Logistics
                </h3>
                <p className="text-[11px] text-muted-foreground/70">
                  These fields print on this vendor&apos;s booklet.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Arrival Time</Label>
                  <TimePicker
                    value={arrivalTime}
                    onChange={(v) => setArrivalTime(v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setupLocation">
                    Setup Location
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="setupLocation"
                    value={setupLocation}
                    onChange={(e) => setSetupLocation(e.target.value)}
                    placeholder="e.g. Grand Ballroom, Side Entrance — skip if not applicable"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <TimePicker
                    value={breakdownTime}
                    onChange={(v) => setBreakdownTime(v)}
                  />
                  <p className="text-xs text-muted-foreground">
                    When they wrap up — coverage end, last song, breakdown start.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mealsNeeded">Vendor Meals Needed</Label>
                  <Input
                    id="mealsNeeded"
                    type="number"
                    value={mealsNeeded}
                    onChange={(e) => setMealsNeeded(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tell the caterer how many staff plates this vendor needs.
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="dietaryNotes">Dietary notes for vendor meals</Label>
                  <Textarea
                    id="dietaryNotes"
                    value={dietaryNotes}
                    onChange={(e) => setDietaryNotes(e.target.value)}
                    placeholder="e.g., photographer is gluten-free, DJ is vegetarian"
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What they provide — shopping items flagged as covered by
              this vendor. Read-only cross-reference; couples edit the
              linkage from the Shopping page. */}
          {coveredItems.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground inline-flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    What they provide
                  </h3>
                  <Link
                    href="/shopping"
                    className="text-xs text-primary/70 hover:text-primary transition-colors inline-flex items-center gap-1"
                  >
                    Edit in Shopping
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Items flagged as covered — these won&apos;t count toward
                  your shopping spend.
                </p>
                <ul className="space-y-1.5">
                  {coveredItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 text-sm py-1"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                      <span className="flex-1 min-w-0 truncate">
                        {item.item_name}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider shrink-0">
                        {item.category}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Notes
              </h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any extra notes, special requests, or reminders..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : "Delete Vendor"}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </TabsContent>

        {/* ============================================================= */}
        {/* TAB 2 — Questions to Ask                                       */}
        {/* ============================================================= */}
        <TabsContent value="questions" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Recommended questions to ask your {config.label.toLowerCase()} before
            signing a contract or finalizing details.
          </p>

          <div className="grid gap-3">
            {questions.map((q, i) => (
              <Card key={i}>
                <CardContent className="pt-5 pb-4">
                  <p className="font-semibold text-sm">{q.question}</p>
                  {q.why && (
                    <p className="text-sm text-muted-foreground mt-1.5">
                      {q.why}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Negotiation Tips */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Negotiation Tips</h3>
              </div>
              <ul className="space-y-2">
                {getNegotiationTips(vendorType).map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary font-bold mt-0.5">-</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

        </TabsContent>

        {/* ============================================================= */}
        {/* TAB 3 — Communication Guide                                    */}
        {/* ============================================================= */}
        <TabsContent value="communication" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            From booking through the wedding day — touch base with your{" "}
            {config.label.toLowerCase()} at each milestone.
          </p>

          {/* Vertical timeline */}
          <div className="relative pl-8">
            {/* Connecting line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-primary/20" />

            <div className="space-y-6">
              {commGuide.map((step, i) => {
                const resolvedDate = resolveDate(weddingDate, step.when);
                const isDone = completedSteps.includes(step.when);
                const canToggle = !!vendor;
                return (
                  <div key={i} className="relative">
                    {/* Toggle dot — click to mark done */}
                    <button
                      type="button"
                      onClick={() => canToggle && toggleCommStep(step.when)}
                      disabled={!canToggle}
                      aria-label={isDone ? "Mark as not done" : "Mark as done"}
                      className={cn(
                        "absolute -left-8 top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 bg-background transition-colors",
                        isDone
                          ? "border-emerald-600 bg-emerald-600 hover:bg-emerald-700"
                          : "border-primary hover:bg-primary/10",
                        canToggle ? "cursor-pointer" : "cursor-default"
                      )}
                    >
                      {isDone ? (
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      ) : (
                        <CircleDot className="h-3 w-3 text-primary" />
                      )}
                    </button>

                    <Card className={cn(isDone && "opacity-60")}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {step.when}
                          </Badge>
                          {resolvedDate && (
                            <span className="text-xs text-muted-foreground">
                              ({formatDate(resolvedDate)})
                            </span>
                          )}
                        </div>
                        <p
                          className={cn(
                            "font-semibold text-sm mt-1",
                            isDone && "line-through text-muted-foreground"
                          )}
                        >
                          {step.what}
                        </p>
                        {step.tip && (
                          <p className="text-sm text-muted-foreground mt-1.5">
                            {step.tip}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add vendor dialog (for unbooked vendors) */}
      {isNew && (
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-lg">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogHeader>
                  <DialogTitle className="text-left">Add {config.label}</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-muted-foreground">
                  Start with the basics — you can add more later.
                </p>
              </div>
            </div>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Company / Name *</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Studio Name LLC" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Smith" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vendor@email.com" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !companyName.trim()}>
                  {saving ? "Saving..." : `Add ${config.label}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
