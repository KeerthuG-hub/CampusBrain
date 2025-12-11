import React, { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Home, BookOpen, Beaker, Briefcase, Lightbulb, 
  Bell, User, Menu, X, ChevronDown, LogOut,
  FileText, Upload, MessageCircle, Building2,
  Users, Target, TrendingUp, Award, Search
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  subItems?: { label: string; path: string; icon: React.ComponentType<{ className?: string }> }[]
}

interface UnifiedNavbarProps {
  user: {
    id: string
    full_name: string
    role: string
    avatar_url?: string
  }
}

export default function UnifiedNavbar({ user }: UnifiedNavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  const navItems: NavItem[] = [
    {
      label: 'Home',
      path: '/',
      icon: Home,
    },
    {
      label: 'Courses',
      path: '/app/course-resources',
      icon: BookOpen,
      subItems: [
        { label: 'All Resources', path: '/app/course-resources', icon: FileText },
        { label: 'Upload Resource', path: '/app/course-resources?upload=true', icon: Upload },
      ]
    },
    {
      label: 'Research',
      path: '/app/research',
      icon: Beaker,
      subItems: [
        { label: 'Publications', path: '/app/research', icon: FileText },
        { label: 'Research Groups', path: '/app/research?view=sigs', icon: Users },
        { label: 'Submit Paper', path: '/app/research?action=submit', icon: Upload },
      ]
    },
    {
      label: 'Placements',
      path: '/app/placements',
      icon: Briefcase,
      subItems: [
        { label: 'Companies', path: '/app/placements', icon: Building2 },
        { label: 'Interview Prep', path: '/app/placements?tab=prep', icon: Target },
        { label: 'Experiences', path: '/app/placements?tab=experiences', icon: MessageCircle },
      ]
    },
    {
      label: 'Insights',
      path: '/app/insights',
      icon: Lightbulb,
      subItems: [
        { label: 'Q&A Forum', path: '/app/insights', icon: MessageCircle },
        { label: 'Ask Question', path: '/app/insights?action=ask', icon: Upload },
        { label: 'Leaderboard', path: '/app/insights?view=leaderboard', icon: Award },
      ]
    },
  ]

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.replace('/logout')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleDashboardClick = () => {
    if (user.role === 'faculty' || user.role === 'admin' || user.role === 'placement_officer') {
      router.push('/faculty')
    } else {
      router.push('/student')
    }
  }

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/')

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => router.push('/')}
          >
            <div className="w-10 h-10">
              <img
                src="/image.png"
                alt="Campus Brain"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Campus Brain</h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                Welcome, <span className="font-medium">{user.full_name?.split(' ')[0]}</span>
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <div
                key={item.path}
                className="relative group"
                onMouseEnter={() => setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  onClick={() => router.push(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.subItems && (
                    <ChevronDown className={`w-4 h-4 transition ${activeDropdown === item.label ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {/* Dropdown */}
                {item.subItems && activeDropdown === item.label && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl py-2">
                    {item.subItems.map((subItem) => (
                      <button
                        key={subItem.path}
                        onClick={() => {
                          router.push(subItem.path)
                          setActiveDropdown(null)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        <subItem.icon className="w-4 h-4 text-gray-400" />
                        <span>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="hidden lg:flex items-center space-x-3">
            <button 
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User Menu */}
            <div className="relative group">
              <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
                <span className="text-sm font-medium text-gray-900 hidden xl:block">
                  {user.full_name?.split(' ')[0]}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {/* User Dropdown */}
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
                <div className="py-2">
                  <button
                    onClick={handleDashboardClick}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    My Dashboard
                  </button>
                  <button
                    onClick={() => router.push('/setup')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    Edit Profile
                  </button>
                </div>
                <div className="border-t border-gray-100 py-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-4 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {/* User Info Mobile */}
            <div className="pb-4 mb-4 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
              <button
                onClick={handleDashboardClick}
                className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium"
              >
                My Dashboard
              </button>
            </div>

            {/* Navigation Items */}
            {navItems.map((item) => (
              <div key={item.path}>
                <button
                  onClick={() => {
                    if (!item.subItems) {
                      router.push(item.path)
                      setMobileMenuOpen(false)
                    } else {
                      setActiveDropdown(activeDropdown === item.label ? null : item.label)
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  {item.subItems && (
                    <ChevronDown className={`w-4 h-4 transition ${activeDropdown === item.label ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {/* Sub Items */}
                {item.subItems && activeDropdown === item.label && (
                  <div className="mt-2 ml-4 space-y-1">
                    {item.subItems.map((subItem) => (
                      <button
                        key={subItem.path}
                        onClick={() => {
                          router.push(subItem.path)
                          setMobileMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition"
                      >
                        <subItem.icon className="w-4 h-4" />
                        <span>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Mobile Bottom Actions */}
            <div className="pt-4 mt-4 border-t border-gray-200 space-y-2">
              <button
                onClick={() => {
                  router.push('/setup')
                  setMobileMenuOpen(false)
                }}
                className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Edit Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}