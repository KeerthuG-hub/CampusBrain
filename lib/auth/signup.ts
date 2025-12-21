
import { supabase } from '@/lib/supabase/client';
import { validateEmail } from './validation'

export async function signupUser(email: string, password: string, fullName: string) {
  
  // Step 1: Validate email and get role
  const validation = await validateEmail(email)
  
  if (!validation.isValid || !validation.role) {
    return { 
      success: false, 
      error: validation.error || 'Invalid email' 
    }
  }

  // Step 2: Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
    options: {
      data: {
        full_name: fullName,
        role: validation.role // Pass role to metadata
      }
    }
  })

  if (authError) {
    return { 
      success: false, 
      error: authError.message 
    }
  }

  // Step 3: Update profile with role (trigger creates it, we update)
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        full_name: fullName,
        role: validation.role 
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
    }
  }

  return { 
    success: true, 
    user: authData.user,
    role: validation.role 
  }
}