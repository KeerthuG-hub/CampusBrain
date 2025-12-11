import { createClient } from '@supabase/supabase-js';
import { autoGenerateEmbedding, embedAllPublications } from '@/lib/embeddings';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Important: Use service role key!
);

// Generate embedding for specific publication
export async function POST(request) {
  try {
    const { publicationId } = await request.json();

    if (!publicationId) {
      return NextResponse.json(
        { success: false, error: 'Publication ID required' },
        { status: 400 }
      );
    }

    const result = await autoGenerateEmbedding(supabase, publicationId);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Embedding API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Batch generate all missing embeddings
export async function GET(request) {
  try {
    console.log('Starting batch embedding generation...');
    
    const result = await embedAllPublications(supabase);

    return NextResponse.json({
      success: true,
      message: 'Batch embedding generation complete',
      ...result
    });

  } catch (error) {
    console.error('Batch embedding error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}