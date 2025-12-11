// ========================================
// app/faculty/page.tsx (FIXED NAVIGATION)
// ========================================

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  BookOpen,
  Beaker,
  MessageCircle,
  Upload,
  TrendingUp,
  Edit2,
  Loader,
  ChevronRight,
  Clock,
  Eye,
  ThumbsUp,
  Tag,
  AlertCircle,
  CheckCircle2,
  Home,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import ProtectedRoute from '@/components/ProtectedRoute'

// ----------------------------------------
// 1) MAIN PAGE WRAPPER
// ----------------------------------------
export default function FacultyPage() {
  return (
    <ProtectedRoute requiredRole="faculty">
      <FacultyDashboard />
    </ProtectedRoute>
  )
}

// ----------------------------------------
// 2) TYPES
// ----------------------------------------
interface Profile {
  full_name: string | null
  department: string | null
  bio: string | null
  points: number
}

interface Course {
  id: string
  code: string
  name: string
  semester_number?: number
}

interface Sig {
  id: string
  name: string
  description?: string
}

interface Stats {
  answers: number
  resources: number
}

interface QuestionTag {
  id: string
  name: string
  type: string
}

interface RecommendedQuestion {
  id: string
  title: string
  content: string
  view_count: number
  upvotes: number
  is_resolved: boolean
  created_at: string
  answer_count: number
  tags: QuestionTag[]
  relevance_score: number
  match_reason: string
}

interface DashboardData {
  profile: Profile | null
  courses: Course[]
  sigs: Sig[]
  stats: Stats
}

// ----------------------------------------
// 3) FACULTY DASHBOARD
// ----------------------------------------
function FacultyDashboard() {
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [userInterests, setUserInterests] = useState<string[]>([])
  const [recommendedQuestions, setRecommendedQuestions] = useState<RecommendedQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [questionsLoading, setQuestionsLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      console.log('[FACULTY] Loading dashboard...')
      
      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('[FACULTY] No user found')
        router.push('/login')
        return
      }

      setUserId(user.id)
      console.log('[FACULTY] User ID:', user.id)

      // Check if user is faculty
      const { data: profileCheck } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileCheck?.role !== 'faculty') {
        console.error('[FACULTY] User is not faculty, redirecting...')
        router.push('/student')
        return
      }

      // Call get_faculty_dashboard function
      const { data, error } = await supabase.rpc('get_faculty_dashboard', { fac_id: user.id })

      if (error) {
        console.error('[FACULTY] Dashboard RPC error:', error)
        throw error
      }

      console.log('[FACULTY] Dashboard data loaded:', data)
      setDashboardData(data)

      // Load interests from user_interests table
      await loadUserInterests(user.id)

      setLoading(false)

      // Load recommended questions
      loadRecommendedQuestions(user.id)
    } catch (err) {
      console.error('[FACULTY] Error loading dashboard:', err)
      setLoading(false)
    }
  }

  const loadUserInterests = async (facultyId: string) => {
    try {
      console.log('[FACULTY] Loading interests for:', facultyId)
      
      const { data, error } = await supabase
        .from('user_interests')
        .select(`
          tag_id,
          tags!inner(id, name)
        `)
        .eq('user_id', facultyId)

      if (error) {
        console.error('[FACULTY] Interests error:', error)
        throw error
      }

      const interestNames = (data || [])
        .map((ui: any) => ui.tags?.name)
        .filter(Boolean) as string[]

      console.log('[FACULTY] ✅ Loaded interests:', interestNames)
      setUserInterests(interestNames)
    } catch (err) {
      console.error('[FACULTY] Error loading interests:', err)
      setUserInterests([])
    }
  }

  const loadRecommendedQuestions = async (facultyId: string) => {
    try {
      console.log('[FACULTY] Loading recommended questions...')
      
      // Call get_faculty_recommended_questions function
      const { data, error } = await supabase.rpc('get_faculty_recommended_questions', {
        faculty_id_param: facultyId,
        limit_count: 10,
      })

      if (error) {
        console.error('[FACULTY] Questions RPC error:', error)
        throw error
      }

      console.log('[FACULTY] ✅ Loaded questions:', data?.length || 0)
      setRecommendedQuestions(data || [])
      setQuestionsLoading(false)
    } catch (err) {
      console.error('[FACULTY] Error loading recommended questions:', err)
      setQuestionsLoading(false)
    }
  }

  const getLevel = (points: number) => {
    if (points >= 500) return 'Expert'
    if (points >= 200) return 'Contributor'
    if (points >= 50) return 'Active'
    return 'Beginner'
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const getMatchReasonLabel = (reason: string) => {
    const reasons = reason.split(', ')
    return reasons
      .map((r) => {
        switch (r) {
          case 'interest':
            return 'Your Interest'
          case 'sig':
            return 'Your SIG'
          case 'course':
            return 'Your Course'
          default:
            return r
        }
      })
      .join(' • ')
  }

  // FIXED: Navigate to course resources by finding semester first
  const handleCourseClick = async (courseCode: string, courseId: string) => {
    console.log('[FACULTY] Navigating to course:', courseCode)
    
    try {
      // Fetch the course to get semester number
      const { data: course, error } = await supabase
        .from('courses')
        .select('semester_number')
        .eq('id', courseId)
        .single()

      if (error || !course) {
        console.error('[FACULTY] Error fetching course:', error)
        // Fallback: just go to course_resources page
        router.push('/course_resources')
        return
      }

      // Store the selected course info in sessionStorage for course_resources page
      sessionStorage.setItem('selectedCourse', JSON.stringify({
        id: courseId,
        code: courseCode,
        semester: course.semester_number
      }))

      // Navigate to course_resources
      router.push('/course_resources')
    } catch (err) {
      console.error('[FACULTY] Navigation error:', err)
      router.push('/course_resources')
    }
  }

  // FIXED: Proper navigation to SIG
  const handleSigClick = (sigId: string) => {
    console.log('[FACULTY] Navigating to SIG:', sigId)
    router.push(`/research?sig=${sigId}`)
  }

  // FIXED: Proper navigation to question
  const handleQuestionClick = (questionId: string) => {
    console.log('[FACULTY] Navigating to question:', questionId)
    router.push(`/insights?question=${questionId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!dashboardData?.profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold text-lg mb-2">Failed to load dashboard</p>
          <p className="text-gray-600 mb-4">Please try refreshing the page</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  const { profile, courses, sigs, stats } = dashboardData
  const level = getLevel(profile.points)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-lg">
              {profile.full_name?.split(' ').map((n) => n[0]).join('') || 'F'}
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                Welcome, {profile.full_name || 'Faculty'} 👨‍🏫
              </h1>
              <p className="text-sm text-gray-500">{profile.department}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Home Button */}
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">Home</span>
            </button>

            {/* Edit Profile Button */}
            <button
              onClick={() => router.push('/setup')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Points</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{profile.points}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                {level}
              </span>
              <span className="text-xs text-gray-500">Level</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Answers Given</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.answers}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500">Help students learn</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Resources Shared</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.resources}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <Upload className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500">Educational materials</p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Bio Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                About
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {profile.bio || 'No bio added yet. Update your profile to add a bio.'}
              </p>
            </div>

            {/* Current Courses */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-gray-600" />
                Current Courses
              </h2>
              {courses.length > 0 ? (
                <div className="space-y-3">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer group"
                      onClick={() => handleCourseClick(course.code, course.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">{course.code}</div>
                          <div className="text-xs text-gray-500 mt-1">{course.name}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No courses assigned</p>
              )}
            </div>

            {/* SIGs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Beaker className="w-5 h-5 text-gray-600" />
                Research Groups (SIGs)
              </h2>
              {sigs.length > 0 ? (
                <div className="space-y-3">
                  {sigs.map((sig) => (
                    <div
                      key={sig.id}
                      className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition cursor-pointer group"
                      onClick={() => handleSigClick(sig.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">{sig.name}</div>
                          {sig.description && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {sig.description}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No SIG memberships</p>
              )}
            </div>

            {/* FIXED: Interests from user_interests table */}
            {userInterests.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Research Interests</h2>
                <div className="flex flex-wrap gap-2">
                  {userInterests.map((interest, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Recommended Questions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                  Recommended Questions for You
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Based on your courses, SIGs, and research interests
                </p>
              </div>

              <div className="divide-y divide-gray-200">
                {questionsLoading ? (
                  <div className="p-12 flex justify-center">
                    <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                ) : recommendedQuestions.length > 0 ? (
                  recommendedQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="p-6 hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => handleQuestionClick(question.id)}
                    >
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="font-semibold text-gray-900 flex-1 hover:text-blue-600 transition">
                          {question.title}
                        </h3>
                        <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full whitespace-nowrap">
                          {question.relevance_score} match
                          {question.relevance_score > 1 ? 'es' : ''}
                        </span>
                      </div>

                      {/* Question Content Preview */}
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {question.content}
                      </p>

                      {/* Tags */}
                      {question.tags && question.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {question.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                            >
                              <Tag className="w-3 h-3" />
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Match Reason */}
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-700 font-medium">
                          Matched: {getMatchReasonLabel(question.match_reason)}
                        </span>
                      </div>

                      {/* Question Meta */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {question.view_count} views
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          {question.upvotes} upvotes
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {question.answer_count} answer
                          {question.answer_count !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1 ml-auto">
                          <Clock className="w-4 h-4" />
                          {getTimeAgo(question.created_at)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      No questions yet
                    </h3>
                    <p className="text-sm text-gray-500">
                      Questions matching your expertise will appear here
                    </p>
                  </div>
                )}
              </div>

              {recommendedQuestions.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => router.push('/insights')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition"
                  >
                    View All Questions
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}