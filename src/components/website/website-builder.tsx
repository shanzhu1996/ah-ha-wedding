"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Download,
  Eye,
  Settings2,
  Plus,
  Trash2,
  GlobeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface WebsiteBuilderProps {
  wedding: WeddingData;
  timelineEvents: TimelineEvent[];
}

type TemplateStyle = "classic" | "modern" | "garden";

interface FAQItem {
  question: string;
  answer: string;
}

interface SectionConfig {
  home: boolean;
  ourStory: boolean;
  details: boolean;
  schedule: boolean;
  registry: boolean;
  faq: boolean;
  travel: boolean;
}

// ---------------------------------------------------------------------------
// Template color schemes
// ---------------------------------------------------------------------------

const TEMPLATES: Record<
  TemplateStyle,
  {
    label: string;
    description: string;
    colors: {
      bg: string;
      text: string;
      heading: string;
      accent: string;
      accentText: string;
      sectionAlt: string;
      muted: string;
      border: string;
      navBg: string;
      navText: string;
      heroBg: string;
      heroOverlay: string;
    };
  }
> = {
  classic: {
    label: "Classic Elegant",
    description: "Ivory, gold accents, serif typography",
    colors: {
      bg: "#FFFDF7",
      text: "#3D3229",
      heading: "#2C1810",
      accent: "#B8860B",
      accentText: "#FFFFFF",
      sectionAlt: "#F5F0E8",
      muted: "#8B7D6B",
      border: "#D4C5A9",
      navBg: "rgba(255,253,247,0.95)",
      navText: "#3D3229",
      heroBg: "#2C1810",
      heroOverlay: "rgba(44,24,16,0.6)",
    },
  },
  modern: {
    label: "Modern Minimal",
    description: "White, black, clean sans-serif",
    colors: {
      bg: "#FFFFFF",
      text: "#374151",
      heading: "#111827",
      accent: "#111827",
      accentText: "#FFFFFF",
      sectionAlt: "#F9FAFB",
      muted: "#6B7280",
      border: "#E5E7EB",
      navBg: "rgba(255,255,255,0.95)",
      navText: "#111827",
      heroBg: "#111827",
      heroOverlay: "rgba(17,24,39,0.7)",
    },
  },
  garden: {
    label: "Romantic Garden",
    description: "Blush, sage, romantic feel",
    colors: {
      bg: "#FDF8F6",
      text: "#44403C",
      heading: "#3B322C",
      accent: "#7C8C6E",
      accentText: "#FFFFFF",
      sectionAlt: "#F0EBE3",
      muted: "#78716C",
      border: "#D6D3D1",
      navBg: "rgba(253,248,246,0.95)",
      navText: "#44403C",
      heroBg: "#3B322C",
      heroOverlay: "rgba(59,50,44,0.55)",
    },
  },
};

// ---------------------------------------------------------------------------
// Helper: format date for display
// ---------------------------------------------------------------------------

function formatWeddingDate(dateStr: string | null): string {
  if (!dateStr) return "Date TBD";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

// ---------------------------------------------------------------------------
// HTML Generator
// ---------------------------------------------------------------------------

function generateHTML(opts: {
  template: TemplateStyle;
  sections: SectionConfig;
  wedding: WeddingData;
  headline: string;
  subtitle: string;
  ourStoryText: string;
  venueName: string;
  venueAddress: string;
  dressCode: string;
  parkingInfo: string;
  scheduleItems: { time: string; title: string; description: string }[];
  registryUrls: string[];
  faqItems: FAQItem[];
  hotelInfo: string;
  airportInfo: string;
}): string {
  const t = TEMPLATES[opts.template];
  const c = t.colors;

  const enabledSections: { id: string; label: string }[] = [];
  if (opts.sections.home) enabledSections.push({ id: "home", label: "Home" });
  if (opts.sections.ourStory)
    enabledSections.push({ id: "our-story", label: "Our Story" });
  if (opts.sections.details)
    enabledSections.push({ id: "details", label: "Details" });
  if (opts.sections.schedule)
    enabledSections.push({ id: "schedule", label: "Schedule" });
  if (opts.sections.registry)
    enabledSections.push({ id: "registry", label: "Registry" });
  if (opts.sections.faq) enabledSections.push({ id: "faq", label: "FAQ" });
  if (opts.sections.travel)
    enabledSections.push({ id: "travel", label: "Travel" });

  const navLinks = enabledSections
    .filter((s) => s.id !== "home")
    .map(
      (s) =>
        `<a href="#${s.id}" style="color:${c.navText};text-decoration:none;font-size:14px;letter-spacing:1px;text-transform:uppercase;transition:opacity 0.2s" onmouseover="this.style.opacity='0.6'" onmouseout="this.style.opacity='1'">${s.label}</a>`
    )
    .join("\n          ");

  const heroSection = opts.sections.home
    ? `
    <section id="home" style="position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;background:${c.heroBg};color:#fff;text-align:center;padding:120px 24px 80px">
      <div style="position:relative;z-index:1;max-width:700px">
        <p style="font-family:'Inter',sans-serif;font-size:14px;letter-spacing:3px;text-transform:uppercase;opacity:0.8;margin-bottom:24px">Together with their families</p>
        <h1 style="font-family:'Playfair Display',serif;font-size:clamp(40px,8vw,72px);font-weight:400;line-height:1.1;margin:0 0 24px">${escape(opts.headline)}</h1>
        <div style="width:60px;height:1px;background:${c.accent};margin:0 auto 24px"></div>
        <p style="font-family:'Inter',sans-serif;font-size:18px;opacity:0.9;line-height:1.6">${escape(opts.subtitle)}</p>
        <p style="font-family:'Playfair Display',serif;font-size:22px;margin-top:32px;letter-spacing:1px">${formatWeddingDate(opts.wedding.wedding_date)}</p>
      </div>
    </section>`
    : "";

  const ourStorySection =
    opts.sections.ourStory && opts.ourStoryText.trim()
      ? `
    <section id="our-story" style="padding:80px 24px;background:${c.sectionAlt}">
      <div style="max-width:700px;margin:0 auto;text-align:center">
        <h2 style="font-family:'Playfair Display',serif;font-size:36px;font-weight:400;color:${c.heading};margin-bottom:32px">Our Story</h2>
        <div style="width:40px;height:1px;background:${c.accent};margin:0 auto 32px"></div>
        <p style="font-family:'Inter',sans-serif;font-size:16px;line-height:1.8;color:${c.text};white-space:pre-line">${escape(opts.ourStoryText)}</p>
      </div>
    </section>`
      : "";

  const detailsSection = opts.sections.details
    ? `
    <section id="details" style="padding:80px 24px;background:${c.bg}">
      <div style="max-width:800px;margin:0 auto;text-align:center">
        <h2 style="font-family:'Playfair Display',serif;font-size:36px;font-weight:400;color:${c.heading};margin-bottom:32px">Wedding Details</h2>
        <div style="width:40px;height:1px;background:${c.accent};margin:0 auto 32px"></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:32px;text-align:center">
          ${
            opts.venueName
              ? `<div style="padding:32px 24px;border:1px solid ${c.border};border-radius:8px">
            <h3 style="font-family:'Playfair Display',serif;font-size:20px;color:${c.heading};margin-bottom:12px">Venue</h3>
            <p style="font-family:'Inter',sans-serif;font-size:15px;color:${c.text};line-height:1.6">${escape(opts.venueName)}</p>
            ${opts.venueAddress ? `<p style="font-family:'Inter',sans-serif;font-size:14px;color:${c.muted};margin-top:8px">${escape(opts.venueAddress)}</p>` : ""}
          </div>`
              : ""
          }
          ${
            opts.dressCode
              ? `<div style="padding:32px 24px;border:1px solid ${c.border};border-radius:8px">
            <h3 style="font-family:'Playfair Display',serif;font-size:20px;color:${c.heading};margin-bottom:12px">Dress Code</h3>
            <p style="font-family:'Inter',sans-serif;font-size:15px;color:${c.text};line-height:1.6">${escape(opts.dressCode)}</p>
          </div>`
              : ""
          }
          ${
            opts.parkingInfo
              ? `<div style="padding:32px 24px;border:1px solid ${c.border};border-radius:8px">
            <h3 style="font-family:'Playfair Display',serif;font-size:20px;color:${c.heading};margin-bottom:12px">Parking</h3>
            <p style="font-family:'Inter',sans-serif;font-size:15px;color:${c.text};line-height:1.6">${escape(opts.parkingInfo)}</p>
          </div>`
              : ""
          }
        </div>
      </div>
    </section>`
    : "";

  const scheduleItemsHtml = opts.scheduleItems
    .filter((si) => si.title.trim())
    .map(
      (si) => `
          <div style="display:flex;gap:24px;align-items:flex-start;text-align:left">
            <div style="min-width:80px;font-family:'Inter',sans-serif;font-size:14px;color:${c.accent};font-weight:600;padding-top:2px">${escape(si.time)}</div>
            <div>
              <h3 style="font-family:'Playfair Display',serif;font-size:18px;color:${c.heading};margin-bottom:4px">${escape(si.title)}</h3>
              ${si.description ? `<p style="font-family:'Inter',sans-serif;font-size:14px;color:${c.muted};line-height:1.5">${escape(si.description)}</p>` : ""}
            </div>
          </div>`
    )
    .join("\n");

  const scheduleSection =
    opts.sections.schedule && scheduleItemsHtml
      ? `
    <section id="schedule" style="padding:80px 24px;background:${c.sectionAlt}">
      <div style="max-width:600px;margin:0 auto">
        <h2 style="font-family:'Playfair Display',serif;font-size:36px;font-weight:400;color:${c.heading};margin-bottom:32px;text-align:center">Schedule</h2>
        <div style="width:40px;height:1px;background:${c.accent};margin:0 auto 40px"></div>
        <div style="display:flex;flex-direction:column;gap:24px;border-left:2px solid ${c.border};padding-left:24px">
          ${scheduleItemsHtml}
        </div>
      </div>
    </section>`
      : "";

  const registryLinksHtml = opts.registryUrls
    .filter((u) => u.trim())
    .map(
      (u) => `
          <a href="${escape(u)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;background:${c.accent};color:${c.accentText};text-decoration:none;font-family:'Inter',sans-serif;font-size:14px;letter-spacing:1px;text-transform:uppercase;border-radius:4px;transition:opacity 0.2s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">${escape(new URL(u).hostname.replace("www.", ""))}</a>`
    )
    .join("\n");

  const registrySection =
    opts.sections.registry && registryLinksHtml
      ? `
    <section id="registry" style="padding:80px 24px;background:${c.bg}">
      <div style="max-width:600px;margin:0 auto;text-align:center">
        <h2 style="font-family:'Playfair Display',serif;font-size:36px;font-weight:400;color:${c.heading};margin-bottom:16px">Registry</h2>
        <div style="width:40px;height:1px;background:${c.accent};margin:0 auto 24px"></div>
        <p style="font-family:'Inter',sans-serif;font-size:16px;color:${c.muted};margin-bottom:32px;line-height:1.6">Your presence is the greatest gift, but if you wish to honor us further, we are registered at the following:</p>
        <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center">
          ${registryLinksHtml}
        </div>
      </div>
    </section>`
      : "";

  const faqItemsHtml = opts.faqItems
    .filter((f) => f.question.trim() && f.answer.trim())
    .map(
      (f) => `
          <div style="padding:24px;border:1px solid ${c.border};border-radius:8px">
            <h3 style="font-family:'Playfair Display',serif;font-size:18px;color:${c.heading};margin-bottom:8px">${escape(f.question)}</h3>
            <p style="font-family:'Inter',sans-serif;font-size:15px;color:${c.text};line-height:1.6">${escape(f.answer)}</p>
          </div>`
    )
    .join("\n");

  const faqSection =
    opts.sections.faq && faqItemsHtml
      ? `
    <section id="faq" style="padding:80px 24px;background:${c.sectionAlt}">
      <div style="max-width:700px;margin:0 auto">
        <h2 style="font-family:'Playfair Display',serif;font-size:36px;font-weight:400;color:${c.heading};margin-bottom:32px;text-align:center">FAQ</h2>
        <div style="width:40px;height:1px;background:${c.accent};margin:0 auto 32px"></div>
        <div style="display:flex;flex-direction:column;gap:16px">
          ${faqItemsHtml}
        </div>
      </div>
    </section>`
      : "";

  const travelSection =
    opts.sections.travel && (opts.hotelInfo.trim() || opts.airportInfo.trim())
      ? `
    <section id="travel" style="padding:80px 24px;background:${c.bg}">
      <div style="max-width:700px;margin:0 auto;text-align:center">
        <h2 style="font-family:'Playfair Display',serif;font-size:36px;font-weight:400;color:${c.heading};margin-bottom:32px">Travel</h2>
        <div style="width:40px;height:1px;background:${c.accent};margin:0 auto 32px"></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:32px;text-align:left">
          ${
            opts.hotelInfo.trim()
              ? `<div style="padding:32px 24px;border:1px solid ${c.border};border-radius:8px">
            <h3 style="font-family:'Playfair Display',serif;font-size:20px;color:${c.heading};margin-bottom:12px">Hotels</h3>
            <p style="font-family:'Inter',sans-serif;font-size:15px;color:${c.text};line-height:1.7;white-space:pre-line">${escape(opts.hotelInfo)}</p>
          </div>`
              : ""
          }
          ${
            opts.airportInfo.trim()
              ? `<div style="padding:32px 24px;border:1px solid ${c.border};border-radius:8px">
            <h3 style="font-family:'Playfair Display',serif;font-size:20px;color:${c.heading};margin-bottom:12px">Getting There</h3>
            <p style="font-family:'Inter',sans-serif;font-size:15px;color:${c.text};line-height:1.7;white-space:pre-line">${escape(opts.airportInfo)}</p>
          </div>`
              : ""
          }
        </div>
      </div>
    </section>`
      : "";

  const footer = `
    <footer style="padding:48px 24px;background:${c.heroBg};color:#fff;text-align:center">
      <p style="font-family:'Playfair Display',serif;font-size:24px;margin-bottom:8px">${escape(opts.wedding.partner1_name)} & ${escape(opts.wedding.partner2_name)}</p>
      <p style="font-family:'Inter',sans-serif;font-size:14px;opacity:0.7">${formatWeddingDate(opts.wedding.wedding_date)}</p>
    </footer>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escape(opts.wedding.partner1_name)} & ${escape(opts.wedding.partner2_name)} - Wedding</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { font-family: 'Inter', sans-serif; color: ${c.text}; background: ${c.bg}; -webkit-font-smoothing: antialiased; }
    img { max-width: 100%; }
    a { color: ${c.accent}; }
    ::selection { background: ${c.accent}; color: ${c.accentText}; }
  </style>
</head>
<body>
  <nav style="position:fixed;top:0;left:0;right:0;z-index:100;background:${c.navBg};backdrop-filter:blur(8px);border-bottom:1px solid ${c.border};padding:16px 24px;display:flex;align-items:center;justify-content:center;gap:32px;flex-wrap:wrap">
    ${navLinks}
  </nav>
  ${heroSection}
  ${ourStorySection}
  ${detailsSection}
  ${scheduleSection}
  ${registrySection}
  ${faqSection}
  ${travelSection}
  ${footer}
</body>
</html>`;
}

function escape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WebsiteBuilder({ wedding, timelineEvents }: WebsiteBuilderProps) {
  // Template
  const [template, setTemplate] = useState<TemplateStyle>("classic");

  // Section toggles
  const [sections, setSections] = useState<SectionConfig>({
    home: true,
    ourStory: true,
    details: true,
    schedule: true,
    registry: true,
    faq: true,
    travel: true,
  });

  // Home
  const [headline, setHeadline] = useState(
    `${wedding.partner1_name} & ${wedding.partner2_name}`
  );
  const [subtitle, setSubtitle] = useState("We're getting married!");

  // Our Story
  const [ourStoryText, setOurStoryText] = useState("");

  // Details
  const [venueName, setVenueName] = useState(wedding.venue_name || "");
  const [venueAddress, setVenueAddress] = useState(wedding.venue_address || "");
  const [dressCode, setDressCode] = useState("");
  const [parkingInfo, setParkingInfo] = useState("");

  // Schedule - pre-fill from day_of timeline events
  const initialSchedule = useMemo(() => {
    const dayOfEvents = timelineEvents
      .filter((e) => e.type === "day_of")
      .sort((a, b) => a.sort_order - b.sort_order);
    if (dayOfEvents.length > 0) {
      return dayOfEvents.map((e) => ({
        time: formatTime(e.event_time),
        title: e.title,
        description: e.description || "",
      }));
    }
    return [
      { time: "4:00 PM", title: "Ceremony", description: "" },
      { time: "5:00 PM", title: "Cocktail Hour", description: "" },
      { time: "6:00 PM", title: "Reception", description: "" },
    ];
  }, [timelineEvents]);

  const [scheduleItems, setScheduleItems] = useState(initialSchedule);

  // Registry
  const [registryUrls, setRegistryUrls] = useState<string[]>([""]);

  // FAQ
  const [faqItems, setFaqItems] = useState<FAQItem[]>([
    { question: "", answer: "" },
  ]);

  // Travel
  const [hotelInfo, setHotelInfo] = useState("");
  const [airportInfo, setAirportInfo] = useState("");

  // Active config tab
  const [activeTab, setActiveTab] = useState("home");

  // Toggle section helper
  const toggleSection = useCallback((key: keyof SectionConfig) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Schedule helpers
  const updateScheduleItem = useCallback(
    (idx: number, field: "time" | "title" | "description", value: string) => {
      setScheduleItems((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: value };
        return next;
      });
    },
    []
  );
  const addScheduleItem = useCallback(() => {
    setScheduleItems((prev) => [
      ...prev,
      { time: "", title: "", description: "" },
    ]);
  }, []);
  const removeScheduleItem = useCallback((idx: number) => {
    setScheduleItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Registry helpers
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

  // FAQ helpers
  const updateFaq = useCallback(
    (idx: number, field: "question" | "answer", value: string) => {
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

  // Generate HTML
  const htmlContent = useMemo(
    () =>
      generateHTML({
        template,
        sections,
        wedding,
        headline,
        subtitle,
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
      }),
    [
      template,
      sections,
      wedding,
      headline,
      subtitle,
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
    ]
  );

  // Download
  const handleDownload = useCallback(() => {
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${wedding.partner1_name.toLowerCase().replace(/\s+/g, "-")}-and-${wedding.partner2_name.toLowerCase().replace(/\s+/g, "-")}-wedding.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [htmlContent, wedding.partner1_name, wedding.partner2_name]);

  // Section label map
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
                <div className="space-y-2">
                  <Label htmlFor="our-story">Your Story</Label>
                  <Textarea
                    id="our-story"
                    value={ourStoryText}
                    onChange={(e) => setOurStoryText(e.target.value)}
                    placeholder="Tell guests how you met, your journey together..."
                    rows={6}
                  />
                </div>
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
                <p className="text-xs text-muted-foreground">
                  Pre-filled from your day-of timeline. Edit as needed.
                </p>
                {scheduleItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="space-y-1 w-28 shrink-0">
                      <Input
                        value={item.time}
                        onChange={(e) =>
                          updateScheduleItem(idx, "time", e.target.value)
                        }
                        placeholder="Time"
                        className="text-xs"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Input
                        value={item.title}
                        onChange={(e) =>
                          updateScheduleItem(idx, "title", e.target.value)
                        }
                        placeholder="Event title"
                      />
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateScheduleItem(idx, "description", e.target.value)
                        }
                        placeholder="Description (optional)"
                        className="text-xs"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeScheduleItem(idx)}
                      className="mt-0.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
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
                {faqItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="space-y-2 p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={item.question}
                          onChange={(e) =>
                            updateFaq(idx, "question", e.target.value)
                          }
                          placeholder="Question"
                        />
                        <Textarea
                          value={item.answer}
                          onChange={(e) =>
                            updateFaq(idx, "answer", e.target.value)
                          }
                          placeholder="Answer"
                          rows={2}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFaq(idx)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addFaq}
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

            <p className="text-xs text-muted-foreground mb-4">
              RSVP form will link to your guest management page.
            </p>

            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Website
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Live Preview Panel */}
      <div className="space-y-4">
        <Card className="sticky top-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden bg-white">
              <iframe
                srcDoc={htmlContent}
                title="Website preview"
                className="w-full border-0"
                style={{ height: "600px" }}
                sandbox="allow-same-origin"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <GlobeIcon className="h-3 w-3" />
              Download the HTML file and host it anywhere: GitHub Pages, Netlify,
              or share directly.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
