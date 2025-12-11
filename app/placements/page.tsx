// ============================================
// FRONTEND: Main Placements Page - UNIFIED AUTH
// FILE: app/placements/page.tsx
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, FileText, Building2, BookOpen, Briefcase, AlertCircle } from 'lucide-react';
import CompanyGrid from '@/components/placements/CompanyGrid';
import GeneralResources from '@/components/placements/GeneralResources';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { useRouter } from 'next/navigation';

export default function PlacementsPage() {
  const router = useRouter();
  const { user, loading } = useUnifiedAuth();
  const [selectedCompanyCategory, setSelectedCompanyCategory] = useState('CORE');
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Handle auth check and redirects ONLY once after loading completes
  // Handle auth check and redirects ONLY once after loading completes
useEffect(() => {
  // CRITICAL: Only proceed when loading is complete
  if (loading) {
    console.log('[PLACEMENTS] Still loading auth...');
    return;
  }

  // Only check once
  if (hasCheckedAuth) {
    return;
  }

  setHasCheckedAuth(true);
  
  console.log('[PLACEMENTS] Auth check complete:', {
    hasUser: !!user,
    role: user?.role,
    loading
  });

  // If no user after loading is complete, redirect to login
  if (!user) {
    console.log('[PLACEMENTS] ❌ No user found - redirecting to login');
    setTimeout(() => {
      router.push('/login');
    }, 100);
    return;
  }

  // User is authenticated - they can access this page
  console.log('[PLACEMENTS] ✅ User authenticated:', user.email, 'Role:', user.role);
}, [loading, user, hasCheckedAuth, router]);

  // Loading state - show spinner while checking auth
  if (loading || !hasCheckedAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg text-gray-600">Loading placement portal...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated (this will briefly show before redirect)
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-96">
            <Card className="max-w-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
                  <p className="text-gray-600 mb-4">
                    Redirecting to login...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated - show the page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl opacity-10 blur-3xl"></div>
          <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <Briefcase className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Placement Portal
                </h1>
                <p className="text-gray-600 mt-2">
                  Your complete guide to placement preparation and company insights
                </p>
              </div>
            </div>
            
            {/* Role badges */}
            {user.role === 'admin' && (
              <div className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700 font-medium">
                  🔐 Administrator Access - Full Control
                </p>
              </div>
            )}
            
            {user.role === 'placement_officer' && (
              <div className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 font-medium">
                  🎯 Placement Officer Privileges
                </p>
              </div>
            )}

            {user.role === 'faculty' && (
              <div className="mt-4 px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 font-medium">
                  👨‍🏫 Faculty - View Mode
                </p>
              </div>
            )}

            {user.role === 'student' && (
              <div className="mt-4 px-4 py-2 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 rounded-lg border border-indigo-200">
                <p className="text-sm text-indigo-700 font-medium">
                  🎓 Student Access
                </p>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 p-1 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white h-auto">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg py-3 px-4 flex items-center gap-2 font-medium transition-all"
            >
              <Info className="h-4 w-4" />
              Overview & Policy
            </TabsTrigger>
            <TabsTrigger 
              value="companies"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg py-3 px-4 flex items-center gap-2 font-medium transition-all"
            >
              <Building2 className="h-4 w-4" />
              Companies
            </TabsTrigger>
            <TabsTrigger 
              value="resources"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg py-3 px-4 flex items-center gap-2 font-medium transition-all"
            >
              <BookOpen className="h-4 w-4" />
              Resources
            </TabsTrigger>
          </TabsList>

          {/* Overview & Policy Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Introduction */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-t-xl border-b">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <Info className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-2xl">Introduction</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p className="text-base">
                    <strong>Graduation and your first job mark the start of your professional journey.</strong>
                  </p>
                  <p className="text-base">
                    Your goal should be a job that helps your career grow, matches your ambitions, and is satisfying.
                  </p>
                  <p className="text-base">
                    The <strong>TCE Placement Office</strong> provides support by bringing a wide range of opportunities from external companies.
                  </p>
                  <p className="text-base">
                    This policy explains how students can participate in placements.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Placement Process Flow */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-t-xl border-b">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-2xl">Placement Process Flow</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="border-2 border-gray-100 rounded-xl overflow-hidden shadow-inner bg-white">
                  <img 
                    src="/flow-diagram.png" 
                    alt="Placement Process Flow Diagram" 
                    className="w-full h-auto"
                  />
                </div>
              </CardContent>
            </Card>

            {/* TCE Placement Policy */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10 rounded-t-xl border-b">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-2xl">TCE Placement Policy</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6 text-gray-700">
                  
                  {/* Types of Placement */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">TYPES OF PLACEMENT</h3>
                    <ul className="space-y-2 ml-5">
                      <li className="flex gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span><strong>General Offer:</strong> Any company; students can accept one offer.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span><strong>Core Offer:</strong> Companies related to your field; students can accept only one core offer.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span><strong>Dream Offer:</strong> High-paying jobs (at least 2.5 times your current CTC); only students with a General Offer can apply.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Academic Eligibility */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">ACADEMIC ELIGIBILITY</h3>
                    <ul className="space-y-2 ml-5">
                      <li className="flex gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>Determined by each company's rules.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Offer Rules */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">OFFER RULES</h3>
                    
                    <div className="ml-4 space-y-3">
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">General Offer</h4>
                        <ul className="space-y-2 ml-5">
                          <li className="flex gap-2">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>Students can accept one offer via the placement portal.</span>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">Core Offer</h4>
                        <ul className="space-y-2 ml-5">
                          <li className="flex gap-2">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>Students can accept only one core offer.</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>Students already in software service companies can still attend core interviews.</span>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">Dream Offer</h4>
                        <ul className="space-y-2 ml-5">
                          <li className="flex gap-2">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>Only students with a General Offer can apply.</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>Dream offer must pay at least 2.5 times the current CTC.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Placement Rules */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">PLACEMENT RULES</h3>
                    <ul className="space-y-2 ml-5">
                      <li className="flex gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>Students must have a minimum of <strong>3000 Placement Grade Points</strong> on Skill Rack.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>Students opting for Higher Studies or with IIT/IISc/foreign internships can attend <strong>software service companies only</strong>.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>Students are eligible for a Core company only if they are <strong>not placed in IT Product or Dream companies</strong>.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>Students joining a Core company cannot apply elsewhere; <strong>Core offer overrides any previous offer</strong>.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>Students with a General Offer can attend Dream placement only after <strong>75% of eligible students receive a General Offer</strong>.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>If a student is shortlisted but does not receive confirmation via email, they can continue applying elsewhere. If an offer comes in this period, they cannot continue with the first company.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>Policy applies to both <strong>on-campus and off-campus placements</strong>.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span><strong className="text-red-600">Rejecting an accepted offer may result in blacklisting.</strong></span>
                      </li>
                    </ul>
                  </div>

                  {/* Blacklist Policy */}
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                    <h3 className="text-xl font-bold text-red-900 mb-3">BLACKLIST POLICY</h3>
                    <ul className="space-y-2 ml-5">
                      <li className="flex gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>Students may be blacklisted for unethical or undesirable actions that affect the College's reputation.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span><strong>Blacklisting prevents participation in future placements.</strong></span>
                      </li>
                    </ul>

                    <h4 className="font-bold text-red-900 mt-4 mb-2">Examples of Offenses Leading to Blacklisting:</h4>
                    <ul className="space-y-2 ml-5">
                      <li className="flex gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>Missing interviews or workshops after signing up</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>Delaying rejection of an accepted offer</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>Not informing the Placement Cell about rejection</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>Copying or taking pictures of test material</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>Giving false information on CV</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>Not following TCE Placement rules</span>
                      </li>
                    </ul>

                    <p className="mt-4 text-red-900 font-semibold italic">
                      Note: The final decision of the Placement Cell and faculty advisors is binding.
                    </p>
                  </div>

                </div>
              </CardContent>
            </Card>
          </TabsContent>
                
          {/* Companies Tab */}
          <TabsContent value="companies" className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-t-xl border-b">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-2xl">Company Categories</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Category Selector */}
                <div className="flex flex-wrap gap-3 mb-6">
                  {['CORE', 'IT', 'DREAM', 'SUPER_DREAM'].map((category) => (
                    <Button
                      key={category}
                      variant={selectedCompanyCategory === category ? 'default' : 'outline'}
                      onClick={() => setSelectedCompanyCategory(category)}
                      className={
                        selectedCompanyCategory === category
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
                          : 'border-2 hover:border-indigo-300'
                      }
                    >
                      {category.replace('_', ' ')}
                    </Button>
                  ))}
                </div>

                {/* Company Grid */}
                <CompanyGrid 
                  category={selectedCompanyCategory} 
                  userRole={user.role} 
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10 rounded-t-xl border-b">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                    <BookOpen className="h-5 h-5 text-white" />
                  </div>
                  <span className="text-2xl">General Resources</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <GeneralResources userRole={user.role} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}