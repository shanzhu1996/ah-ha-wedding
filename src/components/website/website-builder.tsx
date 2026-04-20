"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Download,
  Eye,
  Settings2,
  Plus,
  Trash2,
  GlobeIcon,
  Loader2,
  Copy,
  ExternalLink,
  AlertCircle,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import {
  generateHTML,
  formatTime,
  TEMPLATES,
  type TemplateStyle,
  type FAQItem,
  type ScheduleItem,
  type SectionConfig,
} from "@/lib/website/generate-html";
import {
  compressImageForUpload,
  ImageUploadError,
} from "@/lib/website/image-upload";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimelineEvent {
  id: string;
  type: string;
  event_time: string | null;
  title: string;
  description: string | null;
  sort_order: number;
}

interface WeddingData {
  partner1_name: string;
  partner2_name: string;
  wedding_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
  ceremony_style: string | null;
  reception_format: string | null;
}

interface WebsiteRow {
  id: string;
  wedding_id: string;
  slug: string;
  template: string;
  sections: unknown;
  banner_enabled: boolean;
  banner_message: string;
  hero_image_url: string | null;
  headline: string;
  subtitle: string;
  our_story_text: string;
  story_how_we_met: string;
  story_proposal: string;
  story_favorite_memory: string;
  story_how_we_met_photo: string | null;
  story_proposal_photo: string | null;
  story_favorite_memory_photo: string | null;
  venue_name: string;
  venue_address: string;
  dress_code: string;
  parking_info: string;
  schedule_items: unknown;
  registry_urls: unknown;
  faq_items: unknown;
  hotel_info: string;
  airport_info: string;
  published: boolean;
  published_at: string | null;
}

interface WebsiteBuilderProps {
  weddingId: string;
  wedding: WeddingData;
  timelineEvents: TimelineEvent[];
  initialWebsite: WebsiteRow | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function defaultSlug(p1: string, p2: string): string {
  const a = slugify(p1) || "us";
  const b = slugify(p2) || "them";
  return `${a}-and-${b}`.slice(0, 50);
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function isValidSlug(s: string): boolean {
  return s.length >= 3 && s.length <= 60 && SLUG_RE.test(s);
}

function asSections(raw: unknown): SectionConfig {
  const defaults: SectionConfig = {
    home: true,
    ourStory: true,
    details: true,
    schedule: true,
    registry: true,
    faq: true,
    travel: true,
  };
  if (!raw || typeof raw !== "object") return defaults;
  const r = raw as Record<string, unknown>;
  return {
    home: r.home !== false,
    ourStory: r.ourStory !== false,
    details: r.details !== false,
    schedule: r.schedule !== false,
    registry: r.registry !== false,
    faq: r.faq !== false,
    travel: r.travel !== false,
  };
}

function asScheduleItems(raw: unknown): ScheduleItem[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((x) => {
    const r = (x ?? {}) as Record<string, unknown>;
    // Back-compat: older records stored start/end separately. Merge into a
    // single displayable time string (e.g. "4:15 PM–5:00 PM").
    const time = typeof r.time === "string" ? r.time : "";
    const endTime = typeof r.endTime === "string" ? r.endTime : "";
    return {
      time: endTime ? `${time}–${endTime}` : time,
      title: typeof r.title === "string" ? r.title : "",
      description: typeof r.description === "string" ? r.description : "",
    };
  });
}

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

// Planner-grade extraction: map day_of events to the 5 beats guests actually
// need (Arrival, Ceremony, Cocktail Hour, Reception, Send-off), normalize
// titles, and compute time ranges. Matches how The Knot / Joy / Minted
// present wedding schedules — 3–5 beats with start–end ranges, not a
// run-of-show.
interface BeatConfig {
  title: string;
  // Match the earliest event whose title hits `start` but NOT any of `exclude`.
  start: RegExp;
  exclude?: RegExp[];
}

const BEATS: BeatConfig[] = [
  {
    title: "Guest Arrival",
    start: /\bguests?\s+(begin\s+)?arriv/i,
  },
  {
    title: "Ceremony",
    start: /\bceremony\b/i,
    exclude: [/\bends?\b/i],
  },
  {
    title: "Cocktail Hour",
    start: /\bcocktail/i,
  },
  {
    title: "Reception",
    // Prefer the earliest reception-start signal. Any of these mark the
    // moment the reception phase visibly begins from a guest POV.
    start:
      /\b(guests?\s+seated\s+in\s+reception|grand\s+entrance|reception\s+begins?|dinner\s+service\s+begins?|\breception\b|\bdinner\b)/i,
  },
  {
    title: "Send-off",
    start: /\b(send[-\s]?off|grand\s+exit)\b/i,
  },
];

// Beat-specific placeholder + suggestion chips. Shown ONLY in edit mode —
// placeholders disappear once user types; chips hide once the description
// has content. Clicking a chip replaces the description with the snippet,
// which the user can then edit. Keyed by the canonical beat title.
const BEAT_AIDS: Record<
  string,
  { placeholder: string; suggestions: { label: string; text: string }[] }
> = {
  "Guest Arrival": {
    placeholder:
      "e.g. Doors open 30 minutes early. Look for signs in the lobby.",
    suggestions: [
      {
        label: "Arrival buffer",
        text: "Please plan to arrive 30 minutes before the ceremony so we can start on time.",
      },
      {
        label: "Parking",
        text: "Valet parking is available at the main entrance. Street parking on surrounding blocks.",
      },
      {
        label: "Entrance",
        text: "Enter through the main lobby — signs will direct you to the ceremony space.",
      },
    ],
  },
  Ceremony: {
    placeholder:
      "e.g. Outdoor garden — indoor backup in Hall A. Please silence phones.",
    suggestions: [
      {
        label: "Rain backup",
        text: "If weather requires, we'll move indoors to Hall A — we'll share any updates the morning of.",
      },
      {
        label: "Unplugged",
        text: "We're having an unplugged ceremony — please keep phones away and enjoy the moment with us.",
      },
      {
        label: "Accessibility",
        text: "The ceremony space is fully accessible. Please let us know in advance if you need any accommodations.",
      },
    ],
  },
  "Cocktail Hour": {
    placeholder:
      "e.g. Drinks and hors d'oeuvres on the terrace. Restrooms inside.",
    suggestions: [
      {
        label: "Location",
        text: "Cocktails and hors d'oeuvres will be served on the terrace (weather permitting).",
      },
      {
        label: "Photos",
        text: "Enjoy drinks and mingling while we step away for family photos — we'll rejoin shortly.",
      },
      {
        label: "Restrooms",
        text: "Restrooms are located just inside the main hall.",
      },
    ],
  },
  Reception: {
    placeholder:
      "e.g. Dinner, toasts, and dancing. Open bar. Kid-friendly until 9 PM.",
    suggestions: [
      {
        label: "Open bar",
        text: "Open bar all evening — please drink responsibly, and let us know if you'd like a ride.",
      },
      {
        label: "Adults only",
        text: "Reception is adults only — we appreciate your understanding so we can all enjoy the night.",
      },
      {
        label: "Dietary",
        text: "Let us know about dietary restrictions on your RSVP — we'll make sure there's something for everyone.",
      },
    ],
  },
  "Send-off": {
    placeholder:
      "e.g. Sparkler send-off. Shuttle to hotel leaves at 11:00 PM.",
    suggestions: [
      {
        label: "Sparklers",
        text: "Join us for a sparkler send-off! We'll provide the sparklers — no need to bring your own.",
      },
      {
        label: "Shuttle",
        text: "Shuttle back to the hotel departs at 11:00 PM from the main entrance.",
      },
      {
        label: "After-party",
        text: "If you're still up for it, meet us at the after-party — details and address to follow.",
      },
    ],
  },
};

// Common wedding-website FAQs — shown as one-click chips when a question
// field is empty. Gives couples a starting point without shipping filler.
const FAQ_SUGGESTIONS: string[] = [
  "Can I bring a plus-one?",
  "What's the dress code?",
  "Are kids welcome?",
  "Is there parking at the venue?",
  "What time should I arrive?",
  "I have dietary restrictions — what should I do?",
  "Where should I stay?",
  "Is the ceremony indoor or outdoor?",
  "Will there be an after-party?",
];

// Backstage / logistics cues — used to decide whether a saved schedule is
// noisy legacy data and should be auto-replaced with a clean extraction.
const BACKSTAGE_PATTERNS: RegExp[] = [
  /hair\s*(&|and)?\s*makeup/i,
  /\b(into\s+)?dress\b/i,
  /\b(setup|breakdown)\b/i,
  /detail\s+shots?/i,
  /\b(formal|party|family)\s+photos?/i,
  /\b(hydrate|break|snack|eat)\b/i,
  /\blicense\b/i,
  /\bvendor/i,
  /\bprep\b/i,
  /\bfirst\s+look\b/i,
  /\b(position(ed)?|lined?\s+up)\b/i,
  /\btoast\b/i,
  /\bspeech(es)?\b/i,
  /\bparent\s+dance/i,
  /\bcake\s+cut/i,
  /\bbouquet|garter/i,
  /\bfirst\s+dance\b/i,
  /\bdance\s+floor\s+opens?\b/i,
  /\bgrand\s+entrance\b/i,
  /\bguests?\s+seated\s+in\s+reception/i,
];

function extractGuestFacing(
  timelineEvents: { type: string; event_time: string | null; title: string; sort_order: number }[]
): ScheduleItem[] {
  const dayOf = [...timelineEvents.filter((e) => e.type === "day_of")].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  // If no day_of data at all, fall back to sensible planner defaults.
  if (dayOf.length === 0) {
    return [
      { time: "3:00 PM", title: "Guest Arrival", description: "" },
      { time: "3:30 PM", title: "Ceremony", description: "" },
      { time: "4:30 PM", title: "Cocktail Hour", description: "" },
      { time: "5:30 PM", title: "Reception", description: "" },
      { time: "9:30 PM", title: "Send-off", description: "" },
    ];
  }

  type Hit = { beat: BeatConfig; startTime: string; sortOrder: number };
  const hits: Hit[] = [];

  for (const beat of BEATS) {
    const match = dayOf.find((e) => {
      if (!beat.start.test(e.title)) return false;
      if (beat.exclude?.some((p) => p.test(e.title))) return false;
      return true;
    });
    if (!match) continue;
    hits.push({
      beat,
      startTime: formatTime(match.event_time),
      sortOrder: match.sort_order,
    });
  }

  // Order hits by actual event order (not BEATS order — defensive).
  hits.sort((a, b) => a.sortOrder - b.sortOrder);

  return hits.map((h) => ({
    time: h.startTime,
    title: h.beat.title,
    description: "",
  }));
}

function asFaqItems(raw: unknown): FAQItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => {
    const r = (x ?? {}) as Record<string, unknown>;
    return {
      question: typeof r.question === "string" ? r.question : "",
      answer: typeof r.answer === "string" ? r.answer : "",
    };
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WebsiteBuilder({
  weddingId,
  wedding,
  timelineEvents,
  initialWebsite,
}: WebsiteBuilderProps) {
  // ── Core content state ───────────────────────────────────────────────
  const [template, setTemplate] = useState<TemplateStyle>(
    (initialWebsite?.template as TemplateStyle) ?? "classic"
  );
  const [sections, setSections] = useState<SectionConfig>(
    asSections(initialWebsite?.sections)
  );

  const [slug, setSlug] = useState(
    initialWebsite?.slug ??
      defaultSlug(wedding.partner1_name, wedding.partner2_name)
  );

  const [bannerEnabled, setBannerEnabled] = useState(
    initialWebsite?.banner_enabled ?? false
  );
  const [bannerMessage, setBannerMessage] = useState(
    initialWebsite?.banner_message ?? ""
  );

  const [headline, setHeadline] = useState(
    initialWebsite?.headline ||
      `${wedding.partner1_name} & ${wedding.partner2_name}`
  );
  const [subtitle, setSubtitle] = useState(
    initialWebsite?.subtitle || "We're getting married!"
  );

  const [ourStoryText, setOurStoryText] = useState(
    initialWebsite?.our_story_text ?? ""
  );
  const [storyHowWeMet, setStoryHowWeMet] = useState(
    initialWebsite?.story_how_we_met ?? ""
  );
  const [storyProposal, setStoryProposal] = useState(
    initialWebsite?.story_proposal ?? ""
  );
  const [storyFavoriteMemory, setStoryFavoriteMemory] = useState(
    initialWebsite?.story_favorite_memory ?? ""
  );
  const [storyHowWeMetPhoto, setStoryHowWeMetPhoto] = useState(
    initialWebsite?.story_how_we_met_photo ?? ""
  );
  const [storyProposalPhoto, setStoryProposalPhoto] = useState(
    initialWebsite?.story_proposal_photo ?? ""
  );
  const [storyFavoriteMemoryPhoto, setStoryFavoriteMemoryPhoto] = useState(
    initialWebsite?.story_favorite_memory_photo ?? ""
  );
  const [storyUploadingKey, setStoryUploadingKey] = useState<string | null>(
    null
  );

  const [heroImageUrl, setHeroImageUrl] = useState(
    initialWebsite?.hero_image_url ?? ""
  );
  const [heroUploading, setHeroUploading] = useState(false);

  const [venueName, setVenueName] = useState(
    initialWebsite?.venue_name || wedding.venue_name || ""
  );
  const [venueAddress, setVenueAddress] = useState(
    initialWebsite?.venue_address || wedding.venue_address || ""
  );
  const [dressCode, setDressCode] = useState(initialWebsite?.dress_code ?? "");
  const [parkingInfo, setParkingInfo] = useState(
    initialWebsite?.parking_info ?? ""
  );

  // Schedule: guest-facing only.
  // Planner rule: guests need decision/attendance beats — arrival, ceremony,
  // cocktails, dinner, end time. Backstage work (hair/makeup, vendor setup,
  // posed photos) stays off the public site. We extract from day_of events
  // by pattern match; noisy items are filtered out.
  const initialSchedule = useMemo<ScheduleItem[]>(() => {
    const saved = asScheduleItems(initialWebsite?.schedule_items);
    if (saved && saved.length > 0) return saved;
    return extractGuestFacing(timelineEvents);
  }, [initialWebsite, timelineEvents]);

  const [scheduleItems, setScheduleItems] =
    useState<ScheduleItem[]>(initialSchedule);

  // One-time auto-clean on mount: if the saved schedule looks like legacy
  // noise (backstage items, >5 items total, or time ranges from an older
  // extractor version), silently replace it with the current guest-facing
  // extraction. Autosave persists the cleaned list.
  useEffect(() => {
    const total = initialSchedule.length;
    if (total === 0) return;
    const hasBackstage = initialSchedule.some((i) =>
      BACKSTAGE_PATTERNS.some((p) => p.test(i.title))
    );
    const isBloated = total > 5;
    const hasLegacyRange = initialSchedule.some((i) => i.time.includes("–"));
    if (hasBackstage || isBloated || hasLegacyRange) {
      setScheduleItems(extractGuestFacing(timelineEvents));
    }
    // Intentionally run only on mount — later user-added items (explicit
    // intent) are respected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [registryUrls, setRegistryUrls] = useState<string[]>(() => {
    const saved = asStringArray(initialWebsite?.registry_urls);
    return saved.length > 0 ? saved : [""];
  });

  const [faqItems, setFaqItems] = useState<FAQItem[]>(() => {
    const saved = asFaqItems(initialWebsite?.faq_items);
    return saved.length > 0 ? saved : [{ question: "", answer: "" }];
  });

  const [hotelInfo, setHotelInfo] = useState(initialWebsite?.hotel_info ?? "");
  const [airportInfo, setAirportInfo] = useState(
    initialWebsite?.airport_info ?? ""
  );

  const [published, setPublished] = useState(initialWebsite?.published ?? false);

  const [activeTab, setActiveTab] = useState("home");
  const [bannerExpanded, setBannerExpanded] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">(
    "desktop"
  );
  const [editingScheduleIdx, setEditingScheduleIdx] = useState<number | null>(
    null
  );
  const [editingFaqIdx, setEditingFaqIdx] = useState<number | null>(null);

  // ── Autosave state ───────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Skip the autosave triggered by the initial mount so we don't
  // write a stale-but-identical row immediately on page load.
  const skipInitialSave = useRef(true);

  // ── Toggle helpers ───────────────────────────────────────────────────
  const toggleSection = useCallback((key: keyof SectionConfig) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const updateScheduleItem = useCallback(
    (idx: number, field: keyof ScheduleItem, value: string) => {
      setScheduleItems((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: value };
        return next;
      });
    },
    []
  );
  const removeScheduleItemWithUndo = useCallback(
    (idx: number) => {
      const removed = scheduleItems[idx];
      if (!removed) return;
      setScheduleItems((prev) => prev.filter((_, i) => i !== idx));
      toast(`Removed "${removed.title || "event"}"`, {
        action: {
          label: "Undo",
          onClick: () => {
            setScheduleItems((current) => {
              const restored = [...current];
              restored.splice(Math.min(idx, restored.length), 0, removed);
              return restored;
            });
          },
        },
      });
    },
    [scheduleItems]
  );
  const addScheduleItem = useCallback(() => {
    setScheduleItems((prev) => {
      const next = [...prev, { time: "", title: "", description: "" }];
      // Open the new empty row immediately for editing.
      setEditingScheduleIdx(next.length - 1);
      return next;
    });
  }, []);
  const removeScheduleItem = useCallback((idx: number) => {
    setScheduleItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateRegistryUrl = useCallback((idx: number, value: string) => {
    setRegistryUrls((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }, []);
  const addRegistryUrl = useCallback(() => {
    setRegistryUrls((prev) => [...prev, ""]);
  }, []);
  const removeRegistryUrl = useCallback((idx: number) => {
    setRegistryUrls((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateFaq = useCallback(
    (idx: number, field: keyof FAQItem, value: string) => {
      setFaqItems((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: value };
        return next;
      });
    },
    []
  );
  const addFaq = useCallback(() => {
    setFaqItems((prev) => [...prev, { question: "", answer: "" }]);
  }, []);
  const removeFaq = useCallback((idx: number) => {
    setFaqItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ── HTML generation (preview) ────────────────────────────────────────
  const htmlContent = useMemo(
    () =>
      generateHTML({
        template,
        sections,
        wedding,
        heroImageUrl,
        headline,
        subtitle,
        storyHowWeMet,
        storyProposal,
        storyFavoriteMemory,
        storyHowWeMetPhoto: storyHowWeMetPhoto || null,
        storyProposalPhoto: storyProposalPhoto || null,
        storyFavoriteMemoryPhoto: storyFavoriteMemoryPhoto || null,
        ourStoryText,
        venueName,
        venueAddress,
        dressCode,
        parkingInfo,
        scheduleItems,
        registryUrls,
        faqItems,
        hotelInfo,
        airportInfo,
        bannerEnabled,
        bannerMessage,
        // Preview renders in an iframe via srcDoc; hash links there cause
        // the parent page to jump to top. Disable clickable nav in preview.
        interactiveNav: false,
      }),
    [
      template,
      sections,
      wedding,
      heroImageUrl,
      headline,
      subtitle,
      storyHowWeMet,
      storyProposal,
      storyFavoriteMemory,
      storyHowWeMetPhoto,
      storyProposalPhoto,
      storyFavoriteMemoryPhoto,
      ourStoryText,
      venueName,
      venueAddress,
      dressCode,
      parkingInfo,
      scheduleItems,
      registryUrls,
      faqItems,
      hotelInfo,
      airportInfo,
      bannerEnabled,
      bannerMessage,
    ]
  );

  // ── Autosave ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (skipInitialSave.current) {
      skipInitialSave.current = false;
      return;
    }
    if (!isValidSlug(slug)) {
      setSlugError(
        "Slug must be 3–60 characters, lowercase letters, numbers, or hyphens."
      );
      return;
    }
    setSlugError(null);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSaving(true);
    saveTimeout.current = setTimeout(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("wedding_websites").upsert(
        {
          wedding_id: weddingId,
          slug,
          template,
          sections,
          banner_enabled: bannerEnabled,
          banner_message: bannerMessage,
          hero_image_url: heroImageUrl || null,
          // Denormalized so /w/[slug] can render without reading weddings
          // (the weddings table is owner-only under RLS).
          partner1_name: wedding.partner1_name,
          partner2_name: wedding.partner2_name,
          wedding_date: wedding.wedding_date,
          headline,
          subtitle,
          our_story_text: ourStoryText,
          story_how_we_met: storyHowWeMet,
          story_proposal: storyProposal,
          story_favorite_memory: storyFavoriteMemory,
          story_how_we_met_photo: storyHowWeMetPhoto || null,
          story_proposal_photo: storyProposalPhoto || null,
          story_favorite_memory_photo: storyFavoriteMemoryPhoto || null,
          venue_name: venueName,
          venue_address: venueAddress,
          dress_code: dressCode,
          parking_info: parkingInfo,
          schedule_items: scheduleItems,
          registry_urls: registryUrls,
          faq_items: faqItems,
          hotel_info: hotelInfo,
          airport_info: airportInfo,
        },
        { onConflict: "wedding_id" }
      );
      setSaving(false);
      if (error) {
        // 23505 = unique_violation (most likely the slug)
        if (error.code === "23505") {
          setSlugError("That URL is taken — try a different one.");
        } else if (error.message?.includes("slug_locked_while_published")) {
          setSlugError("URL is locked while published. Unpublish to change it.");
        } else {
          toast.error("Could not save changes", {
            description: error.message,
          });
        }
        return;
      }
      setLastSavedAt(new Date());
    }, 800);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [
    weddingId,
    wedding.partner1_name,
    wedding.partner2_name,
    wedding.wedding_date,
    slug,
    template,
    sections,
    bannerEnabled,
    bannerMessage,
    heroImageUrl,
    headline,
    subtitle,
    ourStoryText,
    storyHowWeMet,
    storyProposal,
    storyFavoriteMemory,
    storyHowWeMetPhoto,
    storyProposalPhoto,
    storyFavoriteMemoryPhoto,
    venueName,
    venueAddress,
    dressCode,
    parkingInfo,
    scheduleItems,
    registryUrls,
    faqItems,
    hotelInfo,
    airportInfo,
  ]);

  // ── Publish / unpublish ──────────────────────────────────────────────
  const [publishBusy, setPublishBusy] = useState(false);
  const setPublishState = useCallback(
    async (next: boolean) => {
      if (!isValidSlug(slug)) {
        toast.error("Fix the website URL before publishing.");
        return;
      }
      setPublishBusy(true);
      const supabase = createClient();
      const { error } = await supabase
        .from("wedding_websites")
        .update({
          published: next,
          published_at: next ? new Date().toISOString() : null,
        })
        .eq("wedding_id", weddingId);
      setPublishBusy(false);
      if (error) {
        toast.error("Could not update publish status", {
          description: error.message,
        });
        return;
      }
      setPublished(next);
      toast.success(next ? "Website is live" : "Website unpublished");
    },
    [slug, weddingId]
  );

  // Public URL for the published site.
  const publicPath = `/w/${slug}`;
  const [publicUrl, setPublicUrl] = useState<string>(publicPath);
  useEffect(() => {
    setPublicUrl(`${window.location.origin}${publicPath}`);
  }, [publicPath]);

  const copyPublicUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy — try selecting manually.");
    }
  }, [publicUrl]);

  // ── Download (still useful for backup) ───────────────────────────────
  const handleDownload = useCallback(() => {
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(wedding.partner1_name)}-and-${slugify(wedding.partner2_name)}-wedding.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [htmlContent, wedding.partner1_name, wedding.partner2_name]);

  // ── Section labels ───────────────────────────────────────────────────
  const sectionLabels: Record<keyof SectionConfig, string> = {
    home: "Home",
    ourStory: "Our Story",
    details: "Details",
    schedule: "Schedule",
    registry: "Registry",
    faq: "FAQ",
    travel: "Travel",
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Configuration Panel */}
      <div className="space-y-6">
        {/* Publish card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GlobeIcon className="h-4 w-4" />
              Your Website URL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-xs">
                Link guests will visit
              </Label>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground shrink-0 font-mono text-xs">
                  /w/
                </span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                  }
                  placeholder="sarah-and-james"
                  className="font-mono text-sm"
                  aria-invalid={slugError !== null}
                  disabled={published}
                  readOnly={published}
                />
              </div>
              {slugError ? (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {slugError}
                </p>
              ) : published ? (
                <p className="text-xs text-muted-foreground">
                  Locked while published. Unpublish to change — any link you&apos;ve already shared with guests would break.
                </p>
              ) : null}
            </div>

            {published ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live at
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-2 py-1.5 bg-muted rounded text-xs truncate">
                    {publicUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyPublicUrl}
                    title="Copy link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <a
                    href={publicPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open live site"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPublishState(false)}
                  disabled={publishBusy}
                  className="w-full"
                >
                  {publishBusy ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : null}
                  Unpublish
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setPublishState(true)}
                disabled={publishBusy || !isValidSlug(slug)}
                className="w-full"
              >
                {publishBusy ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : null}
                Publish Website
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Template Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Template Style
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={template}
              onValueChange={(v) =>
                setTemplate((v ?? "classic") as TemplateStyle)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(TEMPLATES) as [
                    TemplateStyle,
                    (typeof TEMPLATES)[TemplateStyle],
                  ][]
                ).map(([key, tmpl]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <span className="font-medium">{tmpl.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {tmpl.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Section Toggles */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(Object.keys(sectionLabels) as (keyof SectionConfig)[]).map(
                (key) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={sections[key]}
                      onCheckedChange={() => toggleSection(key)}
                    />
                    <span className="text-sm">{sectionLabels[key]}</span>
                  </label>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Announcement banner — demoted: collapsed by default, shown inline
            when expanded or already enabled. For rare-but-urgent use (date
            change, cancellation). */}
        {bannerEnabled || bannerExpanded ? (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Announcement Banner
              </CardTitle>
              {!bannerEnabled && bannerExpanded ? (
                <button
                  type="button"
                  onClick={() => setBannerExpanded(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Hide
                </button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={bannerEnabled}
                  onCheckedChange={(v) => setBannerEnabled(v === true)}
                />
                <span className="text-sm">
                  Show banner at the top of the site
                </span>
              </label>
              <Textarea
                value={bannerMessage}
                onChange={(e) => setBannerMessage(e.target.value)}
                placeholder="e.g. We've moved our date to October 12, 2026 — details below."
                rows={2}
                disabled={!bannerEnabled}
              />
              <p className="text-xs text-muted-foreground">
                Use only for date changes, cancellations, or urgent updates —
                guests see this before anything else.
              </p>
            </CardContent>
          </Card>
        ) : (
          <button
            type="button"
            onClick={() => setBannerExpanded(true)}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 px-2 py-1 -mt-2 self-start"
          >
            <AlertCircle className="h-3 w-3" />
            Need to alert guests? Add an announcement banner.
          </button>
        )}

        {/* Section Content Tabs */}
        <Card>
          <CardContent className="pt-6">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v ?? "home")}
            >
              <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
                {(Object.keys(sectionLabels) as (keyof SectionConfig)[])
                  .filter((key) => sections[key])
                  .map((key) => (
                    <TabsTrigger key={key} value={key} className="text-xs">
                      {sectionLabels[key]}
                    </TabsTrigger>
                  ))}
              </TabsList>

              {/* Home Tab */}
              <TabsContent value="home" className="space-y-4">
                <div className="space-y-2">
                  <Label>Hero Photo</Label>
                  {heroImageUrl ? (
                    <div className="relative rounded-lg overflow-hidden border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={heroImageUrl}
                        alt="Hero"
                        className="w-full h-32 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setHeroImageUrl("")}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                        title="Remove hero photo"
                        aria-label="Remove hero photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 px-4 py-6 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-muted/40 cursor-pointer transition-colors text-sm text-muted-foreground">
                      {heroUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Upload a hero photo (optional)
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={heroUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          // Clear the input so selecting the same file again
                          // re-triggers onChange.
                          e.target.value = "";
                          setHeroUploading(true);
                          try {
                            const compressed = await compressImageForUpload(
                              file
                            );
                            const supabase = createClient();
                            const path = `${weddingId}/hero-${Date.now()}.jpg`;
                            const { error: uploadError } =
                              await supabase.storage
                                .from("website-photos")
                                .upload(path, compressed, {
                                  cacheControl: "3600",
                                  upsert: true,
                                  contentType: "image/jpeg",
                                });
                            if (uploadError) throw uploadError;
                            const { data } = supabase.storage
                              .from("website-photos")
                              .getPublicUrl(path);
                            setHeroImageUrl(data.publicUrl);
                            toast.success("Hero photo updated");
                          } catch (err) {
                            const msg =
                              err instanceof ImageUploadError
                                ? err.message
                                : err instanceof Error
                                  ? err.message
                                  : "Upload failed.";
                            toast.error("Upload failed", { description: msg });
                          } finally {
                            setHeroUploading(false);
                          }
                        }}
                      />
                    </label>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Wide landscape photos look best. PNG / JPG, up to 8MB —
                    we&apos;ll auto-resize for fast loading.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Sarah & James"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. We're getting married!"
                  />
                </div>
              </TabsContent>

              {/* Our Story Tab */}
              <TabsContent value="ourStory" className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Guests love the story. Fill any of the three below — leave
                  blank to skip. Each section gets its own heading and can
                  include one photo.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="story-met">How We Met</Label>
                  <Textarea
                    id="story-met"
                    value={storyHowWeMet}
                    onChange={(e) => setStoryHowWeMet(e.target.value)}
                    placeholder="e.g. We met at a friend's birthday dinner in 2022 — Richie asked for my number by the end of the night."
                    rows={4}
                  />
                  <StoryPhotoField
                    label="How We Met"
                    photoUrl={storyHowWeMetPhoto}
                    setPhotoUrl={setStoryHowWeMetPhoto}
                    fieldKey="how-we-met"
                    weddingId={weddingId}
                    uploadingKey={storyUploadingKey}
                    setUploadingKey={setStoryUploadingKey}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="story-proposal">The Proposal</Label>
                  <Textarea
                    id="story-proposal"
                    value={storyProposal}
                    onChange={(e) => setStoryProposal(e.target.value)}
                    placeholder="e.g. On our favorite hiking trail at sunrise, Richie got down on one knee…"
                    rows={4}
                  />
                  <StoryPhotoField
                    label="The Proposal"
                    photoUrl={storyProposalPhoto}
                    setPhotoUrl={setStoryProposalPhoto}
                    fieldKey="proposal"
                    weddingId={weddingId}
                    uploadingKey={storyUploadingKey}
                    setUploadingKey={setStoryUploadingKey}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="story-memory">A Favorite Memory</Label>
                  <Textarea
                    id="story-memory"
                    value={storyFavoriteMemory}
                    onChange={(e) => setStoryFavoriteMemory(e.target.value)}
                    placeholder="e.g. Our road trip up the coast last summer — we still talk about the pie shop in Half Moon Bay."
                    rows={4}
                  />
                  <StoryPhotoField
                    label="A Favorite Memory"
                    photoUrl={storyFavoriteMemoryPhoto}
                    setPhotoUrl={setStoryFavoriteMemoryPhoto}
                    fieldKey="favorite-memory"
                    weddingId={weddingId}
                    uploadingKey={storyUploadingKey}
                    setUploadingKey={setStoryUploadingKey}
                  />
                </div>
                {ourStoryText.trim() ? (
                  <div className="rounded-lg border border-border/60 bg-muted/40 p-3 space-y-2">
                    <Label
                      htmlFor="our-story-legacy"
                      className="text-xs text-muted-foreground"
                    >
                      Legacy story text (from earlier version — still shown
                      if the three fields above are empty)
                    </Label>
                    <Textarea
                      id="our-story-legacy"
                      value={ourStoryText}
                      onChange={(e) => setOurStoryText(e.target.value)}
                      rows={4}
                      className="text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setOurStoryText("")}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                    >
                      Clear legacy text
                    </button>
                  </div>
                ) : null}
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="venue-name">Venue Name</Label>
                  <Input
                    id="venue-name"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="e.g. The Grand Ballroom"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue-address">Venue Address</Label>
                  <Input
                    id="venue-address"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    placeholder="e.g. 123 Main St, City, State"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dress-code">Dress Code</Label>
                  <Input
                    id="dress-code"
                    value={dressCode}
                    onChange={(e) => setDressCode(e.target.value)}
                    placeholder="e.g. Black Tie Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parking">Parking Info</Label>
                  <Textarea
                    id="parking"
                    value={parkingInfo}
                    onChange={(e) => setParkingInfo(e.target.value)}
                    placeholder="e.g. Complimentary valet parking available"
                    rows={2}
                  />
                </div>
              </TabsContent>

              {/* Schedule Tab */}
              <TabsContent value="schedule" className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Only guest-facing beats are shown — arrival, ceremony,
                  cocktails, dinner, send-off. Backstage work (hair &amp;
                  makeup, vendor setup, posed photos) is auto-filtered out;
                  those belong in Day-of Details.
                </p>
                {scheduleItems.map((item, idx) => {
                  const isEditing = editingScheduleIdx === idx;
                  if (isEditing) {
                    const aid = BEAT_AIDS[item.title];
                    return (
                      <div
                        key={idx}
                        className="flex gap-2 items-start rounded-lg border border-primary/40 bg-muted/30 p-2"
                      >
                        <div className="w-24 shrink-0">
                          <Input
                            value={item.time}
                            onChange={(e) =>
                              updateScheduleItem(idx, "time", e.target.value)
                            }
                            placeholder="4:15 PM"
                            className="text-xs"
                            autoFocus
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <Input
                            value={item.title}
                            onChange={(e) =>
                              updateScheduleItem(idx, "title", e.target.value)
                            }
                            placeholder="Event title"
                          />
                          <div className="relative">
                            <Textarea
                              value={item.description}
                              onChange={(e) =>
                                updateScheduleItem(
                                  idx,
                                  "description",
                                  e.target.value
                                )
                              }
                              placeholder={
                                aid?.placeholder ?? "Description (optional)"
                              }
                              className="text-xs resize-y pr-7"
                              rows={2}
                            />
                            {item.description.trim() ? (
                              <button
                                type="button"
                                onClick={() =>
                                  updateScheduleItem(idx, "description", "")
                                }
                                className="absolute top-1.5 right-1.5 p-0.5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
                                title="Clear description"
                                aria-label="Clear description"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                          {aid && !item.description.trim() ? (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {aid.suggestions.map((s) => (
                                <button
                                  key={s.label}
                                  type="button"
                                  onClick={() =>
                                    updateScheduleItem(
                                      idx,
                                      "description",
                                      s.text
                                    )
                                  }
                                  className="text-[11px] px-2 py-0.5 rounded-full border border-border hover:border-primary/50 hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
                                  title={s.text}
                                >
                                  + {s.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingScheduleIdx(null)}
                            title="Done editing"
                          >
                            Done
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              removeScheduleItemWithUndo(idx);
                              setEditingScheduleIdx(null);
                            }}
                            className="text-muted-foreground hover:text-destructive"
                            title="Delete entire row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditingScheduleIdx(idx)}
                      className="w-full group flex items-start gap-4 text-left rounded-lg border border-transparent hover:border-border hover:bg-muted/40 px-3 py-2 transition-colors"
                    >
                      <div className="w-32 shrink-0 text-xs text-primary/80 font-medium tabular-nums pt-0.5">
                        {item.time || (
                          <span className="italic text-muted-foreground">
                            Set time
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item.title || (
                            <span className="italic text-muted-foreground font-normal">
                              Untitled event
                            </span>
                          )}
                        </div>
                        {item.description ? (
                          <div
                            className="text-xs text-muted-foreground truncate"
                            title={item.description}
                          >
                            {item.description}
                          </div>
                        ) : null}
                      </div>
                      <span className="text-xs text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
                        Edit
                      </span>
                    </button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addScheduleItem}
                  className="w-full"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Event
                </Button>
              </TabsContent>

              {/* Registry Tab */}
              <TabsContent value="registry" className="space-y-4">
                {registryUrls.map((url, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(e) => updateRegistryUrl(idx, e.target.value)}
                      placeholder="https://www.zola.com/registry/..."
                      className="flex-1"
                    />
                    {registryUrls.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRegistryUrl(idx)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addRegistryUrl}
                  className="w-full"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Registry URL
                </Button>
              </TabsContent>

              {/* FAQ Tab */}
              <TabsContent value="faq" className="space-y-4">
                {(() => {
                  // Filter out questions already added (so chips don't offer
                  // duplicates). Case-insensitive exact match.
                  const existingQs = new Set(
                    faqItems
                      .map((f) => f.question.trim().toLowerCase())
                      .filter(Boolean)
                  );
                  const available = FAQ_SUGGESTIONS.filter(
                    (q) => !existingQs.has(q.toLowerCase())
                  );
                  if (available.length === 0) return null;
                  return (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Common questions — click to add (then write the answer):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {available.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => {
                              // Reuse a blank row if one exists, else append.
                              // Open the row in edit mode immediately so the
                              // user knows it's ready for an answer — no
                              // premature "Added" toast.
                              const blankIdx = faqItems.findIndex(
                                (f) => !f.question.trim() && !f.answer.trim()
                              );
                              if (blankIdx >= 0) {
                                updateFaq(blankIdx, "question", q);
                                setEditingFaqIdx(blankIdx);
                              } else {
                                const nextIdx = faqItems.length;
                                setFaqItems((prev) => [
                                  ...prev,
                                  { question: q, answer: "" },
                                ]);
                                setEditingFaqIdx(nextIdx);
                              }
                            }}
                            className="text-[11px] px-2 py-0.5 rounded-full border border-border hover:border-primary/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            + {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {faqItems.map((item, idx) => {
                  const isEditing = editingFaqIdx === idx;
                  const isComplete = Boolean(
                    item.question.trim() && item.answer.trim()
                  );

                  if (isEditing) {
                    return (
                      <div
                        key={idx}
                        className="space-y-2 p-3 rounded-lg border border-primary/40 bg-muted/30"
                      >
                        <Input
                          value={item.question}
                          onChange={(e) =>
                            updateFaq(idx, "question", e.target.value)
                          }
                          placeholder="Question"
                          autoFocus={!item.question.trim()}
                        />
                        <Textarea
                          value={item.answer}
                          onChange={(e) =>
                            updateFaq(idx, "answer", e.target.value)
                          }
                          placeholder="Answer"
                          rows={3}
                          autoFocus={Boolean(item.question.trim())}
                          onKeyDown={(e) => {
                            // Cmd/Ctrl+Enter saves and collapses — matches
                            // common compose-box conventions (Slack/Discord).
                            if (
                              (e.metaKey || e.ctrlKey) &&
                              e.key === "Enter"
                            ) {
                              e.preventDefault();
                              setEditingFaqIdx(null);
                            }
                          }}
                        />
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-muted-foreground">
                            ⌘+Enter to save
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                removeFaq(idx);
                                setEditingFaqIdx(null);
                              }}
                              className="text-muted-foreground hover:text-destructive"
                              title="Delete this Q&A"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingFaqIdx(null)}
                            >
                              Done
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditingFaqIdx(idx)}
                      className="w-full group flex items-start gap-3 text-left rounded-lg border border-transparent hover:border-border hover:bg-muted/40 px-3 py-2 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item.question.trim() || (
                            <span className="italic text-muted-foreground font-normal">
                              Untitled question
                            </span>
                          )}
                        </div>
                        <div
                          className="text-xs text-muted-foreground truncate"
                          title={item.answer || undefined}
                        >
                          {item.answer.trim() || (
                            <span className="italic">No answer yet</span>
                          )}
                        </div>
                      </div>
                      {isComplete ? (
                        <Check
                          className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                          aria-label="Complete"
                        />
                      ) : (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                          Needs answer
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                        Edit
                      </span>
                    </button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    addFaq();
                    // Open the newly appended blank item for editing.
                    setEditingFaqIdx(faqItems.length);
                  }}
                  className="w-full"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Q&A
                </Button>
              </TabsContent>

              {/* Travel Tab */}
              <TabsContent value="travel" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hotel-info">Hotel Recommendations</Label>
                  <Textarea
                    id="hotel-info"
                    value={hotelInfo}
                    onChange={(e) => setHotelInfo(e.target.value)}
                    placeholder="List recommended hotels, room blocks, discount codes..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="airport-info">Airport / Directions</Label>
                  <Textarea
                    id="airport-info"
                    value={airportInfo}
                    onChange={(e) => setAirportInfo(e.target.value)}
                    placeholder="Nearest airport, driving directions, shuttle info..."
                    rows={4}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <Separator className="my-6" />

            <Button
              onClick={handleDownload}
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download HTML (backup)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Live Preview Panel */}
      <div className="space-y-4">
        <Card className="sticky top-6">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Live Preview
            </CardTitle>
            <div className="flex items-center gap-3">
              <div
                role="tablist"
                aria-label="Preview device"
                className="inline-flex rounded-full border border-border/60 p-0.5 text-xs"
              >
                {(["desktop", "mobile"] as const).map((device) => (
                  <button
                    key={device}
                    type="button"
                    role="tab"
                    aria-selected={previewDevice === device}
                    onClick={() => setPreviewDevice(device)}
                    className={`px-3 py-0.5 rounded-full transition-colors ${
                      previewDevice === device
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {device === "desktop" ? "Desktop" : "Mobile"}
                  </button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground min-h-[1rem]">
                {saving ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving…
                  </span>
                ) : lastSavedAt ? (
                  <span
                    className="tabular-nums"
                    title={lastSavedAt.toLocaleString()}
                  >
                    Saved ·{" "}
                    {lastSavedAt.toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`rounded-lg border overflow-hidden bg-white mx-auto transition-[max-width] ${
                previewDevice === "mobile" ? "max-w-[390px]" : "max-w-full"
              }`}
            >
              <iframe
                srcDoc={htmlContent}
                title="Website preview"
                className="w-full border-0"
                style={{ height: "600px" }}
                // allow-scripts: the preview nav uses inline onclick to
                // scrollIntoView within the iframe (avoids parent jump-to-top
                // bug with href="#..." in srcDoc). allow-same-origin lets
                // parent code inspect the iframe's DOM.
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StoryPhotoField — compact uploader used under each Our Story sub-field.
// One photo per story slot, upserted to website-photos storage at a
// deterministic per-wedding path. Shows a thumbnail when set.
// ---------------------------------------------------------------------------

function StoryPhotoField({
  label,
  photoUrl,
  setPhotoUrl,
  fieldKey,
  weddingId,
  uploadingKey,
  setUploadingKey,
}: {
  label: string;
  photoUrl: string;
  setPhotoUrl: (v: string) => void;
  fieldKey: string;
  weddingId: string;
  uploadingKey: string | null;
  setUploadingKey: (v: string | null) => void;
}) {
  const isUploading = uploadingKey === fieldKey;

  if (photoUrl) {
    return (
      <div className="relative rounded-lg overflow-hidden border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={label}
          className="w-full h-28 object-cover"
        />
        <button
          type="button"
          onClick={() => setPhotoUrl("")}
          className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
          title="Remove photo"
          aria-label="Remove photo"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <label
      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-muted/40 transition-colors text-xs cursor-pointer ${
        isUploading ? "opacity-60 cursor-wait" : ""
      } ${uploadingKey && !isUploading ? "pointer-events-none opacity-50" : ""}`}
    >
      {isUploading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-muted-foreground">Uploading…</span>
        </>
      ) : (
        <>
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            Add a photo (optional)
          </span>
        </>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={isUploading}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.target.value = "";
          setUploadingKey(fieldKey);
          try {
            const compressed = await compressImageForUpload(file);
            const supabase = createClient();
            const path = `${weddingId}/story-${fieldKey}-${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage
              .from("website-photos")
              .upload(path, compressed, {
                cacheControl: "3600",
                upsert: true,
                contentType: "image/jpeg",
              });
            if (uploadError) throw uploadError;
            const { data } = supabase.storage
              .from("website-photos")
              .getPublicUrl(path);
            setPhotoUrl(data.publicUrl);
            toast.success(`${label} photo added`);
          } catch (err) {
            const msg =
              err instanceof ImageUploadError
                ? err.message
                : err instanceof Error
                  ? err.message
                  : "Upload failed.";
            toast.error("Upload failed", { description: msg });
          } finally {
            setUploadingKey(null);
          }
        }}
      />
    </label>
  );
}
