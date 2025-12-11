'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Tag, X, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface TagOption {
  id: string
  name: string
  type: string
}

interface Course {
  id: string
  code: string
  name: string
}

export default function AskQuestionPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<TagOption[]>([])
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([])
  
  const [domainTags, setDomainTags] = useState<TagOption[]>([])
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  
  const [showDomainDropdown, setShowDomainDropdown] = useState(false)
  const [showCourseDropdown, setShowCourseDropdown] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTags()
    loadCourses()
  }, [])

  const loadTags = async () => {
    try {
      const { data: tags } = await supabase
        .from('tags')
        .select('id, name, type')
        .eq('type', 'tech_domain')
        .order('name')

      if (tags) {
        setDomainTags(tags)
      }
    } catch (error) {
      console.error('Error loading tags:', error)
    }
  }

  const loadCourses = async () => {
    try {
      // Exclude "Programme Elective" courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, code, name')
        .neq('name', 'Programme Elective')
        .order('code')

      if (courses) {
        setAvailableCourses(courses)
      }
    } catch (error) {
      console.error('Error loading courses:', error)
    }
  }

  const addTag = (tag: TagOption) => {
    if (!selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag])
    }
    setShowDomainDropdown(false)
  }

  const removeTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId))
  }

  const addCourse = (course: Course) => {
    if (!selectedCourses.find(c => c.id === course.id)) {
      setSelectedCourses([...selectedCourses, course])
    }
    setShowCourseDropdown(false)
  }

  const removeCourse = (courseId: string) => {
    setSelectedCourses(selectedCourses.filter(c => c.id !== courseId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim() || !content.trim()) {
      setError('Please fill in all required fields')
      return
    }

    if (selectedTags.length === 0 && selectedCourses.length === 0) {
      setError('Please select at least one domain tag or course')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Insert question
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
          user_id: user.id,
          title: title.trim(),
          content: content.trim(),
          view_count: 0,
          upvotes: 0,
          is_resolved: false
        })
        .select()
        .single()

      if (questionError) throw questionError

      // Insert domain tags
      if (selectedTags.length > 0) {
        const tagInserts = selectedTags.map(tag => ({
          question_id: question.id,
          tag_id: tag.id
        }))

        const { error: tagsError } = await supabase
          .from('question_tags')
          .insert(tagInserts)

        if (tagsError) throw tagsError
      }

      // Insert course tags (create course tags if they don't exist)
      if (selectedCourses.length > 0) {
        for (const course of selectedCourses) {
          // Check if course tag exists
          let { data: existingTag } = await supabase
            .from('tags')
            .select('id')
            .eq('name', course.code)
            .eq('type', 'course')
            .single()

          let tagId = existingTag?.id

          // Create course tag if it doesn't exist
          if (!tagId) {
            const { data: newTag, error: tagError } = await supabase
              .from('tags')
              .insert({
                name: course.code,
                type: 'course'
              })
              .select('id')
              .single()

            if (tagError) throw tagError
            tagId = newTag.id
          }

          // Link to question
          await supabase
            .from('question_tags')
            .insert({
              question_id: question.id,
              tag_id: tagId
            })
        }
      }

      // Award points to user (5 points for asking a question)
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', user.id)
        .single()

      if (currentProfile) {
        await supabase
          .from('profiles')
          .update({ points: (currentProfile.points || 0) + 5 })
          .eq('id', user.id)
      }

      router.push(`/insights/${question.id}`)
    } catch (error: any) {
      console.error('Error creating question:', error)
      setError(error.message || 'Failed to create question. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ask a Question</h1>
          <p className="text-gray-600">Get help from your peers and faculty</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {error && (
            <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
              Question Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., How do transformers differ from CNNs?"
              maxLength={200}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/200 characters</p>
          </div>

          <div className="mb-6">
            <label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">
              Question Details <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide more details about your question..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Be specific and clear. Include what you've tried so far.</p>
          </div>

          {/* Domain Tags Section */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Domain Tags <span className="text-red-500">*</span>
            </label>
            
            {/* Selected Domain Tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => removeTag(tag.id)}
                      className="hover:bg-blue-700 rounded-full p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Domain Tag Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDomainDropdown(!showDomainDropdown)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-left hover:bg-gray-50 transition flex items-center justify-between"
              >
                <span className="text-gray-700">Select domain tags</span>
                <Tag className="w-4 h-4 text-gray-400" />
              </button>

              {showDomainDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                  {domainTags
                    .filter(tag => !selectedTags.find(st => st.id === tag.id))
                    .map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => addTag(tag)}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition text-sm"
                      >
                        {tag.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Course Tags Section */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Related Courses (Optional)
            </label>
            
            {/* Selected Courses */}
            {selectedCourses.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedCourses.map((course) => (
                  <span
                    key={course.id}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    {course.code}
                    <button
                      type="button"
                      onClick={() => removeCourse(course.id)}
                      className="hover:bg-purple-700 rounded-full p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Course Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-left hover:bg-gray-50 transition flex items-center justify-between"
              >
                <span className="text-gray-700">Select courses</span>
                <Tag className="w-4 h-4 text-gray-400" />
              </button>

              {showCourseDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                  {availableCourses
                    .filter(course => !selectedCourses.find(sc => sc.id === course.id))
                    .map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => addCourse(course)}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition text-sm"
                      >
                        <span className="font-medium">{course.code}</span> - {course.name}
                      </button>
                    ))}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Add at least one domain tag or course to help others find your question
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Posting...' : 'Post Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
