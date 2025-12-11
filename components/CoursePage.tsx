'use client'
import { useState, useEffect } from 'react'
import { getResources } from '@/lib/supabase/api'
import ResourceCard from './ResourceCard'
import { Resource } from '@/lib/types';


/*interface Resource {
  id: string
  title: string
  description: string
  file_url: string
  resource_type: 'notes' | 'book' | 'ppt' | 'question_paper' | 'course_plan'
  uploader_name: string
  uploader_id: string
  updated_at: Date
  view_count: number
  download_count: number
  is_approved: boolean
  created_at: string
  tags: Array<{ name: string; type: string }>
}*/

export default function CoursePage({ courseId }: { courseId: string }) {
  const categories = ['notes', 'ppt', 'book', 'question_paper', 'course_plan']
  const [selectedCategory, setSelectedCategory] = useState<'notes' | 'ppt' | 'book' | 'question_paper' | 'course_plan'>('notes')
  const [resources, setResources] = useState<Resource[]>([]) // ← typed array

  useEffect(() => {
    getResources(courseId, selectedCategory).then(setResources)
  }, [courseId, selectedCategory])

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {categories.map(c => (
          <button key={c} onClick={() => setSelectedCategory(c as any)}>
            {c.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {resources.map((r) => (
          <ResourceCard key={r.id} resource={r} />
        ))}
      </div>
    </div>
  )
}
