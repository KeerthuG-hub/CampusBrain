'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { validateEmail } from '@/lib/auth/validation'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<'student' | 'faculty' | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
    interests: [] as string[],
    batch_year: new Date().getFullYear()
  })

  useEffect(() => {
    async function checkProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Determine role from email
      const validation = await validateEmail(user.email!)
      setRole(validation.role)
    }
    checkProfile()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        department: formData.department,
        interests: formData.interests,
        role: role,
        ...(role === 'student' && { batch_year: formData.batch_year })
      })
      .eq('id', user!.id)

    setLoading(false)

    if (!error) {
      router.push(role === 'faculty' ? '/faculty' : '/student')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Complete Your Profile</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <input
              type="text"
              required
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {role === 'student' && (
            <div>
              <label className="block text-sm font-medium mb-1">Batch Year</label>
              <input
                type="number"
                required
                value={formData.batch_year}
                onChange={(e) => setFormData({...formData, batch_year: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Interests (comma-separated)</label>
            <input
              type="text"
              placeholder="AI, Networks, IoT"
              onChange={(e) => setFormData({
                ...formData, 
                interests: e.target.value.split(',').map(s => s.trim())
              })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}