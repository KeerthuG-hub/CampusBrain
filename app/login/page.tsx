'use client'

import React, { useEffect, useState } from 'react'
import { AlertCircle, Lock, ArrowRight, Shield, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function EnhancedLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState('')
  const [isEmailValid, setIsEmailValid] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    
    const authRedirectComplete = sessionStorage.getItem('auth_redirect_complete')
    const lastRedirectTime = sessionStorage.getItem('last_redirect_time')
    
    if (authRedirectComplete === 'true' && lastRedirectTime) {
      const timeSinceRedirect = Date.now() - parseInt(lastRedirectTime)
      
      if (timeSinceRedirect < 3000) {
        sessionStorage.clear()
        return
      }
    }
    
    sessionStorage.removeItem('login_email')
    sessionStorage.removeItem('validation_result')
    sessionStorage.removeItem('auth_redirect_complete')
    sessionStorage.removeItem('setup_in_progress')
    sessionStorage.removeItem('auth_validated')
    sessionStorage.removeItem('validated_role')
    sessionStorage.removeItem('validated_user_id')
    sessionStorage.removeItem('validated_email')

    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }

    const forceCheck = urlParams.get('check_session')
    
    // Only auto-redirect if coming from OAuth callback (has check_session param)
    // This way user can see login page normally, and redirect happens AFTER SSO
    if (forceCheck === 'true') {
      const checkSession = async () => {
        console.log('[LOGIN] OAuth callback detected, checking session...')
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          console.log('[LOGIN] Session found after OAuth, redirecting...')
          await checkSetupAndRedirect(session.user.id)
        } else {
          console.log('[LOGIN] No session found after OAuth')
        }
      }
      checkSession()
    } else {
      console.log('[LOGIN] Normal page load - showing login form')
    }
  }, [])

  const checkSetupAndRedirect = async (userId: string) => {
    try {
      console.log('[LOGIN] Checking setup for user:', userId)
      
      // STEP 1: Get profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, department, batch_year, email')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        console.error('[LOGIN] Profile error:', profileError)
        window.location.replace('/setup')
        return
      }

      if (!profile) {
        console.log('[LOGIN] No profile found, redirecting to setup')
        window.location.replace('/setup')
        return
      }

      console.log('[LOGIN] User role:', profile.role)

      // STEP 2: Handle different roles
      
      // Admin → Home
      if (profile.role === 'admin') {
        console.log('[LOGIN] Admin detected, redirecting to home')
        window.location.replace('/')
        return
      }

      // Placement Officer → Faculty Dashboard
      if (profile.role === 'placement_officer') {
        console.log('[LOGIN] Placement officer detected, redirecting to faculty')
        window.location.replace('/faculty')
        return
      }

      // STEP 3: Check basic info (required for all users)
      const hasBasicInfo = !!profile.full_name && !!profile.department
      
      if (!hasBasicInfo) {
        console.log('[LOGIN] Missing basic info, redirecting to setup')
        window.location.replace('/setup')
        return
      }

      // STEP 4: FIXED - Check interests from user_interests table (NOT profiles.interests)
      const { data: userInterests, error: interestsError } = await supabase
        .from('user_interests')
        .select('tag_id')
        .eq('user_id', userId)
        .limit(1)

      const hasInterests = !interestsError && userInterests && userInterests.length > 0

      console.log('[LOGIN] Has interests:', hasInterests)

      // STEP 5: Faculty-specific checks
      if (profile.role === 'faculty') {
        if (!hasInterests) {
          console.log('[LOGIN] Faculty missing interests, redirecting to setup')
          window.location.replace('/setup')
          return
        }

        // Check if faculty has courses or SIGs
        const { count: coursesCount } = await supabase
          .from('faculty_courses')
          .select('*', { count: 'exact', head: true })
          .eq('faculty_id', userId)

        const { count: sigsCount } = await supabase
          .from('faculty_sigs')
          .select('*', { count: 'exact', head: true })
          .eq('faculty_id', userId)

        console.log('[LOGIN] Faculty courses:', coursesCount, 'SIGs:', sigsCount)

        if ((coursesCount || 0) > 0 || (sigsCount || 0) > 0) {
          console.log('[LOGIN] Faculty setup complete, redirecting to faculty dashboard')
          window.location.replace('/faculty')
        } else {
          console.log('[LOGIN] Faculty needs courses/SIGs, redirecting to setup')
          window.location.replace('/setup')
        }
        return
      }

      // STEP 6: Student-specific checks
      if (profile.role === 'student') {
        const hasBatch = !!profile.batch_year

        if (!hasInterests || !hasBatch) {
          console.log('[LOGIN] Student missing data - interests:', hasInterests, 'batch:', hasBatch)
          window.location.replace('/setup')
          return
        }

        console.log('[LOGIN] Student setup complete, redirecting to home')
        window.location.replace('/')
        return
      }

      // STEP 7: Default fallback
      console.log('[LOGIN] Unknown role or state, redirecting to setup')
      window.location.replace('/setup')

    } catch (err) {
      console.error('[LOGIN] Fatal error in checkSetupAndRedirect:', err)
      window.location.replace('/setup')
    }
  }

  const validateEmailAPI = async (emailToCheck: string) => {
    setValidating(true)
    setError('')
    setIsEmailValid(false)
    setValidationResult(null)

    try {
      const response = await fetch('/api/auth/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck.toLowerCase().trim() }),
      })

      const result = await response.json()

      const isValid = result.valid === true || result.isValid === true
      
      if (response.ok && isValid) {
        const role = result.role || (result.validationType === 'faculty' ? 'faculty' : 'student')
        
        const validationData = {
          email: emailToCheck.toLowerCase().trim(),
          role,
          valid: true,
          validationType: result.validationType || role,
          timestamp: Date.now()
        }
        
        setIsEmailValid(true)
        setValidationResult(validationData)
        setError('')
        
        sessionStorage.setItem('validation_result', JSON.stringify(validationData))
      } else {
        setIsEmailValid(false)
        setError(result.error || result.message || 'This email is not authorized.')
      }
    } catch (err) {
      setError('Unable to validate email. Please try again.')
      setIsEmailValid(false)
    } finally {
      setValidating(false)
    }
  }

  const handleValidateClick = () => {
    if (!email) {
      setError('Please enter your institutional email.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    validateEmailAPI(email)
  }

  const handleGoogleSSO = async () => {
    setError('')

    if (!email) {
      setError('Please enter your institutional email.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (!isEmailValid || !validationResult) {
      setError('Please verify your email before continuing.')
      return
    }

    setLoading(true)

    try {
      await supabase.auth.signOut()

      try {
        Object.keys(localStorage).forEach((k) => {
          if (k.includes('sb-') && k.includes('auth-token')) {
            localStorage.removeItem(k)
          }
        })
      } catch (e) {
        console.warn('Failed to clear localStorage tokens')
      }

      await new Promise(resolve => setTimeout(resolve, 100))

      const domain = email.split('@')[1]
      const redirectUrl = `${window.location.origin}/auth/callback`
      
      sessionStorage.setItem('login_email', email.toLowerCase().trim())
      sessionStorage.setItem('validation_result', JSON.stringify(validationResult))

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            login_hint: email,
            hd: domain
          }
        }
      })

      if (oauthError) {
        setError(oauthError.message || 'Unable to start authentication.')
        setLoading(false)
        return
      }

      if (!data?.url) {
        setError('Authentication could not start.')
        setLoading(false)
        return
      }

      window.location.href = data.url

    } catch (err: any) {
      setError('Connection failed. Try again.')
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const getRoleDisplay = (role: string) => {
    switch(role) {
      case 'admin': return '🔐 Admin access authorized'
      case 'placement_officer': return '🎯 Placement Officer access authorized'
      case 'faculty': return '👨‍🏫 Faculty access authorized'
      case 'student': return '🎓 Student access authorized'
      default: return 'Access authorized'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 px-4 py-12 relative overflow-hidden">
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-700"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        
        {sessionStorage.getItem('auth_redirect_complete') === 'true' && (
          <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900 mb-1">
                  ⚠️ Redirect Loop Detected
                </p>
                <p className="text-xs text-amber-800 mb-2">
                  You were redirected back to login. This usually means the session was not established after OAuth.
                </p>
                <button
                  onClick={() => {
                    sessionStorage.clear()
                    window.location.reload()
                  }}
                  className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                >
                  Clear All Data & Retry
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Logo and branding section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6">
            <Image 
              src="/image.png" 
              alt="Campus Brain Logo" 
              width={140} 
              height={140}
              className="rounded-2xl shadow-2xl border-4 border-blue-100"
            />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
            Campus Brain
          </h1>
          <p className="text-lg text-blue-700 font-medium mb-6 italic">
            Where Knowledge Flows
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto rounded-full"></div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="p-8">

            {error && (
              <div className="mb-6 flex items-start gap-3 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900 mb-1">
                    Authentication Error
                  </p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {isEmailValid && !error && validationResult && (
              <div className="mb-6 flex items-start gap-3 bg-green-50 border-l-4 border-green-500 rounded-lg p-4 shadow-sm">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900 mb-1">
                    ✅ Email Verified
                  </p>
                  <p className="text-sm text-green-700">
                    {getRoleDisplay(validationResult.role)}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2 mb-5">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                Institutional Email Address
              </label>

              <div className="relative">
                <input
                  id="email"
                  type="email"
                  placeholder="john.doe@university.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value.trim())
                    setIsEmailValid(false)
                    setError('')
                    setValidationResult(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isEmailValid) {
                      handleValidateClick()
                    }
                  }}
                  disabled={loading || validating}
                  className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
                />

                {validating && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  </div>
                )}

                {isEmailValid && !validating && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Use your official institutional email address
              </p>
            </div>

            {!isEmailValid && (
              <button
                onClick={handleValidateClick}
                disabled={validating || !email}
                className="w-full mb-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl px-6 py-3.5 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                <div className="flex items-center justify-center gap-2">
                  {validating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Validating Email...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Verify Email</span>
                    </>
                  )}
                </div>
              </button>
            )}

            <button
              onClick={handleGoogleSSO}
              disabled={loading || validating || !isEmailValid}
              className="w-full relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white rounded-xl px-6 py-4 font-bold shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
            >
              <div className="flex items-center justify-center gap-3">
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Continue with Google</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </div>
            </button>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-start gap-3 text-xs text-slate-600">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="leading-relaxed">
                  Your privacy and security are our top priority. All connections are encrypted with enterprise-grade SSL/TLS protocols.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-8 py-5 border-t border-slate-200">
            <div className="flex items-center justify-center gap-8 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium">Verified Access</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="font-medium">256-bit Encryption</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-slate-600 mt-8">
          Need assistance?{' '}
          <a href="/support" className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2 transition-colors">
            Contact Support
          </a>
        </p>

        <div className="text-center mt-6 text-xs text-slate-500">
          © 2025 Campus Brain. All rights reserved.
        </div>
      </div>
    </div>
  )
}