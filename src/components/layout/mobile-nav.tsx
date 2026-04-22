"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Wallet,
  ClipboardCheck,
  MoreHorizontal,
  Search,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { navGroups, footerItems, allNavItems } from "@/lib/nav-config";

const primaryTabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/timeline", icon: CalendarDays, label: "Timeline" },
  { href: "/budget", icon: Wallet, label: "Budget" },
  { href: "/day-of-details", icon: ClipboardCheck, label: "Day-of" },
];

interface MobileNavProps {
  /** Map of toolHref → ISO first-visit timestamp. Used for progress indicators. */
  visits?: Record<string, string>;
}

export function MobileNav({ visits = {} }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const primaryHrefs = new Set(primaryTabs.map((t) => t.href));
  const isMoreActive =
    !primaryHrefs.has(pathname) && pathname !== "/dashboard";

  const searching = query.trim().length > 0;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allNavItems.filter((it) => it.label.toLowerCase().includes(q));
  }, [query]);

  function handleSheetOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  function renderToolCard(item: (typeof allNavItems)[number]) {
    const isActive = pathname === item.href;
    const visited = !!visits[item.href];
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => handleSheetOpenChange(false)}
        className={cn(
          "relative flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        {visited && !isActive && (
          <span
            aria-label="Visited"
            className="absolute top-1.5 right-1.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/15 text-primary"
          >
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        )}
        <item.icon className="h-5 w-5" />
        <span className="text-xs font-medium leading-tight">{item.label}</span>
      </Link>
    );
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-card md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {primaryTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}

        {/* More tab with sheet — mirrors sidebar IA (4 groups + footer) */}
        <Sheet open={open} onOpenChange={handleSheetOpenChange}>
          <SheetTrigger
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors",
              isMoreActive
                ? "text-primary font-medium"
                : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="data-[side=bottom]:h-[80vh] flex flex-col gap-0 p-0"
          >
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle>More Tools</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a tool…"
                  className="pl-8 h-9"
                  aria-label="Search tools"
                />
              </div>
            </div>
            <ScrollArea className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              {searching ? (
                matches.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {matches.map(renderToolCard)}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/70 text-center py-8">
                    No tools match &ldquo;{query.trim()}&rdquo;
                  </p>
                )
              ) : (
                <div className="space-y-5">
                  {navGroups.map((group) => {
                    const exploredCount = group.items.filter(
                      (it) => visits[it.href]
                    ).length;
                    const total = group.items.length;
                    const allExplored = exploredCount === total;
                    return (
                      <div key={group.title}>
                        <div className="flex items-baseline justify-between mb-2 px-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                            {group.title}
                          </p>
                          <p
                            className={cn(
                              "text-[10px] tabular-nums",
                              allExplored
                                ? "text-primary font-medium"
                                : "text-muted-foreground/50"
                            )}
                          >
                            {exploredCount}/{total}
                            {allExplored && " ✓"}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {group.items.map(renderToolCard)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Footer items — post-wedding + settings (no progress) */}
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-3 gap-2">
                      {footerItems.map(renderToolCard)}
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
