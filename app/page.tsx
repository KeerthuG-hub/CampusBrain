'use client'

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Beaker,
  Briefcase,
  Lightbulb,
  TrendingUp,
  Users,
  FileText,
  Building2,
  MessageSquare,
  CheckCircle,
  Bell,
  User,
  Menu,
  X,
  ChevronRight,
  Zap,
  Target,
  ExternalLink,
  Clock,
  Loader2,
  LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';

interface Stats {
  publications: number;
  resources: number;
  companies: number;
  questions: number;
  answers: number;
  users: number;
}

interface NewsArticle {
  id: number;
  title: string;
  source: string;
  time: string;
  category: string;
  url: string;
  image?: string | null;
}

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  gradient: string;
  path: string;
  stats: number;
  statsLabel: string;
}

export default function CampusBrainDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useUnifiedAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

   const fetchStats = async () => {
  try {
    const [
      publicationsResult,
      resourcesResult,
      companiesResult,
      questionsResult,
      answersResult,
      usersResult,
    ] = await Promise.all([
      supabase.from('faculty_publications').select('*', { count: 'exact', head: true }),
      
      // ✅ FIXED: Everyone sees TOTAL resources (no approval filtering)
      supabase.from('resources').select('*', { count: 'exact', head: true }),
      
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('questions').select('*', { count: 'exact', head: true }),
      supabase.from('answers').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ]);

    setStats({
      publications: publicationsResult.count || 0,
      resources: resourcesResult.count || 0,
      companies: companiesResult.count || 0,
      questions: questionsResult.count || 0,
      answers: answersResult.count || 0,
      users: usersResult.count || 0,
    });
    setStatsLoading(false);
  } catch (error) {
    console.error('Error fetching stats:', error);
    setStatsLoading(false);
  }
};


    fetchStats();

    const publicationsChannel = supabase
      .channel('realtime:publications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'faculty_publications' },
        () => fetchStats(),
      )
      .subscribe();

    const resourcesChannel = supabase
      .channel('realtime:resources')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () =>
        fetchStats(),
      )
      .subscribe();

    const companiesChannel = supabase
      .channel('realtime:companies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () =>
        fetchStats(),
      )
      .subscribe();

    const questionsChannel = supabase
      .channel('realtime:questions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () =>
        fetchStats(),
      )
      .subscribe();

    const answersChannel = supabase
      .channel('realtime:answers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, () =>
        fetchStats(),
      )
      .subscribe();

    const usersChannel = supabase
      .channel('realtime:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () =>
        fetchStats(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(publicationsChannel);
      supabase.removeChannel(resourcesChannel);
      supabase.removeChannel(companiesChannel);
      supabase.removeChannel(questionsChannel);
      supabase.removeChannel(answersChannel);
      supabase.removeChannel(usersChannel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchTechNews = async () => {
      try {
        const apiKey =
          process.env.NEXT_PUBLIC_NEWS_API_KEY || '9368bea3d7664fffbb50f22501626342';

        const sources = [
          'techcrunch',
          'the-verge',
          'wired',
          'ars-technica',
          'engadget',
          'recode',
        ].join(',');

        const response = await fetch(
          `https://newsapi.org/v2/top-headlines?sources=${sources}&pageSize=20&language=en&apiKey=${apiKey}`,
        );

        if (!response.ok) {
          throw new Error('Failed to fetch news');
        }

        const data = await response.json();

        const positiveKeywords = [
          'ai',
          'machine learning',
          'deep learning',
          'robotics',
          'software',
          'programming',
          'developer',
          'cybersecurity',
          'data science',
          'cloud',
          'aws',
          'gcp',
          'azure',
          'chip',
          'semiconductor',
          'quantum computing',
          'space technology',
          'engineering',
          'startup',
          'algorithm',
          'big tech',
        ];

        const bannedWords = [
          'discount',
          'sale',
          'deal',
          'best',
          'buy',
          'cheap',
          'offer',
          'review',
          'comparison',
          'price',
          'budget',
          'headphones',
          'gadgets',
          'laptop deals',
          'smartphone deals',
        ];

        const filteredNews: NewsArticle[] = (data.articles || [])
          .filter((article: any) => article.title && article.url)
          .filter((article: any) =>
            positiveKeywords.some((kw) =>
              (article.title + ' ' + (article.description || '')).toLowerCase().includes(kw),
            ),
          )
          .filter((article: any) =>
            !bannedWords.some((bad) =>
              (article.title + ' ' + (article.description || '')).toLowerCase().includes(bad),
            ),
          )
          .slice(0, 9)
          .map((article: any, idx: number) => ({
            id: idx,
            title: article.title,
            source: article.source?.name || 'Unknown',
            time: getTimeAgo(article.publishedAt),
            category: getCategoryFromTitle(article.title || ''),
            url: article.url || '#',
            image: article.urlToImage || null,
          }));

        setNews(filteredNews);
        setNewsLoading(false);
      } catch (error) {
        console.error('Error fetching tech news:', error);
        setNewsLoading(false);
      }
    };

    fetchTechNews();

    const interval = setInterval(fetchTechNews, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return '1d ago';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCategoryFromTitle = (title: string): string => {
    const lower = title.toLowerCase();
    if (
      lower.includes('ai') ||
      lower.includes('artificial intelligence') ||
      lower.includes('machine learning')
    )
      return 'AI & ML';
    if (lower.includes('placement') || lower.includes('hiring') || lower.includes('job'))
      return 'Placements';
    if (lower.includes('research') || lower.includes('paper') || lower.includes('study'))
      return 'Research';
    if (lower.includes('startup') || lower.includes('company')) return 'Startups';
    return 'Tech News';
  };

  const handleNavigation = (path: string): void => {
    router.push(path);
  };

  const handleDashboardClick = () => {
    if (
      user?.role === 'faculty' ||
      user?.role === 'admin' ||
      user?.role === 'placement_officer'
    ) {
      router.push('/faculty');
    } else {
      router.push('/student');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const features: Feature[] = [
    {
      icon: BookOpen,
      title: 'Courses',
      description: 'Subject-wise notes, PPTs, videos & question papers',
      gradient: 'from-blue-500 to-cyan-500',
      path: '/course_resources',
      stats: stats?.resources ?? 0,
      statsLabel: 'Resources',
    },
    {
      icon: Beaker,
      title: 'Research',
      description: 'Papers, project ideas & faculty mentorship',
      gradient: 'from-purple-500 to-pink-500',
      path: '/research',
      stats: stats?.publications || 0,
      statsLabel: 'Publications',
    },
    {
      icon: Briefcase,
      title: 'Placements',
      description: 'Company prep, coding practice & interview experiences',
      gradient: 'from-orange-500 to-red-500',
      path: '/placements',
      stats: stats?.companies || 0,
      statsLabel: 'Companies',
    },
    {
      icon: Lightbulb,
      title: 'Insights',
      description: 'Senior guidance, Q&A system & career roadmaps',
      gradient: 'from-green-500 to-emerald-500',
      path: '/insights',
      stats: stats?.questions || 0,
      statsLabel: 'Questions',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <nav className="relative z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => handleNavigation('/')}
            >
              <div className="w-14 h-14">
                <img
                  src="/image.png"
                  alt="Logo"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Campus Brain
                </h1>
                <p className="text-xs text-slate-400">
                  Welcome, <span className="font-medium capitalize">{user.full_name}</span>
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => handleNavigation('/')}
                className="px-4 py-2 text-blue-400 hover:bg-slate-800 rounded-lg transition"
              >
                Home
              </button>
              <button
                onClick={() => handleNavigation('/course_resources')}
                className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition"
              >
                Courses
              </button>
              <button
                onClick={() => handleNavigation('/research')}
                className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition"
              >
                Research
              </button>
              <button
                onClick={() => handleNavigation('/placements')}
                className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition"
              >
                Placements
              </button>
              <button
                onClick={() => handleNavigation('/insights')}
                className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition"
              >
                Insights
              </button>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <button className="relative p-2 text-slate-300 hover:bg-slate-800 rounded-lg transition">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 hover:bg-slate-800 rounded-lg transition">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white hidden sm:block">
                    {user.full_name?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
                </button>
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition">
                  <div className="p-3">
                    <div className="text-sm text-slate-400 mb-3">
                      Role:{' '}
                      <span className="font-semibold capitalize text-white">{user.role}</span>
                    </div>
                    <button
                      onClick={handleDashboardClick}
                      className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700 rounded mb-3"
                    >
                      My Dashboard
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 text-left px-3 py-2 text-red-400 hover:bg-red-900/30 rounded transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-300"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800">
            <div className="px-4 py-4 space-y-2">
              <div className="text-sm text-slate-400 p-3 border-b border-slate-700">
                <span className="font-medium capitalize">{user.role}</span> Dashboard
              </div>
              <button
                onClick={() => handleNavigation('/')}
                className="w-full text-left px-4 py-2 text-blue-400 bg-slate-800 rounded-lg"
              >
                Home
              </button>
              <button
                onClick={() => handleNavigation('/course_resources')}
                className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                Courses
              </button>
              <button
                onClick={() => handleNavigation('/research')}
                className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                Research
              </button>
              <button
                onClick={() => handleNavigation('/placements')}
                className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                Placements
              </button>
              <button
                onClick={() => handleNavigation('/insights')}
                className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                Insights
              </button>
              <hr className="border-slate-700" />
              <button
                onClick={handleDashboardClick}
                className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                My Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 text-left px-4 py-2 text-red-400 hover:bg-red-900/30 rounded-lg"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-400 font-medium">
                            Your one-stop learning hub            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Welcome to Campus Brain
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Your centralized university knowledge ecosystem bringing together course resources,
            validated research, placement preparation, senior insights, and real-time technology
            updates.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">Verified</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Target className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 font-medium">Moderated</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 font-medium">Continuously Updated</span>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Campus Brain Live Stats</h2>
            <p className="text-slate-400">Real-time platform activity and resources</p>
          </div>

          {statsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition group">
                <FileText className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition" />
                <div className="text-3xl font-bold text-white mb-1">
                  {stats?.publications.toLocaleString()}+
                </div>
                <div className="text-sm text-slate-400">Publications</div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition group">
                <BookOpen className="h-8 w-8 text-indigo-500 mb-3 group-hover:scale-110 transition" />
                <div className="text-3xl font-bold text-white mb-1">
                  {stats?.resources.toLocaleString()}+
                </div>
                <div className="text-sm text-slate-400">Resources</div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-orange-500/50 transition group">
                <Building2 className="w-8 h-8 text-orange-400 mb-3 group-hover:scale-110 transition" />
                <div className="text-3xl font-bold text-white mb-1">
                  {stats?.companies.toLocaleString()}+
                </div>
                <div className="text-sm text-slate-400">Companies</div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-green-500/50 transition group">
                <MessageSquare className="w-8 h-8 text-green-400 mb-3 group-hover:scale-110 transition" />
                <div className="text-3xl font-bold text-white mb-1">
                  {stats?.questions.toLocaleString()}+
                </div>
                <div className="text-sm text-slate-400">Questions</div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-emerald-500/50 transition group">
                <CheckCircle className="w-8 h-8 text-emerald-400 mb-3 group-hover:scale-110 transition" />
                <div className="text-3xl font-bold text-white mb-1">
                  {stats?.answers.toLocaleString()}+
                </div>
                <div className="text-sm text-slate-400">Answers</div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-pink-500/50 transition group">
                <Users className="w-8 h-8 text-pink-400 mb-3 group-hover:scale-110 transition" />
                <div className="text-3xl font-bold text-white mb-1">
                  {stats?.users.toLocaleString()}+
                </div>
                <div className="text-sm text-slate-400">Active Users</div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Explore Campus Brain</h2>
            <p className="text-slate-400">Navigate through our comprehensive academic ecosystem</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                onClick={() => handleNavigation(feature.path)}
                className="group relative bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 hover:border-slate-600 transition cursor-pointer overflow-hidden"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition`}
                />

                <div className="relative z-10">
                  <div
                    className={`inline-flex p-4 bg-gradient-to-br ${feature.gradient} rounded-xl mb-4 group-hover:scale-110 transition`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 mb-4">{feature.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                      <span className="text-2xl font-bold text-white">
                        {feature.stats.toLocaleString()}
                      </span>{' '}
                      {feature.statsLabel}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Latest Technology News</h2>
              <p className="text-slate-400">
                Live headlines from top global tech publishers
              </p>
            </div>
            <div className="flex items-center space-x-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Live Updates</span>
            </div>
          </div>

          {newsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : news.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition"
                >
                  {article.image && (
                    <div className="aspect-video bg-slate-700 overflow-hidden">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                        {article.category}
                      </span>
                      <div className="flex items-center space-x-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{article.time}</span>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition line-clamp-2">
                      {article.title}
                    </h3>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">{article.source}</span>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400">No news articles available at the moment.</p>
            </div>
          )}
        </div>

        <footer className="border-t border-slate-800 pt-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-semibold mb-4">Campus Brain</h3>
              <p className="text-sm text-slate-400">
                Empowering students with trusted academic materials and career guidance.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleNavigation('/course_resources')}
                  className="block text-sm text-slate-400 hover:text-blue-400 transition"
                >
                  Courses
                </button>
                <button
                  onClick={() => handleNavigation('/research')}
                  className="block text-sm text-slate-400 hover:text-blue-400 transition"
                >
                  Research
                </button>
                <button
                  onClick={() => handleNavigation('/placements')}
                  className="block text-sm text-slate-400 hover:text-blue-400 transition"
                >
                  Placements
                </button>
                <button
                  onClick={() => handleNavigation('/insights')}
                  className="block text-sm text-slate-400 hover:text-blue-400 transition"
                >
                  Insights
                </button>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <div className="space-y-2">
                <a href="#" className="block text-sm text-slate-400 hover:text-blue-400 transition">
                  Help & Support
                </a>
                <a href="#" className="block text-sm text-slate-400 hover:text-blue-400 transition">
                  Usage Guidelines
                </a>
                <a href="#" className="block text-sm text-slate-400 hover:text-blue-400 transition">
                  Privacy Policy
                </a>
                {user.role === 'admin' && (
                  <a
                    href="#"
                    className="block text-sm text-slate-400 hover:text-blue-400 transition"
                  >
                    Admin Access
                  </a>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Platform Security</h3>
              <div className="space-y-2 text-sm text-slate-400">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Role-Based Access</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Verified Content</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Activity Tracking</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-slate-500 pt-8 border-t border-slate-800">
            <p>© 2025 Campus Brain. Built with ❤️ for students.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}


