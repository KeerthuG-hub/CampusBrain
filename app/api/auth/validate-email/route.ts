// app/api/auth/validate-email/route.ts
export const runtime = "nodejs"

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  return NextResponse.json({ message: 'Validate email API is working' })
}

export async function POST(req: Request) {
  console.log('✅ POST /api/auth/validate-email called')
  
  try {
    const { email, userId } = await req.json()
    console.log('📧 Email:', email)
    console.log('👤 User ID:', userId || 'not provided')

    if (!email) {
      return NextResponse.json({ 
        valid: false,
        isValid: false, 
        error: 'Email is required',
        message: 'Email is required'
      }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const domain = normalizedEmail.split('@')[1]

    if (!domain) {
      return NextResponse.json({ 
        valid: false,
        isValid: false, 
        error: 'Invalid email format',
        message: 'Invalid email format'
      }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables')
      return NextResponse.json({ 
        valid: false,
        isValid: false, 
        error: 'Server configuration error',
        message: 'Server configuration error'
      }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    )

    // ============================================
    // PRIORITY 1: Check database for existing role
    // (Admin & Placement Officer MUST be in DB)
    // ============================================
    console.log('🔍 STEP 1: Checking profiles table for existing role...')
    
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email, id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Profile fetch error:', profileError)
    }

    if (existingProfile) {
      console.log('📋 Found existing profile:', {
        id: existingProfile.id,
        email: existingProfile.email,
        role: existingProfile.role
      })

      // Admin role - HIGHEST PRIORITY
      if (existingProfile.role === 'admin') {
        console.log('🔐 ADMIN ROLE DETECTED from database')
        return NextResponse.json({ 
          valid: true,
          isValid: true,
          role: 'admin',
          validationType: 'admin',
          source: 'database',
          message: 'Admin access authorized'
        }, { status: 200 })
      }

      // Placement Officer role - SECOND PRIORITY
      if (existingProfile.role === 'placement_officer') {
        console.log('🎯 PLACEMENT OFFICER ROLE DETECTED from database')
        return NextResponse.json({ 
          valid: true,
          isValid: true,
          role: 'placement_officer',
          validationType: 'placement_officer',
          source: 'database',
          message: 'Placement Officer access authorized'
        }, { status: 200 })
      }

      // Faculty role from database
      if (existingProfile.role === 'faculty') {
        console.log('👨‍🏫 FACULTY ROLE DETECTED from database')
        return NextResponse.json({ 
          valid: true,
          isValid: true,
          role: 'faculty',
          validationType: 'faculty',
          source: 'database',
          message: 'Faculty access authorized'
        }, { status: 200 })
      }

      // Student role from database
      if (existingProfile.role === 'student') {
        console.log('🎓 STUDENT ROLE DETECTED from database')
        return NextResponse.json({ 
          valid: true,
          isValid: true,
          role: 'student',
          validationType: 'student',
          source: 'database',
          message: 'Student access authorized'
        }, { status: 200 })
      }
    } else {
      console.log('ℹ️ No existing profile found for this email')
    }

    // ============================================
    // PRIORITY 2: Check faculty_whitelist
    // ============================================
    console.log('🔍 STEP 2: Checking faculty_whitelist...')
    
    const { data: faculty, error: facultyError } = await supabase
      .from('faculty_whitelist')
      .select('email')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (facultyError && facultyError.code !== 'PGRST116') {
      console.error('❌ Faculty fetch error:', facultyError)
    }

    if (faculty) {
      console.log('✅ EMAIL VALIDATED VIA FACULTY WHITELIST')
      
      // Update profile role ONLY if userId is provided (post-SSO)
      if (userId) {
        console.log('📝 Updating profile role to faculty...')
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'faculty' })
          .eq('id', userId)
        
        if (updateError) {
          console.error('⚠️ Profile update error:', updateError.message)
        } else {
          console.log('✅ Profile role updated to faculty')
        }
      }
      
      return NextResponse.json({ 
        valid: true,
        isValid: true,
        role: 'faculty',
        validationType: 'faculty',
        source: 'whitelist',
        message: 'Faculty access authorized'
      }, { status: 200 })
    }

    // ============================================
    // PRIORITY 3: Check allowed_domains (students)
    // ============================================
    console.log('🔍 STEP 3: Checking allowed_domains...')
    
    const { data: allowedDomains, error: domainError } = await supabase
      .from('allowed_domains')
      .select('domain')

    if (domainError) {
      console.error('❌ Domain fetch error:', domainError)
      return NextResponse.json({ 
        valid: false,
        isValid: false, 
        error: 'Database error',
        message: `Database error: ${domainError.message}`
      }, { status: 500 })
    }

    const matchedDomain = allowedDomains?.find(d => 
      domain.toLowerCase() === d.domain.toLowerCase()
    )

    if (matchedDomain) {
      console.log('✅ EMAIL VALIDATED VIA DOMAIN:', matchedDomain.domain)
      
      // Update profile role ONLY if userId is provided (post-SSO)
      if (userId) {
        console.log('📝 Updating profile role to student...')
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'student' })
          .eq('id', userId)
        
        if (updateError) {
          console.error('⚠️ Profile update error:', updateError.message)
        } else {
          console.log('✅ Profile role updated to student')
        }
      }
      
      return NextResponse.json({ 
        valid: true,
        isValid: true,
        role: 'student',
        validationType: 'student',
        source: 'domain',
        matchedDomain: matchedDomain.domain,
        message: 'Student access authorized'
      }, { status: 200 })
    }

    // ============================================
    // STEP 4: Not authorized
    // ============================================
    console.log('❌ Email not authorized')
    return NextResponse.json({ 
      valid: false,
      isValid: false, 
      error: `Email domain "${domain}" is not authorized`,
      message: `Email domain "${domain}" is not authorized. Only institutional emails, whitelisted faculty, or authorized admins can access.`
    }, { status: 403 })

  } catch (err: any) {
    console.error('❌ VALIDATION ERROR:', err)
    return NextResponse.json({ 
      valid: false,
      isValid: false, 
      error: 'Server error',
      message: `Server error: ${err.message}`
    }, { status: 500 })
  }
}