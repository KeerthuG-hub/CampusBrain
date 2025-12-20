
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { BookOpen, ArrowLeft, FileText } from 'lucide-react';
import { Course } from '@/lib/types';

export default async function SemesterPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const semesterId = parseInt(params.id);

  // Fetch courses for this semester
  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .eq('semester_number', semesterId)
    .order('code');

  if (error) {
    console.error('Error fetching courses:', error);
  }

  // Group courses by category (HSC, PC, etc.)
  const groupedCourses = courses?.reduce((acc: { [x: string]: any[]; }, course: { description: string; }) => {
    const category = course.description || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(course);
    return acc;
  }, {} as Record<string, Course[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Semester {semesterId}
              </h1>
              <p className="text-sm text-gray-600">
                {courses?.length || 0} courses available
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!courses || courses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No courses found
            </h3>
            <p className="text-gray-600">
              Courses for this semester haven't been added yet.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {(Object.entries(groupedCourses || {}) as [string, Course[]][]).map(([category, coursesInCategory]) => (
              <div key={category}>
                <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-blue-500 rounded" />
                  {category}
                  <span className="text-sm font-normal text-gray-500">
                    ({coursesInCategory.length} courses)
                  </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coursesInCategory.map((course) => (
                    <Link
                      key={course.id}
                      href={`/course/${course.code}`}
                      className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-500 overflow-hidden"
                    >
                      <div className="p-5">
                        {/* Course Code Badge */}
                        <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-mono font-semibold rounded-md mb-3">
                          {course.code}
                        </div>

                        {/* Course Name */}
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {course.name}
                        </h3>

                        {/* Course Info */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                          {course.credits && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {course.credits} Credits
                            </span>
                          )}
                          {course.course_mode && (
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs capitalize">
                              {course.course_mode.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        {/* View Resources Button */}
                        <div className="flex items-center justify-between pt-4 border-t">
                          <span className="text-sm text-gray-600">
                            View Resources
                          </span>
                          <div className="text-blue-600 group-hover:translate-x-1 transition-transform">
                            →
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}