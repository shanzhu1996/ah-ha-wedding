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
  Share2,
  Globe,
  Sparkles,
  Settings,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
// Tooltip removed for simplicity

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/vendors", icon: Users, label: "Vendors" },
  { href: "/guests", icon: ClipboardList, label: "Guests" },
  { href: "/timeline", icon: CalendarDays, label: "Timeline" },
  { href: "/shopping", icon: CheckSquare, label: "Shopping" },
  { href: "/budget", icon: Wallet, label: "Budget" },
  { href: "/seating", icon: Layout, label: "Seating" },
  { href: "/music", icon: Music, label: "Music" },
  { href: "/tips", icon: Sparkles, label: "Tips" },
  { href: "/booklets", icon: BookOpen, label: "Booklets" },
  { href: "/packing", icon: Package, label: "Packing" },
  { href: "/share", icon: Share2, label: "Share" },
  { href: "/website", icon: Globe, label: "Website" },
  { href: "/postwedding", icon: PartyPopper, label: "Post-Wedding" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
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
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const link = (
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
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            return <span key={item.href}>{link}</span>;
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t p-2 space-y-0.5">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
              pathname === "/settings" && "bg-primary/10 text-primary font-medium"
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
    </>
  );
}
