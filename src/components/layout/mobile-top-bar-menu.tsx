"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { MoreHorizontal, Search, X } from "lucide-react";
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
import { allNavItems, footerItems } from "@/lib/nav-config";

/**
 * Overflow menu in the mobile top bar. Hosts three orphan capabilities that
 * no longer have a primary home after we switched to section-first tabs:
 *   - Search (any of the 17 tools by label)
 *   - Settings
 *   - Post-Wedding
 *
 * Mobile-only (`md:hidden`). Desktop has the sidebar, which already
 * surfaces Settings + Post-Wedding at the bottom.
 */
export function MobileTopBarMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const searching = query.trim().length > 0;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allNavItems.filter((it) => it.label.toLowerCase().includes(q));
  }, [query]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        aria-label="More"
        className="inline-flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="data-[side=bottom]:h-[80vh] flex flex-col gap-0 p-0"
      >
        <SheetHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between">
          <SheetTitle>More</SheetTitle>
          <button
            onClick={() => handleOpenChange(false)}
            aria-label="Close"
            className="inline-flex items-center justify-center h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
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
                {matches.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => handleOpenChange(false)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-xs font-medium leading-tight">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/70 text-center py-8">
                No tools match &ldquo;{query.trim()}&rdquo;
              </p>
            )
          ) : (
            <div className="space-y-1">
              {footerItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => handleOpenChange(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
