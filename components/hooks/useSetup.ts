// hooks/useSetup.ts
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Profile, Course, Sig } from "@/lib/types";

// Types for prefilled setup data
interface FacultyCoursePrefill {
  id: string;       // course_id
  code: string;
  name: string;
  semester: number;
  fc_id: string;    // faculty_courses ID
}

interface FacultySigPrefill {
  id: string;       // sig_id
  name: string;
  role: string;
  fs_id: string;    // faculty_sigs ID
}

interface FacultyPrefilledData {
  interests: string[];
  bio: string;
  courses: FacultyCoursePrefill[];
  sigs: FacultySigPrefill[];
}

interface StudentPrefilledData {
  interests: string[];
  bio: string;
}

type PrefilledData = FacultyPrefilledData | StudentPrefilledData;

// Type for nested SIG query result
type FacultySigWithNestedSigs = {
  id: string;
  sig_id: string;
  role: 'lead' | 'member';
  sigs: { id: string; name: string; description: string }[];
};

export function useSetup(userId: string, role: "student" | "faculty") {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [availableSigs, setAvailableSigs] = useState<Sig[]>([]);
  const [prefilledData, setPrefilledData] = useState<PrefilledData | null>(null);

  useEffect(() => {
    if (userId) loadInitialData();
  }, [userId, role]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 1️⃣ Load all courses
      const { data: courses } = await supabase
  .from('courses')
  .select("*")   // <- now includes created_at, updated_at, etc.
  .order("semester_number", { ascending: true });

setAvailableCourses(courses || []);

      // 2️⃣ Load all SIGs
      const { data: sigs, error: sigsError } = await supabase
        .from('sigs')
        .select("*")
        .order("name", { ascending: true });

      if (sigsError) throw sigsError;
      setAvailableSigs(sigs || []);

      // 3️⃣ Get profile info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select("interests, bio")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      // 4️⃣ Faculty-specific: fetch courses & SIGs
      if (role === "faculty") {
        // Courses handled
        const { data: existingCourses } = await supabase
          .from('faculty_courses')
          .select(`
            id,
            course_id,
            academic_year,
            is_current,
            teaching_role,
            courses(id, code, name, semester_number)
          `)
          .eq("faculty_id", userId);

        // SIGs handled
        const { data: existingSigs } = await supabase
          .from('faculty_sigs')
          .select("id, sig_id, role, sigs(id, name, description)")
          .eq("faculty_id", userId);

        const typedCourses = (existingCourses ?? []).map((ec: any) => ({
          id: ec.course_id,
          code: ec.courses?.code || "",
          name: ec.courses?.name || "",
          semester: ec.courses?.semester_number || 0,
          fc_id: ec.id
        }));

        const typedSigs = (existingSigs ?? []).map((es: any) => ({
          id: es.sig_id,
          name: es.sigs?.name || "",
          role: es.role,
          fs_id: es.id
        }));

        setPrefilledData({
          interests: profile?.interests || [],
          bio: profile?.bio || "",
          courses: typedCourses,
          sigs: typedSigs
        });
      } else {
        // Student prefill
        setPrefilledData({
          interests: profile?.interests || [],
          bio: profile?.bio || ""
        });
      }
    } catch (error) {
      console.error("Error loading setup data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSetup = async (formData: PrefilledData) => {
    setSaving(true);
    try {
      // 1️⃣ Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          interests: formData.interests,
          bio: formData.bio,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // 2️⃣ Faculty-specific: courses & SIGs
      if (role === "faculty") {
        const facultyData = formData as FacultyPrefilledData;

        // Courses
        await supabase.from('faculty_courses').delete().eq("faculty_id", userId);
        if (facultyData.courses?.length) {
          const { error: coursesError } = await supabase.from('faculty_courses').insert(
            facultyData.courses.map(c => ({
              faculty_id: userId,
              course_id: c.id,
              academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
              is_current: true,
              teaching_role: "instructor"
            }))
          );
          if (coursesError) throw coursesError;
        }

        // SIGs
        await supabase.from('faculty_sigs').delete().eq("faculty_id", userId);
        if (facultyData.sigs?.length) {
          const { error: sigsError } = await supabase.from('faculty_sigs').insert(
            facultyData.sigs.map(s => ({
              faculty_id: userId,
              sig_id: s.id,
              role: s.role || "member"
            }))
          );
          if (sigsError) throw sigsError;
        }
      }

      setSaving(false);
      return { success: true };
    } catch (error) {
      console.error("Error saving setup:", error);
      setSaving(false);
      return { success: false, error };
    }
  };

  return {
    loading,
    saving,
    availableCourses,
    availableSigs,
    prefilledData,
    saveSetup
  };
}
