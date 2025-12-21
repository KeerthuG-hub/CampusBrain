// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface ValidationResult {
  isValid: boolean
  role: 'student' | 'faculty' | 'admin' | 'placement_officer' | null
  error?: string
}

async function validateUserEmail(
  supabase: any,
  email: string
): Promise<ValidationResult> {
  const normalizedEmail = email.toLowerCase().trim()

  // Check faculty whitelist first
  const { data: facultyCheck, error: facultyError } = await supabase
    .from('faculty_whitelist')
    .select('email')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (!facultyError && facultyCheck) {
    return { isValid: true, role: 'faculty' }
  }

  // Check student domain
  const domain = normalizedEmail.split('@')[1]

  if (!domain) {
    return {
      isValid: false,
      role: null,
      error: 'Invalid email format'
    }
  }

  const { data: domainCheck, error: domainError } = await supabase
    .from('allowed_domains')
    .select('domain, is_student_domain')
    .eq('domain', domain)
    .maybeSingle()

  if (!domainError && domainCheck?.is_student_domain) {
    return { isValid: true, role: 'student' }
  }

  return {
    isValid: false,
    role: null,
    error:
      'Access denied. Please use your institutional email address or contact your administrator.'
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  // No code provided
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createServerClient()

  try {
    // Exchange code for session
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.exchangeCodeForSession(code)

    if (sessionError || !session) {
      console.error('Session error:', sessionError)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    const userEmail = session.user.email?.toLowerCase().trim()

    // No email in OAuth response
    if (!userEmail) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=no_email`)
    }

    // Validate email against whitelist/domains
    const validation = await validateUserEmail(supabase, userEmail)

    // Email not authorized - sign out immediately
    if (!validation.isValid) {
      await supabase.auth.signOut()
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(
          validation.error || 'unauthorized'
        )}`
      )
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name, department, batch_year')
      .eq('id', session.user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
    }

    // Create profile for new user
    if (!profile) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          email: userEmail,
          role: validation.role,
          full_name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            null,
          avatar_url:
            session.user.user_metadata?.avatar_url ||
            session.user.user_metadata?.picture ||
            null
        })

      if (insertError) {
        console.error('Profile creation error:', insertError)
        await supabase.auth.signOut()
        return NextResponse.redirect(
          `${origin}/login?error=profile_creation_failed`
        )
      }

      // ✅ FIXED: New user needs to complete profile - redirect to /setup
      return NextResponse.redirect(`${origin}/setup`)
    }

    // Update role if it changed
    if (profile.role !== validation.role) {
      await supabase
        .from('profiles')
        .update({ role: validation.role })
        .eq('id', session.user.id)
    }

    // ✅ FIXED: Check if profile is complete with proper validation
    const hasBasicInfo = !!profile.full_name && !!profile.department
    
    // For students, also check batch_year
    const isStudentComplete = profile.role === 'student' 
      ? hasBasicInfo && !!profile.batch_year
      : true
    
    // For faculty, also check interests (we'll do this below)
    const isFacultyComplete = profile.role === 'faculty' 
      ? hasBasicInfo
      : true

    // Check interests for all users
    const { count: interestsCount } = await supabase
      .from('user_interests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)

    const hasInterests = (interestsCount || 0) > 0

    // For faculty, also check courses or SIGs
    let hasFacultyData = true
    if (profile.role === 'faculty') {
      const { count: coursesCount } = await supabase
        .from('faculty_courses')
        .select('*', { count: 'exact', head: true })
        .eq('faculty_id', session.user.id)

      const { count: sigsCount } = await supabase
        .from('faculty_sigs')
        .select('*', { count: 'exact', head: true })
        .eq('faculty_id', session.user.id)

      hasFacultyData = (coursesCount || 0) > 0 || (sigsCount || 0) > 0
    }

    // Determine if setup is complete
    const isProfileComplete = 
      hasBasicInfo && 
      isStudentComplete && 
      isFacultyComplete && 
      hasInterests &&
      (profile.role !== 'faculty' || hasFacultyData)

    if (!isProfileComplete) {
      // ✅ FIXED: Redirect to /setup (not /setup-profile)
      return NextResponse.redirect(`${origin}/setup`)
    }

    // ✅ FIXED: Role-based redirects instead of generic /dashboard
    if (profile.role === 'admin') {
      return NextResponse.redirect(`${origin}/`)
    } else if (profile.role === 'placement_officer') {
      return NextResponse.redirect(`${origin}/faculty`)
    } else if (profile.role === 'faculty') {
      return NextResponse.redirect(`${origin}/faculty`)
    } else {
      // Student
      return NextResponse.redirect(`${origin}/student`)
    }
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(`${origin}/login?error=unexpected_error`)
  }
}