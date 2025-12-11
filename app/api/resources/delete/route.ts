// app/api/resources/delete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClientAsync } from '@/lib/supabase/server'
import { deleteFromGoogleDrive } from '@/lib/gdrive'

function extractGDriveId(url: string): string | null {
  const patterns = [
    /\/d\/([^\/]+)/,
    /\/file\/d\/([^\/]+)/,
    /\/preview\?id=([^&]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClientAsync()
    
    // Get session instead of getUser
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('🔐 Delete Route - Session check:', {
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

    // Get resource_id from URL
    const { searchParams } = new URL(request.url)
    const resource_id = searchParams.get('resource_id')

    if (!resource_id) {
      return NextResponse.json(
        { error: 'resource_id is required' },
        { status: 400 }
      )
    }

    console.log('🗑️ Delete request:', { resource_id, userId: user.id })

    // Get resource
    const { data: resource, error: fetchError } = await supabase
      .from('resources')
      .select('uploader_id, file_url')
      .eq('id', resource_id)
      .single()

    if (fetchError || !resource) {
      return NextResponse.json(
        { error: 'Resource not found', details: fetchError?.message },
        { status: 404 }
      )
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isFaculty = profile?.role === 'faculty' || profile?.role === 'admin'
    const isOwner = resource.uploader_id === user.id

    console.log('👤 Permission check:', {
      isFaculty,
      isOwner,
      role: profile?.role
    })

    if (!isFaculty && !isOwner) {
      return NextResponse.json(
        { 
          error: 'Permission denied',
          details: 'You do not have permission to delete this resource'
        },
        { status: 403 }
      )
    }

    // Delete from Google Drive
    const fileId = extractGDriveId(resource.file_url)
    if (fileId) {
      try {
        await deleteFromGoogleDrive(fileId)
        console.log('✅ Deleted from Google Drive:', fileId)
      } catch (error) {
        console.error('⚠️ Failed to delete from Google Drive:', error)
        // Continue with DB deletion even if Drive deletion fails
      }
    }

    // Delete storage mapping
    await supabase
      .from('storage_mappings')
      .delete()
      .eq('resource_id', resource_id)

    // Delete resource tags
    await supabase
      .from('resource_tags')
      .delete()
      .eq('resource_id', resource_id)

    // Delete activity logs
    await supabase
      .from('user_activity')
      .delete()
      .eq('resource_id', resource_id)

    // Delete resource
    const { error: deleteError } = await supabase
      .from('resources')
      .delete()
      .eq('id', resource_id)

    if (deleteError) {
      throw deleteError
    }

    console.log('✅ Resource deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Resource deleted successfully',
    })

  } catch (error: any) {
    console.error('💥 Delete route error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message || 'Failed to delete resource'
      },
      { status: 500 }
    )
  }
}