import {
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Layout,
  Music,
  Package,
  Users,
  Wallet,
  BookOpen,
  FileText,
  Globe,
  Sparkles,
  PartyPopper,
  Settings,
  Palette,
  LayoutGrid,
  ClipboardCheck,
} from "lucide-react";

export interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// 4 groups align with the 4 questions on the Dashboard Planning Map.
// If you rename a group, update planning-map.tsx so mental models stay in sync.
// Shared by sidebar (desktop) + mobile-nav (mobile) — single source of truth.
export const navGroups: NavGroup[] = [
  {
    title: "The People",
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
    title: "Wrapping Up",
    items: [
      { href: "/tips", icon: Sparkles, label: "Tips" },
      { href: "/booklets", icon: BookOpen, label: "Booklets" },
      { href: "/packing", icon: Package, label: "Packing" },
      { href: "/handouts", icon: FileText, label: "Handouts" },
    ],
  },
];

export const footerItems: NavItem[] = [
  { href: "/postwedding", icon: PartyPopper, label: "Post-Wedding" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export interface BreadcrumbInfo {
  step: number;
  group: string;
  tool: string;
}

/** Find breadcrumb info for a pathname (returns null for Dashboard/footer/unknown). */
export function findBreadcrumb(pathname: string): BreadcrumbInfo | null {
  for (let i = 0; i < navGroups.length; i++) {
    const group = navGroups[i];
    const item = group.items.find((it) => it.href === pathname);
    if (item) {
      return { step: i + 1, group: group.title, tool: item.label };
    }
  }
  return null;
}

/** Flattened nav items (groups + footer) — used for search in the More sheet. */
export const allNavItems: NavItem[] = [
  ...navGroups.flatMap((g) => g.items),
  ...footerItems,
];
