'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { LogOut, Loader2, CheckCircle, AlertCircle, X, Home } from 'lucide-react';

interface UserInfo {
  email: string;
  name: string;
  role: string;
}

export default function LogoutPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutSuccess, setLogoutSuccess] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [showConfirm, setShowConfirm] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Load user info on mount
  useEffect(() => {
    async function getUserInfo() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single();
          
          setUserInfo({
            email: user.email || 'No email',
            name: profile?.full_name || user.email?.split('@')[0] || 'User',
            role: profile?.role || 'user'
          });
        }
      } catch (error) {
        console.error('Error loading user info:', error);
      }
    }
    getUserInfo();
  }, []);

  // Auto-redirect countdown after successful logout
  useEffect(() => {
    if (logoutSuccess && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (logoutSuccess && countdown === 0) {
      router.push('/');
    }
  }, [logoutSuccess, countdown, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError('');

    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      // Clear any local storage (except persistent settings)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Keep theme preferences, but clear session data
        if (key && !key.includes('theme') && !key.includes('preference')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear session storage
      sessionStorage.clear();

      // Success!
      setLogoutSuccess(true);
      setShowConfirm(false);

    } catch (error) {
      console.error('Logout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to logout. Please try again.';
      setLogoutError(errorMessage);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  // Success Screen
  if (logoutSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle className="text-green-600" size={40} />
            </div>

            {/* Success Message */}
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Successfully Logged Out
            </h1>
            <p className="text-gray-600 mb-8">
              You&apos;ve been safely logged out of your account.
            </p>

            {/* User Info */}
            {userInfo && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500 mb-1">Logged out from</p>
                <p className="font-semibold text-gray-800">{userInfo.name}</p>
                <p className="text-sm text-gray-600">{userInfo.email}</p>
              </div>
            )}

            {/* Auto-redirect message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                Redirecting to home page in <span className="font-bold">{countdown}</span> seconds...
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={handleGoHome}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Home size={20} />
              Go to Home Page Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation Screen
  if (showConfirm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 text-white">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <LogOut size={32} />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-center">Confirm Logout</h1>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* User Info */}
              {userInfo && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-500 mb-2">Currently logged in as:</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">
                        {userInfo.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{userInfo.name}</p>
                      <p className="text-sm text-gray-600 truncate">{userInfo.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium capitalize">
                        {userInfo.role}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning Message */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">Before you go...</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Your session will be ended</li>
                      <li>• Unsaved changes may be lost</li>
                      <li>• You&apos;ll need to login again to access your account</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {logoutError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium">{logoutError}</p>
                  </div>
                  <button
                    onClick={() => setLogoutError('')}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-red-700 hover:to-pink-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loggingOut ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Logging out...
                    </>
                  ) : (
                    <>
                      <LogOut size={20} />
                      Yes, Logout
                    </>
                  )}
                </button>

                <button
                  onClick={handleCancel}
                  disabled={loggingOut}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>

              {/* Additional Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Having trouble? Contact support at{' '}
                  <a href="mailto:support@example.com" className="text-indigo-600 hover:underline">
                    support@example.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}