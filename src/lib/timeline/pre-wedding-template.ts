/**
 * Pre-wedding timeline template.
 *
 * Seeded ONCE per wedding when the user first visits /timeline (gated by
 * `weddings.pre_wedding_seeded_at`). Never regenerated afterward — once seeded,
 * the couple owns the list. They can delete/edit/add freely.
 *
 * Shared between the server-side seed (src/app/(app)/timeline/page.tsx) and
 * the client-side renderer (src/components/timeline/timeline-manager.tsx,
 * which uses taskLinkMap to attach deep-links to each task card).
 */

import {
  addDays,
  differenceInCalendarDays,
  differenceInDays,
  format,
  subMonths,
} from "date-fns";

export type Priority = "critical" | "high" | "normal" | "low";

interface TaskDef {
  /** Month-level placement (2+ months out), compresses proportionally when less time is available. */
  idealMonthsBefore?: number;
  /** Exact day offset from wedding (final month), never compresses. */
  exactDaysBefore?: number;
  title: string;
  description: string;
  link?: string;
  optional?: boolean;
}

const TASK_DEFINITIONS: TaskDef[] = [
  // 10-12 months
  { idealMonthsBefore: 12, title: "Set your wedding budget", description: "Sit down together and set your total budget. This drives every decision — venue, catering, photography, everything. Use our budget tool to track spending.", link: "/budget" },
  { idealMonthsBefore: 12, title: "Start outfit shopping", description: "Wedding outfits take a long time to order and alter. Start as early as possible. Don't forget shoes, jewelry, and accessories — buy them early enough to break in the shoes and bring accessories to your fitting.", link: "/shopping" },
  { idealMonthsBefore: 10, title: "Build your moodboard", description: "Collect visual inspiration for colors, flowers, and style. You'll share this with your florist, photographer, and planner.", link: "/moodboard" },
  { idealMonthsBefore: 10, title: "Finalize guest list draft", description: "This number drives everything — venue size, catering count, invitation orders, and budget. Start with a rough list and refine.", link: "/guests" },
  { idealMonthsBefore: 10, title: "Book engagement photoshoot", description: "Great photos for save-the-dates and your wedding website. Also a chance to get comfortable in front of a camera.", optional: true },

  // 8-10 months
  { idealMonthsBefore: 10, title: "Order save-the-dates", description: "Simple cards with your names, date, and city — so guests can block the date and book travel. No website URL needed yet. Order as early as possible.", link: "/shopping" },
  { idealMonthsBefore: 8, title: "Send save-the-dates", description: "Mail to everyone on your guest list. Just names, date, and city is enough. Send earlier for destination weddings." },
  { idealMonthsBefore: 8, title: "Share moodboard with vendors", description: "Send your moodboard to your florist, photographer, and coordinator so everyone designs toward the same vision.", link: "/moodboard" },
  { idealMonthsBefore: 8, title: "Book hotel room blocks", description: "Popular hotels near your venue sell out fast, especially on weekends. Reserve a block so guests get a group rate." },
  { idealMonthsBefore: 8, title: "Set up wedding registry", description: "Guests will want this for engagement parties and showers. Most couples register at 2-3 stores.", optional: true },
  { idealMonthsBefore: 7, title: "Create your wedding website", description: "A page where guests find everything — date, venue, dress code, hotel block info, registry link, and RSVP form. Build it after booking hotel blocks so you have all the details to include.", link: "/website" },

  // 6-7 months
  { idealMonthsBefore: 7, title: "Start planning honeymoon", description: "Book flights and accommodations early for better prices, especially if traveling internationally.", optional: true },
  { idealMonthsBefore: 6, title: "Order wedding invitations", description: "Your invitation suite includes the invitation, RSVP card, and details card with your wedding website URL. Order early — printing and proofing takes time.", link: "/shopping" },

  // 5-6 months
  { idealMonthsBefore: 6, title: "Order wedding party attire", description: "Give your wedding party enough time for ordering, shipping, and alterations.", link: "/shopping" },
  { idealMonthsBefore: 6, title: "Book rehearsal dinner venue", description: "The rehearsal dinner happens the night before your wedding, right after the ceremony rehearsal. Book a restaurant or private space — popular spots fill up.", optional: true },
  { idealMonthsBefore: 5, title: "Schedule hair and makeup trial", description: "Test your look before the big day. Bring your headpiece/veil and inspiration photos to the trial." },
  { idealMonthsBefore: 5, title: "Purchase wedding bands", description: "Allow time for sizing, engraving, and any custom work. Don't leave this to the last minute.", link: "/shopping" },
  { idealMonthsBefore: 5, title: "Schedule cake and food tasting", description: "Most caterers and bakers offer tastings. Bring your partner — this is one of the fun parts!" },

  // 4 months — start the fun creative stuff early
  { idealMonthsBefore: 4, title: "Brainstorm your vows", description: "If writing your own, start jotting down memories, promises, and moments you love about your partner. Don't draft yet — just collect thoughts. You'll draft and finalize closer to the wedding." },
  { idealMonthsBefore: 4, title: "Order wedding favors and party gifts", description: "Favors are small thank-you gifts for guests (many couples skip these). Wedding party gifts are for your bridesmaids, groomsmen, parents, and anyone who helped — these are more important.", link: "/shopping" },
  { idealMonthsBefore: 4, title: "Research marriage license requirements", description: "Every state/county has different rules — ID requirements, waiting periods, expiration dates. Research now so you're not scrambling later." },

  // 3 months — planning tasks that need thought
  { idealMonthsBefore: 3, title: "Send wedding invitations", description: "Time to mail your invitations. Set the RSVP deadline about a month before the wedding. Pro tip: weigh one complete invitation at the post office — odd sizes need extra postage.", link: "/shopping" },
  { idealMonthsBefore: 3, title: "Finalize ceremony with officiant", description: "Review the ceremony script with your officiant. Decide on readings, vows, and any special traditions — like a unity ceremony.", link: "/vendors" },
  { idealMonthsBefore: 3, title: "Start seating chart draft", description: "Start a rough draft — group people who know each other (family together, college friends together). You'll finalize after RSVPs.", link: "/seating" },
  { idealMonthsBefore: 3, title: "Plan your music", description: "Create your must-play list, do-not-play list, and songs for key moments — processional, first dance, parent dances.", link: "/music" },
  { idealMonthsBefore: 3, title: "Plan your day-of details", description: "Map out your ceremony, reception, cocktail hour, and logistics. This becomes the master plan your vendors and wedding party follow.", link: "/day-of-details" },
  { idealMonthsBefore: 3, title: "Arrange guest transportation", description: "Shuttles from hotel to venue, parking instructions, or ride-share codes for guests.", optional: true },

  // 2 months — order + confirm, keep it light
  { idealMonthsBefore: 2, title: "Apply for marriage license", description: "Go to your county clerk's office together. Bring valid ID. Some licenses expire in 30-90 days, so time it right." },
  { idealMonthsBefore: 2, title: "Prepare emergency kit", description: "A bag of 50+ items you'll be grateful to have: sewing kit, stain remover, pain relief, safety pins, breath mints, phone charger, snacks. Check the full checklist on the Tips page.", link: "/tips" },
  { idealMonthsBefore: 1.5, title: "Final outfit fitting", description: "Make sure everything fits perfectly. Start breaking in your wedding shoes at home — seriously.", link: "/shopping" },

  // ═══════════════════════════════════════════════════════════════
  // FINAL MONTH — exact day offsets from wedding (never compressed)
  // ═══════════════════════════════════════════════════════════════

  // ~5 weeks: RSVP chain
  { exactDaysBefore: 32, title: "Send RSVP reminder", description: "Quick text or email to everyone who hasn't responded — 'RSVPs are due in a couple days!'", link: "/guests" },
  { exactDaysBefore: 30, title: "RSVP deadline", description: "The cutoff for guest responses. Everything after depends on the final count: headcount, seating, escort cards, menu.", link: "/guests" },
  { exactDaysBefore: 27, title: "Chase non-responders", description: "Call anyone who still hasn't RSVP'd. A direct phone call works better than another text.", link: "/guests" },

  // ~3.5 weeks: vendor logistics prep before catering headcount
  { exactDaysBefore: 26, title: "Confirm vendor meal counts", description: "Open each vendor and fill in the 'Vendor Meals Needed' field. Photographers, DJs, coordinators, videographers usually need a staff plate. The caterer needs the total in a few days.", link: "/vendors" },

  // ~3 weeks: finalize based on final count
  { exactDaysBefore: 21, title: "Submit final headcount to caterer", description: "Give the caterer the final number. Don't forget vendor meals — photographer, DJ, coordinator need to eat too.", link: "/vendors" },
  { exactDaysBefore: 21, title: "Finalize seating chart", description: "Finalize table assignments. Double-check dietary restrictions are noted for each table.", link: "/seating" },
  { exactDaysBefore: 21, title: "Confirm all vendor details", description: "Contact every vendor to confirm arrival times, setup needs, and final payments.", link: "/vendors" },
  { exactDaysBefore: 21, title: "Prepare vendor tip envelopes", description: "Cash in labeled envelopes. Assign a trusted person to distribute them — NOT you." },
  { exactDaysBefore: 21, title: "Do a venue walkthrough", description: "Walk the space with your coordinator and any key vendors. Confirm layout, ceremony-to-reception flow, timing, restrictions (sparklers? open flame? noise curfew?), and the rain plan if outdoors." },

  // ~2.5 weeks: finalize content
  { exactDaysBefore: 18, title: "Finalize playlist with DJ", description: "Send must-play, do-not-play lists and announcement scripts. Confirm pronunciation of names.", link: "/music" },
  { exactDaysBefore: 18, title: "Generate vendor booklets", description: "Printed reference sheet for each vendor with day-of timeline, contacts, and vendor-specific details.", link: "/booklets" },
  { exactDaysBefore: 18, title: "Prepare welcome bags", description: "Water, snacks, local treats, and itinerary card for out-of-town guests.", optional: true },

  // ~2 weeks: final printing, sharing, and critical confirmations
  { exactDaysBefore: 14, title: "Finalize and practice your vows", description: "If writing your own, finish the draft now and read them out loud. Aim for 1-2 minutes each. Write them in a vow book — not your phone." },
  { exactDaysBefore: 14, title: "Confirm marriage license is in hand", description: "The single most forgotten item on wedding day. Double-check you have the physical license, it's not expired, and you know where it is. Bring a pen to sign it." },
  { exactDaysBefore: 14, title: "Print anything you missed", description: "Escort cards, ceremony programs, table numbers, signage. Proofread everything twice.", link: "/shopping" },
  { exactDaysBefore: 14, title: "Confirm arrival times with every vendor", description: "One final check. Share the day-of timeline and vendor booklets." },
  { exactDaysBefore: 14, title: "Send day-of timeline to wedding party", description: "Everyone should know when to arrive, where to be, and what to wear.", link: "/handouts" },
  { exactDaysBefore: 14, title: "Delegate day-of responsibilities", description: "Assign someone to: distribute tips, wrangle family for photos, watch the gift box, handle emergencies, collect belongings.", link: "/handouts" },

  // ~10 days: pack and prepare
  { exactDaysBefore: 10, title: "Pack wedding day bags and boxes", description: "Organize into labeled boxes — ceremony items, reception decor, personal items, emergency kit.", link: "/packing" },
  { exactDaysBefore: 10, title: "Clean rings and prepare personal items", description: "Get rings cleaned. Lay out everything: outfit, shoes, jewelry, vow books, marriage license." },

  // 2 days: drop-offs (venue allows early access)
  { exactDaysBefore: 2, title: "Drop off decor and boxes at venue", description: "Deliver packed boxes and decor. Less to carry on the wedding morning.", link: "/packing" },
  { exactDaysBefore: 2, title: "Deliver welcome bags to hotel", description: "Drop off welcome bags at the hotel front desk for arriving guests.", optional: true },

  // 1 day: rehearsal evening + final message + rest
  { exactDaysBefore: 1, title: "Send final details to all guests", description: "Quick message with ceremony time, venue address, parking, dress code, and wedding website link." },
  { exactDaysBefore: 1, title: "Rehearsal and rehearsal dinner", description: "Evening before the wedding. Walk through the ceremony with your wedding party and officiant, then head to dinner with the wedding party, immediate family, and out-of-town guests." },
  { exactDaysBefore: 1, title: "Rest and enjoy", description: "You've done the work. Get a good night's sleep. Tomorrow is the best day of your life." },

  // Wedding day
  { exactDaysBefore: 0, title: "Wedding day!", description: "Eat breakfast. Hydrate. Enjoy every single moment. You planned for this — now live it." },

  // Post-wedding
  { exactDaysBefore: -30, title: "Write thank-you notes", description: "Send thank-you notes soon after the wedding. Note who gave what — your guest list tracks gifts received.", link: "/guests" },
];

/** Map of task title → { link, optional } for the client renderer. */
export const taskLinkMap = new Map<string, { link?: string; optional?: boolean }>();
TASK_DEFINITIONS.forEach((t) => taskLinkMap.set(t.title, { link: t.link, optional: t.optional }));

export interface GeneratedTask {
  type: "pre_wedding";
  event_date: string;
  event_time: null;
  title: string;
  description: string;
  assigned_to: null;
  sort_order: number;
  completed: false;
  priority: Priority;
  /** Optional categorical tag — used by cultural seeds (e.g. tea ceremony)
   *  to support visual filtering when the corresponding flag is toggled
   *  off. NULL/absent for generic pre-wedding tasks. */
  category?: string | null;
}

/**
 * Expand the template into concrete dated tasks for a given wedding date.
 *
 * - `idealMonthsBefore` tasks compress proportionally if the wedding is <12 months out.
 * - `exactDaysBefore` tasks are never compressed (final-month tasks).
 * - All dates are clamped between `today` and `weddingDay` (post-wedding tasks excepted).
 */
export function generatePreWeddingTimeline(weddingDate: Date): GeneratedTask[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weddingDay = new Date(weddingDate);
  weddingDay.setHours(0, 0, 0, 0);

  const totalDaysAvailable = Math.max(1, differenceInCalendarDays(weddingDay, today));
  const totalMonthsAvailable = totalDaysAvailable / 30;

  const sameMonthIndex = new Map<number, number>();

  return TASK_DEFINITIONS.map((task, i) => {
    let finalDate: Date;

    if (task.exactDaysBefore !== undefined) {
      if (task.exactDaysBefore < 0) {
        finalDate = addDays(weddingDay, Math.abs(task.exactDaysBefore));
      } else {
        finalDate = addDays(weddingDay, -task.exactDaysBefore);
      }

      if (task.exactDaysBefore >= 0 && finalDate < today) finalDate = today;

      const priority: Priority = task.exactDaysBefore === 0 ? "normal"
        : task.exactDaysBefore < 0 ? "low"
        : finalDate < today ? "high"
        : "normal";

      return {
        type: "pre_wedding" as const,
        event_date: format(finalDate, "yyyy-MM-dd"),
        event_time: null,
        title: task.title,
        description: task.description,
        assigned_to: null,
        sort_order: i,
        completed: false as const,
        priority,
      };
    }

    const monthsBefore = task.idealMonthsBefore || 0;
    const compressionRatio = 12 / Math.max(1, totalMonthsAvailable);
    const compressedMonths = monthsBefore / compressionRatio;

    const targetMonth = subMonths(weddingDay, Math.round(compressedMonths));
    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);

    const offsetIndex = sameMonthIndex.get(monthsBefore) || 0;
    sameMonthIndex.set(monthsBefore, offsetIndex + 1);

    finalDate = addDays(monthStart, offsetIndex * 5);

    if (finalDate < today) finalDate = today;
    if (finalDate > weddingDay) finalDate = weddingDay;

    const idealDate = addDays(weddingDay, -Math.round(monthsBefore * 30));
    const daysLate = differenceInDays(today, idealDate);

    let priority: Priority;
    if (daysLate > 60) priority = "critical";
    else if (daysLate > 0) priority = "high";
    else if (daysLate > -30) priority = "normal";
    else priority = "low";

    return {
      type: "pre_wedding" as const,
      event_date: format(finalDate, "yyyy-MM-dd"),
      event_time: null,
      title: task.title,
      description: task.description,
      assigned_to: null,
      sort_order: i,
      completed: false as const,
      priority,
    };
  });
}
