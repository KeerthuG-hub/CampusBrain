// lib/supabase/api.ts
import { createClient } from './client'

import { supabase } from '@/lib/supabase/client'


export async function getResources(courseId: string, category: string) {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('course_id', courseId)
    .eq('resource_type', category)

  if (error) {
    console.error(error)
    return []
  }

  return data
}
