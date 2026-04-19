"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Heart,
  Layout,
  Music,
  Package,
  Users,
  Wallet,
  BookOpen,
  FileText,
  Globe,
  Sparkles,
  Settings,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PartyPopper,
  Palette,
  LayoutGrid,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "The Basics",
    items: [
      { href: "/vendors", icon: Users, label: "Vendors" },
      { href: "/guests", icon: ClipboardList, label: "Guests" },
    ],
  },
  {
    title: "Your Vision",
    items: [
      { href: "/moodboard", icon: Palette, label: "Moodboard" },
      { href: "/music", icon: Music, label: "Music" },
    ],
  },
  {
    title: "Making It Happen",
    items: [
      { href: "/timeline", icon: CalendarDays, label: "Timeline" },
      { href: "/budget", icon: Wallet, label: "Budget" },
      { href: "/day-of-details", icon: ClipboardCheck, label: "Day-of Details" },
      { href: "/shopping", icon: CheckSquare, label: "Shopping" },
      { href: "/layout-guide", icon: LayoutGrid, label: "Layout Guide" },
      { href: "/seating", icon: Layout, label: "Seating" },
      { href: "/website", icon: Globe, label: "Website" },
    ],
  },
  {
    title: "The Home Stretch",
    items: [
      { href: "/tips", icon: Sparkles, label: "Tips" },
      { href: "/booklets", icon: BookOpen, label: "Booklets" },
      { href: "/packing", icon: Package, label: "Packing" },
      { href: "/handouts", icon: FileText, label: "Handouts" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Determine which groups should be expanded by default
  // Expand the group that contains the current active page
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Always expand the first two groups by default
    initial.add("Get Started");
    initial.add("Set the Vibe");
    // Also expand the group containing the current page
    for (const group of navGroups) {
      if (group.items.some((item) => pathname === item.href)) {
        initial.add(group.title);
      }
    }
    return initial;
  });

  function toggleGroup(title: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-card h-screen sticky top-0 transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="h-16 border-b flex items-center px-4 gap-2 shrink-0">
        <Heart className="h-6 w-6 text-primary fill-primary shrink-0" />
        {!collapsed && (
          <span className="text-lg font-bold font-[family-name:var(--font-heading)]">
            Ah-Ha!
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {/* Dashboard — always visible */}
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1",
            pathname === "/dashboard"
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </Link>

        {/* Phase groups */}
        {navGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.title);
          const hasActivePage = group.items.some(
            (item) => pathname === item.href
          );

          if (collapsed) {
            // When collapsed, just show the icons without groups
            return group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-center py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </Link>
              );
            });
          }

          return (
            <div key={group.title} className="mt-3 first:mt-1">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.title)}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors rounded-md",
                  hasActivePage
                    ? "text-primary"
                    : "text-muted-foreground/70 hover:text-muted-foreground"
                )}
              >
                <span>{group.title}</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    !isExpanded && "-rotate-90"
                  )}
                />
              </button>

              {/* Group items */}
              {isExpanded && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom — standalone links */}
      <div className="border-t p-2 space-y-0.5">
        <Link
          href="/postwedding"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname === "/postwedding"
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <PartyPopper className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Post-Wedding</span>}
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname === "/settings"
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
