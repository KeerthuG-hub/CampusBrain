'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  userRole: string | null
  loading: boolean // true = still restoring session/role
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  // Fetch role safely
  const loadUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setUserRole(data.role)
    } else {
      setUserRole(null)
    }
  }

  useEffect(() => {
    let active = true

    const init = async () => {
      // Step 1 — restore session
      const { data: userData } = await supabase.auth.getUser()
      const loggedInUser = userData.user || null
      if (!active) return

      setUser(loggedInUser)

      // Step 2 — fetch role only if user exists
      if (loggedInUser) {
        await loadUserRole(loggedInUser.id)
      }

      if (active) setLoading(false) // done restoring session
    }

    init()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user || null
        if (!active) return

        setUser(currentUser)

        if (currentUser) {
          await loadUserRole(currentUser.id)
        } else {
          setUserRole(null)
        }

        if (active) setLoading(false)
      }
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, userRole, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
