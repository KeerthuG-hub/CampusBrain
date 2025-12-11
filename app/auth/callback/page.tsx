'use client'

import { useEffect, useState, useRef } from 'react'
import { CheckCircle2, Loader2, Shield, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function EnhancedAuthCallback() {
  const router = useRouter()
  const hasProcessed = useRef(false)
  const redirecting = useRef(false)

  const [status, setStatus] = useState<'checking' | 'validating' | 'error' | 'success'>('checking')
  const [message, setMessage] = useState('Processing your login...')

  const safeRedirect = (path: string) => {
    if (redirecting.current) return
    redirecting.current = true
    
    sessionStorage.setItem('last_redirect_path', path)
    sessionStorage.setItem('last_redirect_time', Date.now().toString())
    
    setTimeout(() => {
      window.location.href = path
    }, 500)
  }

  const postSSOValidation = async (userEmail: string, userId: string) => {
    try {
      setStatus('validating')
      setMessage('Verifying your credentials...')

      const storedEmail = sessionStorage.getItem('login_email')

      if (storedEmail && storedEmail.toLowerCase() !== userEmail.toLowerCase()) {
        throw new Error(`Email mismatch: Expected ${storedEmail} but got ${userEmail}`)
      }
      
      const response = await fetch('/api/auth/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userEmail.toLowerCase().trim(),
          userId: userId
        }),
      })
      
      const result = await response.json()

      const isValid = result.valid === true || result.isValid === true
      
      if (!response.ok || !isValid) {
        throw new Error(result.error || result.message || 'Email not authorized')
      }
      
      const role = result.role || 'student'

      sessionStorage.removeItem('login_email')
      sessionStorage.removeItem('validation_result')
      
      return { success: true, role }
    } catch (error: any) {
      throw error
    }
  }

  const checkSetupAndRedirect = async (userId: string, userEmail: string | undefined) => {
    try {
      if (!userEmail) {
        setStatus('error')
        setMessage('Email missing from session. Please try logging in again.')
        
        await supabase.auth.signOut()
        sessionStorage.clear()
        
        await new Promise(resolve => setTimeout(resolve, 3000))
        safeRedirect('/login?error=missing_email')
        return
      }
      
      let validatedRole = 'student'
      try {
        const validationResult = await postSSOValidation(userEmail, userId)
        validatedRole = validationResult.role
        
        sessionStorage.setItem('validated_role', validatedRole)
        sessionStorage.setItem('auth_validated', 'true')
        sessionStorage.setItem('validated_user_id', userId)
        sessionStorage.setItem('validated_email', userEmail)
        
      } catch (validationError: any) {
        setStatus('error')
        setMessage(validationError.message || 'Email validation failed')
        
        await supabase.auth.signOut()
        sessionStorage.clear()
        
        await new Promise(resolve => setTimeout(resolve, 3000))
        safeRedirect('/login?error=validation_failed')
        return
      }
      
      const { data: { session: verifySession } } = await supabase.auth.getSession()
      
      if (!verifySession) {
        setStatus('error')
        setMessage('Session not established. Please try logging in again.')
        await new Promise(resolve => setTimeout(resolve, 3000))
        safeRedirect('/login?error=no_session')
        return
      }
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('interests, role, full_name, department, batch_year, email')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        setStatus('error')
        setMessage('Failed to load profile. Please try again.')
        await new Promise(resolve => setTimeout(resolve, 3000))
        safeRedirect('/login?error=profile_error')
        return
      }

      if (!profile) {
        sessionStorage.setItem('setup_in_progress', 'true')
        safeRedirect('/setup')
        return
      }

      // ADMIN - Direct to home
      if (profile.role === 'admin') {
        setStatus('success')
        setMessage('Welcome, Administrator!')
        safeRedirect('/')
        return
      }

      // PLACEMENT OFFICER - Direct to faculty dashboard
      if (profile.role === 'placement_officer') {
        setStatus('success')
        setMessage('Welcome, Placement Officer!')
        safeRedirect('/faculty')
        return
      }

      // FACULTY - Check setup completion
      if (profile.role === 'faculty') {
        const hasInterests = profile.interests && Array.isArray(profile.interests) && profile.interests.length > 0
        const hasBasicInfo = !!profile.full_name && !!profile.department

        if (!hasBasicInfo || !hasInterests) {
          sessionStorage.setItem('setup_in_progress', 'true')
          safeRedirect('/setup')
          return
        }
        
        const { count: coursesCount } = await supabase
          .from('faculty_courses')
          .select('*', { count: 'exact', head: true })
          .eq('faculty_id', userId)

        const { count: sigsCount } = await supabase
          .from('faculty_sigs')
          .select('*', { count: 'exact', head: true })
          .eq('faculty_id', userId)

        if ((coursesCount || 0) > 0 || (sigsCount || 0) > 0) {
          setStatus('success')
          setMessage('Welcome back, Faculty!')
          safeRedirect('/faculty')
        } else {
          sessionStorage.setItem('setup_in_progress', 'true')
          safeRedirect('/setup')
        }
        return
      }

      // STUDENT - Check setup completion
      const hasInterests = profile.interests && Array.isArray(profile.interests) && profile.interests.length > 0
      const hasBasicInfo = !!profile.full_name && !!profile.department
      const hasBatch = !!profile.batch_year

      if (!hasBasicInfo || !hasInterests || !hasBatch) {
        sessionStorage.setItem('setup_in_progress', 'true')
        safeRedirect('/setup')
        return
      }

      setStatus('success')
      setMessage('Welcome back!')
      safeRedirect('/student')

    } catch (err: any) {
      setStatus('error')
      setMessage('An unexpected error occurred')
      await supabase.auth.signOut()
      await new Promise(resolve => setTimeout(resolve, 3000))
      safeRedirect('/login?error=fatal')
    }
  }

  useEffect(() => {
    if (hasProcessed.current) return
    hasProcessed.current = true

    const handleCallback = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 300))
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setStatus('error')
          setMessage(sessionError.message)
          return
        }
        
        if (session?.user) {
          await checkSetupAndRedirect(session.user.id, session.user.email)
          return
        }

        const urlParams = new URLSearchParams(window.location.search)
        const error = urlParams.get('error')
        const errorDescription = urlParams.get('error_description')
        const code = urlParams.get('code')

        if (error) {
          let userMessage = decodeURIComponent(error)
          if (error === 'server_error') {
            userMessage = 'OAuth configuration error. Please contact support.'
          }
          
          setStatus('error')
          setMessage(userMessage)
          
          setTimeout(() => {
            safeRedirect('/login?error=' + encodeURIComponent(error))
          }, 5000)
          return
        }

        if (!code) {
          setStatus('error')
          setMessage('Missing authorization code. Please try logging in again.')
          await new Promise(resolve => setTimeout(resolve, 3000))
          safeRedirect('/login?error=no_code')
          return
        }
        
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          setStatus('error')
          setMessage(exchangeError.message || 'Failed to create session')
          
          await new Promise(resolve => setTimeout(resolve, 3000))
          safeRedirect('/login?error=exchange_failed')
          return
        }

        if (!data?.session) {
          setStatus('error')
          setMessage('Failed to create session')
          
          await new Promise(resolve => setTimeout(resolve, 3000))
          safeRedirect('/login?error=no_session_data')
          return
        }
        
        await checkSetupAndRedirect(data.session.user.id, data.session.user.email)

      } catch (err: any) {
        setStatus('error')
        setMessage('Unexpected error occurred')
        
        await new Promise(resolve => setTimeout(resolve, 3000))
        safeRedirect('/login?error=callback_exception')
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 w-full max-w-md">

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6">
            <Image 
              src="/logo.jpeg" 
              alt="Logo" 
              width={64} 
              height={64}
              className="rounded-xl"
            />
          </div>
          
          {(status === 'checking' || status === 'validating') && (
            <>
              <div className="relative w-16 h-16 mx-auto mb-6">
                <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                <Shield className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                {status === 'checking' ? 'Authenticating' : 'Validating Access'}
              </h2>
              <p className="text-sm text-slate-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-green-700 mb-2">Success!</h2>
              <p className="text-sm text-slate-600">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-red-700 mb-2">Access Denied</h2>
              <p className="text-sm text-slate-600 mb-6 whitespace-pre-line">{message}</p>
              <button
                onClick={() => {
                  sessionStorage.clear()
                  window.location.href = '/login'
                }}
                className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
              >
                Return to Login
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}