import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 sm:p-8 pb-24 md:pb-8 animate-page-enter">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
