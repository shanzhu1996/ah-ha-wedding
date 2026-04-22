import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileTopBar } from "@/components/layout/mobile-top-bar";
import { MobileBreadcrumb } from "@/components/layout/mobile-breadcrumb";
import { TrackVisit } from "@/components/layout/track-visit";
import { getCurrentWedding } from "@/lib/supabase/queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const wedding = await getCurrentWedding();
  const visits: Record<string, string> =
    (wedding?.tool_visits as Record<string, string>) ?? {};

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <MobileTopBar weddingDate={wedding?.wedding_date ?? null} />
      <main className="flex-1 overflow-auto md:pt-0 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="max-w-6xl mx-auto p-6 sm:p-8 animate-page-enter">
          <MobileBreadcrumb />
          {children}
        </div>
      </main>
      <MobileNav visits={visits} />
      <TrackVisit />
    </div>
  );
}
