'use client'

import { useState } from 'react'
import {
  Upload,
  FileText,
  BookOpen,
  Presentation,
  FileQuestion,
  Calendar,
  X,
} from 'lucide-react'
import { ResourceType } from '@/lib/types'

interface UploadFormProps {
  courseCode?: string
  courseName?: string
  onSuccess?: () => void
  onClose?: () => void
}

export default function UploadForm({
  courseCode = 'N/A',
  courseName = 'Untitled Course',
  onSuccess,
  onClose,
}: UploadFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resource_type: '' as ResourceType | '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const resourceTypes = [
    { value: 'course_plan', label: 'Course Plan', icon: Calendar, color: 'bg-indigo-500' },
    { value: 'notes', label: 'Notes', icon: FileText, color: 'bg-blue-500' },
    { value: 'ppt', label: 'PPT', icon: Presentation, color: 'bg-purple-500' },
    { value: 'book', label: 'Book', icon: BookOpen, color: 'bg-green-500' },
    { value: 'question_paper', label: 'Question Paper', icon: FileQuestion, color: 'bg-red-500' },
  ]

  const maxFileSize = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '50') * 1024 * 1024

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (selectedFile.size > maxFileSize) {
      setError(`File size must be less than ${process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '50'}MB`)
      return
    }

    if (!formData.title) {
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, '')
      setFormData({ ...formData, title: fileName })
    }

    setFile(selectedFile)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.title || !formData.resource_type || !file) {
      setError('Please fill in all required fields and select a file')
      return
    }

    setLoading(true)
    setUploadProgress(0)

    try {
      const uploadData = new FormData()
      uploadData.append('file', file)
      uploadData.append('title', formData.title)
      uploadData.append('description', formData.description)
      uploadData.append('resource_type', formData.resource_type)
      uploadData.append('course_code', courseCode)

      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(percentComplete)
        }
      })

      const response = await new Promise<any>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'))
          }
        })

        xhr.addEventListener('error', () => reject(new Error('Network error')))
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

        xhr.open('POST', '/api/upload')
        xhr.send(uploadData)
      })

      setSuccess(response.message || 'Resource uploaded successfully!')
      setFormData({ title: '', description: '', resource_type: '' })
      setFile(null)
      setUploadProgress(0)

      if (onSuccess) {
        setTimeout(onSuccess, 1500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploadProgress(0)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-8 shadow-sm relative">
      {/* Close button (optional modal usage) */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Upload className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Upload Resource</h2>
          <p className="text-sm text-slate-500">
            {courseCode} — {courseName}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select File <span className="text-red-500">*</span>
          </label>

          {!file ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 font-medium">Click to upload or drag & drop</p>
                <p className="text-xs text-slate-500 mt-1">
                  PDF, PPT, DOC, XLS (max {process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '50'}MB)
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx"
              />
            </label>
          ) : (
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="p-1 hover:bg-slate-200 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Complete Data Structures Notes"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Brief description of the resource..."
            rows={3}
          />
        </div>

        {/* Resource Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Resource Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {resourceTypes.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormData({ ...formData, resource_type: value as ResourceType })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.resource_type === value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs font-medium text-slate-700 text-center">{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        {loading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Messages */}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !file}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          {loading ? `Uploading ${uploadProgress}%...` : 'Upload Resource'}
        </button>
      </form>
    </div>
  )
}
