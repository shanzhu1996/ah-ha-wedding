"use client";

import { usePathname } from "next/navigation";
import { findBreadcrumb, navGroups } from "@/lib/nav-config";

/**
 * Mobile-only breadcrumb rendered above every (app) page. Surfaces the
 * Planning Map mental model ("Step X · Group") everywhere, so users
 * know how the current tool fits into the 4-question framework even
 * when the sidebar isn't visible.
 */
export function MobileBreadcrumb() {
  const pathname = usePathname();
  const info = findBreadcrumb(pathname);

  if (!info) return null;

  const total = navGroups.length;

  return (
    <div className="md:hidden text-[11px] text-muted-foreground/80 mb-2 -mt-2">
      <span className="font-medium text-muted-foreground">
        Step {info.step} of {total}
      </span>
      <span className="mx-1.5 text-muted-foreground/40">·</span>
      <span>{info.group}</span>
      <span className="mx-1.5 text-muted-foreground/40">/</span>
      <span className="text-foreground/80 font-medium">{info.tool}</span>
    </div>
  );
}
