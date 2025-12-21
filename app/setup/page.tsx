'use client'


import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, Loader, AlertCircle, Plus, Trash2, Award, BookOpen, Users, Sparkles, GraduationCap, Mail, Building2, Calendar, User } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'


const DEPARTMENTS = [
  "Computer Science", "Electronics and Communication", "Mechanical Engineering",
  "Civil Engineering", "Electrical Engineering", "Information Technology",
  "Mathematics", "Physics", "Chemistry", "Management Studies"
]


interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'student' | 'faculty' | 'admin'
  department: string | null
  batch_year: number | null
  bio: string | null
  points: number
}


interface Course {
  id: string
  code: string
  name: string
  semester_number: number
}


interface Sig {
  id: string
  name: string
  description: string | null
}


interface FacultyCourseEntry {
  id: string
  academic_year: string
  is_current: boolean
  teaching_role: string
}


interface FacultySigEntry {
  id: string
  role: 'lead' | 'member'
}


interface FormData {
  full_name: string
  department: string
  batch_year: string
  bio: string
  interests: string[]
  courses: FacultyCourseEntry[]
  sigs: FacultySigEntry[]
}


export default function SetupPage() {
  const router = useRouter()
 
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [isEditMode, setIsEditMode] = useState(false)


  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [availableSigs, setAvailableSigs] = useState<Sig[]>([])
  const [researchDomains, setResearchDomains] = useState<string[]>([])


  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    department: '',
    batch_year: '',
    bio: '',
    interests: [],
    courses: [],
    sigs: []
  })


  useEffect(() => {
    loadSetupData()
  }, [])


  const loadSetupData = async () => {
    try {
      console.log('[SETUP] ━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[SETUP] LOADING SETUP DATA')
      console.log('[SETUP] ━━━━━━━━━━━━━━━━━━━━━━━━━━')
     
      // STEP 1: Get session first
      console.log('[SETUP] Fetching session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
     
      if (sessionError) {
        console.error('[SETUP] ❌ Session error:', sessionError)
        setError('Session error. Please try logging in again.')
        setLoading(false)
       
        await new Promise(resolve => setTimeout(resolve, 2000))
        router.replace('/login?error=session_error')
        return
      }
     
      if (!session?.user) {
        console.error('[SETUP] ❌ No session found')
       
        // Check if this is a new signup (has auth flags)
        const authValidated = sessionStorage.getItem('auth_validated')
        const setupInProgress = sessionStorage.getItem('setup_in_progress')
       
        if (authValidated !== 'true' && setupInProgress !== 'true') {
          setError('Please log in first')
          setLoading(false)
         
          await new Promise(resolve => setTimeout(resolve, 2000))
          router.replace('/login?error=no_session')
          return
        }
       
        // If we have auth flags but no session, wait a bit longer
        console.log('[SETUP] ⏳ Has auth flags, waiting for session to stabilize...')
        await new Promise(resolve => setTimeout(resolve, 1000))
       
        // Try again
        const { data: { session: retrySession } } = await supabase.auth.getSession()
        if (!retrySession?.user) {
          setError('Session not found. Please log in again.')
          setLoading(false)
          await new Promise(resolve => setTimeout(resolve, 2000))
          router.replace('/login?error=session_timeout')
          return
        }
      }
     
      console.log('[SETUP] ✅ Session found!')
      console.log('[SETUP] User ID:', session!.user.id)
      console.log('[SETUP] Email:', session!.user.email)
     
      // STEP 2: Load profile data
      console.log('[SETUP] Loading profile...')
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session!.user.id)
        .single()
       
      if (profileError) {
        console.error('[SETUP] ❌ Profile error:', profileError)
        setError('Failed to load profile. Please try again.')
        setLoading(false)
        return
      }


      if (!profileData) {
        console.error('[SETUP] ❌ No profile data found')
        setError('Profile not found')
        setLoading(false)
        return
      }
     
      console.log('[SETUP] ✅ Profile loaded!')
      console.log('[SETUP] Role:', profileData.role)
      console.log('[SETUP] Name:', profileData.full_name || '(not set)')
     
      // Check if this is edit mode (profile already has basic info)
      const hasBasicInfo = profileData.full_name && profileData.department
      setIsEditMode(hasBasicInfo)
      console.log('[SETUP] Mode:', hasBasicInfo ? 'EDIT' : 'NEW SETUP')
     
      setProfile(profileData)


      // STEP 3: Load research domains from tags table
      console.log('[SETUP] Loading research domains...')
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('name')
        .eq('type', 'tech_domain')
        .order('name', { ascending: true })


      if (tagsError) {
        console.error('[SETUP] Tags error:', tagsError)
      } else {
        setResearchDomains((tagsData || []).map(t => t.name))
        console.log('[SETUP] ✅ Loaded', tagsData?.length || 0, 'research domains')
      }


      // STEP 4: Load user interests from user_interests table
      console.log('[SETUP] Loading user interests...')
      const { data: userInterestsData, error: interestsError } = await supabase
        .from('user_interests')
        .select(`
          tag_id,
          tags!inner(id, name)
        `)
        .eq('user_id', session!.user.id)


      let userInterestNames: string[] = []
      if (interestsError) {
        console.error('[SETUP] Interests error:', interestsError)
      } else {
        userInterestNames = (userInterestsData || [])
          .map((ui: any) => ui.tags?.name)
          .filter(Boolean)
        console.log('[SETUP] ✅ Loaded', userInterestNames.length, 'user interests:', userInterestNames)
      }


      // STEP 5: Load courses
      console.log('[SETUP] Loading courses...')
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, code, name, semester_number')
        .order('semester_number', { ascending: true })
       
      if (coursesError) {
        console.error('[SETUP] Courses error:', coursesError)
      } else {
        setAvailableCourses(coursesData || [])
        console.log('[SETUP] ✅ Loaded', coursesData?.length || 0, 'courses')
      }


      // STEP 6: Load SIGs
      console.log('[SETUP] Loading SIGs...')
      const { data: sigsData, error: sigsError } = await supabase
        .from('sigs')
        .select('id, name, description')
        .order('name', { ascending: true })
       
      if (sigsError) {
        console.error('[SETUP] SIGs error:', sigsError)
      } else {
        setAvailableSigs(sigsData || [])
        console.log('[SETUP] ✅ Loaded', sigsData?.length || 0, 'SIGs')
      }


      // STEP 7: Load faculty-specific data if needed
      let existingCourses: FacultyCourseEntry[] = []
      let existingSigs: FacultySigEntry[] = []


      if (profileData.role === 'faculty') {
        console.log('[SETUP] Loading faculty courses...')
        const { data: facultyCoursesData } = await supabase
          .from('faculty_courses')
          .select('course_id, academic_year, is_current, teaching_role')
          .eq('faculty_id', session!.user.id)
          .order('academic_year', { ascending: false })
       
        existingCourses = (facultyCoursesData || []).map(fc => ({
          id: fc.course_id,
          academic_year: fc.academic_year,
          is_current: fc.is_current,
          teaching_role: fc.teaching_role
        }))
        console.log('[SETUP] ✅ Loaded', existingCourses.length, 'faculty courses')


        console.log('[SETUP] Loading faculty SIGs...')
        const { data: facultySigsData } = await supabase
          .from('faculty_sigs')
          .select('sig_id, role')
          .eq('faculty_id', session!.user.id)
       
        existingSigs = (facultySigsData || []).map(fs => ({
          id: fs.sig_id,
          role: fs.role as 'lead' | 'member'
        }))
        console.log('[SETUP] ✅ Loaded', existingSigs.length, 'faculty SIGs')
      }


      // STEP 8: Set form data
      setFormData({
        full_name: profileData.full_name || '',
        department: profileData.department || '',
        batch_year: profileData.batch_year?.toString() || '',
        bio: profileData.bio || '',
        interests: userInterestNames,
        courses: existingCourses,
        sigs: existingSigs
      })
     
      console.log('[SETUP] ✅ Form data initialized')
      console.log('[SETUP] Interests set:', userInterestNames)
      console.log('[SETUP] ━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[SETUP] SETUP DATA LOADED SUCCESSFULLY')
      console.log('[SETUP] ━━━━━━━━━━━━━━━━━━━━━━━━━━')


      // STEP 9: Clear auth_validated flag (but keep setup_in_progress if in setup mode)
      if (!hasBasicInfo) {
        sessionStorage.removeItem('auth_validated')
        console.log('[SETUP] Cleared auth_validated flag (new setup)')
      }
     
      setLoading(false)
     
    } catch (err: any) {
      console.error('[SETUP] ❌ FATAL ERROR:', err)
      console.error('[SETUP] Stack:', err.stack)
      setError(err?.message || 'Failed to load setup data')
      setLoading(false)
     
      // On fatal error, wait before redirect
      await new Promise(resolve => setTimeout(resolve, 3000))
      router.replace('/login?error=setup_load_failed')
    }
  }


  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }


  const addCourse = () => {
    if (availableCourses.length === 0) return
    const currentYear = new Date().getFullYear()
    const nextYear = currentYear + 1
    setFormData(prev => ({
      ...prev,
      courses: [...prev.courses, {
        id: availableCourses[0].id,
        academic_year: `${currentYear}-${nextYear.toString().slice(-2)}`,
        is_current: true,
        teaching_role: 'instructor'
      }]
    }))
  }


  const removeCourse = (index: number) => {
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.filter((_, i) => i !== index)
    }))
  }


  const updateCourse = (index: number, field: keyof FacultyCourseEntry, value: any) => {
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }))
  }


  const addSig = () => {
    if (availableSigs.length === 0) return
    setFormData(prev => ({
      ...prev,
      sigs: [...prev.sigs, {
        id: availableSigs[0].id,
        role: 'member'
      }]
    }))
  }


  const removeSig = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sigs: prev.sigs.filter((_, i) => i !== index)
    }))
  }


  const updateSig = (index: number, field: keyof FacultySigEntry, value: any) => {
    setFormData(prev => ({
      ...prev,
      sigs: prev.sigs.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }))
  }


  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!formData.full_name.trim()) {
        setError('Please enter your full name')
        return false
      }
      if (!formData.department) {
        setError('Please select your department')
        return false
      }
      if (profile?.role === 'student' && !formData.batch_year) {
        setError('Please enter your batch year')
        return false
      }
      if (profile?.role === 'student') {
        const year = parseInt(formData.batch_year)
        if (isNaN(year) || year < 2000 || year > 2030) {
          setError('Please enter a valid batch year between 2000 and 2030')
          return false
        }
      }
    } else if (step === 2) {
      if (formData.interests.length === 0) {
        setError('Please select at least one interest')
        return false
      }
    } else if (step === 3 && profile?.role === 'faculty') {
      if (formData.courses.length === 0 && formData.sigs.length === 0) {
        setError('Please add at least one course or SIG membership')
        return false
      }
    }
    setError('')
    return true
  }


  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, profile?.role === 'faculty' ? 3 : 2))
    }
  }


  const prevStep = () => {
    setError('')
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }


  const handleSubmit = async () => {
    setError('')
    setSuccessMessage('')


    if (!validateStep(currentStep)) return


    setSaving(true)


    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')


      console.log('[SETUP] 💾 Saving profile...')
      console.log('[SETUP] Interests to save:', formData.interests)


      const updateData: any = {
        full_name: formData.full_name.trim(),
        department: formData.department,
        bio: formData.bio.trim() || null,
        updated_at: new Date().toISOString()
      }


      if (profile?.role === 'student') {
        updateData.batch_year = parseInt(formData.batch_year)
      }


      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', session.user.id)
       
      if (profileError) throw profileError
      console.log('[SETUP] ✅ Profile updated')


      // Delete existing interests
      console.log('[SETUP] 🗑️ Deleting old interests...')
      await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', session.user.id)


      // Insert new interests
      if (formData.interests.length > 0) {
        console.log('[SETUP] 📝 Inserting new interests:', formData.interests)
       
        const { data: selectedTags, error: tagsError } = await supabase
          .from('tags')
          .select('id, name')
          .eq('type', 'tech_domain')
          .in('name', formData.interests)


        if (tagsError) {
          console.error('[SETUP] ❌ Tags query error:', tagsError)
          throw tagsError
        }


        console.log('[SETUP] Found tags:', selectedTags)


        if (selectedTags && selectedTags.length > 0) {
          const interestsToInsert = selectedTags.map(tag => ({
            user_id: session.user.id,
            tag_id: tag.id
          }))
         
          console.log('[SETUP] Inserting user_interests:', interestsToInsert)
         
          const { error: interestsError } = await supabase
            .from('user_interests')
            .insert(interestsToInsert)
         
          if (interestsError) {
            console.error('[SETUP] ❌ Interests insert error:', interestsError)
            throw interestsError
          }
         
          console.log('[SETUP] ✅ Interests saved successfully')
        }
      }


      if (profile?.role === 'faculty') {
        console.log('[SETUP] 💼 Saving faculty data...')
       
        await supabase
          .from('faculty_courses')
          .delete()
          .eq('faculty_id', session.user.id)


        if (formData.courses.length > 0) {
          const coursesToInsert = formData.courses.map(c => ({
            faculty_id: session.user.id,
            course_id: c.id,
            academic_year: c.academic_year,
            is_current: c.is_current,
            teaching_role: c.teaching_role
          }))
          const { error: coursesError } = await supabase
            .from('faculty_courses')
            .insert(coursesToInsert)
         
          if (coursesError) throw coursesError
        }


        await supabase
          .from('faculty_sigs')
          .delete()
          .eq('faculty_id', session.user.id)


        if (formData.sigs.length > 0) {
          const sigsToInsert = formData.sigs.map(s => ({
            faculty_id: session.user.id,
            sig_id: s.id,
            role: s.role
          }))
          const { error: sigsError } = await supabase
            .from('faculty_sigs')
            .insert(sigsToInsert)
         
          if (sigsError) throw sigsError
        }
       
        console.log('[SETUP] ✅ Faculty data saved')
      }


      setSuccessMessage(isEditMode ? 'Profile updated successfully!' : 'Profile setup completed successfully!')
      setSaving(false)
     
      // Clear setup flags before redirect
      sessionStorage.removeItem('setup_in_progress')
      sessionStorage.removeItem('validated_role')
      sessionStorage.removeItem('validated_user_id')
      sessionStorage.removeItem('validated_email')
     
      console.log('[SETUP] ✅ ALL DATA SAVED SUCCESSFULLY')
     
      setTimeout(() => {
        router.push(profile?.role === 'faculty' ? '/' : '/')
      }, 2000)
    } catch (err: any) {
      console.error('[SETUP] ❌ Save error:', err)
      setError(err?.message || 'Failed to save. Please try again.')
      setSaving(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    )
  }


  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to load your profile'}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }


  const isNewUser = !isEditMode
  const isFaculty = profile.role === 'faculty'
  const totalSteps = isFaculty ? 3 : 2


  const getCourseById = (id: string) => availableCourses.find(c => c.id === id)
  const getSigById = (id: string) => availableSigs.find(s => s.id === id)


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            {isFaculty ? (
              <GraduationCap className="w-8 h-8 text-white" />
            ) : (
              <User className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isNewUser ? 'Complete Your Profile' : 'Update Your Profile'}
          </h1>
          <p className="text-gray-600">
            {isNewUser
              ? 'Let\'s get you set up with your academic profile'
              : 'Review and update your information'}
          </p>
        </div>


        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <React.Fragment key={index}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    currentStep > index + 1
                      ? 'bg-green-500 text-white'
                      : currentStep === index + 1
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {currentStep > index + 1 ? <Check className="w-5 h-5" /> : index + 1}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${
                    currentStep === index + 1 ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {index === 0 && 'Basic Info'}
                    {index === 1 && 'Interests'}
                    {index === 2 && 'Courses & SIGs'}
                  </span>
                </div>
                {index < totalSteps - 1 && (
                  <div className={`w-16 h-1 rounded transition-all ${
                    currentStep > index + 1 ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>


        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">{successMessage}</p>
              <p className="text-sm text-green-700 mt-1">Redirecting to dashboard...</p>
            </div>
          </div>
        )}


        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}


        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <User className="w-6 h-6 text-blue-600" />
                  Basic Information
                </h2>
              </div>


              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{profile.email}</span>
                </div>
              </div>


              <div>
                <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>


              <div>
                <label htmlFor="department" className="block text-sm font-semibold text-gray-700 mb-2">
                  Department <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none bg-white"
                  >
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>


              {!isFaculty && (
                <div>
                  <label htmlFor="batch_year" className="block text-sm font-semibold text-gray-700 mb-2">
                    Batch Year <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="batch_year"
                      type="number"
                      value={formData.batch_year}
                      onChange={(e) => setFormData(prev => ({ ...prev, batch_year: e.target.value }))}
                      placeholder="e.g., 2024"
                      min="2000"
                      max="2030"
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              )}


              <div>
                <label htmlFor="bio" className="block text-sm font-semibold text-gray-700 mb-2">
                  Bio <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder={isFaculty
                    ? "Share your research interests, teaching philosophy, and academic background..."
                    : "Tell us about yourself, your interests, and your goals..."}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition"
                />
              </div>
            </div>
          )}


          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                  Interests <span className="text-red-500">*</span>
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  Select areas that interest you. This helps personalize your experience and connect you with relevant opportunities.
                </p>
              </div>


              {researchDomains.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Loader className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
                  <p className="text-gray-600">Loading research domains...</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {researchDomains.map((domain) => (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => toggleInterest(domain)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.interests.includes(domain)
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {domain}
                    </button>
                  ))}
                </div>
              )}


              {formData.interests.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Selected Interests ({formData.interests.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData.interests.map(interest => (
                      <span key={interest} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}


          {currentStep === 3 && isFaculty && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600" />
                Courses & SIG Memberships
              </h2>


              {/* COURSES */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    Courses You Teach
                  </h3>
                  <button
                    onClick={addCourse}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Course
                  </button>
                </div>


                {formData.courses.length === 0 && (
                  <p className="text-sm text-gray-500">No courses added</p>
                )}


                <div className="space-y-4">
                  {formData.courses.map((c, index) => {
                    const course = getCourseById(c.id)
                    return (
                      <div key={index} className="border p-4 rounded-lg bg-gray-50 relative">
                        <button
                          onClick={() => removeCourse(index)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>


                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                            <select
                              value={c.id}
                              onChange={(e) => updateCourse(index, 'id', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg"
                            >
                              {availableCourses.map(course => (
                                <option key={course.id} value={course.id}>
                                  {course.code} — {course.name}
                                </option>
                              ))}
                            </select>
                          </div>


                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Teaching Role</label>
                            <select
                              value={c.teaching_role}
                              onChange={(e) => updateCourse(index, 'teaching_role', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg"
                            >
                              <option value="instructor">Instructor</option>
                              <option value="co-instructor">Co-Instructor</option>
                              <option value="ta">Teaching Assistant</option>
                            </select>
                          </div>


                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                            <input
                              type="text"
                              value={c.academic_year}
                              onChange={(e) => updateCourse(index, 'academic_year', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>


                          <div className="flex items-center gap-2 mt-6">
                            <input
                              type="checkbox"
                              checked={c.is_current}
                              onChange={(e) => updateCourse(index, 'is_current', e.target.checked)}
                            />
                            <span className="text-sm text-gray-700">Currently Teaching</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>


              {/* SIGs */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    SIG Memberships
                  </h3>
                  <button
                    onClick={addSig}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add SIG
                  </button>
                </div>


                {formData.sigs.length === 0 && (
                  <p className="text-sm text-gray-500">No SIG memberships added</p>
                )}


                <div className="space-y-4">
                  {formData.sigs.map((s, index) => {
                    const sig = getSigById(s.id)
                    return (
                      <div key={index} className="border p-4 rounded-lg bg-gray-50 relative">
                        <button
                          onClick={() => removeSig(index)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>


                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">SIG</label>
                            <select
                              value={s.id}
                              onChange={(e) => updateSig(index, 'id', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg"
                            >
                              {availableSigs.map(sig => (
                                <option key={sig.id} value={sig.id}>
                                  {sig.name}
                                </option>
                              ))}
                            </select>
                          </div>


                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select
                              value={s.role}
                              onChange={(e) => updateSig(index, 'role', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg"
                            >
                              <option value="member">Member</option>
                              <option value="lead">Lead</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>


        {/* FOOTER NAVIGATION */}
        <div className="flex justify-between">
          {currentStep > 1 ? (
            <button
              onClick={prevStep}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
            >
              Back
            </button>
          ) : (
            <div />
          )}


          {currentStep < totalSteps ? (
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Finish Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}



