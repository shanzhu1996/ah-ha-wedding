"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { allNavItems } from "@/lib/nav-config";
import { markToolVisited } from "@/lib/actions/track-visit";

/**
 * Mounted once in (app)/layout. Records a first-visit timestamp for any
 * tool route (anything in nav-config). Server action no-ops on repeat
 * visits, so this is cheap. Progress indicators (Planning Map + More
 * sheet) read from weddings.tool_visits on subsequent page loads.
 */
export function TrackVisit() {
  const pathname = usePathname();

  useEffect(() => {
    if (allNavItems.some((it) => it.href === pathname)) {
      void markToolVisited(pathname);
    }
  }, [pathname]);

  return null;
}
