import { createApiClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Simple domain extraction without Groq
function extractDomains(query: string): string[] {
  const lowerQuery = query.toLowerCase()
  const domains: string[] = []
  
  const domainKeywords: Record<string, string[]> = {
    'AI': ['ai', 'artificial intelligence'],
    'Machine Learning': ['machine learning', 'ml', 'model', 'training'],
    'Deep Learning': ['deep learning', 'neural network', 'cnn', 'rnn', 'transformer', 'bert'],
    'NLP': ['nlp', 'natural language', 'text', 'language model'],
    'Computer Vision': ['computer vision', 'image', 'vision', 'detection', 'recognition'],
    'Blockchain': ['blockchain', 'crypto', 'distributed ledger', 'smart contract', 'ethereum'],
    'IoT': ['iot', 'internet of things', 'sensor', 'embedded'],
    'Networks': ['network', 'routing', 'protocol', 'tcp', 'ip'],
    'Cybersecurity': ['security', 'cybersecurity', 'encryption', 'cryptography', 'hack'],
    'Cloud Computing': ['cloud', 'aws', 'azure', 'serverless'],
    'Data Science': ['data science', 'analytics', 'big data', 'visualization'],
    'HPC': ['hpc', 'high performance', 'parallel', 'distributed'],
    'Software Engineering': ['software engineering', 'devops', 'testing', 'architecture'],
  }
  
  Object.entries(domainKeywords).forEach(([domain, keywords]) => {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      domains.push(domain)
    }
  })
  
  return domains.length > 0 ? domains : ['AI', 'Machine Learning'] // Default fallback
}

export async function POST(request: Request) {
  try {
    const { query, selectedDomains } = await request.json()
    const supabase = await createApiClient()
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'student') {
      return NextResponse.json({ error: 'Only students can search faculty' }, { status: 403 })
    }
    
    // Check cache first (MD5 hash of query)
    const queryHash = Buffer.from(query.toLowerCase().trim()).toString('base64').substring(0, 32)
    
    const { data: cached } = await supabase
      .from('research_query_cache')
      .select('*')
      .eq('query_hash', queryHash)
      .single()
    
    let extractedDomains: string[] = []
    
    if (cached) {
      // Update cache stats
      await supabase
        .from('research_query_cache')
        .update({ 
          cache_hits: cached.cache_hits + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', cached.id)
      
      extractedDomains = cached.extracted_domains || []
    } else {
      // Extract domains from query
      extractedDomains = extractDomains(query)
      
      // Cache it
      await supabase
        .from('research_query_cache')
        .insert({
          query_hash: queryHash,
          query_text: query,
          extracted_domains: extractedDomains
        })
    }
    
    // Combine selected and extracted domains
    const allDomains = [...new Set([...selectedDomains, ...extractedDomains])]
    
    // Create request record
    const { data: requestRecord } = await supabase
      .from('student_research_requests')
      .insert({
        student_id: user.id,
        research_query: query,
        ai_extracted_domains: extractedDomains,
        selected_domains: selectedDomains,
        status: 'pending'
      })
      .select()
      .single()
    
    if (!requestRecord) {
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
    }
    
    // Search faculty
    const { data: facultyMatches, error: matchError } = await supabase
      .rpc('match_faculty_by_domains', {
        p_student_id: user.id,
        p_query: query,
        p_domains: allDomains
      })
    
    if (matchError) {
      console.error('Match error:', matchError)
      return NextResponse.json({ error: matchError.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      requestId: requestRecord.id,
      extractedDomains,
      facultyMatches: facultyMatches || []
    })
    
  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}