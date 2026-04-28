"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Palette,
  Building,
  Flower2,
  UtensilsCrossed,
  Mail,
  Shirt,
  Cake,
  Lamp,
  Camera,
  Sparkles,
  Scissors,
  Heart,
  Coffee,
  Trash2,
  ExternalLink,
  ImagePlus,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface MoodboardImage {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

interface MoodboardSection {
  id: string;
  section_key: string;
  notes: string | null;
  moodboard_images: MoodboardImage[];
}

interface MoodboardManagerProps {
  sections: MoodboardSection[];
  weddingId: string;
  partner1Name: string;
  partner2Name: string;
  weddingDate: string | null;
  venueName: string | null;
  weddingStyle: string | null;
  hasTeaCeremony: boolean;
}

// Fix 10: Reordered to match vendor meeting sequence
// Fix 6: priority flag for "start here" vs "add later"
// Fix 7: guiding questions per section
// Fix 9: suggestedCount per section
const SECTIONS = [
  {
    key: "color_palette",
    title: "Color Palette",
    icon: Palette,
    shareWith: "Florist, Coordinator, Photographer",
    scope: "hero color, 2-3 complementary shades",
    tip: "Start with one color you love, then pick 2-3 complementary shades.",
    question: "What's your hero color? Do you prefer warm or cool tones?",
    pinterestSearch: "wedding color palette inspiration",
    maxImages: 3,
    suggestedCount: "3",
    priority: true,
    notePlaceholder: "Notes on your palette — tones you love, colors to avoid, where each appears.",
  },
  {
    key: "venue_setting",
    title: "Venue",
    icon: Building,
    shareWith: "Coordinator, Florist, Photographer",
    scope: "the empty space from all angles and times of day",
    tip: "Photograph the space as it is — empty, all angles, all times of day. Bones, not decor.",
    question: "Indoor or outdoor? What's the light, the layout, the vibe of the empty space?",
    pinterestSearch: "wedding venue decor inspiration",
    maxImages: 5,
    suggestedCount: "3-5",
    priority: true,
    notePlaceholder: "Notes about your venue — what you love about the space, any constraints?",
  },
  {
    key: "tea_ceremony",
    title: "Tea Ceremony",
    icon: Coffee,
    shareWith: "Coordinator, Florist, Photographer, Rentals",
    scope: "tea set, qipao, 囍 decorations, kneeling cushions",
    tip: "Show parents reference photos to align — red lacquer or modern porcelain, traditional or minimal staging.",
    question: "Tea set style, kneeling cushions, qipao/kua, 囍 backdrop, ancestor altar, gift display?",
    pinterestSearch: "Chinese tea ceremony 茶礼 wedding inspiration",
    maxImages: 6,
    suggestedCount: "4-6",
    priority: false,
    teaCeremonyOnly: true,
    notePlaceholder: "Notes for your coordinator & florist — tea set, layout, parents' seating, kneeling cushions, gift display.",
  },
  {
    key: "florals",
    title: "Personal Flowers",
    icon: Flower2,
    shareWith: "Florist",
    scope: "bouquets, boutonnieres, parents' flowers, flower girl petals",
    tip: "Bouquets, boutonnieres, corsages — what you and your party carry. In-season flowers are 2-3x cheaper.",
    question: "Bouquet style, boutonnieres, corsages, flower girl petals — what personal flowers do you carry?",
    pinterestSearch: "wedding bouquet boutonniere corsage inspiration",
    maxImages: 6,
    suggestedCount: "4-6",
    priority: true,
    notePlaceholder: "Notes for your florist — bouquet shape, must-have stems, anything to avoid?",
  },
  {
    key: "ceremony_setup",
    title: "Ceremony Setup",
    icon: Heart,
    shareWith: "Florist, Coordinator, Officiant, Rentals",
    scope: "arch, aisle decor, ceremony chairs, welcome board, sign-in table",
    tip: "Most photographed 30 minutes of the day — and the biggest single floral spend. Lock the visual early.",
    question: "Arch, chuppah, mandap, arbor? Aisle treatment, processional layout, what's behind you in every photo?",
    pinterestSearch: "wedding ceremony arch altar aisle inspiration",
    maxImages: 5,
    suggestedCount: "3-5",
    priority: true,
    notePlaceholder: "Notes for florist & coordinator — arch style, aisle decor, processional layout, ritual props.",
  },
  {
    key: "photo_style",
    title: "Photo Style",
    icon: Camera,
    shareWith: "Photographer, Videographer",
    scope: "wedding photo style you love",
    tip: "Include reference photos showing the editing style you love.",
    question: "Light & airy, moody & cinematic, or documentary?",
    pinterestSearch: "wedding photography style light airy moody",
    maxImages: 10,
    suggestedCount: "10-15",
    priority: false,
    notePlaceholder: "Notes for your photographer — editing style, must-have shots, lighting preference?",
  },
  {
    key: "attire",
    title: "Attire",
    icon: Shirt,
    shareWith: "Stylist, Tailor",
    scope: "silhouette, fabric, accessories, second look",
    tip: "Bring photos to fittings — silhouette, neckline, fabric drape are easier shown than described. Include shoes, jewelry, headpiece if they shape the look.",
    question: "What silhouette? Any cultural pieces (qipao, kua, sherwani, second look)?",
    pinterestSearch: "wedding outfit accessories inspiration",
    maxImages: 5,
    suggestedCount: "3-5",
    priority: false,
    notePlaceholder: "Notes on attire — silhouette, neckline, accessories, cultural pieces, second-look ideas.",
  },
  {
    key: "hair_makeup",
    title: "Hair & Makeup",
    icon: Scissors,
    shareWith: "Hair & Makeup Artist",
    scope: "complete bridal looks",
    tip: "\"Natural\" means 5 different things. Show specific looks — hair texture, eye/lip intensity, skin finish.",
    question: "Updo or down? Bold or soft? Any specific skin-tone or eye-shape references?",
    pinterestSearch: "wedding hair makeup bridal beauty",
    maxImages: 6,
    suggestedCount: "4-6",
    priority: false,
    notePlaceholder: "Notes for your HMUA — products that work for your skin, allergies, second-look hair.",
  },
  {
    key: "tablescape",
    title: "Tablescape",
    icon: UtensilsCrossed,
    shareWith: "Caterer, Rentals, Florist, Coordinator",
    scope: "place settings, linens, centerpieces, table numbers",
    tip: "Guests stare at this for 2+ hours. Include place setting details.",
    question: "Round or long tables? What vibe — minimal or layered?",
    pinterestSearch: "wedding table setting centerpiece",
    maxImages: 5,
    suggestedCount: "3-5",
    priority: false,
    notePlaceholder: "Notes for your caterer & rental company — table shapes, linens, place settings?",
  },
  {
    key: "cake_desserts",
    title: "Cake",
    icon: Cake,
    shareWith: "Baker, Florist",
    scope: "cake design, tiers, dessert table",
    tip: "Show your baker 3-5 reference cakes. Note what you like about each.",
    question: "Fondant or buttercream? How many tiers? Any flavors in mind?",
    pinterestSearch: "wedding cake design ideas",
    maxImages: 5,
    suggestedCount: "3-5",
    priority: false,
    notePlaceholder: "Notes for your baker — flavors, decorating style, dietary needs?",
  },
  {
    key: "stationery",
    title: "Stationery",
    icon: Mail,
    shareWith: "Coordinator, Florist",
    scope: "invitations, menus, table numbers, programs",
    tip: "Your stationery sets the tone before guests arrive.",
    question: "Modern & clean or vintage & textured? Handwritten or printed?",
    pinterestSearch: "wedding invitation suite design",
    maxImages: 5,
    suggestedCount: "3-5",
    priority: false,
    notePlaceholder: "Notes on style — paper weight, calligraphy, modern vs. vintage, where you'll order.",
  },
  {
    key: "lighting",
    title: "Lighting",
    icon: Lamp,
    shareWith: "DJ, Coordinator, Venue",
    scope: "string lights, uplighting, candlelight",
    tip: "Lighting transforms a space, especially for evening receptions.",
    question: "String lights, candles, uplighting, or natural light?",
    pinterestSearch: "wedding lighting string lights ambiance",
    maxImages: 5,
    suggestedCount: "3-5",
    priority: false,
    notePlaceholder: "Notes for your venue & coordinator — lighting vibe, candle preferences, restrictions?",
  },
  {
    key: "reception_setup",
    title: "Reception Setup",
    icon: Sparkles,
    shareWith: "Florist, Coordinator, Rentals",
    scope: "sweetheart table, escort card display, cake table, bar",
    tip: "The styled focal points beyond guest tables — what guests photograph and remember.",
    question: "Welcome board, sweetheart table, escort card display, cake table, photo backdrop, sign-in table?",
    pinterestSearch: "wedding reception welcome board sweetheart table backdrop",
    maxImages: 6,
    suggestedCount: "4-6",
    priority: false,
    notePlaceholder: "Notes for florist & coordinator — which focal points matter most, any signage details, layout constraints?",
  },
];

// 3 conceptual groups, each collapsible (tier-1). Sections inside are
// independently collapsible (tier-2). Tea Ceremony lives under "The Day"
// but is conditionally hidden via teaCeremonyOnly on the section.
//
// Single-axis categorization is fundamentally lossy for weddings (florals
// appear in cake, tablescape, ceremony, etc.) — we accept that and use
// per-section shareWith as the multi-vendor tag, treating these groups
// purely as a navigation aid.
const GROUPS = [
  {
    key: "vibe",
    label: "The Vibe",
    sections: ["color_palette", "photo_style"],
  },
  {
    key: "day",
    label: "The Day",
    sections: [
      "venue_setting",
      "ceremony_setup",
      "reception_setup",
      "tablescape",
      "lighting",
      "tea_ceremony",
      "cake_desserts",
      "stationery",
    ],
  },
  {
    key: "newlyweds",
    label: "The Newlyweds",
    sections: ["attire", "hair_makeup", "florals"],
  },
] as const;

type GroupKey = typeof GROUPS[number]["key"];

export function MoodboardManager({
  sections: initialSections,
  weddingId,
  partner1Name,
  partner2Name,
  weddingDate,
  venueName,
  weddingStyle,
  hasTeaCeremony,
}: MoodboardManagerProps) {
  // Hide tea-ceremony-only sections for couples who haven't opted into it.
  const visibleSections = SECTIONS.filter(
    (s) => !("teaCeremonyOnly" in s && s.teaCeremonyOnly) || hasTeaCeremony
  );
  const visibleSectionKeys = new Set(visibleSections.map((s) => s.key));

  // Each group's sections list is filtered against visibleSections so a
  // non-Chinese wedding sees a 7-section "The Day" group instead of 8.
  const groupsWithSections = GROUPS.map((g) => ({
    ...g,
    sectionDefs: g.sections
      .filter((key) => visibleSectionKeys.has(key))
      .map((key) => visibleSections.find((s) => s.key === key)!)
      .filter(Boolean),
  }));

  // Groups always expanded by default — auto-collapsing empty groups
  // creates discovery blind spots ("where did Tablescape go?"). The
  // per-section logic already keeps the page short by collapsing
  // image-less sections to their header. Group collapse is reserved for
  // manual focus ("I'm done with The Vibe, collapse it to focus on The
  // Day").
  const [collapsedGroups, setCollapsedGroups] = useState<Set<GroupKey>>(
    new Set()
  );
  function toggleGroup(key: GroupKey) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  const router = useRouter();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [showUrlInput, setShowUrlInput] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);

  // All sections start collapsed — the per-section image count badge
  // (rendered in the header) tells users where their work lives, so
  // they expand only what they want to see/edit. Cleaner overview vs
  // auto-expanding everything-with-images.
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Vibe words — stored in localStorage
  const [vibeWords, setVibeWords] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(`ahha-vibe-${weddingId}`) || "";
  });

  function saveVibeWords() {
    localStorage.setItem(`ahha-vibe-${weddingId}`, vibeWords);
  }

  // Section notes — local state with debounced autosave.
  // Flow: onChange → schedule save in 800ms → saving indicator →
  // upsert → "Saved ✓" fades after 2s. onBlur saves immediately as a failsafe.
  const [localNotes, setLocalNotes] = useState<Record<string, string>>(() => {
    const notes: Record<string, string> = {};
    initialSections.forEach((s) => { notes[s.section_key] = s.notes || ""; });
    return notes;
  });
  const savedNotesRef = useRef<Record<string, string>>(
    Object.fromEntries(initialSections.map((s) => [s.section_key, s.notes || ""]))
  );
  type NoteStatus = "idle" | "saving" | "saved";
  const [noteStatus, setNoteStatus] = useState<Record<string, NoteStatus>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const savedTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function saveNotes(sectionKey: string) {
    const notes = localNotes[sectionKey] || "";
    if (notes === (savedNotesRef.current[sectionKey] || "")) return;
    setNoteStatus((s) => ({ ...s, [sectionKey]: "saving" }));
    const supabase = createClient();
    const { error } = await supabase
      .from("moodboard_sections")
      .upsert(
        { wedding_id: weddingId, section_key: sectionKey, notes: notes || null },
        { onConflict: "wedding_id,section_key" }
      );
    if (error) {
      toast.error("Could not save notes", { description: error.message });
      setNoteStatus((s) => ({ ...s, [sectionKey]: "idle" }));
      return;
    }
    savedNotesRef.current[sectionKey] = notes;
    setNoteStatus((s) => ({ ...s, [sectionKey]: "saved" }));
    // Fade back to idle so the badge doesn't linger.
    if (savedTimers.current[sectionKey]) {
      clearTimeout(savedTimers.current[sectionKey]);
    }
    savedTimers.current[sectionKey] = setTimeout(() => {
      setNoteStatus((s) => ({ ...s, [sectionKey]: "idle" }));
    }, 2000);
  }

  function handleNotesChange(sectionKey: string, value: string) {
    setLocalNotes((prev) => ({ ...prev, [sectionKey]: value }));
    if (debounceTimers.current[sectionKey]) {
      clearTimeout(debounceTimers.current[sectionKey]);
    }
    debounceTimers.current[sectionKey] = setTimeout(() => {
      saveNotes(sectionKey);
    }, 800);
  }

  const sectionMap = new Map<string, MoodboardSection>();
  initialSections.forEach((s) => sectionMap.set(s.section_key, s));

  async function getOrCreateSection(sectionKey: string): Promise<string> {
    const existing = sectionMap.get(sectionKey);
    if (existing) return existing.id;

    const supabase = createClient();
    const { data } = await supabase
      .from("moodboard_sections")
      .upsert(
        { wedding_id: weddingId, section_key: sectionKey, notes: null },
        { onConflict: "wedding_id,section_key" }
      )
      .select("id")
      .single();

    return data?.id || "";
  }

  const [urlError, setUrlError] = useState("");

  async function addImageByUrl(sectionKey: string) {
    const url = imageUrl.trim();
    if (!url) return;

    // Only accept Pinterest links
    if (!url.includes("pinterest.com/pin/")) {
      setUrlError("Please paste a Pinterest pin link (e.g., pinterest.com/pin/...)");
      return;
    }

    setUrlError("");
    setImageUrl("Extracting image...");
    let finalImageUrl = url;

    try {
      const res = await fetch(
        `https://hemkofupyhjmpdgbfpqy.supabase.co/functions/v1/pinterest-image`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        }
      );
      const data = await res.json();
      if (data.imageUrl) {
        finalImageUrl = data.imageUrl;
      } else {
        setUrlError("Couldn't extract image. Try a different pin.");
        setImageUrl("");
        return;
      }
    } catch {
      setUrlError("Failed to fetch image. Try again.");
      setImageUrl("");
      return;
    }

    setUrlError("");
    const sectionId = await getOrCreateSection(sectionKey);
    if (!sectionId) return;

    const supabase = createClient();
    const section = sectionMap.get(sectionKey);
    await supabase.from("moodboard_images").insert({
      section_id: sectionId,
      image_url: finalImageUrl,
      sort_order: section?.moodboard_images?.length || 0,
    });
    setImageUrl("");
    setShowUrlInput(null);
    router.refresh();
  }

  async function uploadImage(sectionKey: string, file: File) {
    setUploading(sectionKey);
    const supabase = createClient();
    const filePath = `${weddingId}/${sectionKey}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("moodboard")
      .upload(filePath, file);
    if (uploadError) {
      setUploading(null);
      return;
    }
    const { data: { publicUrl } } = supabase.storage
      .from("moodboard")
      .getPublicUrl(filePath);

    const sectionId = await getOrCreateSection(sectionKey);
    if (!sectionId) { setUploading(null); return; }

    const section = sectionMap.get(sectionKey);
    await supabase.from("moodboard_images").insert({
      section_id: sectionId,
      image_url: publicUrl,
      sort_order: section?.moodboard_images?.length || 0,
    });
    setUploading(null);
    router.refresh();
  }

  async function deleteImage(imageId: string) {
    const supabase = createClient();
    await supabase.from("moodboard_images").delete().eq("id", imageId);
    router.refresh();
  }

  // Fix 5: Save image caption
  async function saveCaption(imageId: string, caption: string) {
    const supabase = createClient();
    await supabase
      .from("moodboard_images")
      .update({ caption: caption || null })
      .eq("id", imageId);
  }

  const totalImages = initialSections.reduce(
    (sum, s) => sum + (s.moodboard_images?.length || 0),
    0
  );

  function handleExport() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const dateFormatted = weddingDate
      ? new Date(weddingDate + "T00:00:00").toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";

    // Build section pages — one per section with images
    const sectionPages = visibleSections.map((def) => {
      const section = sectionMap.get(def.key);
      const images = section?.moodboard_images || [];
      if (images.length === 0) return "";
      const sectionNotes = localNotes[def.key] || "";

      // Layout: if 1 image → full width. If 2 → side by side. If 3+ → masonry grid.
      let imagesHtml = "";

      if (images.length === 1) {
        imagesHtml = `<img src="${images[0].image_url}" style="width:100%;border-radius:16px;object-fit:contain;max-height:500px;" />`;
      } else if (images.length === 2) {
        imagesHtml = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          ${images.map((img) => `<img src="${img.image_url}" style="width:100%;border-radius:12px;object-fit:contain;max-height:400px;" />`).join("")}
        </div>`;
      } else {
        // First image large, rest in grid
        const heroImg = images[0];
        const gridImgs = images.slice(1);
        imagesHtml = `
          <img src="${heroImg.image_url}" style="width:100%;border-radius:16px;object-fit:contain;max-height:450px;margin-bottom:12px;" />
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;">
            ${gridImgs.map((img) => `<img src="${img.image_url}" style="width:100%;border-radius:12px;object-fit:contain;max-height:250px;" />`).join("")}
          </div>
        `;
      }

      return `
        <div style="page-break-before:always;padding:40px 0;">
          <div style="margin-bottom:24px;">
            <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;margin:0 0 6px 0;color:#1a1a1a;">${def.title}</h2>
            <p style="font-size:12px;color:#999;margin:0;letter-spacing:0.5px;">Share with: ${def.shareWith}</p>
            ${sectionNotes ? `<p style="font-size:13px;color:#666;margin:8px 0 0 0;font-style:italic;border-left:3px solid #e8c4c0;padding-left:12px;">${sectionNotes}</p>` : ""}
          </div>
          ${imagesHtml}
        </div>
      `;
    })
      .filter(Boolean)
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${partner1Name} & ${partner2Name} — Wedding Moodboard</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; color: #333; max-width: 850px; margin: 0 auto; padding: 0 40px; }
          img { display: block; }

          /* Cover page */
          .cover {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            page-break-after: always;
          }
          .cover-names {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 48px;
            font-weight: 700;
            color: #1a1a1a;
            letter-spacing: -0.5px;
          }
          .cover-ampersand {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 32px;
            font-weight: 400;
            font-style: italic;
            color: #c4756e;
            margin: 4px 0;
          }
          .cover-details {
            margin-top: 24px;
            font-size: 14px;
            color: #888;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .cover-subtitle {
            margin-top: 48px;
            font-size: 11px;
            color: #bbb;
            letter-spacing: 3px;
            text-transform: uppercase;
          }
          .cover-line {
            width: 60px;
            height: 1px;
            background: #ddd;
            margin: 20px auto;
          }

          @media print {
            body { padding: 0 20px; }
            .cover { height: auto; min-height: 100vh; }
          }
        </style>
      </head>
      <body>
        <!-- Cover Page -->
        <div class="cover">
          <div class="cover-subtitle">Wedding Moodboard</div>
          <div class="cover-line"></div>
          <div class="cover-names">${partner1Name}</div>
          <div class="cover-ampersand">&</div>
          <div class="cover-names">${partner2Name}</div>
          <div class="cover-details">
            ${dateFormatted}${venueName ? ` · ${venueName}` : ""}
          </div>
          ${vibeWords ? `<p style="margin-top:32px;font-size:16px;font-style:italic;color:#c4756e;font-family:'Playfair Display',Georgia,serif;letter-spacing:0.5px;">${vibeWords}</p>` : ""}
        </div>

        <!-- Section Pages -->
        ${sectionPages || "<p style='color:#999;text-align:center;padding:100px 0;'>No inspiration images collected yet.</p>"}

        <!-- Footer -->
        <div style="page-break-before:always;height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
          <p style="font-family:'Playfair Display',Georgia,serif;font-size:24px;color:#c4756e;font-style:italic;">Made with love</p>
          <p style="font-size:11px;color:#ccc;margin-top:12px;letter-spacing:2px;text-transform:uppercase;">Created with Ah-Ha! Wedding Planner</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 800);
  }

  // Helper to render a single section
  function renderSection(def: typeof SECTIONS[number]) {
    const Icon = def.icon;
    const section = sectionMap.get(def.key);
    const images = section?.moodboard_images || [];
    const isUploading = uploading === def.key;
    const showUrl = showUrlInput === def.key;
    const isExpanded = expandedSections.has(def.key);
    const hasImages = images.length > 0;

    return (
      <div key={def.key}>
        {/* Section header — clickable to expand/collapse.
            Title row holds title + Browse ideas; Share with sits on its own
            line below. Image count "X of Y" was dropped — the grid speaks
            for itself, and the count framed an arbitrary cap as a goal. */}
        <button
          onClick={() => toggleSection(def.key)}
          className="w-full flex items-start gap-3 py-3 text-left group/header hover:bg-muted/20 rounded-lg px-2 -mx-2 transition-colors"
        >
          <ChevronRight className={cn("h-4 w-4 text-muted-foreground/60 transition-transform shrink-0 mt-0.5", isExpanded && "rotate-90")} />
          <Icon className="h-4 w-4 text-primary/70 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{def.title}</span>
              <span className="inline-flex items-center gap-2 shrink-0">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
                    images.length > 0
                      ? "text-primary/80"
                      : "text-muted-foreground/50"
                  )}
                >
                  <ImagePlus className="h-3 w-3" />
                  {images.length}
                </span>
                <a
                  href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(def.pinterestSearch)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Browse ideas →
                </a>
              </span>
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              Share with: {def.shareWith}
            </div>
          </div>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="pl-9 space-y-3 pb-4">
            {/* Scope as in-body guidance — replaces the previous tip field,
                which was redundant with the title and inconsistent in voice
                across sections. The "Including: …" line tells couples
                exactly what kinds of images go in the section. */}
            {"scope" in def && def.scope && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground/80">Including:</span>{" "}
                {def.scope as string}.
              </p>
            )}

            {/* Horizontal scroll gallery */}
            <div className="relative">
              <div className="flex gap-3 overflow-x-auto pb-3 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/15 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/25">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="shrink-0 relative group/img rounded-xl overflow-hidden"
                    style={{ height: 160 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.image_url}
                      alt="Inspiration"
                      className="h-full w-auto rounded-xl object-cover"
                      style={{ minWidth: 120, maxWidth: 280 }}
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector(".img-fallback")) {
                          const fallback = document.createElement("div");
                          fallback.className = "img-fallback h-full w-[120px] rounded-xl bg-muted flex items-center justify-center text-xs text-muted-foreground";
                          fallback.textContent = "Image unavailable";
                          parent.insertBefore(fallback, target);
                        }
                      }}
                    />
                    <button
                      onClick={() => deleteImage(img.id)}
                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {/* Add image cards */}
                {images.length < def.maxImages && (
                  <div className="shrink-0 flex gap-2">
                    <button
                      onClick={() => fileInputRefs.current[def.key]?.click()}
                      disabled={isUploading}
                      className="h-[160px] w-[120px] rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/30 hover:text-primary transition-all hover:bg-primary/[0.02]"
                    >
                      {isUploading ? (
                        <span className="text-xs">Uploading...</span>
                      ) : (
                        <>
                          <ImagePlus className="h-5 w-5" />
                          <span className="text-[10px] font-medium">Upload</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowUrlInput(showUrl ? null : def.key)}
                      className="h-[160px] w-[120px] rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-red-200 hover:text-red-400 transition-all hover:bg-red-50/50"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
                      </svg>
                      <span className="text-[10px] font-medium">Paste Pin</span>
                    </button>
                  </div>
                )}
                {images.length >= def.maxImages && (
                  <div className="shrink-0 h-[160px] w-[120px] rounded-xl bg-muted/30 flex items-center justify-center text-xs text-muted-foreground text-center px-2">
                    Max {def.maxImages}
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={(el) => { fileInputRefs.current[def.key] = el; }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); e.target.value = ""; return; }
                      uploadImage(def.key, file);
                    }
                    e.target.value = "";
                  }}
                />
              </div>

              {/* URL input */}
              {showUrl && (
                <div className="mt-2 animate-fade-in-up space-y-1">
                  <div className="flex gap-2">
                    <Input placeholder="Paste Pinterest link..." className="text-sm h-9" value={imageUrl}
                      onChange={(e) => { setImageUrl(e.target.value); setUrlError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") addImageByUrl(def.key); }}
                      autoFocus
                    />
                    <Button size="sm" className="h-9 shrink-0" onClick={() => addImageByUrl(def.key)} disabled={!imageUrl.trim()}>Add</Button>
                  </div>
                  {urlError && <p className="text-xs text-destructive">{urlError}</p>}
                </div>
              )}
            </div>

            {/* Vendor notes — single persistent Textarea so focus stays when
                the first character flips the field from empty to non-empty. */}
            <div className="space-y-1">
              <Textarea
                value={localNotes[def.key] || ""}
                onChange={(e) => handleNotesChange(def.key, e.target.value)}
                onBlur={() => saveNotes(def.key)}
                placeholder={def.notePlaceholder}
                className="text-sm min-h-[50px] resize-none"
                rows={2}
              />
              <div className="h-4 text-[11px] leading-4">
                {noteStatus[def.key] === "saving" && (
                  <span className="text-muted-foreground">Saving…</span>
                )}
                {noteStatus[def.key] === "saved" && (
                  <span className="text-emerald-600 animate-fade-in-up">Saved ✓</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Fix 1: Editorial header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
            Moodboard
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            <span className="font-medium text-foreground/80">{totalImages}</span> image{totalImages !== 1 ? "s" : ""}
            {(() => {
              const usedSections = visibleSections.filter(
                (s) => (sectionMap.get(s.key)?.moodboard_images?.length || 0) > 0
              ).length;
              if (usedSections === 0) return null;
              return (
                <>
                  <span className="text-muted-foreground/50"> · </span>
                  <span className="font-medium text-foreground/80 tabular-nums">
                    {usedSections === visibleSections.length ? visibleSections.length : `${usedSections}/${visibleSections.length}`}
                  </span> sections
                </>
              );
            })()}
          </p>
        </div>
        {totalImages > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs shrink-0">
            <ExternalLink className="h-3 w-3" />
            Export / Print
          </Button>
        )}
      </div>

      {/* Brief explanation */}
      <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
        How it looks, in pictures. Share with vendors so they design toward the same vision.
      </p>

      {/* Fix 3: Wedding Vibe — hero element */}
      <div>
        <h2 className="text-lg font-[family-name:var(--font-heading)] mb-1">
          What does your wedding feel like?
        </h2>
        <p className="text-xs text-muted-foreground mb-2">
          3-5 words that guide every vendor&apos;s design decisions
        </p>
        <Input
          value={vibeWords}
          onChange={(e) => setVibeWords(e.target.value)}
          onBlur={saveVibeWords}
          placeholder="e.g., romantic, garden, timeless, golden hour, intimate"
          className="text-sm max-w-lg"
        />
      </div>

      {/* 2-tier accordion: group header (clickable) → sections inside (each
          independently collapsible). Single-axis categorization is lossy
          for weddings, so groups are nav aid; the multi-vendor shareWith
          on each section captures cross-cutting relationships. */}
      <div className="space-y-6">
        {groupsWithSections.map((group) => {
          const isCollapsed = collapsedGroups.has(group.key);
          const sectionsWithImages = group.sectionDefs.filter(
            (def) => (sectionMap.get(def.key)?.moodboard_images?.length || 0) > 0
          ).length;
          return (
            <div key={group.key} className="space-y-1">
              {/* Group header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center gap-2 py-2 group/grouphdr"
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground/70 transition-transform shrink-0",
                    !isCollapsed && "rotate-90"
                  )}
                />
                <h2 className="text-base font-[family-name:var(--font-heading)] tracking-tight text-foreground">
                  {group.label}
                </h2>
                <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                  {sectionsWithImages > 0
                    ? `${sectionsWithImages}/${group.sectionDefs.length}`
                    : group.sectionDefs.length}
                </span>
                <div className="flex-1 h-px bg-border/40 ml-2" />
              </button>

              {/* Sections inside */}
              {!isCollapsed && (
                <div className="space-y-1 pl-1">
                  {group.sectionDefs.map((def) => renderSection(def))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
