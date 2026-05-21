// Vercel Serverless API Route — AI Travel Assistant Chat
// Proxies chat requests to Groq API (server-side, keeps keys safe)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp, verifySupabaseToken } from './_lib/cors.js';

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
const GROQ_MODEL = 'llama-3.3-70b-versatile';

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

// Call Groq with automatic retry on 429
async function callGroq(body: object, maxRetries = 2): Promise<Response> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429 && attempt < maxRetries) {
      const delay = (attempt + 1) * 2000;
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!corsOk) return res.status(403).json({ error: 'Origin not allowed' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Per-user (signed-in) or per-IP (anonymous) rate limit, backed by Upstash.
  const authUser = await verifySupabaseToken(req.headers as Record<string, string | string[] | undefined>);
  const rlId = authUser ? `chat:user:${authUser.id}` : `chat:ip:${getClientIp(req.headers)}`;
  const rlMax = authUser ? 60 : 20;           // per 5 minutes
  if (!(await checkRateLimit(rlId, rlMax, 5 * 60 * 1000))) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'AI chat is not configured yet.' });
  }

  try {
    const { messages, city, planContext } = req.body as {
      messages: ChatMessage[];
      city?: string;
      planContext?: { stops: { name: string; category: string; timeSlot?: string }[]; city: string; timeOfDay: string };
    };

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

    // Enhanced plan-aware prompt
    if (planContext && planContext.stops.length > 0) {
      const stopList = planContext.stops
        .map((s, i) => `${i + 1}. ${s.name} (${s.category}${s.timeSlot ? `, ${s.timeSlot}` : ''})`)
        .join('\n');
      systemContent += `\n\nThe user has an active itinerary in ${planContext.city}. Current time of day: ${planContext.timeOfDay}.
Their current plan:
${stopList}

You can suggest modifications to their plan. When suggesting a change, end your message with one of these action tags on its own line:
[ACTION:add] [TYPE:place_category] - to suggest adding a new stop
[ACTION:replace] [TARGET:stop_name] [TYPE:place_category] - to suggest replacing a stop
[ACTION:remove] [TARGET:stop_name] - to suggest removing a stop

Only use action tags when the user explicitly asks to modify their plan. Keep being conversational otherwise.`;
    }

    const groqBody = {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemContent },
        ...recentMessages.map(m => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      max_tokens: 400,
    };

    const response = await callGroq(groqBody);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[NxStops Chat] Groq error: ${response.status}`);

      let detail = '';
      try {
        const errJson = JSON.parse(errText);
        detail = errJson?.error?.message || '';
      } catch { /* not JSON */ }

      if (response.status === 401) {
        return res.status(502).json({ error: 'AI service configuration error.' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: detail || 'AI rate limit reached. Try again in a minute.' });
      }
      return res.status(502).json({ error: detail || 'AI service temporarily unavailable.' });
    }

    const data = await response.json();
    let reply =
      data.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response. Try again!";

    // Parse action tags from response
    let modification: { action: string; placeType?: string; targetStop?: string; suggestion?: string } | undefined;
    const actionMatch = reply.match(/\[ACTION:(add|replace|remove)\](?:\s*\[TYPE:([^\]]+)\])?(?:\s*\[TARGET:([^\]]+)\])?/);
    if (actionMatch) {
      modification = {
        action: actionMatch[1],
        placeType: actionMatch[2] || undefined,
        targetStop: actionMatch[3] || undefined,
        suggestion: reply.replace(actionMatch[0], '').trim(),
      };
      // Remove the action tag from the visible reply
      reply = reply.replace(actionMatch[0], '').trim();
    }

    return res.status(200).json({ reply, modification });
  } catch (err) {
    console.error('[NxStops Chat] Error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
