import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Exclude Next.js internals, static files, and metadata file routes
    // (opengraph-image / twitter-image / apple-icon / icon auto-register at
    // these paths — they must bypass auth redirects).
    "/((?!_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|apple-icon|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
