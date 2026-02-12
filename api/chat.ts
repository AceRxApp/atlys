// Vercel Serverless API Route — AI Travel Assistant Chat
// Proxies chat requests to Google Gemini API (server-side, keeps keys safe)

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-1.5-flash';

const ALLOWED_ORIGINS = [
  'https://nxstops.com',
  'https://www.nxstops.com',
  'https://vynbynave.vercel.app',
  'https://nxstops-new.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

function getCorsHeaders(origin?: string) {
  const isAllowed = ALLOWED_ORIGINS.includes(origin || '');
  const allowedOrigin = isAllowed ? origin! : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // requests per window
const RATE_LIMIT_WINDOW = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

const SYSTEM_PROMPT = `You are NxStops AI, a friendly and knowledgeable travel assistant built into the NxStops travel app. You help travelers discover places, plan trips, and make the most of their destinations.

Your personality:
- Warm, enthusiastic, and concise
- Like a well-traveled friend who gives honest recommendations
- Use short, punchy responses (2-4 sentences max unless asked for detail)
- Mention specific types of places when suggesting (e.g. "Try a local coffee shop" not just "go somewhere")

What you can help with:
- Restaurant and dining recommendations
- Things to do and hidden gems in cities
- Trip planning tips and itinerary suggestions
- Local customs, tipping, and cultural advice
- Budget travel tips
- Safety tips for travelers
- Nightlife and entertainment suggestions
- Hotel and accommodation advice
- Transportation tips

Rules:
- Never make up specific restaurant or place names — suggest types and areas instead
- If asked about a specific city, share general knowledge but remind users to check the Discover tab for real-time results
- Keep responses under 150 words unless the user asks for more detail
- If asked something unrelated to travel, politely redirect to travel topics
- Never share personal opinions about politics, religion, or controversial topics`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Convert frontend messages to Gemini format
function toGeminiContents(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
}

// Call Gemini with automatic retry on 429
async function callGemini(body: object, maxRetries = 2): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.status === 429 && attempt < maxRetries) {
      // Wait before retrying: 2s, then 4s
      const delay = (attempt + 1) * 2000;
      console.log(`[NxStops Chat] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }

  // Should never reach here, but TypeScript needs it
  throw new Error('Max retries exceeded');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsHeaders = getCorsHeaders(req.headers.origin as string);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'AI chat is not configured yet. Add GEMINI_API_KEY to your environment variables.' });
  }

  try {
    const { messages, city } = req.body as { messages: ChatMessage[]; city?: string };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Limit conversation history to prevent token abuse
    const recentMessages = messages.slice(-10);

    // Build system prompt with city context
    let systemContent = SYSTEM_PROMPT;
    if (city) {
      systemContent += `\n\nThe user is currently exploring ${city} in the NxStops app. Tailor your suggestions to this city when relevant.`;
    }

    const geminiBody = {
      system_instruction: {
        parts: [{ text: systemContent }],
      },
      contents: toGeminiContents(recentMessages),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
      },
    };

    const response = await callGemini(geminiBody);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[NxStops Chat] Gemini ${response.status}:`, errText);

      // Parse Gemini error for better messages
      let detail = '';
      try {
        const errJson = JSON.parse(errText);
        detail = errJson?.error?.message || '';
      } catch { /* not JSON */ }

      if (response.status === 400) {
        return res.status(502).json({ error: `AI format error: ${detail || 'Check server logs.'}` });
      }
      if (response.status === 403) {
        return res.status(502).json({ error: detail || 'Gemini API key is invalid or the Generative Language API is not enabled.' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: detail || 'AI rate limit reached. Try again in a minute.' });
      }
      return res.status(502).json({ error: detail || 'AI service temporarily unavailable.' });
    }

    const data = await response.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't generate a response. Try again!";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('[NxStops Chat] Error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
