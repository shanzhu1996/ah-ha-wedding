// Shared HTML generator for the wedding website.
// Used by the builder's iframe preview AND the public /w/[slug] page.

export type TemplateStyle =
  | "classic"
  | "modern"
  | "garden"
  | "classic_light"
  | "modern_light"
  | "garden_light";

export interface FAQItem {
  question: string;
  answer: string;
}

export interface ScheduleItem {
  // Free-form — may be a single time ("10:30 PM") or a range ("4:15 PM–5:00 PM").
  // Rendered verbatim in the published HTML.
  time: string;
  title: string;
  description: string;
}

export interface SectionConfig {
  home: boolean;
  ourStory: boolean;
  details: boolean;
  schedule: boolean;
  registry: boolean;
  faq: boolean;
  travel: boolean;
}

export interface WeddingBasics {
  partner1_name: string;
  partner2_name: string;
  wedding_date: string | null;
}

export interface WebsiteContent {
  template: TemplateStyle;
  sections: SectionConfig;
  wedding: WeddingBasics;
  heroImageUrl?: string | null;
  headline: string;
  subtitle: string;
  // Structured Our Story — each field optional. When all empty, falls back
  // to legacy `ourStoryText` (kept for back-compat). Each sub-story also
  // supports an optional photo rendered above its text.
  storyHowWeMet?: string;
  storyProposal?: string;
  storyFavoriteMemory?: string;
  storyHowWeMetPhoto?: string | null;
  storyProposalPhoto?: string | null;
  storyFavoriteMemoryPhoto?: string | null;
  ourStoryText: string;
  venueName: string;
  venueAddress: string;
  dressCode: string;
  parkingInfo: string;
  scheduleItems: ScheduleItem[];
  registryUrls: string[];
  faqItems: FAQItem[];
  hotelInfo: string;
  airportInfo: string;
  bannerEnabled: boolean;
  bannerMessage: string;
  // When false, nav items render as non-clickable spans. Used for the
  // iframe preview where `srcDoc` + hash links causes the parent page to
  // jump to the top in some browsers. Defaults to true (normal behavior
  // for the published /w/[slug] page).
  interactiveNav?: boolean;
}

export const TEMPLATES: Record<
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
      heroText: string;
      heroTextMuted: string;
      footerBg: string;
      footerText: string;
      footerTextMuted: string;
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
      heroText: "#FFFFFF",
      heroTextMuted: "rgba(255,255,255,0.8)",
      footerBg: "#2C1810",
      footerText: "#FFFFFF",
      footerTextMuted: "rgba(255,255,255,0.7)",
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
      heroText: "#FFFFFF",
      heroTextMuted: "rgba(255,255,255,0.8)",
      footerBg: "#111827",
      footerText: "#FFFFFF",
      footerTextMuted: "rgba(255,255,255,0.7)",
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
      heroText: "#FFFFFF",
      heroTextMuted: "rgba(255,255,255,0.8)",
      footerBg: "#3B322C",
      footerText: "#FFFFFF",
      footerTextMuted: "rgba(255,255,255,0.7)",
    },
  },
  classic_light: {
    label: "Classic Light",
    description: "Ivory hero, dark serif, gold accents",
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
      heroBg: "#FFFDF7",
      heroText: "#2C1810",
      heroTextMuted: "#8B7D6B",
      footerBg: "#F5F0E8",
      footerText: "#2C1810",
      footerTextMuted: "#8B7D6B",
    },
  },
  modern_light: {
    label: "Modern Light",
    description: "White hero, black type, clean lines",
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
      heroBg: "#FFFFFF",
      heroText: "#111827",
      heroTextMuted: "#6B7280",
      footerBg: "#F9FAFB",
      footerText: "#111827",
      footerTextMuted: "#6B7280",
    },
  },
  garden_light: {
    label: "Garden Light",
    description: "Blush hero, sage accents, airy feel",
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
      heroBg: "#F7E8E0",
      heroText: "#3B322C",
      heroTextMuted: "#78716C",
      footerBg: "#F0EBE3",
      footerText: "#3B322C",
      footerTextMuted: "#78716C",
    },
  },
};

export function formatWeddingDate(dateStr: string | null): string {
  if (!dateStr) return "Date TBD";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function escape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeHostname(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

export function generateHTML(opts: WebsiteContent): string {
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

  // Preview mode uses data-section buttons with inline scroll script.
  // href="#..." in srcDoc iframes makes the PARENT page jump to top in
  // Chromium — so we hijack clicks to scrollIntoView within the iframe.
  const interactiveNav = opts.interactiveNav !== false;
  const navLinks = enabledSections
    .filter((s) => s.id !== "home")
    .map((s) =>
      interactiveNav
        ? `<a href="#${s.id}" style="color:${c.navText};text-decoration:none;font-size:14px;letter-spacing:1px;text-transform:uppercase;transition:opacity 0.2s" onmouseover="this.style.opacity='0.6'" onmouseout="this.style.opacity='1'">${s.label}</a>`
        : `<button type="button" data-section="${s.id}" style="background:none;border:none;padding:0;margin:0;font:inherit;color:${c.navText};font-size:14px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:opacity 0.2s" onmouseover="this.style.opacity='0.6'" onmouseout="this.style.opacity='1'" onclick="var el=document.getElementById('${s.id}');if(el)el.scrollIntoView({behavior:'smooth'});">${s.label}</button>`
    )
    .join("\n          ");

  // Banner — one-click "we've moved the date" / cancel notice above hero.
  // Rendered independently of section toggles so it's always visible when enabled.
  const bannerHtml =
    opts.bannerEnabled && opts.bannerMessage.trim()
      ? `
    <div role="alert" style="background:${c.accent};color:${c.accentText};padding:14px 24px;text-align:center;font-family:'Inter',sans-serif;font-size:15px;letter-spacing:0.3px;line-height:1.5;position:relative;z-index:101">${escape(opts.bannerMessage)}</div>`
      : "";

  const hasHeroImage = Boolean(opts.heroImageUrl && opts.heroImageUrl.trim());
  // When a hero photo is set, force white text + dark overlay regardless
  // of template (light hero + dark photo wouldn't contrast). When no photo,
  // use the template's solid heroBg + template heroText.
  const heroBgStyle = hasHeroImage
    ? `background:linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)),url('${escape(
        opts.heroImageUrl!
      )}') center/cover no-repeat`
    : `background:${c.heroBg}`;
  const heroTextColor = hasHeroImage ? "#FFFFFF" : c.heroText;
  const heroMutedColor = hasHeroImage ? "rgba(255,255,255,0.82)" : c.heroTextMuted;

  // Countdown widget — rendered as a live element updated by an inline
  // script (allow-scripts enabled in preview + public). Hidden when no
  // wedding_date set or the date has already passed.
  const countdownBlock = opts.wedding.wedding_date
    ? `
        <div id="ah-countdown" data-wedding-date="${escape(opts.wedding.wedding_date)}" style="display:inline-block;margin-top:20px;padding:8px 20px;border:1px solid ${hasHeroImage ? "rgba(255,255,255,0.6)" : c.accent};border-radius:999px;font-family:'Inter',sans-serif;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:${heroTextColor}"></div>`
    : "";

  const heroSection = opts.sections.home
    ? `
    <section id="home" style="position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;${heroBgStyle};color:${heroTextColor};text-align:center;padding:120px 24px 80px">
      <div style="position:relative;z-index:1;max-width:700px">
        <p style="font-family:'Inter',sans-serif;font-size:14px;letter-spacing:3px;text-transform:uppercase;color:${heroMutedColor};margin-bottom:24px">Together with their families</p>
        <h1 style="font-family:'Playfair Display',serif;font-size:clamp(40px,8vw,72px);font-weight:400;line-height:1.1;margin:0 0 24px">${escape(opts.headline)}</h1>
        <div style="width:60px;height:1px;background:${hasHeroImage ? "rgba(255,255,255,0.7)" : c.accent};margin:0 auto 24px"></div>
        <p style="font-family:'Inter',sans-serif;font-size:18px;color:${heroMutedColor};line-height:1.6">${escape(opts.subtitle)}</p>
        <p style="font-family:'Playfair Display',serif;font-size:22px;margin-top:32px;letter-spacing:1px">${formatWeddingDate(opts.wedding.wedding_date)}</p>
        ${countdownBlock}
      </div>
    </section>`
    : "";

  // Our Story: render structured sub-stories if any are filled; otherwise
  // fall back to the legacy single-textarea `ourStoryText`. A sub-story
  // counts as "present" if either its text OR its photo is set.
  const storyParts: { heading: string; text: string; photo?: string }[] = [];
  if (opts.storyHowWeMet?.trim() || opts.storyHowWeMetPhoto) {
    storyParts.push({
      heading: "How We Met",
      text: opts.storyHowWeMet?.trim() ?? "",
      photo: opts.storyHowWeMetPhoto ?? undefined,
    });
  }
  if (opts.storyProposal?.trim() || opts.storyProposalPhoto) {
    storyParts.push({
      heading: "The Proposal",
      text: opts.storyProposal?.trim() ?? "",
      photo: opts.storyProposalPhoto ?? undefined,
    });
  }
  if (opts.storyFavoriteMemory?.trim() || opts.storyFavoriteMemoryPhoto) {
    storyParts.push({
      heading: "A Favorite Memory",
      text: opts.storyFavoriteMemory?.trim() ?? "",
      photo: opts.storyFavoriteMemoryPhoto ?? undefined,
    });
  }

  // Split text into paragraphs on double-newlines so long stories get
  // real typographic rhythm (real <p> spacing beats white-space:pre-line).
  // For single-break lines within a paragraph, preserve them as <br>.
  const paragraphize = (text: string, fontSize: string): string =>
    text
      .split(/\n\s*\n/)
      .map((para) => para.trim())
      .filter(Boolean)
      .map(
        (para) =>
          `<p style="font-family:'Inter',sans-serif;font-size:${fontSize};line-height:1.75;color:${c.text};margin-bottom:1.1em">${escape(para).replace(/\n/g, "<br>")}</p>`
      )
      .join("\n");

  // Threshold-based font scale for density relief: shrink 1px when content
  // is long overall. Not linear — keeps visual consistency across sites.
  const storyTotalChars = storyParts.reduce((n, s) => n + s.text.length, 0);
  const legacyChars = opts.ourStoryText.trim().length;
  const totalChars =
    storyParts.length > 0 ? storyTotalChars : legacyChars;
  const storyFontSize = totalChars > 600 ? "15px" : "16px";

  const storyContentHtml =
    storyParts.length > 0
      ? storyParts
          .map(
            (s, i) => `
        <div style="margin-bottom:${i === storyParts.length - 1 ? "0" : "56px"};text-align:center">
          <h3 style="font-family:'Playfair Display',serif;font-size:22px;font-weight:400;color:${c.heading};margin-bottom:20px;letter-spacing:0.5px">${escape(s.heading)}</h3>
          ${
            s.photo
              ? `<img src="${escape(s.photo)}" alt="${escape(s.heading)}" style="width:100%;max-width:620px;aspect-ratio:16/10;object-fit:cover;border-radius:6px;margin:0 auto 24px;display:block" loading="lazy" />`
              : ""
          }
          ${s.text ? `<div style="text-align:left">${paragraphize(s.text, storyFontSize)}</div>` : ""}
        </div>`
          )
          .join("\n")
      : opts.ourStoryText.trim()
        ? `<div style="text-align:left">${paragraphize(opts.ourStoryText, storyFontSize)}</div>`
        : "";

  const ourStorySection =
    opts.sections.ourStory && storyContentHtml
      ? `
    <section id="our-story" style="padding:80px 24px;background:${c.sectionAlt}">
      <div style="max-width:720px;margin:0 auto">
        <h2 style="font-family:'Playfair Display',serif;font-size:36px;font-weight:400;color:${c.heading};margin-bottom:32px;text-align:center">Our Story</h2>
        <div style="width:40px;height:1px;background:${c.accent};margin:0 auto 48px"></div>
        ${storyContentHtml}
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
            <div style="min-width:120px;font-family:'Inter',sans-serif;font-size:14px;color:${c.accent};font-weight:600;padding-top:2px">${escape(si.time)}</div>
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
          <a href="${escape(u)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;background:${c.accent};color:${c.accentText};text-decoration:none;font-family:'Inter',sans-serif;font-size:14px;letter-spacing:1px;text-transform:uppercase;border-radius:4px;transition:opacity 0.2s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">${escape(safeHostname(u))}</a>`
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
    <footer style="padding:48px 24px;background:${c.footerBg};color:${c.footerText};text-align:center">
      <p style="font-family:'Playfair Display',serif;font-size:24px;margin-bottom:8px">${escape(opts.wedding.partner1_name)} & ${escape(opts.wedding.partner2_name)}</p>
      <p style="font-family:'Inter',sans-serif;font-size:14px;color:${c.footerTextMuted}">${formatWeddingDate(opts.wedding.wedding_date)}</p>
    </footer>
    <script>
      (function(){
        var el = document.getElementById('ah-countdown');
        if (!el) return;
        function tick() {
          var d = el.getAttribute('data-wedding-date');
          if (!d) return;
          var target = new Date(d + 'T00:00:00').getTime();
          var now = Date.now();
          var diffDays = Math.ceil((target - now) / 86400000);
          var label;
          if (diffDays > 1) label = diffDays + ' days to go';
          else if (diffDays === 1) label = 'Tomorrow!';
          else if (diffDays === 0) label = "Today's the day";
          else label = 'Just married';
          el.textContent = label;
        }
        tick();
        setInterval(tick, 60000);
      })();
    </script>`;

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
  ${bannerHtml}
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
