import { supabase } from '@/lib/supabase/client';

export async function validateEmail(email: string): Promise<{
  isValid: boolean
  role: 'student' | 'faculty' | null
  error?: string
}> {
  const lowerEmail = email.toLowerCase().trim()
  
  // Step 1: Check faculty whitelist first
  const { data: facultyCheck, error: facultyError } = await supabase
    .from('faculty_whitelist')
    .select('email')
    .eq('email', lowerEmail)
    .maybeSingle()

  if (!facultyError && facultyCheck) {
    return { isValid: true, role: 'faculty' }
  }

  // Step 2: Check student domain
  const domain = lowerEmail.split('@')[1]
  
  if (!domain) {
    return { 
      isValid: false, 
      role: null, 
      error: 'Invalid email format.' 
    }
  }

  const { data: domainCheck, error: domainError } = await supabase
    .from('allowed_domains')
    .select('domain, is_student_domain')
    .eq('domain', domain)
    .maybeSingle()

  if (!domainError && domainCheck && domainCheck.is_student_domain) {
    return { isValid: true, role: 'student' }
  }

  return { 
    isValid: false, 
    role: null, 
    error: 'Email not authorized. Students must use institutional emails. Faculty must be whitelisted.' 
  }
}