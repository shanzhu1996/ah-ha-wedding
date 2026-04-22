import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { sections, type Section } from "@/lib/nav-config";

interface SectionHubProps {
  section: Section;
  visits: Record<string, string>;
}

/**
 * Section hub page — renders one of the 4 Planning Map questions as a
 * standalone destination. Used at /section/[key] and reached via the
 * mobile section tabs. Shows the question, description, a progress
 * chip, and the tools inside the section.
 *
 * Server-component friendly: accepts plain props, no hooks.
 */
export function SectionHub({ section, visits }: SectionHubProps) {
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

        <span
          className={cn(
            "inline-flex items-center gap-1 mt-4 text-[11px] px-2 py-0.5 rounded-full tabular-nums",
            allExplored
              ? "bg-primary/10 text-primary font-medium"
              : "bg-muted text-muted-foreground/70"
          )}
        >
          {allExplored ? (
            <>
              <Check className="h-3 w-3" strokeWidth={3} />
              All {total} explored
            </>
          ) : (
            <>
              {exploredCount}/{total} explored
            </>
          )}
        </span>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {section.items.map((tool) => {
          const Icon = tool.icon;
          const visited = !!visits[tool.href];
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
              {visited && (
                <span
                  aria-label="Visited"
                  className="absolute top-2 right-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-primary"
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              )}
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
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
