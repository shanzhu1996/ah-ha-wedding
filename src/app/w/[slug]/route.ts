import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateHTML,
  type FAQItem,
  type ScheduleItem,
  type SectionConfig,
  type TemplateStyle,
} from "@/lib/website/generate-html";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

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

function asScheduleItems(raw: unknown): ScheduleItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => {
    const r = (x ?? {}) as Record<string, unknown>;
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!SLUG_RE.test(slug) || slug.length < 3 || slug.length > 60) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const { data: w } = await supabase
    .from("wedding_websites")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!w) {
    return new NextResponse("Not found", { status: 404 });
  }

  const html = generateHTML({
    template: (w.template as TemplateStyle) ?? "classic",
    sections: asSections(w.sections),
    wedding: {
      partner1_name: w.partner1_name,
      partner2_name: w.partner2_name,
      wedding_date: w.wedding_date,
    },
    heroImageUrl: w.hero_image_url,
    headline: w.headline,
    subtitle: w.subtitle,
    storyHowWeMet: w.story_how_we_met,
    storyProposal: w.story_proposal,
    storyFavoriteMemory: w.story_favorite_memory,
    storyHowWeMetPhoto: w.story_how_we_met_photo,
    storyProposalPhoto: w.story_proposal_photo,
    storyFavoriteMemoryPhoto: w.story_favorite_memory_photo,
    ourStoryText: w.our_story_text,
    venueName: w.venue_name,
    venueAddress: w.venue_address,
    dressCode: w.dress_code,
    parkingInfo: w.parking_info,
    scheduleItems: asScheduleItems(w.schedule_items),
    registryUrls: asStringArray(w.registry_urls),
    faqItems: asFaqItems(w.faq_items),
    hotelInfo: w.hotel_info,
    airportInfo: w.airport_info,
    bannerEnabled: w.banner_enabled,
    bannerMessage: w.banner_message,
  });

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
