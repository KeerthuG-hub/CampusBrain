// File: app/api/resources/approve/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const POINTS = {
  APPROVED: 5
}

async function awardPoints(
  supabase: any,
  userId: string,
  points: number,
  actionType: string,
  resourceId?: string
) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single()
    
    await supabase
      .from('profiles')
      .update({ 
        points: (profile?.points || 0) + points,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    await supabase
      .from('user_activity')
      .insert({
        user_id: userId,
        action_type: actionType,
        resource_id: resourceId,
        points_earned: points
      })
    
    return true
  } catch (error) {
    console.error('Error awarding points:', error)
    return false
  }
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is faculty/admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Only faculty and admins can approve resources' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { resource_id } = body

    if (!resource_id) {
      return NextResponse.json(
        { error: 'resource_id is required' },
        { status: 400 }
      )
    }

    // Get resource to find uploader
    const { data: resource, error: fetchError } = await supabase
      .from('resources')
      .select('uploader_id, title, is_approved')
      .eq('id', resource_id)
      .single()

    if (fetchError || !resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      )
    }

    if (resource.is_approved) {
      return NextResponse.json(
        { error: 'Resource is already approved' },
        { status: 400 }
      )
    }

    // Approve resource
    const { error: updateError } = await supabase
      .from('resources')
      .update({ 
        is_approved: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', resource_id)

    if (updateError) {
      throw updateError
    }

    // Award bonus points to uploader
    await awardPoints(
      supabase,
      resource.uploader_id,
      POINTS.APPROVED,
      'resource_approved',
      resource_id
    )

    return NextResponse.json({
      success: true,
      message: 'Resource approved successfully',
      resource_id,
      points_awarded: POINTS.APPROVED
    })

  } catch (error: any) {
    console.error('Approve error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve resource' },
      { status: 500 }
    )
  }
}