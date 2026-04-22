"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { sections, findSectionByPath } from "@/lib/nav-config";

/**
 * Mobile bottom nav — 5 section tabs following the Planning Map story arc:
 *   Home · People · Vision · Plan · Ready
 *
 * Home → /dashboard, sections → /section/[key]. Active tab is derived from
 * the current pathname: if the user is deep in a tool (say /vendors), the
 * section that *owns* that tool (People) lights up. Search, Settings, and
 * Post-Wedding are no longer primary tabs — they live in the top-bar menu.
 */
export function MobileNav() {
  const pathname = usePathname();
  const currentSection = findSectionByPath(pathname);
  const isHome = pathname === "/dashboard";

  const tabs = [
    { key: "home" as const, label: "Home", href: "/dashboard", icon: Home },
    ...sections.map((s) => ({
      key: s.key,
      label: s.tabLabel,
      href: `/section/${s.key}`,
      icon: s.icon,
    })),
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-card md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive =
            tab.key === "home"
              ? isHome
              : !isHome && currentSection?.key === tab.key;
          return (
            <Link
              key={tab.key}
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
      </div>
    </nav>
  );
}
