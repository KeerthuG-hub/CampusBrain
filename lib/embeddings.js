import { CohereClient } from 'cohere-ai';

// Initialize Cohere client
const cohere = new CohereClient({ 
  apiKey: process.env.NEXT_PUBLIC_COHERE_API_KEY 
});

// ============================================
// 1. GENERATE COHERE EMBEDDING (1024-DIM)
// ============================================
async function getEmbedding(text) {
  if (!text || text.trim().length === 0) return null;

  if (!process.env.NEXT_PUBLIC_COHERE_API_KEY) {
    console.warn('⚠️ Cohere API key not configured - using keyword-only search');
    return null;
  }

  try {
    const response = await cohere.embed({
      texts: [text.trim()],
      model: 'embed-english-v3.0',
      inputType: 'search_query'
    });
    return response.embeddings[0];
  } catch (error) {
    console.error('❌ Cohere embedding error:', error);
    return null;
  }
}

// ============================================
// 2. MAIN SEARCH FUNCTION (FIXED)
// ============================================
export async function searchFacultyHybrid(supabase, studentId, query, domains = []) {
  try {
    console.log('🔍 Starting hybrid search:', { query, domains, studentId });

    // Call the CORRECT function: match_faculty_by_domains
    const { data: facultyResults, error } = await supabase.rpc('match_faculty_by_domains', {
      p_student_id: studentId,
      p_query: query || '',
      p_domains: domains.length > 0 ? domains : []
    });

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log('✅ Database returned', facultyResults?.length || 0, 'results');

    if (!facultyResults || facultyResults.length === 0) {
      return { success: true, results: [], used_semantic: false };
    }

    // Format results
    const formattedResults = facultyResults.map(faculty => {
      let publications = [];
      if (faculty.matched_publications) {
        try {
          publications = typeof faculty.matched_publications === 'string'
            ? JSON.parse(faculty.matched_publications)
            : faculty.matched_publications;
          if (!Array.isArray(publications)) publications = [];
        } catch (e) {
          console.warn('Failed to parse publications:', e);
          publications = [];
        }
      }

      return {
        faculty_id: faculty.faculty_id,
        faculty_name: faculty.faculty_name,
        faculty_email: faculty.faculty_email,
        is_active: !!faculty.faculty_id, // Has ID = active
        sig_name: faculty.sig_name || 'No SIG',
        sig_role: 'member',
        match_score: parseFloat(faculty.match_score || 0),
        publication_count: publications.length,
        matched_publications: publications.map(pub => ({
          id: pub.id,
          title: pub.title,
          abstract: pub.abstract,
          venue: pub.venue,
          publication_year: pub.year,
          doi: pub.doi,
          pdf_url: pub.pdf_url,
          research_domains: pub.domains || [],
          match_score: pub.score || 0
        }))
      };
    });

    console.log('✅ Formatted', formattedResults.length, 'faculty results');

    // ============================================
    // 3. OPTIONAL: GROQ RERANKING
    // ============================================
    let finalResults = formattedResults;
    let groqRerankingUsed = false;

    if (query && formattedResults.length > 1) {
      try {
        console.log('🤖 Calling Groq reranking...');
        const res = await fetch('/api/groq-rerank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, facultyList: formattedResults })
        });

        if (!res.ok) {
          throw new Error(`Groq API returned ${res.status}`);
        }

        const data = await res.json();
        console.log('✅ Groq reranking response:', data);

        if (data.rankings && Array.isArray(data.rankings) && data.rankings.length > 0) {
          finalResults = formattedResults.map((f, idx) => {
            const rank = data.rankings.find(r => r.index === idx);
            if (!rank) return f;
            return {
              ...f,
              groq_adjusted_score: rank.adjusted_score,
              groq_reason: rank.reason,
              match_score: f.match_score * 0.7 + rank.adjusted_score * 0.3
            };
          }).sort((a, b) => b.match_score - a.match_score);
          groqRerankingUsed = true;
          console.log('✅ Groq reranking applied');
        }
      } catch (e) {
        console.warn('⚠️ Groq rerank failed, using original ranking:', e.message);
        // Continue with original ranking
      }
    }

    return {
      success: true,
      results: finalResults,
      total_faculty: finalResults.length,
      used_semantic: false, // We're not using embeddings right now
      used_groq_reranking: groqRerankingUsed
    };

  } catch (error) {
    console.error('❌ searchFacultyHybrid error:', error);
    return { 
      success: false, 
      error: error.message, 
      results: [], 
      used_semantic: false 
    };
  }
}

// ============================================
// 4. UTILITY FUNCTIONS
// ============================================
export async function testEmbedding(text = 'machine learning') {
  const embedding = await getEmbedding(text);
  if (!embedding) return { success: false, message: 'Embedding failed' };
  return { 
    success: true, 
    dimension: embedding.length, 
    sample: embedding.slice(0, 5) 
  };
}

export default { searchFacultyHybrid, getEmbedding, testEmbedding };