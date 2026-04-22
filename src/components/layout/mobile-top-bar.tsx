import Link from "next/link";
import { Heart } from "lucide-react";
import { differenceInDays } from "date-fns";

interface Props {
  weddingDate: string | null;
}

/**
 * Persistent mobile-only top bar. Gives every in-app page a consistent
 * emotional anchor (logo + days-until) so users don't need to bounce to
 * Dashboard just to see the countdown. Desktop has the sidebar for this.
 */
export function MobileTopBar({ weddingDate }: Props) {
  let daysUntil: number | null = null;
  if (weddingDate) {
    const d = new Date(weddingDate + "T00:00:00");
    daysUntil = differenceInDays(d, new Date());
  }

  return (
    <header className="md:hidden fixed top-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-b pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between h-12 px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-foreground"
          aria-label="Home"
        >
          <Heart className="h-4 w-4 text-primary fill-primary" />
          <span className="text-sm font-bold font-[family-name:var(--font-heading)]">
            Ah-Ha!
          </span>
        </Link>

        {daysUntil !== null && daysUntil > 0 && (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium tabular-nums"
          >
            <Heart className="h-2.5 w-2.5 fill-primary text-primary animate-heartbeat" />
            {daysUntil} days
          </Link>
        )}
        {daysUntil === 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-primary text-primary-foreground font-medium">
            <Heart className="h-2.5 w-2.5 fill-primary-foreground text-primary-foreground" />
            Today
          </span>
        )}
      </div>
    </header>
  );
}
