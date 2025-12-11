/*import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { uploadToGoogleDrive, generateSlug, generateFolderPath, getPreviewUrl } from '@/lib/gdrive'

const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE || '50')) * 1024 * 1024 // Convert MB to bytes

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const resourceType = formData.get('resource_type') as string
    const courseCode = formData.get('course_code') as string

    // Validation
    if (!file || !title || !resourceType || !courseCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${process.env.MAX_FILE_SIZE || 50}MB limit` },
        { status: 400 }
      )
    }

    // Get course details for folder structure
    const { data: course } = await supabase
      .from('courses')
      .select('semester_number, name')
      .eq('code', courseCode)
      .single()

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate folder path: "Semester 3/CS101 - Data Structures/Notes"
    const folderPath = generateFolderPath(
      course.semester_number,
      courseCode,
      course.name,
      resourceType
    )

    // Upload to Google Drive
    const { fileId, webViewLink, webContentLink } = await uploadToGoogleDrive(
      buffer,
      file.name,
      file.type,
      folderPath
    )

    // Faculty uploads are auto-approved
    const isApproved = profile?.role === 'faculty' || profile?.role === 'admin'

    // Insert resource into database
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .insert({
        title,
        description,
        file_url: getPreviewUrl(fileId),
        file_type: file.type,
        resource_type: resourceType,
        uploader_id: user.id,
        uploader_name: profile?.full_name || user.email,
        course_code: courseCode,
        is_approved: isApproved,
        is_verified: false,
      })
      .select()
      .single()

    if (resourceError) {
      // If DB insert fails, try to delete the uploaded file
      try {
        const { deleteFromGoogleDrive } = await import('@/lib/gdrive')
        await deleteFromGoogleDrive(fileId)
      } catch (deleteError) {
        console.error('Failed to cleanup uploaded file:', deleteError)
      }
      throw resourceError
    }

    // Create storage mapping
    const slug = generateSlug(title, resource.id)
    const { error: mappingError } = await supabase
      .from('storage_mappings')
      .insert({
        resource_id: resource.id,
        provider: 'gdrive',
        external_link: webViewLink,
        internal_slug: slug,
      })

    if (mappingError) throw mappingError

    // Create course tag
    const { data: courseTag } = await supabase
      .from('tags')
      .upsert(
        { name: courseCode, type: 'course' },
        { onConflict: 'name,type', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (courseTag) {
      await supabase
        .from('resource_tags')
        .insert({
          resource_id: resource.id,
          tag_id: courseTag.id,
          auto_tagged: true,
        })
    }

    // Log activity and award points
    const pointsEarned = isApproved ? 10 : 5
    
    await supabase
      .from('user_activity')
      .insert({
        user_id: user.id,
        action_type: 'upload',
        resource_id: resource.id,
        points_earned: pointsEarned,
      })

    // Update user points
    await supabase.rpc('increment_user_points', {
      user_id: user.id,
      points: pointsEarned,
    })

    return NextResponse.json({
      success: true,
      resource: {
        ...resource,
        download_link: webContentLink,
      },
      message: isApproved 
        ? 'Resource uploaded successfully!' 
        : 'Resource uploaded. Pending faculty approval.',
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload resource' },
      { status: 500 }
    )
  }
}

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}*/

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { uploadToGoogleDrive, generateSlug, generateFolderPath, getPreviewUrl } from '@/lib/gdrive'

const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE || '50')) * 1024 * 1024 // Convert MB to bytes

export async function POST(request: NextRequest) {
  // FIX 1: Proper cookie handling in Next.js 15
  const cookieStore = await cookies()
  const supabase = createServerClient()

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const resourceType = formData.get('resource_type') as string
    const courseCode = formData.get('course_code') as string

    // Validation
    if (!file || !title || !resourceType || !courseCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${process.env.MAX_FILE_SIZE || 50}MB limit` },
        { status: 400 }
      )
    }

    // Get course details for folder structure
    const { data: course } = await supabase
      .from('courses')
      .select('semester_number, name')
      .eq('code', courseCode)
      .single()

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // FIX 2: Current folder hierarchy logic
    // Generates path: "Semester 3/CS101 - Data Structures/Notes"
    // This creates organized structure by:
    // 1. Semester Number (e.g., "Semester 3")
    // 2. Course Code + Name (e.g., "CS101 - Data Structures")
    // 3. Resource Type (e.g., "Notes", "Question Papers", "Lab Materials")
    const folderPath = generateFolderPath(
      course.semester_number,
      courseCode,
      course.name,
      resourceType
    )

    // Upload to Google Drive
    const { fileId, webViewLink, webContentLink } = await uploadToGoogleDrive(
      buffer,
      file.name,
      file.type,
      folderPath
    )

    // Faculty uploads are auto-approved
    const isApproved = profile?.role === 'faculty' || profile?.role === 'admin'

    // Insert resource into database
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .insert({
        title,
        description,
        file_url: getPreviewUrl(fileId),
        file_type: file.type,
        resource_type: resourceType,
        uploader_id: user.id,
        uploader_name: profile?.full_name || user.email,
        course_code: courseCode,
        is_approved: isApproved,
        is_verified: false,
        // FIX 3: Removed download tracking fields - Google Drive CDN handles this
        // No download_count, last_downloaded_at, etc.
      })
      .select()
      .single()

    if (resourceError) {
      // If DB insert fails, try to delete the uploaded file
      try {
        const { deleteFromGoogleDrive } = await import('@/lib/gdrive')
        await deleteFromGoogleDrive(fileId)
      } catch (deleteError) {
        console.error('Failed to cleanup uploaded file:', deleteError)
      }
      throw resourceError
    }

    // Create storage mapping
    const slug = generateSlug(title, resource.id)
    const { error: mappingError } = await supabase
      .from('storage_mappings')
      .insert({
        resource_id: resource.id,
        provider: 'gdrive',
        external_link: webViewLink,
        internal_slug: slug,
      })

    if (mappingError) throw mappingError

    // Create course tag
    const { data: courseTag } = await supabase
      .from('tags')
      .upsert(
        { name: courseCode, type: 'course' },
        { onConflict: 'name,type', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (courseTag) {
      await supabase
        .from('resource_tags')
        .insert({
          resource_id: resource.id,
          tag_id: courseTag.id,
          auto_tagged: true,
        })
    }

    // Log activity and award points
    const pointsEarned = isApproved ? 10 : 5
    
    await supabase
      .from('user_activity')
      .insert({
        user_id: user.id,
        action_type: 'upload',
        resource_id: resource.id,
        points_earned: pointsEarned,
      })

    // Update user points
    await supabase.rpc('increment_user_points', {
      user_id: user.id,
      points: pointsEarned,
    })

    // FIX 3: Return only preview link (not download link)
    // Users will use Google Drive's interface to download
    return NextResponse.json({
      success: true,
      resource: {
        ...resource,
        view_link: webViewLink, // Direct Google Drive view link
      },
      message: isApproved 
        ? 'Resource uploaded successfully!' 
        : 'Resource uploaded. Pending faculty approval.',
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload resource' },
      { status: 500 }
    )
  }
}

// Note: Next.js 15 App Router handles multipart/form-data automatically
// No need for bodyParser config