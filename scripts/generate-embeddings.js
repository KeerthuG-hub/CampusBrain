// ============================================
// ONE-TIME SCRIPT: Generate Embeddings with Cohere
// File: scripts/generateEmbeddings.js
// ============================================

import { createClient } from '@supabase/supabase-js';
import { embedAllPublications } from '../lib/embeddings.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   COHERE EMBEDDING GENERATION (FREE!)     ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Correct required env var
  if (!process.env.CO_API_KEY) {
    console.error('❌ CO_API_KEY missing in .env.local!\n');
    console.log('Add this:');
    console.log('CO_API_KEY=your-key-here\n');
    process.exit(1);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Supabase credentials missing!');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log('✅ Supabase connected');
  console.log('✅ Cohere API key registered\n');

  try {
    // Count total publications
    const { count: totalCount, error: totalErr } = await supabase
      .from('faculty_publications')
      .select('*', { count: 'exact', head: true });

    if (totalErr) throw totalErr;

    // Count embedded publications
    const { count: embeddedCount, error: embeddedErr } = await supabase
      .from('faculty_publications')
      .select('*', { count: 'exact', head: true })
      .not('embedding', 'is', null);

    if (embeddedErr) throw embeddedErr;

    console.log(`📊 Total publications: ${totalCount}`);
    console.log(`📦 Already embedded:  ${embeddedCount}`);
    console.log(`🧠 Need embedding:    ${totalCount - embeddedCount}\n`);

    if (totalCount === 0) {
      console.log('❌ No publications found. Insert data first.');
      return;
    }

    console.log('🚀 Starting embedding generation...\n');

    const result = await embedAllPublications(supabase);

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║        EMBEDDING GENERATION COMPLETE!      ║');
    console.log('╚════════════════════════════════════════════╝\n');

    console.log(`✅ Success: ${result.successCount}`);
    console.log(`❌ Errors:  ${result.errorCount}\n`);

  } catch (error) {
    console.error('❌ Fatal Error:', error);
    process.exit(1);
  }
}

main();
