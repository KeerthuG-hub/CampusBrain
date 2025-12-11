// File: app/api/research/validate/route.ts
import { NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const availableDomains: string[] = [
  "AI", "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
  "Blockchain", "IoT", "Robotics", "Networks", "Cybersecurity",
  "Cloud Computing", "Distributed Systems", "Data Science", "HCI",
  "Software Engineering", "Algorithms", "Computational Theory",
  "Data Engineering", "High Performance Computing", "Security",
  "Embedded Systems", "Web Development", "DevOps", "Databases"
];

// -----------------------------
// Fallback domain extraction
// -----------------------------
function intelligentFallbackExtraction(text: string): string[] {
  const lowerText = text.toLowerCase();
  const domainPatterns: Record<string, string[]> = {
    "AI": ["ai", "artificial intelligence", "intelligent", "autonomous", "cognitive"],
    "Machine Learning": ["machine learning", "ml ", "supervised", "unsupervised", "classification", "regression", "prediction", "random forest", "svm", "decision tree"],
    "Deep Learning": ["deep learning", "neural network", "cnn", "rnn", "lstm", "transformer", "attention", "gan", "resnet", "bert", "gpt", "yolo", "convolution"],
    "Computer Vision": ["computer vision", "image", "object detection", "face recognition", "segmentation", "yolo", "opencv", "detection", "visual", "video"],
    "NLP": ["nlp", "natural language", "text", "sentiment", "chatbot", "language model", "translation", "speech"],
    "Blockchain": ["blockchain", "crypto", "smart contract", "ethereum", "bitcoin", "consensus", "decentralized", "web3", "ledger"],
    "IoT": ["iot", "internet of things", "sensor", "embedded", "arduino", "raspberry", "smart home", "wearable", "mqtt"],
    "Networks": ["network", "routing", "protocol", "tcp", "ip", "dns", "http", "packet", "sdn", "bandwidth"],
    "Cybersecurity": ["cybersecurity", "cyber security", "encryption", "cryptography", "authentication", "vulnerability", "penetration", "firewall", "intrusion", "malware", "attack"],
    "Security": ["security", "secure", "privacy", "access control", "zero trust"],
    "Cloud Computing": ["cloud", "aws", "azure", "gcp", "kubernetes", "docker", "container", "serverless", "microservices"],
    "Distributed Systems": ["distributed", "cluster", "load balancing", "replication", "consensus", "raft", "fault tolerance", "sharding"],
    "Data Science": ["data science", "analytics", "big data", "data mining", "statistics", "visualization", "pandas"],
    "Data Engineering": ["data engineering", "data pipeline", "etl", "data warehouse", "spark", "hadoop", "kafka"],
    "High Performance Computing": ["hpc", "high performance", "parallel", "gpu", "cuda", "optimization", "performance"],
    "Software Engineering": ["software engineering", "agile", "testing", "design patterns", "ci/cd", "git"],
    "Web Development": ["web", "frontend", "backend", "react", "nodejs", "rest api", "graphql"],
    "Algorithms": ["algorithm", "sorting", "searching", "graph", "dynamic programming", "optimization"],
    "Robotics": ["robot", "robotics", "navigation", "path planning", "ros", "manipulator"],
    "HCI": ["hci", "human computer", "user interface", "user experience", "usability", "ui/ux"],
    "Databases": ["database", "sql", "nosql", "mongodb", "postgresql", "query"]
  };

  const scores: Record<string, number> = {};
  for (const [domain, keywords] of Object.entries(domainPatterns)) {
    let score = 0;
    for (const kw of keywords) {
      if (lowerText.includes(kw)) score += kw.length;
    }
    if (score > 0) scores[domain] = score;
  }

  const sortedDomains = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([domain]) => domain);

  // Implicit relationships
  if (sortedDomains.includes("Deep Learning")) {
    if (!sortedDomains.includes("AI")) sortedDomains.push("AI");
    if (!sortedDomains.includes("Machine Learning")) sortedDomains.push("Machine Learning");
  }
  if (sortedDomains.includes("Computer Vision") && !sortedDomains.includes("AI")) sortedDomains.push("AI");
  if (sortedDomains.includes("NLP") && !sortedDomains.includes("AI")) sortedDomains.push("AI");

  return sortedDomains.slice(0, 6);
}

// -----------------------------
// Helper: check if query is research
// -----------------------------
async function checkIsResearchQuery(query: string): Promise<boolean> {
  if (!GROQ_API_KEY) return true; // fail-open

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a research query validator. Reply ONLY with true or false." },
          { role: "user", content: query }
        ],
        temperature: 0,
        max_tokens: 10
      })
    });

    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    return content.toLowerCase().includes("true");
  } catch (err) {
    console.error("❌ Research validation error:", err);
    return true; // fail-open
  }
}

// -----------------------------
// API Route
// -----------------------------
export async function POST(request: Request) {
  try {
    const body = await request.json() as { query: string; action: string };
    const query = body.query?.trim() ?? "";
    const action = body.action;

    if (!query || query.length < 3) {
      return NextResponse.json({ success: false, error: "Query too short" }, { status: 400 });
    }

    // -----------------------------
    // RESEARCH QUERY CHECK
    // -----------------------------
    if (action === "isResearchQuery") {
      const isResearch = await checkIsResearchQuery(query);
      return NextResponse.json({ success: true, isResearch });
    }

    // -----------------------------
    // DOMAIN EXTRACTION
    // -----------------------------
    if (action === "extractDomains") {
      // Step 1: check if query is research-relevant
      const isResearch = await checkIsResearchQuery(query);
      if (!isResearch) {
        return NextResponse.json({
          success: true,
          domains: [],
          message: "Query is outside research scope",
          aiDomains: [],
          fallbackDomains: []
        });
      }

      // Step 2: fallback + AI domain extraction
      const fallbackDomains = intelligentFallbackExtraction(query);

      try {
        const response = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `Extract 3-6 domains from this query. Prefer these domains: ${availableDomains.join(
                  ", "
                )}. You may also suggest new research areas. Return ONLY a JSON array.`
              },
              { role: "user", content: query }
            ],
            temperature: 0.2,
            max_tokens: 150
          })
        });

        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim() ?? "";

        let extractedDomains: string[] = [];
        try {
          const clean = content.replace(/```json\n?|```/g, "").trim();
          const parsed = JSON.parse(clean);
          if (Array.isArray(parsed)) extractedDomains = parsed.filter(d => typeof d === "string");
        } catch {
          extractedDomains = fallbackDomains;
        }

        const combined = [...new Set([...extractedDomains, ...fallbackDomains])].slice(0, 6);

        return NextResponse.json({
          success: true,
          domains: combined,
          source: "ai",
          aiDomains: extractedDomains,
          fallbackDomains: fallbackDomains.slice(0, 3)
        });

      } catch (err) {
        console.error("❌ Domain extraction error:", err);
        return NextResponse.json({ success: true, domains: fallbackDomains, source: "fallback" });
      }
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });

  } catch (err: any) {
    console.error("❌ API error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}