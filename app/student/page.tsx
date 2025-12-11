'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, MessageCircle, Upload, Edit2, Loader, 
  AlertCircle, CheckCircle2, Eye, ThumbsUp, 
  Clock, Tag, ChevronRight, RefreshCw, Home,
  TrendingUp, Award
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string
  department: string | null
  batch_year: number | null
  bio: string | null
  interests: string[] | null
  points: number
}

interface Stats {
  questions: number
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

export default function StudentDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats>({ questions: 0, answers: 0, resources: 0 })
  const [recommendedQuestions, setRecommendedQuestions] = useState<RecommendedQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [questionsLoading, setQuestionsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session || !session.user) {
        console.log('[STUDENT] No session → redirect /login')
        router.replace('/login')
        return
      }

      const user = session.user

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // Role mismatch protection
      if (profileData.role !== 'student') {
        console.log('[STUDENT] Wrong role → redirect /faculty')
        router.replace('/faculty')
        return
      }

      setProfile(profileData)

      // Stats calls
      const { count: questionsCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_deleted', false)

      const { count: answersCount } = await supabase
        .from('answers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_deleted', false)

      const { count: resourcesCount } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('uploader_id', user.id)

      setStats({
        questions: questionsCount || 0,
        answers: answersCount || 0,
        resources: resourcesCount || 0,
      })

      setLoading(false)

      // Load recommended questions
      loadRecommendedQuestions(user.id)
    } catch (err) {
      console.error('Error loading dashboard:', err)
      setLoading(false)
    }
  }

  const loadRecommendedQuestions = async (userId: string) => {
    try {
      setQuestionsLoading(true)

      // Call get_student_recommended_questions function
      const { data, error } = await supabase
        .rpc('get_student_recommended_questions', {
          student_id_param: userId,
          limit_count: 10
        })

      if (error) {
        console.error('Questions RPC Error:', error)
        throw error
      }

      console.log('Recommended questions:', data)
      setRecommendedQuestions(data || [])
      setQuestionsLoading(false)
    } catch (err) {
      console.error('Error loading recommended questions:', err)
      setQuestionsLoading(false)
    }
  }

  const getLevel = (points: number) => {
    if (points >= 500) return { name: 'Expert', next: null }
    if (points >= 200) return { name: 'Contributor', next: 500 }
    if (points >= 50) return { name: 'Active', next: 200 }
    return { name: 'Beginner', next: 50 }
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
    if (!reason) return 'Relevant to you'
    const reasons = reason.split(', ')
    return reasons.map(r => {
      switch(r) {
        case 'interest': return 'Your Interest'
        case 'sig': return 'Your SIG'
        case 'course': return 'Your Course'
        default: return r
      }
    }).join(' • ')
  }

  const handleQuestionClick = (questionId: string) => {
    router.push(`/app/insights?question=${questionId}`)
  }

  const handleRefreshQuestions = () => {
    if (profile?.id) {
      loadRecommendedQuestions(profile.id)
    }
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="w-16 h-16 text-blue-600 animate-spin" />
      </div>
    )

  if (!profile) return null

  const level = getLevel(profile.points)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold text-lg">
              {profile.full_name?.split(' ').map((n) => n[0]).join('') || 'S'}
            </div>
            <div>
              <h1 className="text-xl font-semibold">Welcome, {profile.full_name || 'Student'} 🎓</h1>
              <p className="text-sm text-gray-500">
                {profile.department} {profile.batch_year && `• Batch ${profile.batch_year}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Points Card */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 mb-8 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Your Progress</p>
              <h2 className="text-4xl font-bold mb-2">{profile.points} Points</h2>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-300" />
                <p className="text-blue-100">Level: {level.name}</p>
              </div>
            </div>
            {level.next && (
              <div className="text-right">
                <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2 backdrop-blur-sm">
                  <p className="text-sm text-blue-100 mb-1">Next Level</p>
                  <p className="text-xl font-semibold">{level.next - profile.points} pts</p>
                </div>
              </div>
            )}
          </div>
          {level.next && (
            <div className="mt-4 bg-white bg-opacity-20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all"
                style={{ width: `${(profile.points / level.next) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats & Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stats */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <MessageCircle className="w-8 h-8 text-blue-600" />
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.questions}</p>
                <p className="text-sm text-gray-600">Questions Asked</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <MessageCircle className="w-8 h-8 text-green-600" />
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.answers}</p>
                <p className="text-sm text-gray-600">Answers Given</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <Upload className="w-8 h-8 text-purple-600" />
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.resources}</p>
                <p className="text-sm text-gray-600">Resources Shared</p>
              </div>
            </div>

            {/* Interests */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                Your Interests
              </h2>
              {Array.isArray(profile.interests) && profile.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest: string) => (
                    <span
                      key={interest}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No interests added yet. Click "Edit Profile" to add some!
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Recommended Questions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <AlertCircle className="w-6 h-6 text-blue-600" />
                      Recommended Questions for You
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Based on your interests and courses
                    </p>
                  </div>
                  <button
                    onClick={handleRefreshQuestions}
                    disabled={questionsLoading}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${questionsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {questionsLoading ? (
                  <div className="p-12 flex justify-center">
                    <div className="text-center">
                      <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Loading questions...</p>
                    </div>
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
                          {question.relevance_score} match{question.relevance_score > 1 ? 'es' : ''}
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
                          {question.answer_count} answer{question.answer_count !== 1 ? 's' : ''}
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
                    <h3 className="text-sm font-medium text-gray-900 mb-1">No questions yet</h3>
                    <p className="text-sm text-gray-500">
                      Questions matching your interests will appear here
                    </p>
                  </div>
                )}
              </div>

              {recommendedQuestions.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <button 
                    onClick={() => router.push('/app/insights')}
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