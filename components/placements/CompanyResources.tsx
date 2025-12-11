// ============================================
// FRONTEND STEP 5A: CompanyResources Component
// FILE: components/placements/CompanyResources.tsx
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, ExternalLink, Upload, Calendar, User, Loader2 } from 'lucide-react';

interface Profile {
  full_name?: string;
  email?: string;
}

interface Resource {
  id: string;
  title: string;
  description?: string;
  year: number;
  resource_type: string;
  file_url?: string;
  external_link?: string;
  view_count: number;
  download_count: number;
  profiles?: Profile;
}

interface Props {
  companyId: string;
}

export default function CompanyResources({ companyId }: Props) {
  const { user, loading: authLoading } = useUnifiedAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      fetchResources();
    }
  }, [companyId, authLoading]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      console.log('[CompanyResources] Fetching resources for company:', companyId);
      
      const { data, error } = await supabase
        .from('company_placement_resources')
        .select(`
          *,
          profiles:uploaded_by (
            full_name,
            email
          )
        `)
        .eq('company_id', companyId)
        .order('year', { ascending: false });
      
      if (error) {
        console.error('[CompanyResources] Error fetching:', error);
      } else {
        console.log('[CompanyResources] Fetched resources:', data?.length || 0);
        setResources(data as Resource[]);
      }
    } catch (error) {
      console.error('[CompanyResources] Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupByYear = (resources: Resource[]) => {
    return resources.reduce((acc: { [key: number]: Resource[] }, resource: Resource) => {
      if (!acc[resource.year]) acc[resource.year] = [];
      acc[resource.year].push(resource);
      return acc;
    }, {});
  };

  const grouped = groupByYear(resources);
  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-600">Loading resources...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Info - Remove in production */}
      {user && (
        <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
          Logged in as: {user.email} | Role: {user.role} | Resources: {resources.length}
        </div>
      )}

      {user ? (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Your Resource
            </CardTitle>
            <p className="text-sm text-gray-600">
              Share previous year questions, interview experiences, or preparation tips
            </p>
          </CardHeader>
          <CardContent>
            <UploadForm 
              companyId={companyId} 
              userId={user.id}
              onSuccess={fetchResources} 
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-6 text-center">
            <p className="text-gray-700">
              Please sign in to upload and share resources with fellow students
            </p>
          </CardContent>
        </Card>
      )}

      {years.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>No resources available yet. Be the first to upload!</p>
            {user && (
              <p className="text-xs mt-2">Use the form above to add a resource</p>
            )}
          </CardContent>
        </Card>
      ) : (
        years.map(year => (
          <Card key={year}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {year} Placement Resources ({grouped[Number(year)].length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {grouped[Number(year)].map((resource) => (
                  <ResourceItem key={resource.id} resource={resource} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

interface ResourceItemProps {
  resource: Resource;
}

function ResourceItem({ resource }: ResourceItemProps) {
  const handleClick = async (type: 'view' | 'download') => {
    try {
      const column = type === 'view' ? 'view_count' : 'download_count';
      const currentCount = type === 'view' ? resource.view_count : resource.download_count;
      
      await supabase
        .from('company_placement_resources')
        .update({ [column]: currentCount + 1 })
        .eq('id', resource.id);
    } catch (error) {
      console.error('Error updating count:', error);
    }
  };

  return (
    <div className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3 flex-1">
        <FileText className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold">{resource.title}</h4>
          {resource.description && (
            <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline">{resource.resource_type}</Badge>
            {resource.profiles && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <User className="h-3 w-3" />
                {resource.profiles.full_name || resource.profiles.email}
              </span>
            )}
            <span className="text-xs text-gray-500">
              {resource.view_count} views • {resource.download_count} downloads
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0 ml-4">
        {resource.file_url && (
          <Button 
            size="sm" 
            variant="outline" 
            asChild
            onClick={() => handleClick('download')}
          >
            <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-1" />
              Download
            </a>
          </Button>
        )}
        {resource.external_link && (
          <Button 
            size="sm" 
            variant="outline" 
            asChild
            onClick={() => handleClick('view')}
          >
            <a href={resource.external_link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

interface UploadFormProps {
  companyId: string;
  userId: string;
  onSuccess: () => void;
}

function UploadForm({ companyId, userId, onSuccess }: UploadFormProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    year: new Date().getFullYear(),
    resource_type: 'Previous Year Questions',
    external_link: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('[UploadForm] Submitting resource:', {
        company_id: companyId,
        uploaded_by: userId,
        ...form
      });

      const { data, error: insertError } = await supabase
        .from('company_placement_resources')
        .insert({
          company_id: companyId,
          uploaded_by: userId,
          title: form.title,
          description: form.description || null,
          year: form.year,
          resource_type: form.resource_type,
          external_link: form.external_link || null,
          view_count: 0,
          download_count: 0
        })
        .select();

      if (insertError) {
        console.error('[UploadForm] Insert error:', insertError);
        throw insertError;
      }

      console.log('[UploadForm] Resource uploaded successfully:', data);

      // Reset form
      setForm({
        title: '',
        description: '',
        year: new Date().getFullYear(),
        resource_type: 'Previous Year Questions',
        external_link: ''
      });
      
      // Show success message
      alert('Resource uploaded successfully!');
      
      // Refresh the resources list
      onSuccess();
    } catch (error: any) {
      console.error('[UploadForm] Error uploading:', error);
      setError(error.message || 'Failed to upload resource');
      alert('Failed to upload resource: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="text-sm font-medium block mb-1">Title *</label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g., 2024 Online Test Questions"
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium block mb-1">Description</label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          placeholder="Brief description of the resource"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium block mb-1">Year *</label>
          <Input
            type="number"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            min={2000}
            max={2050}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Type *</label>
          <select
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.resource_type}
            onChange={(e) => setForm({ ...form, resource_type: e.target.value })}
          >
            <option>Previous Year Questions</option>
            <option>Interview Experience</option>
            <option>Sample Resume</option>
            <option>Preparation Tips</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium block mb-1">
          Link (Google Drive, GitHub, etc.) *
        </label>
        <Input
          type="url"
          placeholder="https://drive.google.com/..."
          value={form.external_link}
          onChange={(e) => setForm({ ...form, external_link: e.target.value })}
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Share a publicly accessible link to your resource
        </p>
      </div>
      
      <Button onClick={handleSubmit} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload Resource
          </>
        )}
      </Button>
    </div>
  );
}