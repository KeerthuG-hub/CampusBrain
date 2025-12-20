// app/api/auth/validate-email/me/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// Type helper for Supabase client
type SupabaseClientType = Awaited<ReturnType<typeof createServerClient>>;

export async function GET(req: Request) {
  try {
    // 1️⃣ Await the server client
    const supabase: SupabaseClientType = await createServerClient();

    // 2️⃣ Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // 3️⃣ Fetch user profile from 'profiles' table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return NextResponse.json({ error: "Profile fetch failed" }, { status: 500 });
    }

    // 4️⃣ Return user + profile
    return NextResponse.json({ user, profile });

  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
