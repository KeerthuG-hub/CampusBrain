'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Eye, ThumbsUp, CheckCircle, MessageSquare, Send, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const MAX_ANSWER_WORDS = 500

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
    role: string
  }
  tags: Array<{
    id: string
    name: string
  }>
}

interface Answer {
  id: string
  content: string
  upvotes: number
  is_accepted: boolean
  created_at: string
  user_id: string
  profiles: {
    full_name: string
    role: string
  }
}

export default function QuestionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const questionId = params.id as string

  const [question, setQuestion] = useState<Question | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [newAnswer, setNewAnswer] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [userVotes, setUserVotes] = useState<{[key: string]: boolean}>({})

  // Calculate word count
  const getWordCount = () => {
    return newAnswer.trim().split(/\s+/).filter(Boolean).length
  }

  useEffect(() => {
    loadQuestionAndAnswers()
    incrementViewCount()
    loadUserVotes()
  }, [questionId])

  const loadUserVotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: votes } = await supabase
        .from('votes')
        .select('votable_id')
        .eq('user_id', user.id)
        .eq('votable_type', 'answer')

      if (votes) {
        const votesMap: {[key: string]: boolean} = {}
        votes.forEach(v => {
          votesMap[v.votable_id] = true
        })
        setUserVotes(votesMap)
      }
    } catch (error) {
      console.error('Error loading votes:', error)
    }
  }

  const loadQuestionAndAnswers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)

      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select(`
          *,
          profiles!questions_user_id_fkey (full_name, role)
        `)
        .eq('id', questionId)
        .single()

      if (questionError) throw questionError

      const { data: tagData } = await supabase
        .from('question_tags')
        .select(`
          tags (id, name)
        `)
        .eq('question_id', questionId)

      setQuestion({
        ...questionData,
        tags: tagData?.map(t => t.tags).filter(Boolean) || []
      } as Question)

      const { data: answersData, error: answersError } = await supabase
        .from('answers')
        .select(`
          *,
          profiles!answers_user_id_fkey (full_name, role)
        `)
        .eq('question_id', questionId)
        .eq('is_deleted', false)
        .order('is_accepted', { ascending: false })
        .order('upvotes', { ascending: false })
        .order('created_at', { ascending: true })

      if (answersError) throw answersError

      setAnswers(answersData as Answer[])
      setLoading(false)
    } catch (error) {
      console.error('Error loading question:', error)
      setError('Failed to load question')
      setLoading(false)
    }
  }

  const incrementViewCount = async () => {
    try {
      // Check if already viewed in this session
      const viewedKey = `viewed_question_${questionId}`
      const hasViewed = sessionStorage.getItem(viewedKey)
      
      if (hasViewed) {
        return // Already viewed in this session
      }

      // Mark as viewed
      sessionStorage.setItem(viewedKey, 'true')

      // Increment view count
      const { data: currentQuestion } = await supabase
        .from('questions')
        .select('view_count')
        .eq('id', questionId)
        .single()

      if (currentQuestion) {
        await supabase
          .from('questions')
          .update({ view_count: currentQuestion.view_count + 1 })
          .eq('id', questionId)

        // Update local state to reflect new count
        setQuestion(prev => prev ? { ...prev, view_count: currentQuestion.view_count + 1 } : null)
      }
    } catch (error) {
      console.error('Error incrementing view count:', error)
    }
  }

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAnswer.trim()) return

    const currentWordCount = getWordCount()
    if (currentWordCount > MAX_ANSWER_WORDS) {
      setError(`Answer exceeds ${MAX_ANSWER_WORDS} word limit. Please shorten your answer or provide a link to external content.`)
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('answers')
        .insert({
          question_id: questionId,
          user_id: user.id,
          content: newAnswer.trim(),
          upvotes: 0,
          is_accepted: false
        })
        .select(`
          *,
          profiles!answers_user_id_fkey (full_name, role)
        `)
        .single()

      if (error) throw error

      setAnswers([...answers, data as Answer])
      setNewAnswer('')

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', user.id)
        .single()

      if (currentProfile) {
        await supabase
          .from('profiles')
          .update({ points: (currentProfile.points || 0) + 10 })
          .eq('id', user.id)
      }
    } catch (error: any) {
      console.error('Error submitting answer:', error)
      setError(error.message || 'Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkAsAccepted = async (answerId: string) => {
    if (!question || question.user_id !== currentUserId) return

    try {
      await supabase
        .from('answers')
        .update({ is_accepted: false })
        .eq('question_id', questionId)
        .neq('id', answerId)

      const { error: acceptError } = await supabase
        .from('answers')
        .update({ is_accepted: true })
        .eq('id', answerId)

      if (acceptError) throw acceptError

      const { error: resolveError } = await supabase
        .from('questions')
        .update({ is_resolved: true })
        .eq('id', questionId)

      if (resolveError) throw resolveError

      const answer = answers.find(a => a.id === answerId)
      if (answer) {
        const { data: answerAuthorProfile } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', answer.user_id)
          .single()

        if (answerAuthorProfile) {
          await supabase
            .from('profiles')
            .update({ points: (answerAuthorProfile.points || 0) + 25 })
            .eq('id', answer.user_id)
        }
      }

      loadQuestionAndAnswers()
    } catch (error) {
      console.error('Error marking answer:', error)
    }
  }

  const handleUpvoteAnswer = async (answerId: string, answerUserId: string, currentUpvotes: number) => {
    if (!currentUserId) return

    const hasVoted = userVotes[answerId]

    setUserVotes(prev => ({
      ...prev,
      [answerId]: !hasVoted
    }))

    setAnswers(prev => prev.map(a => 
      a.id === answerId 
        ? { ...a, upvotes: hasVoted ? Math.max(0, a.upvotes - 1) : a.upvotes + 1 }
        : a
    ))

    try {
      if (hasVoted) {
        await supabase
          .from('votes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('votable_type', 'answer')
          .eq('votable_id', answerId)

        await supabase
          .from('answers')
          .update({ upvotes: Math.max(0, currentUpvotes - 1) })
          .eq('id', answerId)
      } else {
        await supabase
          .from('votes')
          .insert({
            user_id: currentUserId,
            votable_type: 'answer',
            votable_id: answerId,
            vote_type: 'up'
          })

        await supabase
          .from('answers')
          .update({ upvotes: currentUpvotes + 1 })
          .eq('id', answerId)

        const { data: authorProfile } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', answerUserId)
          .single()

        if (authorProfile) {
          await supabase
            .from('profiles')
            .update({ points: (authorProfile.points || 0) + 2 })
            .eq('id', answerUserId)
        }
      }
    } catch (error) {
      console.error('Error upvoting answer:', error)
      setUserVotes(prev => ({
        ...prev,
        [answerId]: hasVoted
      }))
      setAnswers(prev => prev.map(a => 
        a.id === answerId 
          ? { ...a, upvotes: currentUpvotes }
          : a
      ))
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading question...</p>
        </div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold text-xl">Question not found</p>
        </div>
      </div>
    )
  }

  const currentWordCount = getWordCount()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Questions
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 flex-1">{question.title}</h1>
            {question.is_resolved && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Resolved
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {question.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
              >
                {tag.name}
              </span>
            ))}
          </div>

          <p className="text-gray-700 text-base mb-6 whitespace-pre-wrap">{question.content}</p>

          <div className="flex items-center gap-6 text-sm text-gray-500 pt-4 border-t border-gray-200">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {question.view_count} views
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              {answers.length} answers
            </span>
            <span>•</span>
            <span>
              Asked by <strong>{question.profiles?.full_name}</strong> ({question.profiles?.role})
            </span>
            <span>•</span>
            <span>{formatTimeAgo(question.created_at)}</span>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
          </h2>

          {answers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No answers yet</p>
              <p className="text-sm text-gray-500 mt-1">Be the first to answer this question!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {answers.map((answer) => (
                <div
                  key={answer.id}
                  className={`bg-white rounded-xl border-2 p-6 ${
                    answer.is_accepted ? 'border-green-500 bg-green-50/30' : 'border-gray-200'
                  }`}
                >
                  {answer.is_accepted && (
                    <div className="flex items-center gap-2 text-green-700 font-semibold mb-3">
                      <CheckCircle className="w-5 h-5" />
                      Accepted Answer
                    </div>
                  )}

                  <p className="text-gray-800 mb-4 whitespace-pre-wrap">{answer.content}</p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">
                        <strong>{answer.profiles?.full_name}</strong> ({answer.profiles?.role})
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">{formatTimeAgo(answer.created_at)}</span>
                      <button
                        onClick={() => handleUpvoteAnswer(answer.id, answer.user_id, answer.upvotes)}
                        disabled={!currentUserId}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                          userVotes[answer.id]
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span className="font-medium">{answer.upvotes}</span>
                      </button>
                    </div>

                    {question.user_id === currentUserId && !answer.is_accepted && !question.is_resolved && (
                      <button
                        onClick={() => handleMarkAsAccepted(answer.id)}
                        className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                      >
                        Mark as Answer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Your Answer</h3>

          {error && (
            <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> Keep answers under {MAX_ANSWER_WORDS} words (currently: <span className={currentWordCount > MAX_ANSWER_WORDS ? 'text-red-600 font-bold' : 'font-semibold'}>{currentWordCount}</span>).
              For longer explanations, consider sharing a link to a document or resource.
            </p>
          </div>

          <form onSubmit={handleSubmitAnswer}>
            <textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Write your answer here... (Max 500 words)"
              rows={6}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent resize-none mb-2 ${
                currentWordCount > MAX_ANSWER_WORDS
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              required
            />

            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm ${
                currentWordCount > MAX_ANSWER_WORDS ? 'text-red-600 font-semibold' : 'text-gray-500'
              }`}>
                {currentWordCount} / {MAX_ANSWER_WORDS} words
              </span>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !newAnswer.trim() || currentWordCount > MAX_ANSWER_WORDS}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Post Answer
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}