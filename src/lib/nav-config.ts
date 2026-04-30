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
  /** Tagline shown on Planning Map + section hubs (1 short sentence). */
  tagline?: string;
  /** Visually emphasize on Planning Map + hubs. */
  highlight?: boolean;
}

// Kept for backwards compatibility with older callers (sidebar collapsed state etc.).
export interface NavGroup {
  title: string;
  items: NavItem[];
}

export type SectionKey = "people" | "vision" | "plan" | "ready";

export interface Section {
  /** Stable URL slug — routes live at /section/[key]. */
  key: SectionKey;
  /** 1-indexed position in the Planning Map story arc. */
  number: 1 | 2 | 3 | 4;
  /** Longer title used in the sidebar group header + section hub fallback. */
  sidebarTitle: string;
  /** Short mobile-nav tab label (1 word). */
  tabLabel: string;
  /** The Planning Map question this section answers. */
  question: string;
  /** One-sentence description shown on the section hub. */
  description: string;
  /** Icon shown on the mobile bottom tab for this section. */
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

// Single source of truth. Consumed by:
//   - sidebar.tsx (desktop): groups by sidebarTitle, lists items
//   - planning-map.tsx (dashboard): number/question/description/items
//   - mobile-nav.tsx (mobile): tabLabel + icon for the bottom tab
//   - (app)/section/[key]/page.tsx: renders a full section hub
//   - mobile-breadcrumb.tsx: pathname → section number + sidebarTitle
// If you rename sidebarTitle, the web UX changes visibly — bump it through sidebar.tsx too.
export const sections: Section[] = [
  {
    key: "people",
    number: 1,
    sidebarTitle: "The People",
    tabLabel: "People",
    question: "Who's involved?",
    description:
      "It starts with two groups: who's pulling this off with you, and who's there to celebrate.",
    icon: Users,
    items: [
      { href: "/vendors", icon: Users, label: "Vendors", tagline: "Who's helping you?" },
      { href: "/guests", icon: ClipboardList, label: "Guests", tagline: "Who's coming?" },
    ],
  },
  {
    key: "vision",
    number: 2,
    sidebarTitle: "Your Vision",
    tabLabel: "Vision",
    question: "What's your vision?",
    description:
      "What does it look like, feel like, sound like? Don't worry about logistics yet — just dream.",
    icon: Palette,
    items: [
      { href: "/moodboard", icon: Palette, label: "Moodboard", tagline: "What does it feel like?" },
      { href: "/music", icon: Music, label: "Music", tagline: "What does it sound like?" },
    ],
  },
  {
    key: "plan",
    number: 3,
    sidebarTitle: "Making It Happen",
    tabLabel: "Plan",
    question: "How does it all come together?",
    description:
      "Every detail that turns a dream into your wedding day.",
    icon: CalendarDays,
    items: [
      { href: "/timeline", icon: CalendarDays, label: "Timeline", tagline: "Your planning calendar" },
      { href: "/budget", icon: Wallet, label: "Budget", tagline: "Where is the money going?" },
      { href: "/day-of-details", icon: ClipboardCheck, label: "Day-of Details", tagline: "The hour-by-hour playbook" },
      { href: "/shopping", icon: CheckSquare, label: "Shopping", tagline: "What do you need?" },
      { href: "/layout-guide", icon: LayoutGrid, label: "Layout Guide", tagline: "Where does everything go?" },
      { href: "/seating", icon: Layout, label: "Seating", tagline: "Who sits where?" },
      { href: "/website", icon: Globe, label: "Website", tagline: "Where do guests find info?" },
    ],
  },
  {
    key: "ready",
    number: 4,
    sidebarTitle: "The Final Stretch",
    tabLabel: "Ready",
    question: "Is everything ready?",
    description: "Last few weeks. Make sure everyone knows the plan.",
    icon: Sparkles,
    items: [
      { href: "/tips", icon: Sparkles, label: "Tips", tagline: "Advice from experience" },
      { href: "/booklets", icon: BookOpen, label: "Booklets", tagline: "Brief your vendors" },
      { href: "/packing", icon: Package, label: "Packing", tagline: "What goes where?" },
      { href: "/handouts", icon: FileText, label: "Handouts", tagline: "Brief your party" },
    ],
  },
];

export const footerItems: NavItem[] = [
  { href: "/postwedding", icon: PartyPopper, label: "Post-Wedding" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

// Backwards-compatible alias for older callers that expect the {title, items} shape.
export const navGroups: NavGroup[] = sections.map((s) => ({
  title: s.sidebarTitle,
  items: s.items,
}));

export interface BreadcrumbInfo {
  step: number;
  group: string;
  tool: string;
}

/** Find breadcrumb info for a pathname (returns null for Dashboard/footer/unknown). */
export function findBreadcrumb(pathname: string): BreadcrumbInfo | null {
  for (const section of sections) {
    const item = section.items.find((it) => it.href === pathname);
    if (item) {
      return { step: section.number, group: section.sidebarTitle, tool: item.label };
    }
  }
  return null;
}

/** Find the section that contains the given pathname (or owns /section/[key] itself). */
export function findSectionByPath(pathname: string): Section | null {
  const match = pathname.match(/^\/section\/([^/]+)/);
  if (match) {
    return sections.find((s) => s.key === match[1]) ?? null;
  }
  for (const section of sections) {
    if (section.items.some((it) => it.href === pathname)) {
      return section;
    }
  }
  return null;
}

/** Flattened nav items — groups + footer — used for search. */
export const allNavItems: NavItem[] = [
  ...sections.flatMap((s) => s.items),
  ...footerItems,
];
