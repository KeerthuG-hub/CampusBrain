import React from 'react'
import { Eye, CheckCircle, Trash2 } from 'lucide-react'
import type { Resource } from '@/lib/types'

type Props = {
  resource: Resource
  onView?: (resource: Resource) => void
  onApprove?: (id: string) => void
  onDelete?: (id: string) => void
  canApprove?: boolean
  canDelete?: boolean
}

const getDriveLink = (url: string) => {
  if (!url) return '#'
  const match = url.match(/[-\w]{25,}/)
  if (!match) return url
  const id = match[0]
  return `https://drive.google.com/file/d/${id}/view`
}

export default function ResourceCard({
  resource,
  onView,
  onApprove,
  onDelete,
  canApprove,
  canDelete,
}: Props) {
  const viewLink = getDriveLink(resource.file_url)

  return (
    <div className="bg-white rounded-xl p-6 border hover:shadow-lg transition">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
          <span className="font-semibold text-slate-700">
            {resource.resource_type?.[0]?.toUpperCase() || '?'}
          </span>
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h3 className="font-bold">{resource.title}</h3>
            {resource.is_approved && <CheckCircle className="text-green-600" />}
          </div>
          <p className="text-sm text-slate-600 mt-2 line-clamp-3">
            {resource.description}
          </p>
          <div className="text-xs text-slate-400 mt-2">
            {resource.uploader_name || 'Unknown'} •{' '}
            {resource.created_at
              ? new Date(resource.created_at).toLocaleDateString()
              : 'N/A'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <div className="text-sm text-slate-500 flex gap-4">
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" /> {resource.view_count ?? 0}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Only View button remains */}
          <a
            href={viewLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation()
              onView?.(resource)
            }}
            className="px-3 py-1 border rounded text-sm hover:bg-slate-100 transition"
          >
            View
          </a>
          {canApprove && !resource.is_approved && (
            <button
              onClick={() => onApprove?.(resource.id)}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
            >
              Approve
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete?.(resource.id)}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm flex items-center gap-1 hover:bg-red-700 transition"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
