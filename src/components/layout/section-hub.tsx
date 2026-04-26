import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { sections, type Section } from "@/lib/nav-config";

interface ToolStats {
  vendorCount: number;
  rsvpCounts: { total: number; pending: number };
  shoppingProgress: number;
  shoppingItemCount: number;
  budgetSpent: number;
  budgetTotal: number;
  timelineEventCount: number;
  upcomingTasks: Array<{ completed: boolean | null }>;
}

interface SectionHubProps {
  section: Section;
  visits: Record<string, string>;
  stats?: ToolStats;
}

function formatMoney(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${n}`;
}

/**
 * Per-tool live status — concrete state shown under the tagline.
 * Returns null when the tool has no data yet (so the card stays clean
 * for un-started tools). Tools without a meaningful single-number
 * status (Day-of, Layout Guide, Website, Tips, Booklets, Packing) are
 * intentionally omitted — the tagline alone speaks for them.
 */
function toolStatus(href: string, stats?: ToolStats): string | null {
  if (!stats) return null;
  switch (href) {
    case "/vendors":
      return stats.vendorCount > 0 ? `${stats.vendorCount} added` : null;
    case "/guests": {
      const { total, pending } = stats.rsvpCounts;
      if (total === 0) return null;
      if (pending > 0) return `${total} invited · ${pending} pending`;
      return `${total} invited · all replied`;
    }
    case "/timeline": {
      const upcoming = stats.upcomingTasks.filter((t) => !t.completed).length;
      if (stats.timelineEventCount === 0) return null;
      return `${upcoming} upcoming`;
    }
    case "/budget":
      if (stats.budgetTotal === 0) return null;
      return `${formatMoney(stats.budgetSpent)} of ${formatMoney(stats.budgetTotal)}`;
    case "/shopping":
      if (stats.shoppingItemCount === 0) return null;
      return `${stats.shoppingProgress}% done`;
    default:
      return null;
  }
}

/**
 * Section hub page — renders one of the 4 Planning Map questions as a
 * standalone destination. Used at /section/[key] and reached via the
 * mobile section tabs. Shows the question, description, a progress
 * chip, and the tools inside the section.
 *
 * Server-component friendly: accepts plain props, no hooks.
 */
export function SectionHub({ section, visits, stats }: SectionHubProps) {
  const exploredCount = section.items.filter((t) => visits[t.href]).length;
  const total = section.items.length;
  const allExplored = exploredCount === total;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
          Step {section.number} of {sections.length} · {section.sidebarTitle}
        </p>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight mt-1">
          {section.question}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xl">
          {section.description}
        </p>

        {!allExplored && (
          <span className="inline-flex items-center gap-1 mt-4 text-[11px] px-2 py-0.5 rounded-full tabular-nums bg-muted text-muted-foreground/70">
            {exploredCount}/{total} explored
          </span>
        )}
      </header>

      {/* Per-card visited ✓ removed — visiting a tool ≠ completing the work
          there. The "X/Y explored" chip above keeps the honest at-a-glance
          signal. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {section.items.map((tool) => {
          const Icon = tool.icon;
          const status = toolStatus(tool.href, stats);
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className={cn(
                "group relative p-4 rounded-xl border transition-all duration-300 hover:shadow-[0_4px_20px_rgba(196,168,130,0.12)]",
                tool.highlight
                  ? "border-primary/40 bg-primary/[0.04] hover:border-primary shadow-[0_2px_12px_rgba(196,168,130,0.12)]"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className="flex items-start justify-between mb-2.5">
                <Icon className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors duration-300" />
                <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all duration-300 -translate-x-1 group-hover:translate-x-0" />
              </div>
              <div>
                <span className="text-sm font-semibold block">{tool.label}</span>
                {tool.tagline && (
                  <span className="text-[11px] text-muted-foreground block mt-0.5 leading-snug">
                    {tool.tagline}
                  </span>
                )}
                {status && (
                  <span className="text-[11px] text-primary font-medium block mt-2 tabular-nums">
                    {status}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
