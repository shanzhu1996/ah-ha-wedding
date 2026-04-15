import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto p-6 sm:p-8 animate-page-enter">
          {children}
        </div>
        {/* Mobile nav spacer */}
        <div className="h-20 md:hidden" />
      </main>
      <MobileNav />
    </div>
  );
}
