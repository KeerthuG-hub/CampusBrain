// ============================================
// FRONTEND STEP 5B: GeneralResources Component
// FILE: components/placements/GeneralResources.tsx
// ============================================

'use client';

import { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ExternalLink, Star, Search, TrendingUp, Plus } from 'lucide-react';

interface Category {
  value: string;
  label: string;
  icon: string;
}

const CATEGORIES: Category[] = [
  { value: 'aptitude', label: 'Aptitude', icon: '🧮' },
  { value: 'coding_dsa', label: 'Coding & DSA', icon: '💻' },
  { value: 'coding_sheets', label: 'Coding Sheets', icon: '📝' },
  { value: 'competitive_programming', label: 'Competitive Programming', icon: '🏆' },
  { value: 'system_design', label: 'System Design', icon: '🏗️' },
  { value: 'core_subjects', label: 'Core Subjects', icon: '📚' },
  { value: 'resume_building', label: 'Resume Building', icon: '📄' },
  { value: 'interview_preparation', label: 'Interview Prep', icon: '🎤' },
  { value: 'communication_skills', label: 'Communication', icon: '💬' },
  { value: 'group_discussion', label: 'Group Discussion', icon: '👥' },
  { value: 'mock_tests', label: 'Mock Tests', icon: '📝' },
  { value: 'useful_links', label: 'Useful Links', icon: '🔗' },
  { value: 'study_materials', label: 'Study Materials', icon: '📖' },
  { value: 'company_specific_prep', label: 'Company Specific', icon: '🏢' },
  { value: 'other', label: 'Other', icon: '📦' },
];

interface Resource {
  id: string;
  title: string;
  description?: string;
  category: string;
  resource_url?: string;
  file_url?: string;
  is_featured: boolean;
  view_count: number;
  click_count: number;
}

interface GeneralResourcesProps {
  userRole: string;
}

export default function GeneralResources({ userRole }: GeneralResourcesProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('general_placement_resources')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data } = await query;
      if (data) setResources(data as Resource[]);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = resources.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const featuredResources = resources.filter(r => r.is_featured);
  const canManage = userRole === 'admin' || userRole === 'placement_officer';

  return (
    <div className="space-y-6">
      {/* Featured Resources */}
      {featuredResources.length > 0 && selectedCategory === 'all' && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
              Featured Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredResources.slice(0, 6).map((resource) => (
                <a
                  key={resource.id}
                  href={resource.resource_url || resource.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow border"
                >
                  <TrendingUp className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm">{resource.title}</h4>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {resource.description}
                    </p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {CATEGORIES.find(c => c.value === resource.category)?.label}
                    </Badge>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Manage */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {canManage && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All Resources
        </Button>
        {CATEGORIES.map(cat => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.icon} {cat.label}
          </Button>
        ))}
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading resources...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No resources found. Try a different search or category.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map(resource => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ResourceCardProps {
  resource: Resource;
}

function ResourceCard({ resource }: ResourceCardProps) {
  const category = CATEGORIES.find(c => c.value === resource.category);
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{category?.icon}</span>
              {resource.is_featured && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <CardTitle className="text-lg">{resource.title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {resource.description}
        </p>
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{category?.label}</Badge>
          {(resource.resource_url || resource.file_url) && (
            <Button size="sm" variant="outline" asChild>
              <a 
                href={resource.resource_url || resource.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}