
// 1. lib/supabase/client.ts - PKCE + Cookies (Not localStorage)
// ============================================================================
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// createBrowserClient from @supabase/ssr:
// - Automatically uses PKCE flow for OAuth/SSO ✅
// - Automatically uses cookies (not localStorage) ✅
// - Works with SSR ✅
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
