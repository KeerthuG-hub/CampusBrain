'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Shield } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'student' | 'faculty' | 'admin'
  allowedRoles?: ('student' | 'faculty' | 'admin')[]
}

export default function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      console.log('[PROTECTED] ━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[PROTECTED] CHECKING AUTHORIZATION')
      console.log('[PROTECTED] ━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[PROTECTED] Required role:', requiredRole)
      console.log('[PROTECTED] Allowed roles:', allowedRoles)
      
      // Check if coming from auth flow
      const authRedirectComplete = sessionStorage.getItem('auth_redirect_complete')
      const lastRedirectPath = sessionStorage.getItem('last_redirect_path')
      const authValidated = sessionStorage.getItem('auth_validated')
      
      console.log('[PROTECTED] Auth redirect complete:', authRedirectComplete)
      console.log('[PROTECTED] Last redirect path:', lastRedirectPath)
      console.log('[PROTECTED] Auth validated:', authValidated)
      
      // If we JUST came from auth callback, give session more time
      if (authRedirectComplete === 'true' && authValidated === 'true') {
        const lastRedirectTime = parseInt(sessionStorage.getItem('last_redirect_time') || '0')
        const timeSinceRedirect = Date.now() - lastRedirectTime
        
        console.log('[PROTECTED] Time since redirect:', Math.round(timeSinceRedirect / 1000), 'seconds')
        
        if (timeSinceRedirect < 2000) {
          console.log('[PROTECTED] Just redirected from auth, waiting 1 second...')
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      console.log('[PROTECTED] Fetching session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('[PROTECTED] ❌ Session error:', sessionError.message)
        throw sessionError
      }

      if (!session) {
        console.log('[PROTECTED] ❌ No session found')
        
        // Clear auth flags if no session
        if (authValidated === 'true') {
          console.log('[PROTECTED] ⚠️ Auth validated but no session - CRITICAL ISSUE')
          console.log('[PROTECTED] This means session was lost between callback and protected route')
          
          // Don't redirect immediately - wait and retry once
          console.log('[PROTECTED] Retrying in 2 seconds...')
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          
          if (!retrySession) {
            console.error('[PROTECTED] ❌ Retry failed - session still not found')
            sessionStorage.clear()
            router.replace('/login?error=Session%20expired.%20Please%20log%20in%20again.')
            return
          }
          
          console.log('[PROTECTED] ✅ Retry succeeded!')
          // Continue with retry session
        } else {
          // Normal case - not authenticated
          console.log('[PROTECTED] Redirecting to login (not authenticated)')
          router.replace('/login')
          return
        }
      }

      const user = session!.user
      console.log('[PROTECTED] ✅ Session found')
      console.log('[PROTECTED] User:', user.email)
      console.log('[PROTECTED] User ID:', user.id)

      // Get user profile to check role
      console.log('[PROTECTED] Fetching profile...')
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, department, interests, batch_year')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('[PROTECTED] ❌ Profile error:', profileError.message)
        throw profileError
      }

      if (!profile) {
        console.log('[PROTECTED] ❌ No profile found - redirecting to setup')
        router.replace('/setup')
        return
      }

      console.log('[PROTECTED] ✅ Profile found')
      console.log('[PROTECTED] Profile role:', profile.role)

      // Check role authorization
      const roles = allowedRoles || (requiredRole ? [requiredRole] : null)
      
      if (roles && !roles.includes(profile.role)) {
        console.log('[PROTECTED] ❌ Role not authorized')
        console.log('[PROTECTED] Required:', roles.join(', '))
        console.log('[PROTECTED] User has:', profile.role)
        
        // Redirect to appropriate dashboard
        const redirectPath = profile.role === 'faculty' ? '/faculty' : '/student'
        console.log('[PROTECTED] Redirecting to:', redirectPath)
        router.replace(redirectPath)
        return
      }

      console.log('[PROTECTED] ✅ Authorization passed')
      
      // Clear auth redirect flags after successful auth
      if (authRedirectComplete === 'true') {
        console.log('[PROTECTED] Clearing auth redirect flags')
        sessionStorage.removeItem('auth_redirect_complete')
        sessionStorage.removeItem('last_redirect_path')
        sessionStorage.removeItem('last_redirect_time')
        sessionStorage.removeItem('auth_validated')
        sessionStorage.removeItem('validated_role')
        sessionStorage.removeItem('validated_user_id')
        sessionStorage.removeItem('validated_email')
      }
      
      setAuthorized(true)
      setLoading(false)

    } catch (error: any) {
      console.error('[PROTECTED] ❌ Fatal error:', error.message)
      console.error('[PROTECTED] Stack:', error.stack)
      
      // Clear everything and redirect to login
      sessionStorage.clear()
      router.replace('/login?error=Authentication%20failed.%20Please%20try%20again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            <Shield className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-600 font-medium">Verifying your access...</p>
          <p className="text-sm text-slate-500 mt-2">Please wait</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}