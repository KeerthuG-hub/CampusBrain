import { createApiClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { requestId, facultyId, topic, description, publicationIds } = await request.json()
    const supabase = await createApiClient()
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'student') {
      return NextResponse.json({ error: 'Only students can send requests' }, { status: 403 })
    }
    
    // Send request
    const { data, error } = await supabase.rpc('send_faculty_request', {
      p_request_id: requestId,
      p_faculty_id: facultyId,
      p_topic: topic,
      p_description: description || '',
      p_relevant_pub_ids: publicationIds || []
    })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('Send request error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}