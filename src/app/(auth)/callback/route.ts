import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if user has a wedding already
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: memberships } = await supabase
          .from("wedding_members")
          .select("wedding_id")
          .eq("user_id", user.id)
          .limit(1);

        if (memberships && memberships.length > 0) {
          return NextResponse.redirect(`${origin}/dashboard`);
        }
      }
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
