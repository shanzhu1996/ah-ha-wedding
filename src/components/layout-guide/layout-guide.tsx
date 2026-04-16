"use client";

import { useState, useRef } from "react";
import NextLink from "next/link";
import {
  DoorOpen,
  Rows3 as Rows,
  Wine,
  LayoutGrid,
  UtensilsCrossed,
  Heart,
  Wrench,
  ChevronDown,
  ExternalLink,
  Lightbulb,
  Share2,
  ImagePlus,
  Link as LinkIcon,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CheckableItem {
  name: string;
  searchTerms?: string;
}

interface SectionDef {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  shareWith: string[];
  tip: string;
  pinterestSearch?: string;
  moodboardLink?: { label: string; href: string };
  content: (
    checkedItems: Set<string>,
    handleToggle: (name: string, checked: boolean, searchTerms?: string) => void,
    ceremonyStyle?: string,
    onCeremonyStyleChange?: (style: string) => void,
    headTableStyle?: string,
    onHeadTableStyleChange?: (style: string) => void
  ) => React.ReactNode;
}

interface LayoutGuideProps {
  weddingId: string;
  existingShoppingItems: string[];
  partner1Name: string;
  partner2Name: string;
  weddingDate: string | null;
  venueName: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pinterestUrl(query: string) {
  return `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
}

function CheckItem({
  item,
  checked,
  onToggle,
}: {
  item: CheckableItem;
  checked: boolean;
  onToggle: (name: string, checked: boolean, searchTerms?: string) => void;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer select-none">
      <Checkbox
        checked={checked}
        onCheckedChange={() => onToggle(item.name, !checked, item.searchTerms)}
        className="mt-0.5"
      />
      <span className="text-sm leading-tight">{item.name}</span>
    </label>
  );
}

function StaticBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-muted-foreground">&#8226;</span>
      <span>{children}</span>
    </li>
  );
}

function CheckItemList({
  items,
  checkedItems,
  handleToggle,
}: {
  items: CheckableItem[];
  checkedItems: Set<string>;
  handleToggle: (name: string, checked: boolean, searchTerms?: string) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <CheckItem
          key={item.name}
          item={item}
          checked={checkedItems.has(item.name)}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section data                                                       */
/* ------------------------------------------------------------------ */

const WELCOME_ITEMS: CheckableItem[] = [
  { name: "Welcome sign on easel", searchTerms: "wedding welcome sign acrylic" },
  { name: "Guest book + pens", searchTerms: "wedding guest book" },
  { name: "Card box", searchTerms: "wedding card box lock" },
  { name: "Escort card display", searchTerms: "escort card display stand wedding" },
  { name: "Framed photos of the couple", searchTerms: "wedding photo frame display" },
  { name: "Memorial display for loved ones", searchTerms: "wedding memorial display frame" },
  { name: "Favors", searchTerms: "wedding favors bulk" },
  { name: "Programs", searchTerms: "wedding ceremony program" },
  { name: "Flowers or greenery arrangement", searchTerms: "wedding welcome table flowers" },
  { name: "Table cloth/runner", searchTerms: "wedding table runner" },
];

const COCKTAIL_ITEMS: CheckableItem[] = [
  { name: "Photo booth or camera station", searchTerms: "wedding photo booth" },
  { name: "Lawn games (outdoor)", searchTerms: "wedding lawn games outdoor" },
  { name: "Signature cocktail menu sign", searchTerms: "wedding bar menu sign acrylic" },
];

const RECEPTION_ITEMS: CheckableItem[] = [
  { name: "Sweetheart table or head table", searchTerms: "wedding sweetheart table decor" },
  { name: "Table numbers", searchTerms: "wedding table numbers" },
  { name: "Centerpieces", searchTerms: "wedding centerpiece" },
  { name: "Cake/dessert table", searchTerms: "wedding dessert table display" },
  { name: "Gift table", searchTerms: "wedding gift table sign" },
  { name: "Photo booth backdrop", searchTerms: "wedding photo booth backdrop" },
];

const TABLE_SETTING_ITEMS: CheckableItem[] = [
  { name: "Charger plates", searchTerms: "wedding charger plates" },
  { name: "Napkins (cloth)", searchTerms: "wedding cloth napkins" },
  { name: "Menu cards", searchTerms: "wedding menu card printed" },
  { name: "Place cards", searchTerms: "wedding place cards" },
  { name: "Table numbers", searchTerms: "wedding table number holder" },
];

const HEAD_TABLE_ITEMS: CheckableItem[] = [
  { name: "Special table decor/garland", searchTerms: "sweetheart table garland decor wedding" },
  { name: "Mr & Mrs sign or couple sign", searchTerms: "wedding sweetheart table sign" },
];

const VENDOR_ITEMS: CheckableItem[] = [
  { name: "Vendor meal table", searchTerms: "wedding vendor meal table" },
  { name: "Coat check rack/storage", searchTerms: "coat rack rental wedding" },
];

const SECTIONS: SectionDef[] = [
  {
    key: "welcome",
    title: "Welcome & Entry Table",
    subtitle: "The first thing guests see when they arrive — guest book, escort cards, and your welcome sign.",
    icon: DoorOpen,
    shareWith: ["Coordinator", "Venue"],
    tip: "Place the escort card display first — it's the one thing every guest needs to pick up.",
    pinterestSearch: "wedding welcome table setup ideas",
    content: (checkedItems, handleToggle) => (
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">How to set it up</h4>
          <ul className="space-y-1.5 text-sm">
            <StaticBullet>Place near the venue entrance so guests pass it on the way in</StaticBullet>
            <StaticBullet>Escort cards should be the first thing guests see — they need to pick up their table number</StaticBullet>
            <StaticBullet>Keep the card box visible but secure — assign someone to watch it</StaticBullet>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Items to add to your list</h4>
          <CheckItemList items={WELCOME_ITEMS} checkedItems={checkedItems} handleToggle={handleToggle} />
        </div>
      </div>
    ),
  },
  {
    key: "ceremony",
    title: "Ceremony Seating",
    subtitle: "How to arrange chairs for the ceremony — rows, semi-circle, or something creative.",
    icon: Rows,
    shareWith: ["Venue", "Coordinator", "Rentals"],
    tip: "For outdoor ceremonies, do a site visit at the same time of day as your ceremony to check the sun angle.",
    pinterestSearch: "wedding ceremony seating layout",
    content: (_checkedItems, _handleToggle, ceremonyStyle, onCeremonyStyleChange) => (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Choose your seating arrangement</h4>
          <p className="text-xs text-muted-foreground mb-3">Tell your venue and rental company which style you want.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { value: "rows", label: "Traditional rows", desc: "Classic, symmetrical, works for any guest count" },
              { value: "semicircle", label: "Semi-circle", desc: "More intimate, better sightlines from back rows" },
              { value: "circle", label: "Full circle", desc: "Everyone faces the couple, very personal" },
              { value: "spiral", label: "Spiral", desc: "Couple walks past every guest — dramatic entrance" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => onCeremonyStyleChange?.(opt.value)}
                className={`text-left p-3 rounded-lg border text-sm transition-all ${
                  ceremonyStyle === opt.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:border-primary/30 hover:bg-muted/30"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2">Key measurements</h4>
          <ul className="space-y-1.5 text-sm">
            <StaticBullet>Aisle width: minimum 5 feet (60&quot;) — wider for 2+ people</StaticBullet>
            <StaticBullet>Row spacing: 2 feet (24&quot;) between rows</StaticBullet>
            <StaticBullet>First row: 5-6 feet from the altar</StaticBullet>
            <StaticBullet>Reserve first 2-3 rows for immediate family</StaticBullet>
            <StaticBullet>Outdoor: face guests AWAY from the sun</StaticBullet>
          </ul>
        </div>
      </div>
    ),
  },
  {
    key: "cocktail",
    title: "Cocktail Hour",
    subtitle: "Where guests mingle while the venue flips from ceremony to reception — bar, apps, and entertainment.",
    icon: Wine,
    shareWith: ["Caterer", "Coordinator", "DJ"],
    tip: "Cocktail hour happens WHILE the venue flips from ceremony to reception. Make sure it's in a separate area so guests don't see the setup.",
    pinterestSearch: "wedding cocktail hour setup ideas",
    content: (checkedItems, handleToggle) => (
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">What to plan for</h4>
          <ul className="space-y-1.5 text-sm">
            <StaticBullet>Bar setup — place away from the entrance to draw guests in</StaticBullet>
            <StaticBullet>Appetizer stations or passed trays</StaticBullet>
            <StaticBullet>Background music — speaker or live musician</StaticBullet>
            <StaticBullet>High-top tables and/or lounge seating — <em className="text-muted-foreground">check if your venue provides these</em></StaticBullet>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Items to add to your list</h4>
          <CheckItemList items={COCKTAIL_ITEMS} checkedItems={checkedItems} handleToggle={handleToggle} />
        </div>
      </div>
    ),
  },
  {
    key: "reception",
    title: "Reception Floor Plan",
    subtitle: "Where to put tables, dance floor, bar, cake, gifts, and photo booth — and how guests move between them.",
    icon: LayoutGrid,
    shareWith: ["Venue", "Coordinator", "Rentals", "Caterer"],
    tip: "The #1 mistake is making the dance floor too small. Guests won't dance if it feels cramped. Bigger is always better.",
    pinterestSearch: "wedding reception floor plan layout",
    content: (checkedItems, handleToggle) => (
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Where to place everything</h4>
          <ul className="space-y-1.5 text-sm">
            <StaticBullet>Guest tables — rounds seat 8-10, need 12x12ft space each</StaticBullet>
            <StaticBullet>Dance floor — central, visible from all tables. Make it bigger than you think</StaticBullet>
            <StaticBullet>DJ/band — next to dance floor, near power outlets</StaticBullet>
            <StaticBullet>Bar — opposite side from entrance to draw guests in</StaticBullet>
            <StaticBullet>Buffet — if applicable, multiple lines reduce wait</StaticBullet>
            <StaticBullet>Leave clear paths between bar, dance floor, buffet, and restrooms</StaticBullet>
            <StaticBullet>Tables, chairs, linens, dance floor — <em className="text-muted-foreground">most venues provide these. Ask what&apos;s included</em></StaticBullet>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Items to add to your list</h4>
          <CheckItemList items={RECEPTION_ITEMS} checkedItems={checkedItems} handleToggle={handleToggle} />
        </div>
      </div>
    ),
  },
  {
    key: "table_setting",
    title: "Table Setting",
    subtitle: "How each guest's place looks — plates, forks, glasses, napkin, and menu card. Your caterer or rental company sets this up.",
    icon: UtensilsCrossed,
    shareWith: ["Caterer", "Rentals", "Coordinator"],
    tip: "If you're renting your own plates or chargers, ask the rental company for a sample place setting. Photograph exactly how you want it arranged and share the photo with whoever is setting up on the day.",
    pinterestSearch: "wedding table setting place setting",
    content: (checkedItems, handleToggle) => (
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Who handles what</h4>
          <ul className="space-y-1.5 text-sm">
            <StaticBullet><strong>Caterer / rental company</strong> — most caterers include basic plates, flatware, glassware, linens, and napkins in their package. They handle the setup too. Just tell them your style (formal vs casual) and napkin fold preference</StaticBullet>
            <StaticBullet><strong>Florist</strong> — centerpieces and any greenery on the table. Remind them: keep centerpieces under 14&quot; or over 28&quot; so guests can see each other</StaticBullet>
            <StaticBullet><strong>Coordinator / you</strong> — menu cards, place cards, table numbers, favors, and any personal touches</StaticBullet>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Extras to add to your list</h4>
          <CheckItemList items={TABLE_SETTING_ITEMS} checkedItems={checkedItems} handleToggle={handleToggle} />
        </div>
      </div>
    ),
  },
  {
    key: "head_table",
    title: "Head / Sweetheart Table",
    subtitle: "Where you sit during dinner — just the two of you, or with your wedding party? Three popular options.",
    icon: Heart,
    shareWith: ["Coordinator", "Florist", "Rentals"],
    tip: "If you choose sweetheart table, seat your wedding party at the closest tables so they're still nearby.",
    pinterestSearch: "wedding sweetheart table head table decor",
    content: (checkedItems, handleToggle, _cs, _csc, headTableStyle, onHeadTableStyleChange) => (
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Choose your style</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { value: "sweetheart", label: "Sweetheart Table", desc: "Just the two of you. Small table facing guests. Intimate and trending." },
              { value: "head_table", label: "Traditional Head Table", desc: "Long table. Couple in center, wedding party on both sides, all facing guests." },
              { value: "kings_table", label: "King's Table", desc: "Long table, couple in center, wedding party + dates on both sides. More social." },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => onHeadTableStyleChange?.(opt.value)}
                className={`text-left p-3 rounded-lg border text-sm transition-all ${
                  headTableStyle === opt.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:border-primary/30 hover:bg-muted/30"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Key details</h4>
          <ul className="space-y-1.5 text-sm">
            <StaticBullet>Position with clear sightline to the dance floor</StaticBullet>
            <StaticBullet>No tall centerpiece — don&apos;t block your faces in photos</StaticBullet>
            <StaticBullet>Good lighting — your photographer will thank you</StaticBullet>
            <StaticBullet>Special chairs or loveseat — <em className="text-muted-foreground">ask your rental company for options</em></StaticBullet>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Items to add to your list</h4>
          <CheckItemList items={HEAD_TABLE_ITEMS} checkedItems={checkedItems} handleToggle={handleToggle} />
        </div>
      </div>
    ),
  },
  {
    key: "vendor_stations",
    title: "Vendor Stations",
    subtitle: "Where your DJ, photographer, caterer, and coordinator set up — plan this with your venue.",
    icon: Wrench,
    shareWith: ["All Vendors", "Coordinator"],
    tip: "Walk the venue with your coordinator and mark each vendor's setup spot. Take photos and share with each vendor in their booklet.",
    content: (checkedItems, handleToggle) => (
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Where each vendor sets up</h4>
          <ul className="space-y-1.5 text-sm">
            <StaticBullet><strong>DJ/band</strong> — 10x10ft minimum, adjacent to dance floor, needs multiple power outlets and extension cords. Tape cords down away from walkways</StaticBullet>
            <StaticBullet><strong>Photographer</strong> — staging area for gear between shots. Doesn&apos;t need a dedicated table, just a corner</StaticBullet>
            <StaticBullet><strong>Coordinator</strong> — central location with the timeline, vendor contacts, and emergency kit</StaticBullet>
            <StaticBullet><strong>Caterer</strong> — back-of-house path for staff to move between kitchen and reception without crossing the dance floor</StaticBullet>
            <StaticBullet>Power outlets — know where they are. Outdoor venues may need generators</StaticBullet>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Items to add to your list</h4>
          <CheckItemList items={VENDOR_ITEMS} checkedItems={checkedItems} handleToggle={handleToggle} />
        </div>
      </div>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  All checkable items (for export)                                   */
/* ------------------------------------------------------------------ */

const ALL_SECTION_ITEMS: Record<string, CheckableItem[]> = {
  welcome: WELCOME_ITEMS,
  cocktail: COCKTAIL_ITEMS,
  reception: RECEPTION_ITEMS,
  table_setting: TABLE_SETTING_ITEMS,
  head_table: HEAD_TABLE_ITEMS,
  vendor_stations: VENDOR_ITEMS,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LayoutGuide({
  weddingId,
  existingShoppingItems,
  partner1Name,
  partner2Name,
  weddingDate,
  venueName,
}: LayoutGuideProps) {
  const router = useRouter();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [checkedItems, setCheckedItems] = useState<Set<string>>(
    () => new Set(existingShoppingItems)
  );

  // Section images — stored in localStorage
  const [sectionImages, setSectionImages] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(`ahha-layout-images-${weddingId}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  function saveSectionImages(updated: Record<string, string>) {
    setSectionImages(updated);
    localStorage.setItem(`ahha-layout-images-${weddingId}`, JSON.stringify(updated));
  }

  // Section notes — stored in localStorage
  const [sectionNotes, setSectionNotes] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(`ahha-layout-notes-${weddingId}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [showNoteFor, setShowNoteFor] = useState<string | null>(null);

  // Ceremony seating style selection
  const [ceremonyStyle, setCeremonyStyle] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(`ahha-ceremony-style-${weddingId}`) || "";
  });

  function handleCeremonyStyleChange(style: string) {
    setCeremonyStyle(style);
    localStorage.setItem(`ahha-ceremony-style-${weddingId}`, style);
  }

  const [headTableStyle, setHeadTableStyle] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(`ahha-head-table-style-${weddingId}`) || "";
  });

  function handleHeadTableStyleChange(style: string) {
    setHeadTableStyle(style);
    localStorage.setItem(`ahha-head-table-style-${weddingId}`, style);
  }

  function saveNotes(key: string, value: string) {
    const updated = { ...sectionNotes, [key]: value };
    setSectionNotes(updated);
    localStorage.setItem(`ahha-layout-notes-${weddingId}`, JSON.stringify(updated));
  }

  // Upload & Pinterest states
  const [uploading, setUploading] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleToggleItem(itemName: string, checked: boolean, searchTerms?: string) {
    const supabase = createClient();
    if (checked) {
      await supabase.from("shopping_items").insert({
        wedding_id: weddingId,
        category: "Layout & Decor",
        item_name: itemName,
        status: "not_started",
        quantity: 1,
        search_terms: searchTerms || null,
      });
      setCheckedItems((prev) => new Set([...prev, itemName]));
    } else {
      await supabase
        .from("shopping_items")
        .delete()
        .eq("wedding_id", weddingId)
        .eq("item_name", itemName);
      setCheckedItems((prev) => {
        const next = new Set(prev);
        next.delete(itemName);
        return next;
      });
    }
    router.refresh();
  }

  /* ---- Image upload ---- */
  async function uploadSectionImage(sectionKey: string, file: File) {
    setUploading(sectionKey);
    const supabase = createClient();
    const filePath = `${weddingId}/layout/${sectionKey}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("moodboard")
      .upload(filePath, file);
    if (uploadError) {
      setUploading(null);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("moodboard").getPublicUrl(filePath);

    const updated = { ...sectionImages, [sectionKey]: publicUrl };
    saveSectionImages(updated);
    setUploading(null);
  }

  async function addImageByUrl(sectionKey: string) {
    const url = imageUrl.trim();
    if (!url) return;

    if (!url.includes("pinterest.com/pin/")) {
      setUrlError("Please paste a Pinterest pin link (e.g., pinterest.com/pin/...)");
      return;
    }

    setUrlError("");
    setImageUrl("Extracting image...");

    try {
      const res = await fetch(
        "https://hemkofupyhjmpdgbfpqy.supabase.co/functions/v1/pinterest-image",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        }
      );
      const data = await res.json();
      if (data.imageUrl) {
        const updated = { ...sectionImages, [sectionKey]: data.imageUrl };
        saveSectionImages(updated);
        setImageUrl("");
        setShowUrlInput(null);
      } else {
        setUrlError("Couldn't extract image. Try a different pin.");
        setImageUrl("");
      }
    } catch {
      setUrlError("Failed to fetch image. Try again.");
      setImageUrl("");
    }
  }

  function deleteSectionImage(sectionKey: string) {
    const updated = { ...sectionImages };
    delete updated[sectionKey];
    saveSectionImages(updated);
  }

  /* ---- Export / Print ---- */
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

    const sectionPages = SECTIONS.map((def) => {
      const items = ALL_SECTION_ITEMS[def.key] || [];
      const checked = items.filter((item) => checkedItems.has(item.name));
      const note = sectionNotes[def.key];
      if (checked.length === 0 && !sectionImages[def.key] && !note) return "";

      const checklistHtml =
        checked.length > 0
          ? `<div style="margin-top:16px;">
              <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:#555;text-transform:uppercase;letter-spacing:1px;">Checklist</h3>
              <ul style="list-style:none;padding:0;margin:0;">
                ${checked.map((item) => `<li style="font-size:13px;padding:4px 0;color:#333;">&#9745; ${item.name}</li>`).join("")}
              </ul>
            </div>`
          : "";

      const imageHtml = sectionImages[def.key]
        ? `<div style="margin-top:16px;">
            <img src="${sectionImages[def.key]}" style="width:100%;max-height:300px;object-fit:contain;border-radius:12px;border:1px solid #eee;" />
          </div>`
        : "";

      const noteHtml = note
        ? `<div style="margin-top:16px;border-left:3px solid #c4c4c4;padding:8px 14px;border-radius:0 8px 8px 0;">
            <p style="font-size:12px;color:#666;margin:0;font-style:italic;">${note.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>`
        : "";

      const tipHtml = `<div style="margin-top:16px;background:#fef9f0;border-left:3px solid #d4a853;padding:10px 14px;border-radius:0 8px 8px 0;">
        <p style="font-size:12px;color:#8a6d3b;margin:0;"><strong>Pro tip:</strong> ${def.tip}</p>
      </div>`;

      return `
        <div style="page-break-before:always;padding:40px 0;">
          <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;margin:0 0 6px 0;color:#1a1a1a;">${def.title}</h2>
          <p style="font-size:12px;color:#999;margin:0;letter-spacing:0.5px;">Share with: ${def.shareWith.join(", ")}</p>
          ${checklistHtml}
          ${noteHtml}
          ${tipHtml}
          ${imageHtml}
        </div>
      `;
    })
      .filter(Boolean)
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${partner1Name} & ${partner2Name} — Layout & Design Guide</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; color: #333; max-width: 850px; margin: 0 auto; padding: 0 40px; }
          img { display: block; }
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
          .cover-share {
            margin-top: 40px;
            font-size: 12px;
            color: #aaa;
            font-style: italic;
          }
          @media print {
            body { padding: 0 20px; }
            .cover { height: auto; min-height: 100vh; }
          }
        </style>
      </head>
      <body>
        <div class="cover">
          <div class="cover-subtitle">Layout & Design Guide</div>
          <div class="cover-line"></div>
          <div class="cover-names">${partner1Name}</div>
          <div class="cover-ampersand">&</div>
          <div class="cover-names">${partner2Name}</div>
          <div class="cover-details">
            ${dateFormatted}${venueName ? ` &middot; ${venueName}` : ""}
          </div>
          <p class="cover-share">Share this guide with your coordinator, venue, and rental company</p>
        </div>

        ${sectionPages || "<p style='color:#999;text-align:center;padding:100px 0;'>No items checked yet.</p>"}

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

  // Count only layout-related items (items defined in our section lists)
  const allLayoutItemNames = new Set([
    ...WELCOME_ITEMS, ...COCKTAIL_ITEMS,
    ...RECEPTION_ITEMS, ...TABLE_SETTING_ITEMS, ...HEAD_TABLE_ITEMS, ...VENDOR_ITEMS,
  ].map(i => i.name));
  const totalChecked = [...checkedItems].filter(name => allLayoutItemNames.has(name)).length;

  return (
    <div className="space-y-3">
      {/* Stats + Export */}
      {totalChecked > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {totalChecked} item{totalChecked !== 1 ? "s" : ""} selected → added to Shopping List
          </p>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
            <ExternalLink className="h-3 w-3" />
            Export / Print
          </Button>
        </div>
      )}

      {SECTIONS.map((section) => {
        const Icon = section.icon;
        const isExpanded = expandedSections.has(section.key);
        const sectionImage = sectionImages[section.key];
        const isUploading = uploading === section.key;
        const showUrl = showUrlInput === section.key;

        return (
          <Card key={section.key} className="overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(section.key)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            >
              <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm block">{section.title}</span>
                <span className="text-xs text-muted-foreground block">{section.subtitle}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1">
                  <Share2 className="h-3 w-3 text-muted-foreground" />
                  {section.shareWith.map((vendor) => (
                    <Badge key={vendor} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {vendor}
                    </Badge>
                  ))}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>
            {isExpanded && (
              <CardContent className="px-4 pb-4 pt-0 border-t">
                <div className="pt-3 space-y-4">
                  {/* Share with on mobile */}
                  <div className="flex items-center gap-1 sm:hidden">
                    <Share2 className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground mr-1">Share with:</span>
                    {section.shareWith.map((vendor) => (
                      <Badge key={vendor} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {vendor}
                      </Badge>
                    ))}
                  </div>

                  {/* Section content */}
                  {section.content(checkedItems, handleToggleItem, ceremonyStyle, handleCeremonyStyleChange, headTableStyle, handleHeadTableStyleChange)}

                  {/* Pro tip */}
                  <div className="flex gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                    <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      <strong>Pro tip:</strong> {section.tip}
                    </p>
                  </div>

                  {/* Pinterest link */}
                  {section.pinterestSearch && (
                    <a
                      href={pinterestUrl(section.pinterestSearch)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Browse ideas on Pinterest
                    </a>
                  )}

                  {/* Moodboard cross-link */}
                  {section.moodboardLink && (
                    <div>
                      <NextLink
                        href={section.moodboardLink.href}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        &rarr; {section.moodboardLink.label}
                      </NextLink>
                    </div>
                  )}

                  {/* Section image upload */}
                  <div className="pt-2 border-t border-dashed border-muted-foreground/15">
                    {sectionImage ? (
                      <div className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sectionImage}
                          alt={`${section.title} layout`}
                          className="w-full rounded-lg border"
                          style={{ height: 200, objectFit: "contain" }}
                        />
                        <button
                          onClick={() => deleteSectionImage(section.key)}
                          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => fileInputRefs.current[section.key]?.click()}
                            disabled={isUploading}
                            className="h-[80px] flex-1 rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/30 hover:text-primary transition-all hover:bg-primary/[0.02]"
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
                              setShowUrlInput(showUrl ? null : section.key)
                            }
                            className="h-[80px] flex-1 rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-red-200 hover:text-red-400 transition-all hover:bg-red-50/50"
                          >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
                            </svg>
                            <span className="text-[10px] font-medium">Paste Pin</span>
                          </button>
                        </div>

                        {showUrl && (
                          <div className="animate-fade-in-up space-y-1">
                            <div className="flex gap-2">
                              <Input
                                placeholder="Paste Pinterest link..."
                                className="text-sm h-9"
                                value={imageUrl}
                                onChange={(e) => {
                                  setImageUrl(e.target.value);
                                  setUrlError("");
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") addImageByUrl(section.key);
                                }}
                                autoFocus
                              />
                              <Button
                                size="sm"
                                className="h-9 shrink-0"
                                onClick={() => addImageByUrl(section.key)}
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

                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => {
                            fileInputRefs.current[section.key] = el;
                          }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                alert("Image must be under 5MB");
                                e.target.value = "";
                                return;
                              }
                              uploadSectionImage(section.key, file);
                            }
                            e.target.value = "";
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {showNoteFor === section.key ? (
                    <div className="animate-fade-in-up space-y-1">
                      <Textarea
                        value={sectionNotes[section.key] || ""}
                        onChange={(e) => saveNotes(section.key, e.target.value)}
                        placeholder="Notes — e.g., venue said we can only use the left entrance"
                        className="text-sm min-h-[60px] resize-none"
                        rows={2}
                        autoFocus
                      />
                      <button onClick={() => setShowNoteFor(null)} className="text-[10px] text-muted-foreground hover:text-foreground">Close</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowNoteFor(section.key)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {sectionNotes[section.key] ? `\u{1F4DD} ${sectionNotes[section.key].slice(0, 60)}${sectionNotes[section.key].length > 60 ? "..." : ""}` : "+ Add a note"}
                    </button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
