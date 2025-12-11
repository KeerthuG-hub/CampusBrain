// app/api/resources/edit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClientAsync } from '@/lib/supabase/server'

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClientAsync()
    
    // Debug: Check if we can get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('🔐 Edit Route - Session check:', {
      hasSession: !!session,
      sessionError: sessionError?.message,
      userId: session?.user?.id
    })

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { 
          error: 'Unauthorized - No valid session found',
          details: sessionError?.message || 'Please log in again'
        },
        { status: 401 }
      )
    }

    const user = session.user

    // Parse request body
    const body = await request.json()
    const { resource_id, title, description } = body

    console.log('📝 Edit request:', { resource_id, title, userId: user.id })

    if (!resource_id) {
      return NextResponse.json(
        { error: 'resource_id is required' },
        { status: 400 }
      )
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title cannot be empty' },
        { status: 400 }
      )
    }

    // Get resource to check permissions
    const { data: resource, error: fetchError } = await supabase
      .from('resources')
      .select('uploader_id')
      .eq('id', resource_id)
      .single()

    console.log('🔍 Resource fetch:', { found: !!resource, error: fetchError?.message })

    if (fetchError || !resource) {
      return NextResponse.json(
        { error: 'Resource not found', details: fetchError?.message },
        { status: 404 }
      )
    }

    // Check user permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('👤 User profile:', { role: profile?.role, userId: user.id })

    const isFacultyOrAdmin = profile?.role === 'faculty' || profile?.role === 'admin'

    if (!isFacultyOrAdmin) {
      return NextResponse.json(
        { 
          error: 'Permission denied',
          details: 'Only faculty and admin can edit resources'
        },
        { status: 403 }
      )
    }

    // Update resource
    const { data: updatedResource, error: updateError } = await supabase
      .from('resources')
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', resource_id)
      .select('*, profiles!resources_uploader_id_fkey(full_name, avatar_url, role)')
      .single()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      throw updateError
    }

    console.log('✅ Resource updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Resource updated successfully',
      resource: updatedResource
    })

  } catch (error: any) {
    console.error('💥 Edit route error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message || 'Failed to update resource'
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  return PUT(request)
}