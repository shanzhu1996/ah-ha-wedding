"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Wallet,
  ClipboardCheck,
  MoreHorizontal,
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
import { navGroups, footerItems } from "@/lib/nav-config";

const primaryTabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/timeline", icon: CalendarDays, label: "Timeline" },
  { href: "/budget", icon: Wallet, label: "Budget" },
  { href: "/day-of-details", icon: ClipboardCheck, label: "Day-of" },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const primaryHrefs = new Set(primaryTabs.map((t) => t.href));
  const isMoreActive =
    !primaryHrefs.has(pathname) && pathname !== "/dashboard";

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
        <Sheet open={open} onOpenChange={setOpen}>
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
            className="max-h-[80vh] flex flex-col gap-0 p-0"
          >
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle>More Tools</SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <div className="space-y-5">
                {navGroups.map((group) => (
                  <div key={group.title}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2 px-1">
                      {group.title}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {group.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
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
                  </div>
                ))}

                {/* Footer items — post-wedding + settings */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-3 gap-2">
                    {footerItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
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
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
