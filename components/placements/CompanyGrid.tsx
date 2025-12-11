'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CompanyCard from './CompanyCard';
import AddCompanyModal from './AddCompanyModal';

interface Company {
  id: string;
  name: string;
  industry: string;
  ctc_range: string;
  roles: string[] | any;
  about: string;
  offer_type: string;
  category: string;
  eligibility?: string;
  website?: string;
}

interface CompanyGridProps {
  category: string;
  userRole: string;
}

export default function CompanyGrid({ category, userRole }: CompanyGridProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      console.log('[COMPANY_GRID] Fetching companies for category:', category);
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('category', category)
        .eq('is_published', true)
        .order('name');
      
      if (error) {
        console.error('[COMPANY_GRID] Error:', error);
        throw error;
      }
      
      if (data) {
        console.log('[COMPANY_GRID] Fetched', data.length, 'companies');
        
        // CRITICAL: Normalize roles to always be string[]
        const normalizedCompanies = data.map(company => ({
          ...company,
          roles: Array.isArray(company.roles) 
            ? company.roles 
            : (typeof company.roles === 'string' 
              ? [company.roles] 
              : [])
        }));
        
        setCompanies(normalizedCompanies as Company[]);
      }
    } catch (error: any) {
      console.error('[COMPANY_GRID] Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const canAddCompany = userRole === 'admin' || userRole === 'placement_officer';

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading companies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canAddCompany && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {companies.length} {companies.length === 1 ? 'company' : 'companies'} in this category
          </p>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </div>
      )}

      {companies.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
          <p className="text-gray-500 mb-2">No companies added in this category yet.</p>
          {canAddCompany && (
            <Button 
              className="mt-4 bg-gradient-to-r from-blue-500 to-indigo-600" 
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Company
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddCompanyModal
          category={category}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchCompanies();
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
