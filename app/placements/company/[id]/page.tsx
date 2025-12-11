// ============================================
// FRONTEND STEP 4: Company Detail Page
// FILE: app/placements/company/[id]/page.tsx
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client'; // FIXED: Use consistent client
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ExternalLink, Building2, Users, DollarSign, 
  Briefcase, ArrowLeft, Globe 
} from 'lucide-react';
import Link from 'next/link';
import CompanyResources from '@/components/placements/CompanyResources';

interface Company {
  id: string;
  name: string;
  industry: string;
  category: string;
  ctc_range: string;
  offer_type: string;
  about: string;
  services?: string[];
  industries_served?: string[];
  focus?: string;
  eligibility: string;
  roles?: string[] | any; // FIXED: Allow flexible type
  pre_placement_insights?: string;
  technologies?: string[];
  growth_opportunities?: string;
  website?: string;
  careers_page?: string;
}

interface RecruitmentRound {
  id: string;
  round_number: number;
  name: string;
  mode: string;
  description: string;
  expectations: string;
}

interface PrepArea {
  id: string;
  type: string;
  topics?: string[];
  tips: string;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = params.id as string;
  const [company, setCompany] = useState<Company | null>(null);
  const [rounds, setRounds] = useState<RecruitmentRound[]>([]);
  const [prepAreas, setPrepAreas] = useState<PrepArea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanyDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const fetchCompanyDetails = async () => {
    setLoading(true);
    try {
      // Fetch company
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyData) {
        // FIXED: Normalize roles to always be array
        const normalizedCompany = {
          ...companyData,
          roles: Array.isArray(companyData.roles) 
            ? companyData.roles 
            : (typeof companyData.roles === 'string' 
              ? [companyData.roles] 
              : [])
        };
        
        setCompany(normalizedCompany as Company);

        // Fetch recruitment rounds
        const { data: roundsData } = await supabase
          .from('company_recruitment_rounds')
          .select('*')
          .eq('company_id', companyId)
          .order('round_number');

        if (roundsData) setRounds(roundsData as RecruitmentRound[]);

        // Fetch prep areas
        const { data: prepData } = await supabase
          .from('company_prep_areas')
          .select('*')
          .eq('company_id', companyId);

        if (prepData) setPrepAreas(prepData as PrepArea[]);
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading company details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Company not found</p>
            <Link href="/placements">
              <Button className="mt-4">Back to Placements</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper to ensure array
  const rolesArray = Array.isArray(company.roles) ? company.roles : [];

  return (
    <div className="container mx-auto p-6">
      {/* Back Button */}
      <Link href="/placements">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Placements
        </Button>
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Building2 className="h-10 w-10 text-blue-600" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">{company.name}</h1>
            <p className="text-gray-600">{company.industry}</p>
            <Badge className="mt-2">{company.category}</Badge>
          </div>
        </div>
        <div className="flex gap-4">
          {company.website && (
            <a 
              href={company.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <Globe className="h-4 w-4" />
              Official Website
            </a>
          )}
          {company.careers_page && (
            <a 
              href={company.careers_page} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Careers Page
            </a>
          )}
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <DollarSign className="h-8 w-8 text-green-600 mb-2" />
            <p className="text-sm text-gray-600">CTC Range</p>
            <p className="text-2xl font-bold">{company.ctc_range}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Briefcase className="h-8 w-8 text-blue-600 mb-2" />
            <p className="text-sm text-gray-600">Offer Type</p>
            <p className="text-xl font-bold">{company.offer_type}</p>
          </CardContent>
        </Card>
        
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="process">Recruitment Process</TabsTrigger>
          <TabsTrigger value="preparation">Preparation</TabsTrigger>
          <TabsTrigger value="resources">Previous Year Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About {company.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap">{company.about}</p>
              
              {company.services && company.services.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Services</h3>
                  <div className="flex flex-wrap gap-2">
                    {company.services.map((service, idx) => (
                      <Badge key={idx} variant="outline">{service}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {company.industries_served && company.industries_served.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Industries Served</h3>
                  <div className="flex flex-wrap gap-2">
                    {company.industries_served.map((industry, idx) => (
                      <Badge key={idx} variant="secondary">{industry}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {company.focus && (
                <div>
                  <h3 className="font-semibold mb-2">Focus Areas</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{company.focus}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Eligibility Criteria</h3>
                <p className="text-gray-600">{company.eligibility}</p>
              </div>

              {/* FIXED: Safe roles rendering */}
              {rolesArray.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Roles Offered</h3>
                  <div className="flex flex-wrap gap-2">
                    {rolesArray.map((role, idx) => (
                      <Badge key={idx}>{role}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {company.pre_placement_insights && (
            <Card>
              <CardHeader>
                <CardTitle>Pre-Placement Talk Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-gray-700">
                  {company.pre_placement_insights}
                </p>
                
                {company.technologies && company.technologies.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Technologies Used</h3>
                    <div className="flex flex-wrap gap-2">
                      {company.technologies.map((tech, idx) => (
                        <Badge key={idx} variant="outline">{tech}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {company.growth_opportunities && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Growth Opportunities</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">
                      {company.growth_opportunities}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="process">
          <Card>
            <CardHeader>
              <CardTitle>Recruitment Process</CardTitle>
            </CardHeader>
            <CardContent>
              {rounds.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Recruitment process details not yet added
                </p>
              ) : (
                <div className="space-y-6">
                  {rounds.map((round) => (
                    <div key={round.id} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>Round {round.round_number}</Badge>
                        <h3 className="text-xl font-semibold">{round.name}</h3>
                        <Badge variant="outline">{round.mode}</Badge>
                      </div>
                      <p className="text-gray-700 mb-2">{round.description}</p>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">What They Expect:</span> {round.expectations}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preparation">
          {prepAreas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">Preparation areas not yet added</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {prepAreas.map((area, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle>{area.type}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Topics to Focus</h4>
                      <div className="flex flex-wrap gap-2">
                        {area.topics?.map((topic, i) => (
                          <Badge key={i} variant="secondary">{topic}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">💡 Pro Tips</h4>
                      <p className="text-sm whitespace-pre-wrap">{area.tips}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resources">
          <CompanyResources companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}