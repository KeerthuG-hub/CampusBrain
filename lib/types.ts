import { ReactNode } from "react";

// types.ts
export type UUID = string;
export type Timestamp = string; // ISO string
export type Role = 'student' | 'faculty' | 'admin';
export type ResearchStatus = 'pending' | 'accepted' | 'completed';
export type SigRole = 'lead' | 'member';
export type ActionType = 'view' | 'upload' | 'vote' | 'download' | 'answer' | 'ask_question';
export type VoteType = 'up' | 'down';
export type ResourceType = 'notes' | 'lab' | 'guide' | 'template' | 'experience' | 'essay'; // adjust to match enum
export type ScholarshipType = 'merit' | 'need-based' | 'govt' | 'private' | 'research' | 'international'; // adjust to match enum

export interface AllowedDomain {
  id: UUID;
  domain: string;
  description?: string;
  is_student_domain: boolean;
  added_at: Timestamp;
}

export interface Profile {
  interests: boolean;
  id: UUID;
  email: string;
  full_name?: string;
  role: Role;
  department?: string;
  batch_year?: number;
  bio?: string;
  avatar_url?: string;
  points: number;
  created_at: Timestamp;
  updated_at?: Timestamp;
  is_deleted: boolean;
}

export interface Question {
  id: UUID;
  user_id: UUID;
  title: string;
  content: string;
  view_count: number;
  upvotes: number;
  is_resolved: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  is_deleted: boolean;
}

export interface Answer {
  id: UUID;
  question_id: UUID;
  user_id: UUID;
  content: string;
  upvotes: number;
  is_accepted: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  is_deleted: boolean;
}

export interface Badge {
  id: UUID;
  name: string;
  description?: string;
  icon_url?: string;
  criteria?: any; // JSON
  created_at: Timestamp;
}

export interface Company {
  id: UUID;
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  created_at: Timestamp;
}

export interface CompanyResource {
  id: UUID;
  company_id: UUID;
  resource_id: UUID;
  role_type?: string;
  prep_category?: string;
  is_verified: boolean;
  created_at: Timestamp;
}

export interface Course {
  id: UUID;
  code: string;
  name: string;
  semester_number: number;
  description?: string;
  credits?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  course_mode?: string;
}

export interface FacultyCourse {
  code: ReactNode;
  name: ReactNode;
  id: UUID;
  faculty_id: UUID;
  course_id: UUID;
  academic_year: string;
  is_current: boolean;
  teaching_role: string;
  designed: boolean;
  course?: Course; // join result
}

export interface Sig {
  id: UUID;
  name: string;
  description?: string;
  research_domains?: string[];
  created_at: Timestamp;
}

export interface FacultySig {
  name: ReactNode;
  id: UUID;
  faculty_id: UUID;
  sig_id: UUID;
  role: SigRole;
  joined_at: Timestamp;
  sig?: Sig; // join result
}

export interface FacultyWhitelist {
  id: UUID;
  email: string;
  added_at: Timestamp;
}

export interface PlacementExperience {
  id: UUID;
  user_id: UUID;
  company_id: UUID;
  role: string;
  year: number;
  experience_text?: string;
  tips?: string;
  is_verified: boolean;
  created_at: Timestamp;
}

export interface ResearchRequest {
  id: UUID;
  student_id: UUID;
  sig_id: UUID;
  faculty_id: UUID;
  topic: string;
  description?: string;
  status: ResearchStatus;
  created_at: Timestamp;
}

export interface ResourceEmbedding {
  id: UUID;
  resource_id: UUID;
  embedding: any; // depends on pgvector type
  created_at: Timestamp;
}

export interface ResourceTag {
  id: UUID;
  resource_id: UUID;
  tag_id: UUID;
  auto_tagged: boolean;
  created_at: Timestamp;
}

export interface Resource {
  id: UUID;
  title: string;
  description?: string;
  file_url: string;
  file_type?: string;
  resource_type: ResourceType;
  uploader_id: UUID;
  view_count: number;
  download_count: number;
  is_approved: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  course_id?: UUID;
  uploader_name?: string;
}

export interface ScholarshipResource {
  id: UUID;
  scholarship_id: UUID;
  resource_id: UUID;
  resource_type: ResourceType;
  is_verified: boolean;
  created_at: Timestamp;
}

export interface Scholarship {
  id: UUID;
  name: string;
  description?: string;
  eligibility?: string;
  deadline?: string;
  amount?: number;
  scholarship_type: ScholarshipType;
  application_url?: string;
  created_at: Timestamp;
}

export interface StorageMapping {
  id: UUID;
  resource_id: UUID;
  provider: string;
  external_link: string;
  internal_slug: string;
  created_at: Timestamp;
}

export interface Tag {
  id: UUID;
  name: string;
  type: string; // adjust to match enum
  parent_id?: UUID;
  created_at: Timestamp;
}

export interface UserActivity {
  id: UUID;
  user_id: UUID;
  action_type: ActionType;
  resource_id?: UUID;
  question_id?: UUID;
  answer_id?: UUID;
  scholarship_id?: UUID;
  company_id?: UUID;
  points_earned: number;
  created_at: Timestamp;
}

export interface Vote {
  id: UUID;
  user_id: UUID;
  votable_type: string; // adjust to enum
  votable_id: UUID;
  vote_type: VoteType;
  created_at: Timestamp;
}

export interface QuestionTag {
  id: UUID;
  question_id: UUID;
  tag_id: UUID;
  created_at: Timestamp;
}
