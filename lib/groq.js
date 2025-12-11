// ============================================
// CLIENT-SIDE GROQ HELPER
// File: lib/groq.js
// Calls API routes for research validation & domain extraction
// ============================================


export const availableDomains = [
  'AI', 'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
  'Blockchain', 'IoT', 'Robotics', 'Networks', 'Cybersecurity',
  'Cloud Computing', 'Distributed Systems', 'Data Science', 'HCI',
  'Software Engineering', 'Algorithms', 'Computational Theory',
  'Data Engineering', 'High Performance Computing', 'Security',
  'Embedded Systems', 'Web Development', 'DevOps', 'Databases'
];


/**
 * Extract research domains from student query using AI
 * @param {string} studentQuery - The research query
 * @returns {Promise<string[]>} - Array of domain names
 */
export async function extractResearchDomains(studentQuery) {
  if (!studentQuery || studentQuery.trim().length < 3) return [];


  try {
    const response = await fetch('/api/research/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: studentQuery, action: 'extractDomains' })
    });


    const data = await response.json();


    // ✅ If API failed or returned no domains → treat as out-of-scope
    if (!data.success || !Array.isArray(data.domains) || data.domains.length === 0) {
      console.warn('⚠️ Query out-of-scope or no domains:', data.message || 'No domains');
      return [];
    }


    console.log('✅ Domains extracted:', data.domains);
    return data.domains;
  } catch (error) {
    console.error('❌ Domain extraction error:', error);
    return [];
  }
}


/**
 * Check if query is suitable for research faculty matching
 * @param {string} studentQuery - The query to validate
 * @returns {Promise<boolean>} - True if valid research query
 */
export async function isResearchQueryAI(studentQuery) {
  if (!studentQuery || studentQuery.trim().length < 3) return false;


  try {
    const response = await fetch('/api/research/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: studentQuery, action: 'isResearchQuery' })
    });


    const data = await response.json();


    if (!data.success) {
      console.warn('⚠️ Validation failed, allowing query');
      return true; // Fail open
    }


    console.log('🔍 Research validation:', data.isResearch);
    return data.isResearch;
  } catch (error) {
    console.error('❌ Research validation error:', error);
    return true; // Fail open
  }
}



