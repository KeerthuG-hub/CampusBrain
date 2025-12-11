// ============================================
// UNIFIED AUTH HOOK
// FILE: lib/hooks/useUnifiedAuth.ts
// ============================================
// Use this hook in ALL components for consistent auth

'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

interface UnifiedUser {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'faculty' | 'admin' | 'placement_officer';
  avatar_url?: string | null;
}

interface UnifiedAuthState {
  user: UnifiedUser | null;
  loading: boolean;
  error: string | null;
}

export function useUnifiedAuth(): UnifiedAuthState {
  
  // Get AuthContext data (might be null)
  const { user: contextUser, userRole: contextRole, loading: contextLoading } = useAuth();
  
  // Session-based state
  const [sessionUser, setSessionUser] = useState<UnifiedUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Fetch session on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        console.log('[UNIFIED_AUTH] Checking session...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[UNIFIED_AUTH] Session error:', error);
          setSessionError(error.message);
          setSessionLoading(false);
          return;
        }

        if (!session?.user) {
          console.log('[UNIFIED_AUTH] No session found');
          setSessionLoading(false);
          return;
        }

        console.log('[UNIFIED_AUTH] ✅ Session found:', session.user.email);

        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, avatar_url')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('[UNIFIED_AUTH] Profile error:', profileError);
          setSessionError('Failed to load profile');
          setSessionLoading(false);
          return;
        }

        if (profile) {
          console.log('[UNIFIED_AUTH] ✅ Profile loaded - Role:', profile.role);
          setSessionUser({
            id: profile.id,
            email: profile.email || session.user.email || '',
            full_name: profile.full_name,
            role: profile.role,
            avatar_url: profile.avatar_url
          });
        }

        setSessionLoading(false);
      } catch (err: any) {
        console.error('[UNIFIED_AUTH] Unexpected error:', err);
        setSessionError(err.message);
        setSessionLoading(false);
      }
    };

    fetchSession();
  }, [supabase]);

  // Determine final user (session takes priority, then context)
  const finalUser: UnifiedUser | null = sessionUser || (contextUser && contextRole ? {
    id: contextUser.id,
    email: contextUser.email || '',
    full_name: contextUser.user_metadata?.full_name || contextUser.email || 'User',
    role: contextRole as 'student' | 'faculty' | 'admin' | 'placement_officer',
    avatar_url: contextUser.user_metadata?.avatar_url
  } : null);

  // Loading state: wait for both if needed
  // CRITICAL: Wait for session check to complete
const isLoading = sessionLoading;

console.log('[UNIFIED_AUTH] Final state:', {
  hasSessionUser: !!sessionUser,
  hasContextUser: !!contextUser,
  finalUser: finalUser?.email,
  finalRole: finalUser?.role,
  isLoading
});

return {
  user: finalUser,
  loading: isLoading,
  error: sessionError
};
}