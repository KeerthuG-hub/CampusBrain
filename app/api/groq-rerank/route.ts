// app/api/groq-rerank/route.ts
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { query, facultyList } = await req.json();
    
    if (!query || !facultyList || !Array.isArray(facultyList)) {
      return NextResponse.json({ 
        error: 'Missing or invalid query/facultyList' 
      }, { status: 400 });
    }

    // Fallback if no GROQ_API_KEY
    if (!process.env.GROQ_API_KEY) {
      console.warn('⚠️ GROQ_API_KEY not set, skipping reranking');
      return NextResponse.json({ 
        rankings: facultyList.map((_, idx) => ({
          index: idx,
          adjusted_score: 0.5,
          reason: 'Reranking skipped - API key not configured'
        }))
      });
    }

    // Prepare faculty summaries for reranking
    const documents = facultyList.map((faculty, idx) => {
      const pubTitles = faculty.matched_publications
        ?.slice(0, 3)
        .map((p: any) => p.title)
        .join('; ') || 'No publications';
      
      return {
        id: idx.toString(),
        text: `Faculty: ${faculty.faculty_name}
SIG: ${faculty.sig_name || 'None'}
Role: ${faculty.sig_role || 'member'}
Total Publications: ${faculty.publication_count || 0}
Recent Publications: ${faculty.recent_publication_count || 0}
Relevant Publications: ${faculty.relevant_publication_count || 0}
Top Papers: ${pubTitles}
Match Score: ${Math.round((faculty.match_score || 0) * 100)}%`
      };
    });

    console.log('🔄 Calling Groq rerank with', documents.length, 'faculty');

    // Call Groq rerank API
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert research faculty matcher. Given a student's research query and faculty profiles, analyze and rerank them by relevance.

For each faculty member, consider:
- How well their publications align with the student's research interest
- Recency and quantity of relevant publications
- SIG alignment with the research area
- Overall expertise match

Return ONLY a JSON array with this exact format:
[
  {
    "index": 0,
    "adjusted_score": 0.95,
    "reason": "Strong match - multiple publications in blockchain security for IoT"
  },
  {
    "index": 1,
    "adjusted_score": 0.72,
    "reason": "Moderate match - some IoT work but limited blockchain focus"
  }
]

Rules:
- adjusted_score: 0.0 to 1.0 (higher = better match)
- Keep reason concise (under 80 chars)
- Return ALL faculty in the array
- NO markdown, NO explanations, ONLY the JSON array`
        },
        {
          role: 'user',
          content: `Student Query: "${query}"

Faculty Profiles:
${documents.map((doc, idx) => `[${idx}] ${doc.text}`).join('\n\n')}

Analyze and rerank these faculty members by relevance to the student's query.`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content?.trim();
    
    if (!content) {
      console.warn('⚠️ Empty Groq response, using original ranking');
      return NextResponse.json({
        rankings: facultyList.map((_, idx) => ({
          index: idx,
          adjusted_score: 0.5,
          reason: 'Reranking unavailable'
        }))
      });
    }

    // Parse AI response
    let rankings;
    try {
      const parsed = JSON.parse(content);
      
      // Handle both direct array and wrapped object
      rankings = parsed.rankings || parsed.faculty_matches || parsed;
      
      // Validate structure
      if (!Array.isArray(rankings) || rankings.length === 0) {
        throw new Error('Invalid rankings format');
      }

      // Ensure all entries have required fields
      rankings = rankings.map((r: any) => ({
        index: parseInt(r.index) || 0,
        adjusted_score: parseFloat(r.adjusted_score) || 0.5,
        reason: r.reason || 'No reason provided'
      }));

      console.log('✅ Groq reranked', rankings.length, 'faculty');

    } catch (parseError) {
      console.error('❌ Failed to parse Groq response:', parseError);
      console.log('Raw content:', content);
      
      // Return original ranking on parse failure
      return NextResponse.json({
        rankings: facultyList.map((_, idx) => ({
          index: idx,
          adjusted_score: 0.5,
          reason: 'Parse error - using original ranking'
        }))
      });
    }

    return NextResponse.json({ rankings });

  } catch (error: any) {
    console.error('❌ Groq rerank error:', error.message);
    
    // Return graceful fallback instead of error
    return NextResponse.json({
      rankings: [],
      error: error.message
    }, { status: 200 }); // Return 200 so frontend doesn't break
  }
}