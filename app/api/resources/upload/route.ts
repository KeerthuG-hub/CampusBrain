import { NextRequest, NextResponse } from 'next/server'
import { createServerClientAsync } from '@/lib/supabase/server'
import { 
  uploadToGoogleDrive, 
  generateSlug, 
  generateFolderPath, 
  getPreviewUrl,
  getFolderUrl,
  checkRateLimit,
  validateFileType
} from '@/lib/gdrive'

const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE || '50')) * 1024 * 1024

const POINTS = {
  UPLOAD: 10,
  APPROVED: 5,
  VIEWED: 2,
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClientAsync()

  try {
    // ========================================
    // 1. AUTHENTICATE USER
    // ========================================
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }

    console.log(`📤 Upload request from user: ${user.id}`)

    // ========================================
    // 2. GET USER PROFILE
    // ========================================
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    console.log(`👤 User role: ${profile.role}`)

    // ========================================
    // 3. RATE LIMITING
    // ========================================
    const { allowed, remaining } = checkRateLimit(user.id)
    
    if (!allowed) {
      console.warn(`⚠️  Rate limit exceeded for user: ${user.id}`)
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Maximum 10 uploads per hour.',
          retry_after: '1 hour'
        },
        { status: 429 }
      )
    }

    console.log(`✅ Rate limit OK. Remaining: ${remaining}/10`)

    // ========================================
    // 4. PARSE FORM DATA
    // ========================================
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const resourceType = formData.get('resource_type') as string
    const courseId = formData.get('course_id') as string

    // Validation
    if (!file || !title || !resourceType || !courseId) {
      return NextResponse.json(
        { error: 'Missing required fields: title, file, resource_type, course_id' },
        { status: 400 }
      )
    }

    console.log(`📄 File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)

    // ========================================
    // 5. FILE VALIDATION
    // ========================================
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${process.env.MAX_FILE_SIZE || 50}MB limit` },
        { status: 400 }
      )
    }

    // Check file type
    if (!validateFileType(file.name, file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, PPT, DOC, Images' },
        { status: 400 }
      )
    }

    // ========================================
    // 6. GET COURSE DETAILS
    // ========================================
    const { data: course } = await supabase
      .from('courses')
      .select('semester_number, name, code')
      .eq('id', courseId)
      .single()

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    console.log(`📚 Course: ${course.code} - ${course.name}`)

    // ========================================
    // 7. UPLOAD TO GOOGLE DRIVE
    // ========================================
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const folderPath = generateFolderPath(
      course.semester_number,
      course.code,
      course.name,
      resourceType
    )

    console.log(`📂 Folder path: ${folderPath}`)

    const { fileId, webViewLink, folderId } = await uploadToGoogleDrive(
      buffer,
      file.name,
      file.type,
      folderPath
    )

    console.log(`✅ Uploaded to Google Drive: ${fileId}`)

    // ========================================
    // 8. SAVE TO DATABASE
    // ========================================
    
    // Faculty uploads are auto-approved
    const isApproved = profile.role === 'faculty' || profile.role === 'admin'

    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        file_url: getPreviewUrl(fileId),
        file_type: file.type,
        resource_type: resourceType,
        uploader_id: user.id,
        course_id: courseId,
        is_approved: isApproved,
        view_count: 0,
        download_count: 0,
      })
      .select()
      .single()

    if (resourceError) {
      console.error('❌ Database error:', resourceError)
      
      // Cleanup: Delete uploaded file
      try {
        const { deleteFromGoogleDrive } = await import('@/lib/gdrive')
        await deleteFromGoogleDrive(fileId)
        console.log('🧹 Cleaned up uploaded file after DB error')
      } catch (deleteError) {
        console.error('Failed to cleanup uploaded file:', deleteError)
      }
      
      throw resourceError
    }

    console.log(`💾 Saved to database: ${resource.id}`)

    // ========================================
    // 9. CREATE STORAGE MAPPING
    // ========================================
    const slug = generateSlug(title, resource.id)
    await supabase
      .from('storage_mappings')
      .insert({
        resource_id: resource.id,
        provider: 'gdrive',
        external_link: webViewLink,
        internal_slug: slug,
      })

    // ========================================
    // 10. AWARD POINTS
    // ========================================
    const pointsEarned = isApproved ? POINTS.UPLOAD + POINTS.APPROVED : POINTS.UPLOAD
    
    // Log activity
    await supabase
      .from('user_activity')
      .insert({
        user_id: user.id,
        action_type: isApproved ? 'resource_approved' : 'resource_uploaded',
        resource_id: resource.id,
        points_earned: pointsEarned,
      })

    // Update user points
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', user.id)
      .single()

    await supabase
      .from('profiles')
      .update({ points: (currentProfile?.points || 0) + pointsEarned })
      .eq('id', user.id)

    console.log(`🎯 Awarded ${pointsEarned} points`)

    // ========================================
    // 11. RETURN SUCCESS
    // ========================================
    return NextResponse.json({
      success: true,
      resource: {
        ...resource,
        view_link: webViewLink,
        folder_link: getFolderUrl(folderId),
      },
      folder_url: getFolderUrl(folderId),
      points_earned: pointsEarned,
      rate_limit: {
        remaining,
        reset_in: '1 hour'
      },
      message: isApproved 
        ? `✅ Resource uploaded and approved! Earned ${pointsEarned} points.` 
        : `✅ Resource uploaded! Pending approval. Earned ${pointsEarned} points.`,
    })

  } catch (error: any) {
    console.error('❌ Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload resource' },
      { status: 500 }
    )
  }
}