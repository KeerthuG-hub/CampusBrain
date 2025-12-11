'use client'

import React, { useState, useEffect } from 'react'
import {
  Search, Upload, Filter, BookOpen, FileText,
  FileQuestion, ChevronRight, Calendar, Eye, CheckCircle,
  XCircle, Trash2, ExternalLink
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  role: 'student' | 'faculty' | 'admin'
}

interface Resource {
  id: string
  title: string
  description: string
  file_url: string
  resource_type: 'notes' | 'book' | 'ppt' | 'question_paper' | 'course_plan'
  uploader_id: string
  view_count: number
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

const categoryConfig = {
  course_plan: { icon: Calendar, color: 'bg-indigo-500', label: 'Course Plan' },
  notes_and_ppts: { icon: FileText, color: 'bg-blue-500', label: 'Notes & PPTs', types: ['notes', 'ppt'] },
  book: { icon: BookOpen, color: 'bg-green-500', label: 'Books' },
  question_paper: { icon: FileQuestion, color: 'bg-red-500', label: 'Question Papers' }
} as const

type CategoryKey = keyof typeof categoryConfig

const semesterColors = [
  'from-red-500 to-orange-500',
  'from-orange-500 to-amber-500',
  'from-amber-500 to-yellow-500',
  'from-green-500 to-emerald-500',
  'from-emerald-500 to-teal-500',
  'from-cyan-500 to-blue-500',
  'from-blue-500 to-indigo-500',
  'from-indigo-500 to-purple-500'
]

const Avatar = ({ name, avatarUrl, role }: { name: string; avatarUrl: string | null; role: string }) => {
  const getInitials = (name: string) => {
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
  currentUserRole, 
  onApprove, 
  onDelete
}: {
  resource: Resource
  currentUserRole: 'student' | 'faculty' | 'admin'
  onApprove?: (id: string) => void
  onDelete?: (id: string) => void
}) => {
  const canModerate = currentUserRole === 'faculty' || currentUserRole === 'admin'
  
  const uploaderName = resource.profiles?.full_name || 'Unknown User'
  const uploaderAvatar = resource.profiles?.avatar_url || null
  const uploaderRole = resource.profiles?.role || 'student'

  const handleAccessResource = async () => {
    try {
      await supabase.rpc('increment_view_count', { resource_id: resource.id })
    } catch (error) {
      console.error('Failed to update view count:', error)
    }
    window.open(resource.file_url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={`bg-white rounded-xl p-6 border-2 ${resource.is_approved ? 'border-slate-200' : 'border-amber-300'} hover:shadow-lg transition-all`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={uploaderName} avatarUrl={uploaderAvatar} role={uploaderRole} />
          <div>
            <p className="text-sm font-semibold text-slate-900">{uploaderName}</p>
            <p className="text-xs text-slate-500 capitalize">{uploaderRole}</p>
          </div>
        </div>
        {!resource.is_approved && (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Pending</span>
        )}
        {resource.is_approved && <CheckCircle className="w-5 h-5 text-green-500" />}
      </div>
      
      <h3 className="text-lg font-bold text-slate-900 mb-2">{resource.title}</h3>
      {resource.description && (
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{resource.description}</p>
      )}
      
      <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
        <div className="flex items-center gap-1">
          <Eye className="w-4 h-4" />
          {resource.view_count}
        </div>
        <div className="ml-auto">
          <span className="text-xs bg-slate-100 px-2 py-1 rounded">
            {new Date(resource.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      
      <button
        onClick={handleAccessResource}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-semibold"
      >
        <ExternalLink className="w-4 h-4" />
        Access Resource
      </button>
      
      {canModerate && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
          {!resource.is_approved && onApprove && (
            <button
              onClick={() => onApprove(resource.id)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-semibold"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(resource.id)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold"
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

function UploadModal({ category, onClose }: { category: CategoryKey | null; onClose: () => void }) {
  if (!category) return null
  
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-slate-400 hover:text-slate-600" onClick={onClose}>
          <XCircle className="w-6 h-6" />
        </button>
        <h3 className="text-xl font-bold mb-4">
          Upload Resource ({categoryConfig[category].label})
        </h3>
        <p className="text-slate-600 mb-4">Upload form will go here</p>
        <button 
          onClick={onClose} 
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
        >
          Close
        </button>
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

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase.from('courses').select('*')
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
        
        if (currentUser?.role === 'student') {
          query = query.eq('is_approved', true)
        } else if (filterType === 'approved') {
          query = query.eq('is_approved', true)
        }
        
        const { data, error } = await query
        
        if (!error && data) {
          setResources(data as Resource[])
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
      }
    } catch (error) {
      console.error('Error approving resource:', error)
    }
  }

  const handleDelete = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return
    
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId)
      
      if (!error) {
        setResources(prev => prev.filter(r => r.id !== resourceId))
      }
    } catch (error) {
      console.error('Error deleting resource:', error)
    }
  }

  const getCategoryCount = (key: CategoryKey) => {
    const config = categoryConfig[key]
    if ('types' in config && Array.isArray(config.types)) {
      return resources.filter(r => {
        const types = config.types as readonly string[]
        return types.includes(r.resource_type)
      }).length
    }
    return resources.filter(r => r.resource_type === key).length
  }

  if (view === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
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
                  ? 'You have access to approve and manage all resources.'
                  : 'Browse and download resources to enhance your learning!'}
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Understanding Bloom&apos;s Taxonomy</h2>
            <div className="text-slate-600">
              <p className="mb-4">
                Our resource organization follows <strong>Bloom&apos;s Taxonomy</strong>, a hierarchical model of cognitive skills.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Lower Order Thinking Skills</h3>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Remember:</strong> Course plans help recall facts</li>
                    <li><strong>Understand:</strong> Notes and PPTs aid in explaining ideas</li>
                    <li><strong>Apply:</strong> Question papers for practice</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Higher Order Thinking Skills</h3>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Analyze:</strong> Books help draw connections</li>
                    <li><strong>Evaluate:</strong> Multiple resources for assessment</li>
                    <li><strong>Create:</strong> Combined materials for original work</li>
                  </ul>
                </div>
              </div>
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
            {filtered.map((course) => (
              <button
                key={course.id}
                onClick={() => { setSelectedCourse(course); setView('course') }}
                className="bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
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
                {course.course_mode && (
                  <div className="mb-2">
                    <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded">
                      {course.course_mode}
                    </span>
                  </div>
                )}
                {course.description && (
                  <p className="text-sm text-slate-600 line-clamp-2">{course.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (view === 'course' && selectedCourse) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
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
          <div className="grid grid-cols-4 gap-6">
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
                    <h4 className="text-base font-bold text-slate-900 mb-2">{cfg.label}</h4>
                    <div className="text-sm text-slate-500">{count} items</div>
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
          {showUploadForm && <UploadModal category={showUploadForm} onClose={() => setShowUploadForm(null)} />}
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
      let matchesCategory = false
      
      if ('types' in categoryInfo && Array.isArray(categoryInfo.types)) {
        const types = categoryInfo.types as readonly string[]
        matchesCategory = types.includes(r.resource_type)
      } else {
        matchesCategory = r.resource_type === selectedCategory
      }
      
      return matchesSearch && matchesType && matchesCategory
    })

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
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
              {currentUser?.role === 'student' && ' (approved resources only)'}
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
                  ? 'No approved resources are available yet. Check back later!'
                  : 'Be the first to upload a resource for this category.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {filteredResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  currentUserRole={currentUser?.role || 'student'}
                  onApprove={currentUser?.role === 'faculty' || currentUser?.role === 'admin' ? handleApprove : undefined}
                  onDelete={currentUser?.role === 'faculty' || currentUser?.role === 'admin' ? handleDelete : undefined}
                />
              ))}
            </div>
          )}
          
          {showUploadForm && <UploadModal category={showUploadForm} onClose={() => setShowUploadForm(null)} />}
        </div>
      </div>
    )
  }

  return null
}