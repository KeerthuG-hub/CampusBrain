

'use client'


import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Globe, Shield, Award, Users, ChevronDown, ChevronUp, ExternalLink, Loader2, CheckCircle, AlertCircle, X, Sparkles, Mail, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { searchFacultyHybrid } from '@/lib/embeddings';

const getInitialsFromName = (name) => {
  if (!name || typeof name !== 'string') return '??';
  const honorifics = ['dr', 'dr.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'prof', 'prof.', 'professor', 'miss', 'sir', 'madam'];
  const words = name.trim().split(/\s+/).filter(word => !honorifics.includes(word.toLowerCase().replace(/\./g, '')));
  if (words.length === 0) return name.slice(0, 2).toUpperCase();
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
};
export default function ResearchTab() {
  const [activeSection, setActiveSection] = useState('info');
  const [expandedInfo, setExpandedInfo] = useState(null);
  const [resources, setResources] = useState([]);
  const [sigs, setSigs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [facultyResults, setFacultyResults] = useState(null);
  const [extractedDomains, setExtractedDomains] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [validationError, setValidationError] = useState('');


  const availableDomains = [
    'AI', 'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
    'Blockchain', 'IoT', 'Robotics', 'Networks', 'Cybersecurity', 'Cloud Computing',
    'Distributed Systems', 'Data Science', 'HCI', 'Software Engineering', 'Algorithms',
    'Security', 'High Performance Computing', 'Data Engineering', 'Web Development',
    'DevOps', 'Databases'
  ];


  const researchInfo = [
    {
      id: 'types',
      title: 'Types of Research',
      icon: BookOpen,
      content: '<h3 class="text-xl font-bold text-gray-800 mt-4 mb-2">1. Applied Research</h3><p class="text-gray-600 mb-3">Focuses on solving practical problems and developing real-world applications.</p><ul class="list-disc ml-6 text-gray-600 space-y-1"><li>Industry-focused projects</li><li>Product development</li><li>Process optimization</li></ul><h3 class="text-xl font-bold text-gray-800 mt-4 mb-2">2. Fundamental/Basic Research</h3><p class="text-gray-600 mb-3">Explores theoretical concepts to expand knowledge without immediate application.</p><ul class="list-disc ml-6 text-gray-600 space-y-1"><li>Algorithm complexity theory</li><li>Mathematical proofs</li><li>Novel architectures</li></ul>'
    },
    {
      id: 'venues',
      title: 'Publication Venues',
      icon: Globe,
      content: '<h3 class="text-xl font-bold text-gray-800 mt-4 mb-2">Conferences vs Journals</h3><h4 class="text-lg font-semibold text-gray-700 mt-3 mb-2">📅 Conferences</h4><ul class="list-disc ml-6 text-gray-600 space-y-1 mb-3"><li><strong>Timeline:</strong> Faster publication (6-9 months)</li><li><strong>Format:</strong> Oral/poster presentations</li><li><strong>Examples:</strong> NeurIPS, CVPR, ACM SIGCOMM</li></ul><h4 class="text-lg font-semibold text-gray-700 mt-3 mb-2">📖 Journals</h4><ul class="list-disc ml-6 text-gray-600 space-y-1 mb-3"><li><strong>Timeline:</strong> Longer review cycle (1-2 years)</li><li><strong>Format:</strong> Detailed written papers</li><li><strong>Examples:</strong> IEEE Transactions, ACM Computing Surveys</li></ul>'
    },
    {
      id: 'process',
      title: 'Research Process Flow',
      icon: Award,
      content: '<div class="space-y-3"><div class="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-lg"><strong class="block text-lg mb-1">1. Identify Problem</strong><p class="text-purple-100">Find gaps in existing literature</p></div><div class="text-center text-2xl text-indigo-600 font-bold">↓</div><div class="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-lg"><strong class="block text-lg mb-1">2. Literature Review</strong><p class="text-purple-100">Study related work</p></div><div class="text-center text-2xl text-indigo-600 font-bold">↓</div><div class="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-lg"><strong class="block text-lg mb-1">3. Design Methodology</strong><p class="text-purple-100">Algorithms, experiments, datasets</p></div><div class="text-center text-2xl text-indigo-600 font-bold">↓</div><div class="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-lg"><strong class="block text-lg mb-1">4. Implementation & Results</strong><p class="text-purple-100">Code, analyze, write paper</p></div></div>'
    },
    {
      id: 'writing',
      title: 'How to Write a Paper',
      icon: Shield,
      content: '<h3 class="text-xl font-bold text-gray-800 mt-4 mb-3">Standard Paper Structure</h3><div class="space-y-4"><div><h4 class="text-lg font-semibold text-gray-700 mb-2">1. Title & Abstract</h4><p class="text-gray-600">Concise summary (150-250 words)</p></div><div><h4 class="text-lg font-semibold text-gray-700 mb-2">2. Introduction</h4><ul class="list-disc ml-6 text-gray-600 space-y-1"><li>Problem statement</li><li>Contributions</li></ul></div><div><h4 class="text-lg font-semibold text-gray-700 mb-2">3. Methodology</h4><p class="text-gray-600">Algorithm design and implementation</p></div><div><h4 class="text-lg font-semibold text-gray-700 mb-2">4. Results & Discussion</h4><p class="text-gray-600">Evaluation metrics and comparison</p></div></div>'
    }
  ];


  useEffect(() => {
    let isMounted = true;


    async function loadSessionAndRole() {
      try {
        setLoading(true);
       
        const { data: { session } } = await supabase.auth.getSession();
       
        if (!isMounted) return;
       
        if (!session?.user) {
          setCurrentUser(null);
          setUserRole(null);
          setLoading(false);
          return;
        }
       
        setCurrentUser(session.user);


        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();


        if (isMounted) {
          if (profile && !error) {
            setUserRole(profile.role);
          } else {
            setUserRole(null);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Session load error:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    }


    loadSessionAndRole();
   
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadSessionAndRole();
    });


    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);


  const tabs = [
    { id: 'info', label: 'Research Info', icon: BookOpen },
    { id: 'resources', label: 'Resources', icon: Globe },
    { id: 'sigs', label: 'SIGs', icon: Users },
  ];
 
  if (userRole === 'student') {
    tabs.push({ id: 'finder', label: 'Find Faculty', icon: Search });
  }


  const loadResources = async () => {
    if (resources.length > 0) return;
    try {
      const { data, error } = await supabase
        .from('research_resources')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('display_order');
     
      if (!error && data) {
        setResources(data);
      }
    } catch (error) {
      console.error('❌ Error loading resources:', error);
    }
  };


const loadSIGs = async () => {
  if (sigs.length > 0) return;
 
  try {
    console.log('🔵 Loading SIGs...');
   
    const { data, error } = await supabase
      .from('sigs')
      .select('*')
      .order('name');
   
    if (error) {
      console.error('❌ Error loading SIGs:', error);
      return;
    }
   
    if (!data || data.length === 0) {
      console.log('⚠️ No SIGs found');
      setSigs([]);
      return;
    }
   
    console.log('✅ Found', data.length, 'SIGs');
   
    const sigsWithFaculty = await Promise.all(data.map(async (sig) => {
      console.log('🔵 Loading faculty for SIG:', sig.name, 'ID:', sig.id);
     
      // Use the RPC function to get faculty with publications
      // Use the RPC function to get faculty with publications
      const { data: facultyData, error: facultyError } = await supabase
        .rpc('get_sig_faculty_with_publications', {
          p_sig_id: sig.id
        });
     
      if (facultyError) {
        console.error('❌ Error loading faculty for', sig.name, ':', facultyError);
        return { ...sig, faculty: [] };
      }
     
      if (!facultyData || facultyData.length === 0) {
        console.log('⚠️ No faculty for', sig.name);
        return { ...sig, faculty: [] };
      }
     
      console.log('✅', sig.name, ':', facultyData.length, 'faculty members');
      console.log('🔍 Raw faculty data:', facultyData);
     
      // Process the faculty data and ensure publications are properly formatted
      const facultyWithPubs = facultyData.map(faculty => {
        console.log('🔍 Processing faculty:', faculty.faculty_name);
        console.log('🔍 Raw publication_count:', faculty.publication_count);
        console.log('🔍 Raw publications:', faculty.publications);
       
        // Handle publications - might be JSONB, array, or string
        let publications = [];
        if (faculty.publications) {
          if (typeof faculty.publications === 'string') {
            try {
              publications = JSON.parse(faculty.publications);
            } catch (e) {
              console.error('Failed to parse publications string:', e);
              publications = [];
            }
          } else if (Array.isArray(faculty.publications)) {
            publications = faculty.publications;
          } else if (typeof faculty.publications === 'object') {
            // Might be JSONB object, convert to array
            publications = Object.values(faculty.publications);
          }
        }
       
        console.log('📄', faculty.faculty_name, ':', publications.length, 'publications parsed');
       
        return {
          faculty_id: faculty.faculty_id,
          faculty_name: faculty.faculty_name,
          faculty_email: faculty.faculty_email,
          is_active: faculty.is_active,
          sig_role: faculty.sig_role,
          publication_count: publications.length,
          publications: publications
        };
      });
     
      // Now get full publications for each faculty
   
      return {
        ...sig,
        faculty: facultyWithPubs
      };
    }));
   
    console.log('✅ Final SIGs loaded:', sigsWithFaculty);
    setSigs(sigsWithFaculty);
   
  } catch (error) {
    console.error('❌ Fatal error loading SIGs:', error);
  }
};
  useEffect(() => {
    if (!loading) {
      loadResources();
      loadSIGs();
    }
  }, [loading]);


  const searchFaculty = async () => {
    setFacultyResults(null);
    setExtractedDomains([]);
    setValidationError('');


    if (!searchQuery.trim() && selectedDomains.length === 0) {
      setValidationError('Please enter a search query or select domains');
      return;
    }


    setSearching(true);
    setSearchStatus('Initializing search...');


    try {
      // STEP 1: VALIDATE IF RESEARCH QUERY
      if (searchQuery.trim()) {
        setSearchStatus('🤖 Validating research query...');
       
        const validateResponse = await fetch('/api/research/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery.trim(),
            action: 'isResearchQuery'
          })
        });


        const validateData = await validateResponse.json();
       
        if (!validateData.success || !validateData.isResearch) {
          setValidationError('⚠️ Your query doesn\'t appear to be research-related. Please enter an academic topic (e.g., "blockchain security", "deep learning for medical imaging").');
          setSearching(false);
          setSearchStatus('');
          return;
        }
      }


      // Check authentication
      setSearchStatus('Checking authentication...');
      const { data: { user } } = await supabase.auth.getUser();


      if (!user) {
        setValidationError('Please log in first');
        setSearching(false);
        setSearchStatus('');
        return;
      }


      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();


      if (profile?.role !== 'student') {
        setValidationError('This feature is only available for students.');
        setSearching(false);
        setSearchStatus('');
        return;
      }


      // STEP 2: EXTRACT DOMAINS
      let domains = [...selectedDomains];
      let aiDomains = [];


      if (searchQuery.trim()) {
        setSearchStatus('🤖 AI extracting research domains...');


        try {
          const extractResponse = await fetch('/api/research/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: searchQuery.trim(),
              action: 'extractDomains'
            })
          });


          const extractData = await extractResponse.json();
         
          if (!extractData.success || !extractData.domains || extractData.domains.length === 0) {
            setValidationError('❌ Could not identify research domains from your query. Please enter a specific academic topic or select domains manually.');
            setSearching(false);
            setSearchStatus('');
            return;
          }


          aiDomains = extractData.domains;
          setExtractedDomains(aiDomains);
          domains = [...new Set([...domains, ...aiDomains])];


        } catch (domainError) {
          console.error('⚠️ Domain extraction failed:', domainError);
          setValidationError('Failed to extract research domains. Please try again or select domains manually.');
          setSearching(false);
          setSearchStatus('');
          return;
        }
      }


      // STEP 3: FINAL CHECK
      if (domains.length === 0) {
        setValidationError('❌ No research domains identified. Please enter a specific academic topic or select domains manually.');
        setSearching(false);
        setSearchStatus('');
        return;
      }


      // STEP 4: SEARCH DATABASE
      setSearchStatus('🔍 Searching faculty publications...');


      const result = await searchFacultyHybrid(
        supabase,
        user.id,
        searchQuery,
        domains
      );


      if (!result.success) {
        throw new Error(result.error || 'Search failed');
      }


      setSearchStatus('');
      setFacultyResults(result.results || []);


      if (result.results.length === 0) {
        setValidationError('No matching faculty found. Try different keywords or domains.');
      }


    } catch (error) {
      console.error('❌ Search error:', error);
      setValidationError('Search failed: ' + error.message);
      setSearchStatus('');
    } finally {
      setSearching(false);
    }
  };


  const sendResearchRequest = async (faculty) => {
    if (!faculty.is_active || !faculty.faculty_id) {
      setValidationError('This faculty member has not logged in yet. Please try again later.');
      return;
    }


    const topic = prompt('Enter research topic:');
    if (!topic) return;


    const description = prompt('Describe your research interest (optional):') || '';


    try {
      const { data: { user } } = await supabase.auth.getUser();
     
      const { data: requestData, error: reqError } = await supabase
        .from('student_research_requests')
        .insert({
          student_id: user.id,
          research_query: searchQuery,
          ai_extracted_domains: extractedDomains,
          selected_domains: selectedDomains,
          status: 'pending'
        })
        .select()
        .single();


      if (reqError) throw reqError;


      const pubIds = (faculty.matched_publications || [])
        .slice(0, 3)
        .map(p => p.id)
        .filter(Boolean);


      const { data, error } = await supabase.rpc('send_faculty_request', {
        p_request_id: requestData.id,
        p_faculty_id: faculty.faculty_id,
        p_topic: topic,
        p_description: description,
        p_relevant_pub_ids: pubIds
      });


      if (error) throw error;


      if (data?.success) {
        setValidationError('');
        alert('✅ Research request sent successfully!');
      } else {
        setValidationError(data?.error || 'Failed to send request');
      }
    } catch (error) {
      console.error('❌ Request error:', error);
      setValidationError('Failed to send request: ' + error.message);
    }
  };


  const toggleDomain = (domain) => {
    setSelectedDomains(prev =>
      prev.includes(domain)
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };


  const resourcesByCategory = resources.reduce((acc, resource) => {
    if (!acc[resource.category]) acc[resource.category] = [];
    acc[resource.category].push(resource);
    return acc;
  }, {});


  const categoryLabels = {
    conference: '🗓️ Conferences & Deadlines',
    journal: '📖 Academic Databases',
    plagiarism: '🔍 Plagiarism Checkers',
    ai_check: '🤖 AI Detection Tools',
    general: '🛠️ Research Tools'
  };


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Research Hub</h1>
        <p className="text-indigo-100 text-lg">Your gateway to academic research and faculty collaboration</p>
      </div>


      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-all whitespace-nowrap ${
              activeSection === tab.id
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon size={20} />
            {tab.label}
          </button>
        ))}
      </div>


      {/* Research Info Tab */}
      {activeSection === 'info' && (
        <div className="space-y-4">
          {researchInfo.map(info => (
            <div key={info.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => setExpandedInfo(expandedInfo === info.id ? null : info.id)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <info.icon className="text-indigo-600" size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">{info.title}</h2>
                </div>
                {expandedInfo === info.id ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedInfo === info.id && (
                <div className="px-6 pb-6" dangerouslySetInnerHTML={{ __html: info.content }} />
              )}
            </div>
          ))}
        </div>
      )}


      {/* Resources Tab */}
      {activeSection === 'resources' && (
        <div className="space-y-6">
          {Object.entries(categoryLabels).map(([category, label]) => (
            resourcesByCategory[category] && resourcesByCategory[category].length > 0 && (
              <div key={category} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">{label}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resourcesByCategory[category].map(resource => (
                    <a
                      key={resource.id}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-md transition-all group"
                    >
                      <ExternalLink className="text-indigo-600 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" size={20} />
                      <div>
                        <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600">{resource.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}


    {/* SIGs Tab */}
{activeSection === 'sigs' && (
  <div className="space-y-6">
    {sigs.map(sig => (
      <div key={sig.id} className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">{sig.name}</h2>
          <p className="text-indigo-100">{sig.description}</p>
        </div>
        {sig.faculty && sig.faculty.length > 0 ? (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Faculty Members</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sig.faculty.map((faculty, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-400 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">
{getInitialsFromName(faculty.faculty_name)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800">{faculty.faculty_name || 'Faculty Member'}</h4>
                      <p className="text-xs text-gray-500">{faculty.faculty_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium uppercase">
                      {faculty.sig_role}
                    </span>
                    {faculty.is_active ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                        <CheckCircle size={12} />Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-600 text-xs font-medium">
                        <AlertCircle size={12} />Not Active
                      </span>
                    )}
                  </div>
                  <div className="text-center py-2 bg-gray-50 rounded mb-3">
                    <div className="text-2xl font-bold text-indigo-600">{faculty.publication_count || 0}</div>
                    <p className="text-xs text-gray-500">Publications</p>
                  </div>
                 
                 
                    {/* View Button - ALWAYS SHOWN */}
                    <button
                      onClick={() => {
                        console.log('🔵 Button clicked for:', faculty.faculty_name);
                        console.log('🔵 Publications:', faculty.publications);
                       
                        const pubs = faculty.publications || [];
                        const currentYear = new Date().getFullYear();
                       
                        setSelectedFaculty({
                          faculty_id: faculty.faculty_id,
                          faculty_name: faculty.faculty_name,
                          faculty_email: faculty.faculty_email,
                          is_active: faculty.is_active,
                          sig_name: sig.name,
                          sig_role: faculty.sig_role,
                          matched_publications: pubs,
                          total_publications: pubs.length,
                          recent_publications: pubs.filter(p =>
                            p.publication_year && p.publication_year >= currentYear - 2
                          ).length,
                          relevant_publications: pubs.length,
                          match_score: 0
                        });
                       
                        console.log('✅ Modal should open now');
                      }}
                      className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <BookOpen size={16} />
                      View Publications ({faculty.publications?.length || 0})
                    </button>
                 
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <Users className="mx-auto text-gray-400 mb-2" size={48} />
            <p>No faculty members assigned yet</p>
          </div>
        )}
      </div>
    ))}
  </div>
)}


      {/* Faculty Finder Tab */}
      {activeSection === 'finder' && userRole === 'student' && (
        <div className="space-y-6">
          {/* Search Interface */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Search size={24} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Find Research Faculty</h2>
                <p className="text-sm text-gray-600">AI-powered matching with semantic + text + domain analysis</p>
              </div>
            </div>


            {/* Validation Error Message */}
            {validationError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm text-red-800 font-medium">{validationError}</p>
                </div>
                <button
                  onClick={() => setValidationError('')}
                  className="text-red-400 hover:text-red-600"
                >
                  <X size={18} />
                </button>
              </div>
            )}


            <div className="space-y-4">
              {/* Query Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe your research interest
                </label>
                <textarea
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Example: blockchain security for IoT devices, waste detection using CNNs, cloud infrastructure optimization..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Sparkles size={12} className="text-indigo-500" />
                  AI will extract domains and find faculty with matching publications
                </p>
              </div>


              {/* Domain Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or select domains (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableDomains.map(domain => (
                    <button
                      key={domain}
                      onClick={() => toggleDomain(domain)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedDomains.includes(domain)
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {domain}
                    </button>
                  ))}
                </div>
              </div>


              {/* AI Extracted Domains */}
              {extractedDomains.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Sparkles className="text-blue-600" size={16} />
                    AI Detected Domains:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {extractedDomains.map(domain => (
                      <span
                        key={domain}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full font-medium shadow-sm"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              )}


              {/* Search Status */}
              {searchStatus && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="animate-spin text-yellow-600" size={16} />
                  <span className="text-sm text-gray-700">{searchStatus}</span>
                </div>
              )}


              {/* Search Button */}
              <button
                onClick={searchFaculty}
                disabled={searching || (!searchQuery.trim() && selectedDomains.length === 0)}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {searching ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    Find Top 3 Faculty Matches
                  </>
                )}
              </button>
            </div>
          </div>


          {/* Search Results - IMPROVED FACULTY CARDS */}
          {facultyResults && facultyResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Award className="text-yellow-500" size={28} />
                Top {facultyResults.length} Faculty Matches
              </h3>
              {facultyResults.map((faculty, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl shadow-lg border-2 border-gray-100 hover:border-indigo-300 transition-all overflow-hidden"
                >
                  {/* Faculty Card Header */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                          <span className="text-3xl font-bold text-white">#{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-800 mb-1">{faculty.faculty_name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{faculty.faculty_email}</p>
                         
                          <div className="flex items-center gap-3 flex-wrap">
                            {faculty.is_active ? (
                              <span className="flex items-center gap-1 text-green-600 font-medium px-3 py-1 bg-green-50 rounded-full text-sm">
                                <CheckCircle size={14} />Active
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-yellow-600 font-medium px-3 py-1 bg-yellow-50 rounded-full text-sm">
                                <AlertCircle size={14} />Not Active Yet
                              </span>
                            )}
                           
                            {faculty.sig_name && (
                              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                                {faculty.sig_name}
                              </span>
                            )}
                           
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold flex items-center gap-1">
                              <Award size={14} />
                              {Math.round(faculty.match_score * 100)}% Match
                            </span>
                          </div>
                        </div>
                      </div>
                     
                      <button
                        onClick={() => sendResearchRequest(faculty)}
                        disabled={!faculty.is_active}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium shadow-md"
                      >
                        <Mail size={16} />
                        Send Request
                      </button>
                    </div>
                   
                    {/* Publication Stats */}
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                        <div className="text-2xl font-bold text-indigo-600">{faculty.total_publications}</div>
                        <p className="text-xs text-gray-500">Total Publications</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                        <div className="text-2xl font-bold text-green-600">{faculty.recent_publications}</div>
                        <p className="text-xs text-gray-500">Recent (2 yrs)</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                        <div className="text-2xl font-bold text-purple-600">{faculty.relevant_publications}</div>
                        <p className="text-xs text-gray-500">Relevant</p>
                      </div>
                    </div>
                  </div>


                  {/* Recent Publications Preview (1-2 papers) */}
                  {faculty.matched_publications && faculty.matched_publications.length > 0 && (
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-gray-700 flex items-center gap-2">
                          <FileText size={18} className="text-indigo-600" />
                          Top Matching Publications
                        </h5>
                        <button
                          onClick={() => setSelectedFaculty(faculty)}
                          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                        >
                          View All {faculty.total_publications} Publications
                          <ChevronDown size={16} />
                        </button>
                      </div>
                     
                      <div className="space-y-3">
                        {faculty.matched_publications.slice(0, 2).map((pub, pidx) => (
                          <div key={pidx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 transition-all">
                            <div className="flex items-start justify-between mb-2">
                              <h6 className="font-medium text-gray-800 flex-1">{pub.title}</h6>
                            {pub.match_score !== undefined && (
  <span className="ml-3 px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full font-bold flex-shrink-0">
    {Math.round(pub.match_score)}% Match
  </span>
)}
                            </div>
                           
                            {pub.abstract && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{pub.abstract}</p>
                            )}
                           
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                              {pub.venue && <span className="font-medium">{pub.venue}</span>}
                              {pub.publication_year && <><span>•</span><span>{pub.publication_year}</span></>}
                              {pub.doi && (
                                <>
                                  <span>•</span>
                                  <a
                                    href={`https://doi.org/${pub.doi}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:underline flex items-center gap-1"
                                  >
                                    DOI<ExternalLink size={10} />
                                  </a>
                                </>
                              )}
                            </div>
                           
                            {pub.research_domains && pub.research_domains.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {pub.research_domains.slice(0, 5).map(domain => (
                                  <span
                                    key={domain}
                                    className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full"
                                  >
                                    {domain}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                     
                      {faculty.matched_publications.length > 2 && (
                        <button
                          onClick={() => setSelectedFaculty(faculty)}
                          className="mt-3 w-full py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <TrendingUp size={16} />
                          View {faculty.matched_publications.length - 2} More Relevant Publications
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}


          {/* No Results */}
          {facultyResults && facultyResults.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <AlertCircle className="mx-auto text-yellow-600 mb-2" size={48} />
              <p className="text-gray-700 font-medium">No matching faculty found</p>
              <p className="text-gray-600 text-sm mt-1">
                Try broadening your search or selecting different domains
              </p>
            </div>
          )}
        </div>
      )}


      {/* Faculty Detail Modal - ALL PUBLICATIONS */}
      {selectedFaculty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex justify-between items-start z-10">
              <div>
                <h2 className="text-3xl font-bold mb-1">{selectedFaculty.faculty_name}</h2>
                <p className="text-indigo-100 mb-3">{selectedFaculty.faculty_email}</p>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-medium">
                    {selectedFaculty.sig_name}
                  </span>
                 
                  {selectedFaculty.is_active && (
                    <span className="px-3 py-1 bg-green-500 bg-opacity-30 rounded-full text-sm flex items-center gap-1">
                      <CheckCircle size={14} />Active
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedFaculty(null)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
           
            {/* Stats Bar */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 border-b border-gray-200">
              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">{selectedFaculty.total_publications}</div>
                  <p className="text-sm text-gray-600">Total Publications</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{selectedFaculty.recent_publications}</div>
                  <p className="text-sm text-gray-600">Recent (2 years)</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{selectedFaculty.relevant_publications}</div>
                  <p className="text-sm text-gray-600">Relevant to Search</p>
                </div>
              </div>
            </div>
           
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BookOpen className="text-indigo-600" size={28} />
                All Publications
              </h3>
             
              {selectedFaculty.matched_publications && selectedFaculty.matched_publications.length > 0 ? (
                <div className="space-y-4">
                  {selectedFaculty.matched_publications.map((pub, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-5 hover:border-indigo-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-800 text-lg flex-1">{pub.title}</h4>
                         {pub.match_score !== undefined && (
  <span className="ml-3 px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full font-bold flex-shrink-0">
    {Math.round(pub.match_score)}% Match
  </span>
)}
                      </div>
                     
                      {pub.abstract && (
                        <p className="text-sm text-gray-600 mb-3">{pub.abstract}</p>
                      )}
                     
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        {pub.venue && <span className="font-medium">{pub.venue}</span>}
                        {pub.publication_year && <><span>•</span><span>{pub.publication_year}</span></>}
                        {pub.doi && (
                          <>
                            <span>•</span>
                            <a
                              href={`https://doi.org/${pub.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              View DOI<ExternalLink size={12} />
                            </a>
                          </>
                        )}
                        {pub.pdf_url && (
                          <>
                            <span>•</span>
                            <a
                              href={pub.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              PDF<ExternalLink size={12} />
                            </a>
                          </>
                        )}
                      </div>
                     
                      {pub.research_domains && pub.research_domains.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {pub.research_domains.map(domain => (
                            <span
                              key={domain}
                              className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium"
                            >
                              {domain}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="mx-auto mb-3 text-gray-400" size={56} />
                  <p className="text-lg">No publications available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

