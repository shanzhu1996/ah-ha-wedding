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
  Trash2,
  ExternalLink,
  Upload,
  Link,
  Lightbulb,
  Plus,
  ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

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
}

const SECTIONS = [
  {
    key: "color_palette",
    title: "Color Palette",
    icon: Palette,
    shareWith: "Florist, Stationer, Planner",
    tip: "Start with one color you love, then pick 2-3 complementary shades.",
    canvaSearch: "wedding color palette template",
    pinterestSearch: "wedding color palette inspiration",
    maxImages: 3,
  },
  {
    key: "venue_setting",
    title: "Venue & Setting",
    icon: Building,
    shareWith: "Planner, Coordinator",
    tip: "Photograph your actual venue from different angles and times of day.",
    canvaSearch: "wedding venue moodboard",
    pinterestSearch: "wedding venue decor inspiration",
    maxImages: 5,
  },
  {
    key: "florals",
    title: "Florals & Greenery",
    icon: Flower2,
    shareWith: "Florist",
    tip: "In-season flowers are 2-3x cheaper. Ask your florist what's available.",
    canvaSearch: "wedding floral moodboard",
    pinterestSearch: "wedding bouquet centerpiece inspiration",
    maxImages: 8,
  },
  {
    key: "tablescape",
    title: "Tablescape",
    icon: UtensilsCrossed,
    shareWith: "Caterer, Rentals, Coordinator",
    tip: "Guests stare at this for 2+ hours. Include place setting details.",
    canvaSearch: "wedding tablescape design",
    pinterestSearch: "wedding table setting centerpiece",
    maxImages: 5,
  },
  {
    key: "stationery",
    title: "Stationery & Paper",
    icon: Mail,
    shareWith: "Stationer, Designer",
    tip: "Your stationery sets the tone before guests arrive.",
    canvaSearch: "wedding stationery suite design",
    pinterestSearch: "wedding invitation suite design",
    maxImages: 5,
  },
  {
    key: "attire",
    title: "Attire & Accessories",
    icon: Shirt,
    shareWith: "Stylist, Hair & Makeup",
    tip: "Include hair and accessories — think about how it all looks together.",
    canvaSearch: "wedding attire moodboard",
    pinterestSearch: "wedding outfit accessories inspiration",
    maxImages: 5,
  },
  {
    key: "cake_desserts",
    title: "Cake & Desserts",
    icon: Cake,
    shareWith: "Baker",
    tip: "Show your baker 3-5 reference cakes. Note what you like about each.",
    canvaSearch: "wedding cake design inspiration",
    pinterestSearch: "wedding cake design ideas",
    maxImages: 5,
  },
  {
    key: "lighting",
    title: "Lighting & Ambiance",
    icon: Lamp,
    shareWith: "DJ, Coordinator, Venue",
    tip: "Lighting transforms a space, especially for evening receptions.",
    canvaSearch: "wedding lighting moodboard",
    pinterestSearch: "wedding lighting string lights ambiance",
    maxImages: 5,
  },
  {
    key: "photo_style",
    title: "Photography Style",
    icon: Camera,
    shareWith: "Photographer",
    tip: "Include 10-15 reference photos showing the editing style you love.",
    canvaSearch: "wedding photography style moodboard",
    pinterestSearch: "wedding photography style light airy moody",
    maxImages: 10,
  },
  {
    key: "details",
    title: "Details & Personal Touches",
    icon: Sparkles,
    shareWith: "Planner, Coordinator",
    tip: "The little things people remember. Make it uniquely yours.",
    canvaSearch: "wedding details moodboard",
    pinterestSearch: "wedding details favors guest book ideas",
    maxImages: 5,
  },
];

export function MoodboardManager({
  sections: initialSections,
  weddingId,
  partner1Name,
  partner2Name,
  weddingDate,
  venueName,
  weddingStyle,
}: MoodboardManagerProps) {
  const router = useRouter();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [showUrlInput, setShowUrlInput] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [showNoteFor, setShowNoteFor] = useState<string | null>(null);

  // Vibe words — stored in localStorage
  const [vibeWords, setVibeWords] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(`ahha-vibe-${weddingId}`) || "";
  });

  function saveVibeWords() {
    localStorage.setItem(`ahha-vibe-${weddingId}`, vibeWords);
  }

  // Section notes — local state, saves to DB on blur
  const [localNotes, setLocalNotes] = useState<Record<string, string>>(() => {
    const notes: Record<string, string> = {};
    initialSections.forEach((s) => { notes[s.section_key] = s.notes || ""; });
    return notes;
  });

  async function saveNotes(sectionKey: string) {
    const notes = localNotes[sectionKey] || "";
    const supabase = createClient();
    await supabase
      .from("moodboard_sections")
      .upsert(
        { wedding_id: weddingId, section_key: sectionKey, notes: notes || null },
        { onConflict: "wedding_id,section_key" }
      );
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
    const sectionPages = SECTIONS.map((def) => {
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

  return (
    <div className="space-y-6">
      {/* Stats + Export — top right */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalImages} inspiration image{totalImages !== 1 ? "s" : ""} collected
        </p>
        {totalImages > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
            <ExternalLink className="h-3 w-3" />
            Export / Print
          </Button>
        )}
      </div>

      {/* Vibe Words */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Your Wedding Vibe</h3>
            <p className="text-xs text-muted-foreground">
              3-5 words that guide your vendors&apos; design decisions
            </p>
          </div>
        </div>
        <Input
          value={vibeWords}
          onChange={(e) => setVibeWords(e.target.value)}
          onBlur={saveVibeWords}
          placeholder="e.g., romantic, garden, timeless, golden hour, intimate"
          className="text-sm"
        />
      </div>

      {/* Section rows */}
      {SECTIONS.map((def) => {
        const Icon = def.icon;
        const section = sectionMap.get(def.key);
        const images = section?.moodboard_images || [];
        const isUploading = uploading === def.key;
        const showUrl = showUrlInput === def.key;

        return (
          <div key={def.key} className="space-y-2">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{def.title}</h3>
                    {images.length > 0 && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        {images.length}/{def.maxImages}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      Share with: {def.shareWith}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lightbulb className="h-2.5 w-2.5" />
                    {def.tip}
                  </p>
                </div>
              </div>
              <a
                href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(def.pinterestSearch)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors shrink-0"
              >
                Browse ideas →
              </a>
            </div>

            {/* Horizontal scroll gallery */}
            <div className="relative">
              <div className="flex gap-3 overflow-x-auto pb-3 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/15 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/25">

                {images.map((img) => (
                  <div
                    key={img.id}
                    className="shrink-0 relative group rounded-xl overflow-hidden"
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
                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
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
                      onClick={() =>
                        setShowUrlInput(showUrl ? null : def.key)
                      }
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
                    Max {def.maxImages} images
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={(el) => {
                    fileInputRefs.current[def.key] = el;
                  }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert("Image must be under 5MB");
                        e.target.value = "";
                        return;
                      }
                      uploadImage(def.key, file);
                    }
                    e.target.value = "";
                  }}
                />
              </div>

              {/* URL input (conditionally shown) */}
              {showUrl && (
                <div className="mt-2 animate-fade-in-up space-y-1">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste Pinterest link..."
                      className="text-sm h-9"
                      value={imageUrl}
                      onChange={(e) => { setImageUrl(e.target.value); setUrlError(""); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addImageByUrl(def.key);
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="h-9 shrink-0"
                      onClick={() => addImageByUrl(def.key)}
                      disabled={!imageUrl.trim()}
                    >
                      Add
                    </Button>
                  </div>
                  {urlError && (
                    <p className="text-xs text-destructive">{urlError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Notes toggle */}
            {showNoteFor === def.key ? (
              <div className="animate-fade-in-up space-y-1">
                <Textarea
                  value={localNotes[def.key] || ""}
                  onChange={(e) => setLocalNotes((prev) => ({ ...prev, [def.key]: e.target.value }))}
                  onBlur={() => saveNotes(def.key)}
                  placeholder="Notes for your vendor — e.g., 'I love the dusty rose tones, not the burgundy'"
                  className="text-sm min-h-[60px] resize-none"
                  rows={2}
                  autoFocus
                />
                <button
                  onClick={() => setShowNoteFor(null)}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNoteFor(def.key)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {localNotes[def.key] ? `📝 ${localNotes[def.key].slice(0, 60)}${localNotes[def.key].length > 60 ? "..." : ""}` : "+ Add note for vendor"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
