"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  CheckSquare,
  MoreHorizontal,
  Users,
  Wallet,
  Layout,
  Music,
  Sparkles,
  BookOpen,
  Package,
  Share2,
  Globe,
  PartyPopper,
  Settings,
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

const primaryTabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/timeline", icon: CalendarDays, label: "Timeline" },
  { href: "/guests", icon: ClipboardList, label: "Guests" },
  { href: "/shopping", icon: CheckSquare, label: "Shopping" },
];

const moreItems = [
  { href: "/vendors", icon: Users, label: "Vendors" },
  { href: "/budget", icon: Wallet, label: "Budget" },
  { href: "/seating", icon: Layout, label: "Seating" },
  { href: "/music", icon: Music, label: "Music" },
  { href: "/tips", icon: Sparkles, label: "Tips" },
  { href: "/booklets", icon: BookOpen, label: "Booklets" },
  { href: "/packing", icon: Package, label: "Packing" },
  { href: "/share", icon: Share2, label: "Share" },
  { href: "/website", icon: Globe, label: "Website" },
  { href: "/postwedding", icon: PartyPopper, label: "Post-Wedding" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function MobileNav() {
  const pathname = usePathname();
  const isMoreActive = moreItems.some((item) => pathname === item.href);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-card md:hidden">
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

        {/* More tab with sheet */}
        <Sheet>
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
          <SheetContent side="bottom" className="max-h-[70vh]">
            <SheetHeader>
              <SheetTitle>More Tools</SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1 px-4 pb-4">
              <div className="grid grid-cols-3 gap-3">
                {moreItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
