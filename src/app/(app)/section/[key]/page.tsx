import { notFound, redirect } from "next/navigation";
import { getCurrentWedding, getWeddingStats } from "@/lib/supabase/queries";
import { sections, type SectionKey } from "@/lib/nav-config";
import { SectionHub } from "@/components/layout/section-hub";

export function generateStaticParams() {
  return sections.map((s) => ({ key: s.key }));
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const section = sections.find((s) => s.key === (key as SectionKey));
  if (!section) notFound();

  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const stats = await getWeddingStats(wedding.id);
  const visits: Record<string, string> =
    (wedding.tool_visits as Record<string, string>) ?? {};

  return <SectionHub section={section} visits={visits} stats={stats} />;
}
