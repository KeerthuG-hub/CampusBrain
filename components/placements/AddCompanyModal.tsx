'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Loader2 } from 'lucide-react';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { supabase } from '@/lib/supabase/client'

export interface AddCompanyModalProps {
  category: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCompanyModal({ category, onClose, onSuccess }: AddCompanyModalProps) {
  const { user, loading: authLoading, error: authError } = useUnifiedAuth();
  
  // Check permissions
  const hasPermission = user?.role === 'admin' || user?.role === 'placement_officer';

  // =============================
  // Form State
  // =============================
  const [form, setForm] = useState({
    name: '',
    industry: '',
    category: category,
    ctc_range: '',
    offer_type: 'Full-time',
    about: '',
    eligibility: '',
    roles: '',
    website: ''
  });

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // =============================
  // Submit Handler
  // =============================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setSubmitError('You must be logged in to add companies');
      return;
    }

    if (!hasPermission) {
      setSubmitError('You do not have permission to add companies');
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      console.log('[ADD_COMPANY] Submitting company data...');
      console.log('[ADD_COMPANY] User ID:', user.id);
      console.log('[ADD_COMPANY] User Role:', user.role);

      // Parse roles from comma-separated string into array
      const rolesArray = form.roles
        .split(',')
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      console.log('[ADD_COMPANY] Parsed roles:', rolesArray);

      // Prepare data object with proper types
      const companyData = {
        name: form.name.trim(),
        industry: form.industry.trim(),
        category: form.category,
        ctc_range: form.ctc_range.trim(),
        offer_type: form.offer_type,
        about: form.about.trim(),
        eligibility: form.eligibility.trim(),
        roles: rolesArray, // Array of strings
        website: form.website.trim() || null,
        is_published: true
      };

      console.log('[ADD_COMPANY] Data to insert:', companyData);

      const { data, error } = await supabase
        .from('companies')
        .insert(companyData)
        .select()
        .single();

      if (error) {
        console.error('[ADD_COMPANY] Insert error:', error);
        console.error('[ADD_COMPANY] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('[ADD_COMPANY] ✅ Company added successfully:', data);
      alert('Company added successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[ADD_COMPANY] Error adding company:', err);
      
      // More detailed error message
      let errorMessage = 'Failed to add company. ';
      
      if (err.message?.includes('roles')) {
        errorMessage += 'There was an issue with the roles field. Make sure roles are comma-separated.';
      } else if (err.code === '23505') {
        errorMessage += 'A company with this name already exists.';
      } else if (err.code === '23503') {
        errorMessage += 'Invalid foreign key reference.';
      } else if (err.message) {
        errorMessage += err.message;
      } else {
        errorMessage += 'Please check all fields and try again.';
      }
      
      setSubmitError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // Loading State
  // =============================
  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-lg font-semibold text-gray-700">Verifying permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  // =============================
  // Auth Error or No Permission
  // =============================
  if (authError || !user || !hasPermission) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-red-100 p-4 rounded-full">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
            <p className="text-gray-600 text-center">
              {authError || (!user ? 'Please sign in to continue' : `Your role (${user.role}) does not have permission to add companies`)}
            </p>
            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // =============================
  // Render Form (User is Authorized)
  // =============================
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 p-6 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-white">Add New Company</h2>
            <p className="text-sm text-white/80 mt-1">
              Logged in as: {user.full_name} ({user.role})
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Error Display */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-medium">{submitError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Name */}
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1">Company Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Google, Microsoft"
                required
                disabled={loading}
              />
            </div>

            {/* Industry */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Industry *</label>
              <Input
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                placeholder="e.g., Technology, Finance"
                required
                disabled={loading}
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Category *</label>
              <select
                className="w-full border rounded-lg p-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
                disabled={loading}
              >
                <option value="CORE">CORE</option>
                <option value="IT">IT</option>
                <option value="DREAM">DREAM</option>
                <option value="SUPER_DREAM">SUPER DREAM</option>
              </select>
            </div>

            {/* CTC Range */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">CTC Range *</label>
              <Input
                value={form.ctc_range}
                onChange={(e) => setForm({ ...form, ctc_range: e.target.value })}
                placeholder="e.g., 12–15 LPA"
                required
                disabled={loading}
              />
            </div>

            {/* Offer Type */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Offer Type *</label>
              <select
                className="w-full border rounded-lg p-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.offer_type}
                onChange={(e) => setForm({ ...form, offer_type: e.target.value })}
                required
                disabled={loading}
              >
                <option value="Full-time">Full-time</option>
                <option value="Internship">Internship</option>
                <option value="Internship + PPO">Internship + PPO</option>
              </select>
            </div>

            {/* Roles */}
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1">Roles (comma-separated) *</label>
              <Input
                value={form.roles}
                onChange={(e) => setForm({ ...form, roles: e.target.value })}
                placeholder="e.g., Software Engineer, Data Analyst, Product Manager"
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate multiple roles with commas
              </p>
            </div>

            {/* About */}
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1">About Company *</label>
              <Textarea
                value={form.about}
                onChange={(e) => setForm({ ...form, about: e.target.value })}
                rows={4}
                placeholder="Brief description of the company..."
                required
                disabled={loading}
                className="resize-none"
              />
            </div>

            {/* Eligibility */}
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1">Eligibility Criteria *</label>
              <Textarea
                value={form.eligibility}
                onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
                rows={3}
                placeholder="e.g., Minimum 70% aggregate, No active backlogs"
                required
                disabled={loading}
                className="resize-none"
              />
            </div>

            {/* Website */}
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1">Website</label>
              <Input
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://company.com"
                disabled={loading}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Company'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}