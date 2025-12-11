/**
 * SUPABASE IMPORT SCRIPT (Fixed + Dynamic Category Detection)
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('❌ Missing Supabase URL or Key! Check .env.local');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const CSV_PATH = process.env.CSV_PATH || './drive-files-export.csv';

const SYSTEM_USER_ID = '127d7bf7-091d-4e49-9fcd-b8b7b6d7426e';

// ============================================
// CATEGORY MAPPING
// ============================================
const CATEGORY_MAP: Record<string, string> = {
  'Course Plan': 'course_plan',
  'Notes and PPTs': 'notes',
  'Notes': 'notes',
  'PPT': 'ppt',
  'Books': 'book',
  'Book': 'book',
  'Question Papers': 'question_paper',
  'Question Paper': 'question_paper'
};

// ============================================
// TYPES
// ============================================
interface CSVRow {
  Name: string;
  ID: string;
  URL: string;
  MimeType: string;
  Path: string;
  CreatedDate: string;
  Size?: string;
}

interface ParsedData {
  semester: number;
  courseCode: string;
  courseName: string;
  categoryFolder: string;
  resourceType: string;
  fileName: string;
}

// ============================================
// PATH PARSER
// ============================================
function parsePath(pathStr: string, fileName: string, mimeType: string): ParsedData | null {
  const parts = pathStr.split('/').filter(p => p.trim());
  if (parts.length < 2) return null;

  const semesterMatch = parts[0].match(/semester\s*(\d+)/i);
  if (!semesterMatch) return null;

  const semester = parseInt(semesterMatch[1]);
  if (semester < 1 || semester > 8) return null;

  const courseStr = parts[1].trim();
  const courseMatch = courseStr.match(/^([A-Za-z0-9]{4,7})[\s\-_–—]*(.*)$/);
  if (!courseMatch) return null;

  const courseCode = courseMatch[1].toUpperCase();
  const courseName = courseMatch[2]?.trim() || 'Untitled';

  let categoryFolder = '';
  let resourceType: string = 'misc';

  for (const segment of parts) {
    const normalized = segment.trim().toLowerCase();

    for (const [key, value] of Object.entries(CATEGORY_MAP)) {
      const keyNorm = key.toLowerCase();
      if (normalized.includes(keyNorm.replace(/ and ppts/i, ''))) {
        categoryFolder = segment;
        resourceType = value;
      }
    }
  }

  const fold = categoryFolder.toLowerCase();
  const lowerFile = fileName.toLowerCase();

  if (fold.includes('ppt')) resourceType = 'ppt';
  if (fold.includes('note')) resourceType = lowerFile.endsWith('.ppt') || mimeType.includes('presentation') ? 'ppt' : 'notes';

  if (!categoryFolder) {
    categoryFolder = parts[parts.length - 1];
    resourceType =
      fold.includes('ppt') ? 'ppt' :
      fold.includes('note') ? 'notes' :
      CATEGORY_MAP[categoryFolder] || 'misc';
  }

  return {
    semester,
    courseCode,
    courseName,
    categoryFolder,
    resourceType,
    fileName
  };
}

// ============================================
// DATABASE
// ============================================
async function getCourseId(courseCode: string): Promise<string | undefined> {
  const { data } = await supabase
    .from('courses')
    .select('id')
    .eq('code', courseCode)
    .maybeSingle();

  return data?.id ?? undefined;  // ← FIXED
}

async function insertResource(params: {
  courseId: string;
  title: string;
  fileUrl: string;
  fileType: string;
  resourceType: string;
  categoryFolder: string;
}): Promise<string | undefined> {
  const finalTitle =
    params.categoryFolder === 'Course Plan'
      ? `[Course Plan] ${params.title}`
      : params.title;

  const { data, error } = await supabase
    .from('resources')
    .insert({
      course_id: params.courseId,
      title: finalTitle,
      file_url: params.fileUrl,
      file_type: params.fileType,
      resource_type: params.resourceType,
      uploader_id: SYSTEM_USER_ID,
      is_approved: true,
      view_count: 0,
      download_count: 0
    })
    .select('id')
    .single();

  if (error) {
    console.error(`   ❌ DB Error: ${error.message}`);
    return undefined;
  }

  return data?.id;
}

async function insertStorageMapping(
  resourceId: string,
  externalLink: string,
  driveId: string
): Promise<boolean> {
  const slug = `drive-${driveId}`;

  const { error } = await supabase
    .from('storage_mappings')
    .insert({
      resource_id: resourceId,
      provider: 'gdrive',
      external_link: externalLink,
      internal_slug: slug
    });

  if (error && error.code !== '23505') {
    console.error(`   ❌ Storage mapping error: ${error.message}`);
    return false;
  }

  return true;
}

// ============================================
// MAIN IMPORT
// ============================================
async function importCSV() {
  console.log('🚀 Import Script Starting...\n');

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records: CSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  const courseCache = new Map<string, string>();
  const missingCourses = new Set<string>();
  const categoryStats: Record<string, number> = {};

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    console.log(`\n[${i + 1}/${records.length}] ${row.Name}`);

    try {
      const parsed = parsePath(row.Path, row.Name, row.MimeType);
      if (!parsed) {
        skippedCount++;
        continue;
      }

      let courseId = courseCache.get(parsed.courseCode);

      if (!courseId) {
        const fetched = await getCourseId(parsed.courseCode);
        if (!fetched) {
          console.log(`   ❌ Missing course: ${parsed.courseCode}`);
          missingCourses.add(parsed.courseCode);
          skippedCount++;
          continue;          // ← SAFETY FIX
        }
        courseId = fetched;
        courseCache.set(parsed.courseCode, courseId);
      }

      const resourceId = await insertResource({
        courseId,
        title: row.Name,
        fileUrl: row.URL,
        fileType: row.MimeType,
        resourceType: parsed.resourceType,
        categoryFolder: parsed.categoryFolder
      });

      if (!resourceId) {
        errorCount++;
        continue;
      }

      await insertStorageMapping(resourceId, row.URL, row.ID);

      successCount++;
      categoryStats[parsed.resourceType] = (categoryStats[parsed.resourceType] || 0) + 1;

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Imported: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`⏭️ Skipped: ${skippedCount}`);

  if (missingCourses.size > 0) {
    console.log('\n⚠️ Missing Courses:');
    missingCourses.forEach(c => console.log(` - ${c}`));
  }

  console.log('\n✨ Done!\n');
}

// ============================================
importCSV();
