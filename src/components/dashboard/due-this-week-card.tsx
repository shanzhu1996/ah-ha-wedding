import Link from "next/link";
import { differenceInDays } from "date-fns";
import { ArrowRight, Circle } from "lucide-react";

interface Task {
  title: string;
  event_date: string | null;
}

interface Props {
  tasks: Task[];
  daysUntil: number | null;
}

function dueLabel(eventDate: string): string {
  const d = new Date(eventDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = differenceInDays(d, today);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function getWindow(daysUntil: number | null): { label: string; days: number } {
  if (daysUntil !== null && daysUntil <= 7) {
    return { label: "Today", days: 1 };
  }
  if (daysUntil !== null && daysUntil <= 30) {
    return { label: "Next 3 days", days: 3 };
  }
  return { label: "This week", days: 7 };
}

export function DueThisWeekCard({ tasks, daysUntil }: Props) {
  const win = getWindow(daysUntil);

  // Filter to just this window (anything from overdue → end of window)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inWindow = tasks.filter((t) => {
    if (!t.event_date) return false;
    const d = new Date(t.event_date + "T00:00:00");
    const days = differenceInDays(d, today);
    return days <= win.days;
  });

  if (inWindow.length === 0) return null;

  const show = inWindow.slice(0, 3);
  const remaining = inWindow.length - show.length;

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3">
        {win.label}
      </p>
      <Link
        href="/timeline"
        className="group block bg-card rounded-xl border hover:border-primary/40 transition-colors overflow-hidden"
      >
        <ul className="divide-y">
          {show.map((t, i) => (
            <li
              key={`${t.title}-${i}`}
              className="px-4 py-3 flex items-center gap-3"
            >
              <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              <p className="flex-1 text-sm text-foreground leading-tight truncate">
                {t.title}
              </p>
              {t.event_date && (
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {dueLabel(t.event_date)}
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="px-4 py-2.5 border-t bg-muted/30 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {remaining > 0 ? `+${remaining} more` : ""}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
            See all
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </Link>
    </div>
  );
}
