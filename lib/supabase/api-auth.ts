// lib/supabase/api-auth.ts
import { createServerClientAsync } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function getAuthenticatedUser(request?: NextRequest) {
  const supabase = await createServerClientAsync()
  
  try {
    // Try to get the session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (session?.user) {
      return { user: session.user, supabase, error: null }
    }
    
    // If no session, try to refresh
    const { data: { session: refreshedSession }, error: refreshError } = 
      await supabase.auth.refreshSession()
    
    if (refreshedSession?.user) {
      return { user: refreshedSession.user, supabase, error: null }
    }
    
    // If both fail, try getUser as last resort
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (user) {
      return { user, supabase, error: null }
    }
    
    return { user: null, supabase, error: 'Unauthorized' }
    
  } catch (error) {
    console.error('Auth error:', error)
    return { user: null, supabase, error: 'Unauthorized' }
  }
}