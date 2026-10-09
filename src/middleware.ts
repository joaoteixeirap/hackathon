import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { needsGuestSession } from "@/lib/guest";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

// Refreshes the Supabase session cookie on every navigation, and starts an anonymous
// guest session on routes that need a user (no login screen during the hackathon).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user && needsGuestSession(request.nextUrl.pathname)) {
    await supabase.auth.signInAnonymously();
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|sw.js|manifest.webmanifest|icon.svg|pwa-icon|.*\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
