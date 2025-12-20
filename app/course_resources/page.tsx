'use client'

import React, { useState, useEffect } from 'react'
import {
  Search, Upload, Filter, BookOpen, FileText, FileQuestion, ChevronRight, 
  Calendar, Eye, CheckCircle, XCircle, Trash2, ExternalLink, Edit, Award,
  User, Star, Clock, AlertCircle, X, Loader2, Check, Save
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  role: 'student' | 'faculty' | 'admin'
  points: number
}

interface Resource {
  id: string
  title: string
  description: string
  file_url: string
  resource_type: 'notes' | 'book' | 'ppt' | 'question_paper' | 'course_plan'
  uploader_id: string
  view_count: number
  download_count: number
  is_approved: boolean
  created_at: string
  course_id: string
  profiles?: {
    full_name: string
    avatar_url: string | null
    role: 'student' | 'faculty' | 'admin'
  }
}

interface Course {
  id: string
  code: string
  name: string
  semester_number: number
  credits: number
  description: string
  course_mode: string
}

type CategoryKey = 'course_plan' | 'notes' | 'book' | 'question_paper'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'confirm'
  message: string
  onConfirm?: () => void
  onCancel?: () => void
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const categoryConfig = {
  course_plan: { icon: Calendar, color: 'bg-indigo-500', label: 'Course Plan' },
  notes: { icon: FileText, color: 'bg-blue-500', label: 'Notes & PPTs' },
  book: { icon: BookOpen, color: 'bg-green-500', label: 'Books' },
  question_paper: { icon: FileQuestion, color: 'bg-red-500', label: 'Question Papers' }
}

const courseModeConfig: Record<string, { color: string, label: string, borderGradient: string }> = {
  'THEORY': { 
    color: 'bg-blue-500', 
    label: 'Theory',
    borderGradient: 'border-blue-400 hover:border-blue-500 hover:shadow-blue-200'
  },
  'THEORY CUM PRACTICAL': { 
    color: 'bg-purple-500', 
    label: 'Theory cum Practical',
    borderGradient: 'border-purple-400 hover:border-purple-500 hover:shadow-purple-200'
  },
  'AUDIT COURSE': { 
    color: 'bg-amber-500', 
    label: 'Audit Course',
    borderGradient: 'border-amber-400 hover:border-amber-500 hover:shadow-amber-200'
  },
  'PRACTICAL': { 
    color: 'bg-green-500', 
    label: 'Practical',
    borderGradient: 'border-green-400 hover:border-green-500 hover:shadow-green-200'
  }
}

const getCourseModeBadge = (courseMode: string) => {
  if (!courseMode) return null
  
  const upperMode = courseMode.toUpperCase().trim()
  const config = courseModeConfig[upperMode]
  
  if (config) {
    return { color: config.color, label: config.label, borderGradient: config.borderGradient }
  }
  
  // Fallback for variations
  if (upperMode.includes('AUDIT')) {
    return { 
      color: 'bg-amber-500', 
      label: 'Audit Course',
      borderGradient: 'border-amber-400 hover:border-amber-500 hover:shadow-amber-200'
    }
  }
  if (upperMode.includes('PRACTICAL') && upperMode.includes('THEORY')) {
    return { 
      color: 'bg-purple-500', 
      label: 'Theory cum Practical',
      borderGradient: 'border-purple-400 hover:border-purple-500 hover:shadow-purple-200'
    }
  }
  if (upperMode.includes('PRACTICAL')) {
    return { 
      color: 'bg-green-500', 
      label: 'Practical',
      borderGradient: 'border-green-400 hover:border-green-500 hover:shadow-green-200'
    }
  }
  if (upperMode.includes('THEORY')) {
    return { 
      color: 'bg-blue-500', 
      label: 'Theory',
      borderGradient: 'border-blue-400 hover:border-blue-500 hover:shadow-blue-200'
    }
  }
  
  return { 
    color: 'bg-slate-500', 
    label: courseMode,
    borderGradient: 'border-slate-300 hover:border-slate-400 hover:shadow-slate-200'
  }
}

const semesterColors = [
  'from-red-500 to-orange-500', 'from-orange-500 to-amber-500',
  'from-amber-500 to-yellow-500', 'from-green-500 to-emerald-500',
  'from-emerald-500 to-teal-500', 'from-cyan-500 to-blue-500',
  'from-blue-500 to-indigo-500', 'from-indigo-500 to-purple-500'
]

const POINTS = {
  UPLOAD: 10,
  APPROVED: 5,
  VIEWED: 2
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const awardPoints = async (
  userId: string,
  points: number,
  actionType: string,
  resourceId?: string
) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single()
    
    await supabase
      .from('profiles')
      .update({ points: (profile?.points || 0) + points })
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

// ============================================================================
// COMPONENTS
// ============================================================================

const NotificationCenter = ({ notifications, onDismiss }: { 
  notifications: Notification[]
  onDismiss: (id: string) => void 
}) => {
  if (notifications.length === 0) return null

  const hasConfirm = notifications.some(n => n.type === 'confirm')

  return (
    <>
      {hasConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
      )}
      
      <div className="fixed top-1/2 right-6 -translate-y-1/2 z-50 space-y-3 max-w-sm">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white rounded-2xl shadow-2xl border-2 p-5 animate-slide-in ${
              notification.type === 'success' ? 'border-green-500' :
              notification.type === 'error' ? 'border-red-500' :
              notification.type === 'confirm' ? 'border-amber-500' :
              'border-blue-500'
            }`}
          >
            <div className="flex items-start gap-3">
              {notification.type === 'success' && (
                <div className="bg-green-100 p-2.5 rounded-xl flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              )}
              {notification.type === 'error' && (
                <div className="bg-red-100 p-2.5 rounded-xl flex-shrink-0">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              )}
              {notification.type === 'confirm' && (
                <div className="bg-amber-100 p-2.5 rounded-xl flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
              )}
              {notification.type === 'info' && (
                <div className="bg-blue-100 p-2.5 rounded-xl flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 leading-relaxed">{notification.message}</p>
                
                {notification.type === 'confirm' && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        notification.onConfirm?.()
                        onDismiss(notification.id)
                      }}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm font-bold shadow-lg"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => {
                        notification.onCancel?.()
                        onDismiss(notification.id)
                      }}
                      className="flex-1 px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors text-sm font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              
              {notification.type !== 'confirm' && (
                <button
                  onClick={() => onDismiss(notification.id)}
                  className="text-slate-400 hover:text-slate-600 transition flex-shrink-0 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translate(100%, -50%);
            opacity: 0;
          }
          to {
            transform: translate(0, -50%);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </>
  )
}

const Avatar = ({ name, avatarUrl, role }: { 
  name: string
  avatarUrl: string | null
  role: string 
}) => {
  const getInitials = (name: string) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  
  const getRoleColor = (role: string) => {
    if (role === 'faculty') return 'bg-purple-500'
    if (role === 'admin') return 'bg-red-500'
    return 'bg-blue-500'
  }

  return (
    <div className="relative group">
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt={name} 
          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md" 
        />
      ) : (
        <div className={`w-10 h-10 rounded-full ${getRoleColor(role)} flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-md`}>
          {getInitials(name)}
        </div>
      )}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        {name} ({role})
      </div>
    </div>
  )
}

const ResourceCard = ({
  resource, 
  currentUser,
  onApprove, 
  onDelete,
  onRefresh,
  showNotification
}: {
  resource: Resource
  currentUser: Profile | null
  onApprove?: (id: string) => void
  onDelete?: (id: string) => void
  onRefresh?: () => void
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(resource.title)
  const [editDescription, setEditDescription] = useState(resource.description || '')
  const [isSaving, setSaving] = useState(false)
  
  const canModerate = currentUser?.role === 'faculty' || currentUser?.role === 'admin'
  const isOwnUpload = resource.uploader_id === currentUser?.id
  
  const uploaderName = resource.profiles?.full_name || 'Unknown User'
  const uploaderAvatar = resource.profiles?.avatar_url || null
  const uploaderRole = resource.profiles?.role || 'student'

  const handleAccessResource = async () => {
    try {
      // Only increment view count
      await supabase
        .from('resources')
        .update({ 
          view_count: (resource.view_count || 0) + 1
        })
        .eq('id', resource.id)
      
      // Award points to uploader for views
      if (resource.uploader_id !== currentUser?.id) {
        await awardPoints(
          resource.uploader_id,
          POINTS.VIEWED,
          'resource_viewed',
          resource.id
        )
      }
      
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Failed to update view count:', error)
    }
    
    window.open(resource.file_url, '_blank', 'noopener,noreferrer')
  }

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      showNotification('error', 'Title cannot be empty')
      return
    }

    setSaving(true)
    try {
  const response = await fetch('/api/resources/edit', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', 
    body: JSON.stringify({
      resource_id: resource.id,
      title: editTitle,
      description: editDescription
    })
  })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update')
      }

      setIsEditing(false)
      showNotification('success', 'Resource updated successfully')
      if (onRefresh) onRefresh()
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to update resource')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditTitle(resource.title)
    setEditDescription(resource.description || '')
    setIsEditing(false)
  }

  const showPriorityBadge = canModerate && isOwnUpload

  return (
    <div className={`bg-white rounded-xl p-6 border-2 ${
      showPriorityBadge ? 'border-purple-300 bg-purple-50/30' :
      resource.is_approved ? 'border-slate-200' : 'border-amber-300'
    } hover:shadow-lg transition-all relative`}>
      
      {showPriorityBadge && (
<div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
          <div className="px-2 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
            <Star className="w-3 h-3" />
            Your Upload
          </div>
        </div>
      )}
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={uploaderName} avatarUrl={uploaderAvatar} role={uploaderRole} />
          <div>
            <p className="text-sm font-semibold text-slate-900">{uploaderName}</p>
            <p className="text-xs text-slate-500 capitalize">{uploaderRole}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!resource.is_approved && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Not Approved
            </span>
          )}
          {resource.is_approved && !showPriorityBadge && (
            <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Approved
            </div>
          )}
        </div>
      </div>
      
      {/* Editable Title and Description */}
      {isEditing ? (
        <div className="space-y-3 mb-4">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-3 py-2 border-2 border-blue-500 rounded-lg text-lg font-bold focus:outline-none"
            placeholder="Resource title"
            disabled={isSaving}
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full px-3 py-2 border-2 border-blue-500 rounded-lg text-sm focus:outline-none resize-none"
            placeholder="Description (optional)"
            rows={3}
            disabled={isSaving}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-bold text-slate-900 line-clamp-2 flex-1">{resource.title}</h3>
            {canModerate && (
              <button
                onClick={() => setIsEditing(true)}
                className="ml-2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit resource"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
          </div>
          {resource.description && (
            <p className="text-sm text-slate-600 mb-4 line-clamp-2">{resource.description}</p>
          )}
        </>
      )}
      
      <div className="flex items-center gap-4 text-sm text-slate-500 mb-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-1">
          <Eye className="w-4 h-4" />
          <span className="font-medium">{resource.view_count || 0} views</span>
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded">
          <Clock className="w-3 h-3" />
          {new Date(resource.created_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      </div>
      
      <button
        onClick={handleAccessResource}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-semibold"
      >
        <ExternalLink className="w-4 h-4" />
        View Resource
      </button>
      
      {canModerate && (
        <div className="flex gap-2 mt-3">
          {!resource.is_approved && onApprove && (
            <button
              onClick={() => onApprove(resource.id)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-semibold border border-emerald-200"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(resource.id)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold border border-red-200"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const UploadModal = ({ 
  category, 
  course,
  currentUser,
  onClose,
  onSuccess,
  showNotification
}: { 
  category: CategoryKey | null
  course: Course | null
  currentUser: Profile | null
  onClose: () => void
  onSuccess: () => void
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  if (!category || !course || !currentUser) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size exceeds 50MB limit')
        setFile(null)
        return
      }
      setFile(selectedFile)
      setError('')
    }
  }

  const handleUpload = async () => {
    setError('')

    if (!title.trim() || !file) {
      setError('Title and file are required')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('resource_type', category)
      formData.append('course_id', course.id)
      formData.append('file', file)

      const response = await fetch('/api/resources/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Award upload points
      await awardPoints(
        currentUser.id,
        POINTS.UPLOAD,
        'resource_uploaded',
        data.resourceId
      )

      // Close modal first
      onClose()
      
      // Then show notification with points info
      showNotification('success', `Resource uploaded successfully! +${POINTS.UPLOAD} points earned`)
      onSuccess()
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const CategoryIcon = categoryConfig[category].icon

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={`${categoryConfig[category].color} p-2 rounded-lg shadow-md`}>
              <CategoryIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Upload {categoryConfig[category].label}
              </h3>
              <p className="text-sm text-slate-500">{course.code} • {course.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 mb-1">🎯 Earn Points!</p>
                <div className="text-xs text-blue-700">
                  <p>Upload resources to earn points and climb the leaderboard</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Resource Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Unit 3 - Data Structures Complete Notes"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Upload File <span className="text-red-500">*</span> <span className="text-xs text-slate-500">(Max 50MB)</span>
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              disabled={uploading}
            />
            {file && (
              <p className="text-xs text-green-600 mt-1">✓ {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Description <span className="text-slate-400 text-xs">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the content, topics covered, etc."
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition"
              disabled={uploading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">Upload Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-semibold"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !title.trim() || !file}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Resource
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AcademicResourceHub() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [view, setView] = useState<'home' | 'semester' | 'course' | 'category'>('home')
  const [courses, setCourses] = useState<Course[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'approved'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState<CategoryKey | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const showNotification = (type: 'success' | 'error' | 'info' | 'confirm', message: string) => {
    const id = Math.random().toString(36).substr(2, 9)
    setNotifications(prev => [...prev, { id, type, message }])
    
    if (type !== 'confirm') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, 4000)
    }
  }

  const showDeleteConfirm = (resourceId: string) => {
    const id = Math.random().toString(36).substr(2, 9)
    setNotifications(prev => [...prev, {
      id,
      type: 'confirm',
      message: 'Are you sure you want to delete this resource? This action cannot be undone.',
      onConfirm: () => handleDeleteConfirmed(resourceId),
      onCancel: () => {}
    }])
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          if (data) setCurrentUser(data)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      }
    }
    fetchCurrentUser()
  }, [])
  // At the top of AcademicResourceHub component, add this useEffect:
useEffect(() => {
  // Check for stored course selection from faculty dashboard
  const storedCourse = sessionStorage.getItem('selectedCourse')
  
  if (storedCourse && courses.length > 0) {
    try {
      const courseInfo = JSON.parse(storedCourse)
      
      // Find the course in our courses list
      const course = courses.find(c => c.id === courseInfo.id)
      
      if (course) {
        // Set semester and course, then navigate to course view
        setSelectedSemester(courseInfo.semester)
        setSelectedCourse(course)
        setView('course')
        
        // Clear the stored data after using it
        sessionStorage.removeItem('selectedCourse')
      }
    } catch (err) {
      console.error('Error parsing stored course:', err)
      sessionStorage.removeItem('selectedCourse')
    }
  }
}, [courses]) // Run when courses are loaded

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase.from('courses').select('*').order('name', { ascending: true })
        if (!error && data) setCourses(data)
      } catch (error) {
        console.error('Error fetching courses:', error)
      }
    }
    fetchCourses()
  }, [])

  useEffect(() => {
    if (!selectedCourse) return
    
    const fetchResources = async () => {
      try {
        let query = supabase
          .from('resources')
          .select('*, profiles!resources_uploader_id_fkey(full_name, avatar_url, role)')
          .eq('course_id', selectedCourse.id)
        
        if (currentUser?.role !== 'student' && filterType === 'approved') {
  query = query.eq('is_approved', true)
}
        
        const { data, error } = await query
        
        if (!error && data) {
          // Sort: Approved faculty resources first, then by view count
          const sorted = (data as Resource[]).sort((a, b) => {
            // Priority 1: Faculty-approved resources
            const aIsFacultyApproved = a.is_approved && (a.profiles?.role === 'faculty' || a.profiles?.role === 'admin')
            const bIsFacultyApproved = b.is_approved && (b.profiles?.role === 'faculty' || b.profiles?.role === 'admin')
            
            if (aIsFacultyApproved && !bIsFacultyApproved) return -1
            if (!aIsFacultyApproved && bIsFacultyApproved) return 1
            
            // Priority 2: Approved status
            if (a.is_approved && !b.is_approved) return -1
            if (!a.is_approved && b.is_approved) return 1
            
            // Priority 3: View count
            return (b.view_count || 0) - (a.view_count || 0)
          })
          
          setResources(sorted)
        } else {
          setResources([])
        }
      } catch (error) {
        console.error('Error fetching resources:', error)
        setResources([])
      }
    }
    fetchResources()
  }, [selectedCourse, filterType, currentUser])

  const handleApprove = async (resourceId: string) => {
    try {
      const { error } = await supabase
        .from('resources')
        .update({ is_approved: true })
        .eq('id', resourceId)
      
      if (!error) {
        setResources(prev => prev.map(r => 
          r.id === resourceId ? { ...r, is_approved: true } : r
        ))
        
        const resource = resources.find(r => r.id === resourceId)
        if (resource) {
          const pointsAwarded = await awardPoints(
            resource.uploader_id,
            POINTS.APPROVED,
            'resource_approved',
            resourceId
          )
          
          if (pointsAwarded) {
            showNotification('success', `Resource approved! +${POINTS.APPROVED} points awarded to uploader`)
          }
        }
        
        if (!resource) {
          showNotification('success', 'Resource approved successfully')
        }
      }
    } catch (error) {
      console.error('Error approving resource:', error)
      showNotification('error', 'Failed to approve resource')
    }
  }

  const handleDeleteConfirmed = async (resourceId: string) => {
    try {
      // Get resource details before deletion to calculate points
      const resource = resources.find(r => r.id === resourceId)
      
      const response = await fetch(`/api/resources/delete?resource_id=${resourceId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete')
      }

      // Deduct points after successful deletion
      if (resource) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', resource.uploader_id)
          .single()
        
        let pointsToDeduct = POINTS.UPLOAD
        
        // If resource had views, keep the view points
        if (resource.view_count > 0) {
          pointsToDeduct = POINTS.UPLOAD // Only deduct upload points
          // View points are retained
        } else {
          pointsToDeduct = POINTS.UPLOAD // Deduct upload points
        }
        
        // If resource was approved, also deduct approval bonus
        if (resource.is_approved) {
          pointsToDeduct += POINTS.APPROVED
        }
        
        const newPoints = Math.max(0, (profile?.points || 0) - pointsToDeduct)
        
        await supabase
          .from('profiles')
          .update({ points: newPoints })
          .eq('id', resource.uploader_id)
        
        await supabase
          .from('user_activity')
          .insert({
            user_id: resource.uploader_id,
            action_type: 'resource_deleted',
            resource_id: resourceId,
            points_earned: -pointsToDeduct
          })
      }

      setResources(prev => prev.filter(r => r.id !== resourceId))
      showNotification('success', 'Resource deleted successfully')
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to delete resource')
    }
  }

  const refreshResources = async () => {
    if (!selectedCourse) return
    
    try {
      let query = supabase
        .from('resources')
        .select('*, profiles!resources_uploader_id_fkey(full_name, avatar_url, role)')
        .eq('course_id', selectedCourse.id)
      
      if (currentUser?.role !== 'student' && filterType === 'approved') {
  query = query.eq('is_approved', true)
}

      
      const { data, error } = await query
      
      if (!error && data) {
        // Sort: Approved faculty resources first, then by view count
        const sorted = (data as Resource[]).sort((a, b) => {
          const aIsFacultyApproved = a.is_approved && (a.profiles?.role === 'faculty' || a.profiles?.role === 'admin')
          const bIsFacultyApproved = b.is_approved && (b.profiles?.role === 'faculty' || b.profiles?.role === 'admin')
          
          if (aIsFacultyApproved && !bIsFacultyApproved) return -1
          if (!aIsFacultyApproved && bIsFacultyApproved) return 1
          
          if (a.is_approved && !b.is_approved) return -1
          if (!a.is_approved && b.is_approved) return 1
          
          return (b.view_count || 0) - (a.view_count || 0)
        })
        
        setResources(sorted)
      }
    } catch (error) {
      console.error('Error refreshing resources:', error)
    }
  }

  const getCategoryCount = (key: CategoryKey) => {
    return resources.filter(r => r.resource_type === key).length
  }

  if (view === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <NotificationCenter notifications={notifications} onDismiss={dismissNotification} />
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Resource Hub</h1>
                <p className="text-sm text-slate-500">Academic Resources & Materials</p>
              </div>
            </div>
            {currentUser && (
              <div className="flex items-center gap-3">
                <Avatar name={currentUser.full_name} avatarUrl={currentUser.avatar_url} role={currentUser.role} />
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{currentUser.full_name}</p>
                  <p className="text-xs text-slate-500 capitalize">{currentUser.role}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {currentUser && (
            <div className={`rounded-2xl p-6 mb-8 ${
              currentUser.role === 'faculty' || currentUser.role === 'admin'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600'
                : 'bg-gradient-to-r from-blue-500 to-cyan-600'
            }`}>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome, {currentUser.full_name}!</h2>
              <p className="text-white/90">
                {currentUser.role === 'faculty' || currentUser.role === 'admin'
                  ? 'You have access to approve, edit, and delete all resources.'
                  : 'Browse and view resources to enhance your learning!'}
              </p>
            </div>
          )}

         <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 mb-8">
  <h2 className="text-2xl font-bold text-slate-900 mb-6">Understanding TCE's Academic System</h2>
  
  {/* Course Classification */}
  <div className="mb-8">
    <h3 className="text-xl font-semibold text-slate-900 mb-4">Course Classification by Type</h3>
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          Theory Courses
        </h4>
        <p className="text-sm text-blue-800 mb-2">Classroom-based subjects emphasizing conceptual understanding and problem-solving.</p>
        <p className="text-xs text-blue-700 font-medium">Evaluation: CAT Exams (2), Assignments, Terminal Exam</p>
      </div>
      
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
          Theory-Cum-Practical
        </h4>
        <p className="text-sm text-purple-800 mb-2">Integrated courses combining theory with lab work.</p>
        <p className="text-xs text-purple-700 font-medium">Evaluation: CAT Exams (2), Lab Activities, Terminal Exam</p>
      </div>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          Practical (Laboratory)
        </h4>
        <p className="text-sm text-green-800 mb-2">Fully hands-on courses focusing on implementation and experimentation.</p>
        <p className="text-xs text-green-700 font-medium">Evaluation: Model Lab Exams (2), Terminal Practical</p>
      </div>
      
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
          Audit Courses
        </h4>
        <p className="text-sm text-amber-800 mb-2">Mandatory non-credit courses (e.g., Environmental Science).</p>
        <p className="text-xs text-amber-700 font-medium">Required for degree but don't count toward CGPA</p>
      </div>
    </div>
  </div>

  {/* Credit Structure */}
  <div className="mb-8">
    <h3 className="text-xl font-semibold text-slate-900 mb-4">Credit Structure & Distribution</h3>
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
      <div className="grid grid-cols-5 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">54-66</div>
          <div className="text-xs text-slate-600 mt-1">Foundation Courses (FC)</div>
          <div className="text-xs text-slate-500">HS, BS, ES</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">55</div>
          <div className="text-xs text-slate-600 mt-1">Professional Core (PCC)</div>
          <div className="text-xs text-slate-500">Essential CSE</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">24-39</div>
          <div className="text-xs text-slate-600 mt-1">Professional Elective (PEC)</div>
          <div className="text-xs text-slate-500">Specialization</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">6-12</div>
          <div className="text-xs text-slate-600 mt-1">Open Elective (OEC)</div>
          <div className="text-xs text-slate-500">Interdisciplinary</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">12</div>
          <div className="text-xs text-slate-600 mt-1">Project Work (P)</div>
          <div className="text-xs text-slate-500">Mini & Major</div>
        </div>
      </div>
      <div className="border-t border-blue-300 pt-4 text-center">
        <div className="text-sm font-semibold text-slate-700">
          <span className="text-blue-600 font-bold text-lg">160 credits</span> required for Regular Entry • 
          <span className="text-purple-600 font-bold text-lg ml-2">120 credits</span> for Lateral Entry
        </div>
      </div>
    </div>
  </div>

  {/* Bloom's Taxonomy */}
  <div className="mb-8">
    <h3 className="text-xl font-semibold text-slate-900 mb-4">Bloom's Taxonomy Integration</h3>
    <p className="text-sm text-slate-600 mb-4">
      All courses follow Bloom's Revised Taxonomy with learning outcomes structured across six cognitive levels:
    </p>
    <img 
      src="/blooms.png" 
      alt="Bloom's Taxonomy Levels" 
      className="w-full max-w-3xl mx-auto rounded-lg shadow-md border border-slate-200"
    />
  </div>

  {/* Evaluation System */}
  <div className="mb-8">
    <h3 className="text-xl font-semibold text-slate-900 mb-4">Evaluation & Assessment System</h3>
    <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="font-bold text-slate-900 mb-3">Continuous Assessment (40%)</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between bg-white p-2 rounded border border-slate-200">
              <span className="text-slate-600">CAT-1 Examination</span>
              <span className="font-semibold">60 marks</span>
            </div>
            <div className="flex justify-between bg-white p-2 rounded border border-slate-200">
              <span className="text-slate-600">CAT-2 Examination</span>
              <span className="font-semibold">60 marks</span>
            </div>
            <div className="flex justify-between bg-white p-2 rounded border border-slate-200">
              <span className="text-slate-600">Assignments & Internal</span>
              <span className="font-semibold">40 marks( x2)</span>
            </div>
            <div className="flex justify-between bg-blue-100 p-2 rounded border border-blue-300 font-bold">
              <span className="text-blue-900">Total CAT</span>
              <span className="text-blue-900">200 → 40%</span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-bold text-slate-900 mb-3">Terminal Examination (60%)</h4>
          <div className="space-y-2 text-sm">
            <div className="bg-white p-4 rounded border border-slate-200 h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-indigo-600 mb-2">100</div>
                <div className="text-slate-600">End Semester Exam</div>
                <div className="text-xs text-slate-500 mt-1">University Supervised</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg p-4 text-center">
        <div className="text-sm font-semibold mb-1">Final Score Calculation</div>
        <div className="text-lg font-bold">Final Score = (CAT Total × 0.40) + (Terminal Marks × 0.60)</div>
      </div>
    </div>
  </div>

  {/* Grading System */}
  <div>
    <h3 className="text-xl font-semibold text-slate-900 mb-4">Grading System</h3>
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 px-4 py-2 text-left font-bold">Grade</th>
            <th className="border border-slate-300 px-4 py-2 text-left font-bold">Score Range</th>
            <th className="border border-slate-300 px-4 py-2 text-left font-bold">Grade Points</th>
            <th className="border border-slate-300 px-4 py-2 text-left font-bold">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-green-50">
            <td className="border border-slate-300 px-4 py-2 font-bold text-green-700">O</td>
            <td className="border border-slate-300 px-4 py-2">90–100</td>
            <td className="border border-slate-300 px-4 py-2 font-bold">10</td>
            <td className="border border-slate-300 px-4 py-2">Outstanding</td>
          </tr>
          <tr className="bg-blue-50">
            <td className="border border-slate-300 px-4 py-2 font-bold text-blue-700">A+</td>
            <td className="border border-slate-300 px-4 py-2">80–89</td>
            <td className="border border-slate-300 px-4 py-2 font-bold">9</td>
            <td className="border border-slate-300 px-4 py-2">Excellent</td>
          </tr>
          <tr className="bg-cyan-50">
            <td className="border border-slate-300 px-4 py-2 font-bold text-cyan-700">A</td>
            <td className="border border-slate-300 px-4 py-2">70–79</td>
            <td className="border border-slate-300 px-4 py-2 font-bold">8</td>
            <td className="border border-slate-300 px-4 py-2">Very Good</td>
          </tr>
          <tr className="bg-indigo-50">
            <td className="border border-slate-300 px-4 py-2 font-bold text-indigo-700">B+</td>
            <td className="border border-slate-300 px-4 py-2">60–69</td>
            <td className="border border-slate-300 px-4 py-2 font-bold">7</td>
            <td className="border border-slate-300 px-4 py-2">Good</td>
          </tr>
          <tr className="bg-purple-50">
            <td className="border border-slate-300 px-4 py-2 font-bold text-purple-700">B</td>
            <td className="border border-slate-300 px-4 py-2">55–59</td>
            <td className="border border-slate-300 px-4 py-2 font-bold">6</td>
            <td className="border border-slate-300 px-4 py-2">Above Average</td>
          </tr>
          <tr className="bg-slate-50">
            <td className="border border-slate-300 px-4 py-2 font-bold text-slate-700">C</td>
            <td className="border border-slate-300 px-4 py-2">50–54</td>
            <td className="border border-slate-300 px-4 py-2 font-bold">5</td>
            <td className="border border-slate-300 px-4 py-2">Average (Pass)</td>
          </tr>
          <tr className="bg-red-50">
            <td className="border border-slate-300 px-4 py-2 font-bold text-red-700">U</td>
            <td className="border border-slate-300 px-4 py-2">Below 50</td>
            <td className="border border-slate-300 px-4 py-2 font-bold">0</td>
            <td className="border border-slate-300 px-4 py-2">Fail</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p className="text-xs text-slate-500 mt-2 text-center">Minimum passing grade: C (50/100)</p>
  </div>
</div>

          <h3 className="text-xl font-bold text-slate-900 mb-6">Browse by Semester</h3>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <button
                key={sem}
                onClick={() => {
                  setSelectedSemester(sem)
                  setView('semester')
                }}
                className={`bg-gradient-to-br ${semesterColors[sem - 1]} rounded-xl p-6 shadow-lg hover:shadow-xl transition-all group relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="text-3xl font-bold text-white mb-2">Semester {sem}</div>
                  <div className="text-sm text-white/90">
                    {courses.filter((c) => c.semester_number === sem).length} courses
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/80 mt-3 ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (view === 'semester' && selectedSemester) {
    const filtered = courses.filter((c) => c.semester_number === selectedSemester)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <NotificationCenter notifications={notifications} onDismiss={dismissNotification} />
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setView('home'); setSelectedSemester(null) }}
                className="text-slate-600 hover:text-slate-900 font-medium"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Semester {selectedSemester}</h1>
                <p className="text-sm text-slate-500">{filtered.length} courses available</p>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 gap-6">
            {filtered.map((course) => {
              const badge = course.course_mode ? getCourseModeBadge(course.course_mode) : null
              const cardStyle = badge ? badge.borderGradient : 'border-slate-200 hover:border-blue-500'
              
              return (
              <button
                key={course.id}
                onClick={() => { setSelectedCourse(course); setView('course') }}
                className={`bg-white rounded-xl p-6 border-2 ${cardStyle} hover:shadow-xl transition-all text-left group`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-3 py-1.5 rounded-lg">
                      <span className="text-white font-bold text-sm">{course.code}</span>
                    </div>
                    <div className="bg-slate-100 px-2 py-1 rounded">
                      <span className="text-slate-700 font-semibold text-xs">{course.credits} Credits</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{course.name}</h3>
                {course.course_mode && (() => {
                  const badge = getCourseModeBadge(course.course_mode)
                  return badge ? (
                    <div className="mb-2">
                      <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded">
                        {badge.label}
                      </span>
                    </div>
                  ) : null
                })()}
                {course.description && (
                  <p className="text-sm text-slate-600 line-clamp-2">{course.description}</p>
                )}
              </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  if (view === 'course' && selectedCourse) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <NotificationCenter notifications={notifications} onDismiss={dismissNotification} />
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setView('semester'); setSelectedCourse(null) }}
                className="text-slate-600 hover:text-slate-900 font-medium"
              >
                ← Back
              </button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900">{selectedCourse.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-slate-500">{selectedCourse.code}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-sm text-slate-500">{selectedCourse.credits} Credits</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-sm text-slate-500">Semester {selectedCourse.semester_number}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Select Resource Category</h3>
          <div className="grid grid-cols-5 gap-6">
            {(Object.entries(categoryConfig) as [CategoryKey, typeof categoryConfig[CategoryKey]][]).map(([key, cfg]) => {
              const Icon = cfg.icon
              const count = getCategoryCount(key)
              return (
                <div
                  key={key}
                  className="bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all group flex flex-col justify-between"
                >
                  <div
                    onClick={() => { setSelectedCategory(key); setView('category') }}
                    className="cursor-pointer"
                  >
                    <div className={`${cfg.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2 text-center">{cfg.label}</h4>
                    <div className="text-sm text-slate-500 text-center">{count} items</div>
                  </div>
                  <button
                    onClick={() => setShowUploadForm(key)}
                    className="mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full"
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>
                </div>
              )
            })}
          </div>
          {showUploadForm && (
            <UploadModal
              category={showUploadForm}
              course={selectedCourse}
              currentUser={currentUser}
              onClose={() => setShowUploadForm(null)}
              onSuccess={refreshResources}
              showNotification={showNotification}
            />
          )}
        </div>
      </div>
    )
  }

  if (view === 'category' && selectedCategory && selectedCourse) {
    const categoryInfo = categoryConfig[selectedCategory]
    const CategoryIcon = categoryInfo.icon

    const filteredResources = resources.filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesType = filterType === 'all' || r.is_approved
      const matchesCategory = r.resource_type === selectedCategory
      return matchesSearch && matchesType && matchesCategory
    })

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <NotificationCenter notifications={notifications} onDismiss={dismissNotification} />
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { setView('course'); setSelectedCategory(null) }}
                  className="text-slate-600 hover:text-slate-900 font-medium"
                >
                  ← Back
                </button>
                <div className={`${categoryInfo.color} p-2 rounded-lg shadow-md`}>
                  <CategoryIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{categoryInfo.label}</h1>
                  <p className="text-sm text-slate-500">{selectedCourse.code} • {selectedCourse.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadForm(selectedCategory)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            </div>
          </div>
        </header>

        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {(currentUser?.role === 'faculty' || currentUser?.role === 'admin') && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
              )}
            </div>
            {showFilters && (currentUser?.role === 'faculty' || currentUser?.role === 'admin') && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1 rounded-lg text-sm ${filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
                  >
                    All Resources
                  </button>
                  <button
                    onClick={() => setFilterType('approved')}
                    className={`px-3 py-1 rounded-lg text-sm ${filterType === 'approved' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
                  >
                    Approved Only
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-4">
            <p className="text-sm text-slate-600">
              {filteredResources.length} resources found
              {currentUser?.role === 'student'}
            </p>
          </div>
          
          {filteredResources.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-slate-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileQuestion className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No resources found</h3>
              <p className="text-slate-600">
                {currentUser?.role === 'student'
                  ? 'No resources are available yet. Check back later!'
                  : 'Be the first to upload a resource for this category.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {filteredResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  currentUser={currentUser}
                  onApprove={currentUser?.role === 'faculty' || currentUser?.role === 'admin' ? handleApprove : undefined}
                  onDelete={currentUser?.role === 'faculty' || currentUser?.role === 'admin' ? showDeleteConfirm : undefined}
                  onRefresh={refreshResources}
                  showNotification={showNotification}
                />
              ))}
            </div>
          )}
          
          {showUploadForm && (
            <UploadModal
              category={showUploadForm}
              course={selectedCourse}
              currentUser={currentUser}
              onClose={() => setShowUploadForm(null)}
              onSuccess={refreshResources}
              showNotification={showNotification}
            />
          )}
        </div>
      </div>
    )
  }

  return null
}