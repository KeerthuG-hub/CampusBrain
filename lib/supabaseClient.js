import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Add small safety checks (helps debug)
if (!supabaseUrl) console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
if (!supabaseAnonKey) console.error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)