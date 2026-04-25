/**
 * Tea Ceremony timeline seed (A4).
 *
 * Seeded ONCE per wedding when the couple turns on `weddings.has_tea_ceremony`
 * and first visits /timeline (gated by `weddings.tea_ceremony_seeded_at`).
 * Never regenerated afterward — once seeded, the couple owns the list.
 *
 * Mirrors the structure of pre-wedding-template.ts so the couple gets the
 * same "complete with dates" experience for cultural prep.
 */

import { addDays, format, subMonths } from "date-fns";
import type { Priority, GeneratedTask } from "./pre-wedding-template";

interface TeaTaskDef {
  /** Months before wedding — compresses proportionally if wedding is closer. */
  idealMonthsBefore?: number;
  /** Exact day offset from wedding (final month, never compresses). */
  exactDaysBefore?: number;
  title: string;
  description: string;
}

const TEA_TASKS: TeaTaskDef[] = [
  {
    idealMonthsBefore: 6,
    title: "Order tea-ceremony attire (秀禾服 / 龙凤褂 / qipao)",
    description:
      "Rental or custom orders take weeks. Browse early so you can compare styles and do a fitting. Rentals usually include a dust bag and alterations window — confirm both.",
  },
  {
    idealMonthsBefore: 3,
    title: "Book tea-ceremony host (大妗姐 / auntie / MC)",
    description:
      "The host announces elder names, guides bows, and keeps order moving. 大妗姐 services are Cantonese-specific; for other regions, pick a senior auntie or the emcee. Confirm fee + any red envelope customary for the host.",
  },
  {
    exactDaysBefore: 42,
    title: "Draft elder serving order",
    description:
      "List every elder you plan to serve, in order. Tradition: groom's side → bride's side, eldest within each. Set this up in Day-of Details → Ceremony → Tea Ceremony. Share the list with your parents to double-check no one is missed.",
  },
  {
    exactDaysBefore: 14,
    title: "Prepare red envelopes 红包",
    description:
      "Stop by the bank for crisp new bills. Use lucky numbers (6, 8, 88, 168, 888) — avoid 4. Prepare 2-3 spares in case unexpected elders show up. Label the back of each envelope with the recipient so they don't get mixed up.",
  },
  {
    exactDaysBefore: 7,
    title: "Confirm tea set, tea leaves, and logistics",
    description:
      "Check: tea set (rental delivered? brought from home?), tea leaves (sweet black tea or long-leaf variety), 2-3 spare cups in case one cracks, kneeling cushion if elders prefer. Do a water temperature dry-run so the day-of pour isn't scalding.",
  },
];

/**
 * Expand the tea-ceremony template into dated tasks. Uses the same logic
 * as pre-wedding: ideal-month tasks compress if the wedding is less than
 * 12 months out; exact-day tasks never compress.
 */
export function generateTeaCeremonyTimeline(
  weddingDate: Date,
  /** Offset sort_order so tea tasks don't collide with pre-wedding numbering. */
  sortOrderBase: number
): GeneratedTask[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weddingDay = new Date(weddingDate);
  weddingDay.setHours(0, 0, 0, 0);

  const totalDaysAvailable = Math.max(
    1,
    Math.round((weddingDay.getTime() - today.getTime()) / 86_400_000)
  );
  const totalMonthsAvailable = totalDaysAvailable / 30;

  return TEA_TASKS.map((task, i) => {
    let finalDate: Date;
    let priority: Priority;

    if (task.exactDaysBefore !== undefined) {
      finalDate = addDays(weddingDay, -task.exactDaysBefore);
      if (finalDate < today) finalDate = today;
      priority = finalDate < today ? "high" : "normal";
    } else {
      const monthsBefore = task.idealMonthsBefore || 0;
      const compressionRatio = 12 / Math.max(1, totalMonthsAvailable);
      const compressedMonths = monthsBefore / compressionRatio;

      const targetMonth = subMonths(weddingDay, Math.round(compressedMonths));
      finalDate = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth(),
        1
      );

      if (finalDate < today) finalDate = today;
      if (finalDate > weddingDay) finalDate = weddingDay;

      priority = finalDate < today ? "high" : "normal";
    }

    return {
      type: "pre_wedding" as const,
      event_date: format(finalDate, "yyyy-MM-dd"),
      event_time: null,
      title: task.title,
      description: task.description,
      assigned_to: null,
      sort_order: sortOrderBase + i,
      completed: false as const,
      priority,
      // Tag for filtering: when has_tea_ceremony is toggled off, the
      // Timeline page hides all category='tea_ceremony' rows so the
      // couple's working list reflects their current intent.
      category: "tea_ceremony" as const,
    };
  });
}
