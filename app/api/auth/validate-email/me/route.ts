import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ user: null }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, email")
      .eq("id", user.id)
      .maybeSingle()

    return NextResponse.json({ user, profile })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
