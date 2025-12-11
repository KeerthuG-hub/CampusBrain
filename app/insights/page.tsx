'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, TrendingUp, MessageSquare, Clock, Plus, Tag, Eye, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Question {
  id: string
  title: string
  content: string
  view_count: number
  upvotes: number
  is_resolved: boolean
  created_at: string
  user_id: string
  profiles: {
    full_name: string
  }
  answer_count: number
  tags: Array<{
    id: string
    name: string
    type: string
  }>
}

export default function InsightsPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'trending' | 'unanswered' | 'recent'>('trending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<string>('')
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [showUnansweredOnly, setShowUnansweredOnly] = useState(false)
  
  const [availableDomains, setAvailableDomains] = useState<string[]>([])
  const [availableCourses, setAvailableCourses] = useState<Array<{id: string, code: string, name: string}>>([])
  const [userRole, setUserRole] = useState<'student' | 'faculty' | null>(null)

  useEffect(() => {
    loadUserAndDomains()
    loadQuestions()
  }, [activeTab, selectedDomain, selectedCourse, showUnansweredOnly])

  const loadUserAndDomains = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile) {
      setUserRole(profile.role)
    }

    // Load available domains from tags
    const { data: tags } = await supabase
      .from('tags')
      .select('name')
      .eq('type', 'tech_domain')
      .order('name')

    if (tags) {
      setAvailableDomains(tags.map(t => t.name))
    }

    // Load available courses (exclude Programme Elective)
    const { data: courses } = await supabase
      .from('courses')
      .select('id, code, name')
      .neq('name', 'Programme Elective')
      .order('code')

    if (courses) {
      setAvailableCourses(courses)
    }
  }

  const loadQuestions = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('questions')
        .select(`
          id,
          title,
          content,
          view_count,
          upvotes,
          is_resolved,
          created_at,
          user_id,
          profiles!questions_user_id_fkey (full_name),
          answers (count)
        `)
        .eq('is_deleted', false)

      // Apply domain filter
      if (selectedDomain) {
        const { data: tagData } = await supabase
          .from('tags')
          .select('id')
          .eq('name', selectedDomain)
          .eq('type', 'tech_domain')
          .single()

        if (tagData) {
          const { data: questionIds } = await supabase
            .from('question_tags')
            .select('question_id')
            .eq('tag_id', tagData.id)

          if (questionIds && questionIds.length > 0) {
            const ids = questionIds.map(q => q.question_id)
            query = query.in('id', ids)
          } else {
            // No questions with this tag, return empty
            setQuestions([])
            setLoading(false)
            return
          }
        }
      }

      // Apply course filter
      if (selectedCourse) {
        const { data: courseTagData } = await supabase
          .from('tags')
          .select('id')
          .eq('name', selectedCourse)
          .eq('type', 'course')
          .single()

        if (courseTagData) {
          const { data: questionIds } = await supabase
            .from('question_tags')
            .select('question_id')
            .eq('tag_id', courseTagData.id)

          if (questionIds && questionIds.length > 0) {
            const ids = questionIds.map(q => q.question_id)
            query = query.in('id', ids)
          } else {
            setQuestions([])
            setLoading(false)
            return
          }
        }
      }

      // Apply unanswered filter
      if (showUnansweredOnly) {
        query = query.eq('is_resolved', false)
      }

      // Apply sorting based on tab
      if (activeTab === 'trending') {
        query = query.order('view_count', { ascending: false })
      } else if (activeTab === 'unanswered') {
        query = query.eq('is_resolved', false).order('created_at', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query.limit(20)

      if (error) throw error

      // Load tags for each question
      const questionsWithTags = await Promise.all(
        (data || []).map(async (q: any) => {
          const { data: questionTags } = await supabase
            .from('question_tags')
            .select(`
              tags (id, name, type)
            `)
            .eq('question_id', q.id)

          return {
            ...q,
            answer_count: q.answers?.[0]?.count || 0,
            tags: questionTags?.map(qt => qt.tags).filter(Boolean) || []
          }
        })
      )

      setQuestions(questionsWithTags as Question[])
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadQuestions()
      return
    }

    setLoading(true)
    try {
      // Word-based search (Google-like)
      const words = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean)
      const searchPattern = words.join('|') // OR pattern for PostgreSQL

      const { data, error } = await supabase
        .from('questions')
        .select(`
          id,
          title,
          content,
          view_count,
          upvotes,
          is_resolved,
          created_at,
          user_id,
          profiles!questions_user_id_fkey (full_name),
          answers (count)
        `)
        .eq('is_deleted', false)
        .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const questionsWithTags = await Promise.all(
        (data || []).map(async (q: any) => {
          const { data: questionTags } = await supabase
            .from('question_tags')
            .select(`tags (id, name, type)`)
            .eq('question_id', q.id)

          return {
            ...q,
            answer_count: q.answers?.[0]?.count || 0,
            tags: questionTags?.map(qt => qt.tags).filter(Boolean) || []
          }
        })
      )

      setQuestions(questionsWithTags as Question[])
    } catch (error) {
      console.error('Error searching:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">💬 Insights</h1>
          <p className="text-gray-600">Ask questions, share knowledge, and learn together</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Search
            </button>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">All Domains</option>
              {availableDomains.map(domain => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>

            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">All Courses</option>
              {availableCourses.map(course => (
                <option key={course.id} value={course.code}>{course.code} - {course.name}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnansweredOnly}
                onChange={(e) => setShowUnansweredOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Unanswered Only</span>
            </label>

            {(searchQuery || selectedDomain || selectedCourse || showUnansweredOnly) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedDomain('')
                  setSelectedCourse('')
                  setShowUnansweredOnly(false)
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-2.5 font-medium transition border-b-2 ${
              activeTab === 'trending'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2 -mt-0.5" />
            Trending
          </button>
          <button
            onClick={() => setActiveTab('unanswered')}
            className={`px-4 py-2.5 font-medium transition border-b-2 ${
              activeTab === 'unanswered'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2 -mt-0.5" />
            Unanswered
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2.5 font-medium transition border-b-2 ${
              activeTab === 'recent'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2 -mt-0.5" />
            Recent
          </button>

          <div className="flex-1" />

          <button
            onClick={() => router.push('/insights/ask')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ask Question
          </button>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 mt-4">Loading questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No questions found</p>
            <p className="text-sm text-gray-500 mt-1">Be the first to ask a question!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <div
                key={question.id}
                onClick={() => router.push(`/insights/${question.id}`)}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition">
                    {question.title}
                  </h3>
                  {question.is_resolved && (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {question.content}
                </p>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {question.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    {question.view_count} views
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" />
                    {question.answer_count} answers
                  </span>
                  <span>•</span>
                  <span>by {question.profiles?.full_name || 'Anonymous'}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(question.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}