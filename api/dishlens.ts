// Vercel Serverless API Route — TasteLens AI Food Analyzer + Menu Scanner
// Handles two actions:
//   1. Dish analysis: POST { dishName, restaurant?, city? }
//   2. Menu scan:     POST { image: base64 }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!corsOk) return res.status(403).json({ error: 'Origin not allowed' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const clientIp = getClientIp(req.headers);
  if (!(await checkRateLimit(clientIp, 10, 60_000))) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const { image, dishName, restaurant, city } = req.body || {};

  // ─── Menu Scan (image present) ───
  if (image && typeof image === 'string') {
    return handleMenuScan(image, res);
  }

  // ─── Dish Analysis (dishName present) ───
  return handleDishAnalysis(dishName, restaurant, city, res);
}

// ─────────────────────────────────────────────────
// Menu Scan — Groq Vision (uses same GROQ_API_KEY)
// ─────────────────────────────────────────────────
async function handleMenuScan(image: string, res: VercelResponse) {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Menu scanner not configured.' });
  }

  // Ensure the image has a proper data URL prefix for Groq vision
  let dataUrl = image;
  if (!dataUrl.startsWith('data:')) {
    dataUrl = `data:image/jpeg;base64,${dataUrl}`;
  }

  // Check size (base64 portion only)
  const base64Part = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  if (base64Part.length > 7_000_000) {
    return res.status(400).json({ error: 'Image too large. Please try a smaller photo.' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a menu reader for a food app. Look at this image of a restaurant menu and extract all the dish/food item names you can see.

Rules:
- Return ONLY a JSON object with a single key "dishes" containing an array of strings
- Each string should be the dish name as written on the menu
- Include food items, drinks, appetizers, desserts — anything orderable
- Do NOT include prices, descriptions, or section headers
- If the image is not a menu or you cannot read any dishes, return {"dishes": []}
- Maximum 30 items
- Clean up the names: proper capitalization, no extra whitespace

Example response: {"dishes": ["Margherita Pizza", "Caesar Salad", "Grilled Salmon", "Tiramisu"]}`,
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq Vision 90b error:', response.status, errorText);
      // Try smaller 11b model as fallback
      const fallbackRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all dish/food names from this menu image. Return ONLY a JSON object like: {"dishes": ["Dish 1", "Dish 2"]}. If not a menu, return {"dishes": []}. No other text.',
                },
                {
                  type: 'image_url',
                  image_url: { url: dataUrl },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 1024,
        }),
      });

      if (!fallbackRes.ok) {
        const fbErr = await fallbackRes.text();
        console.error('Groq Vision 11b error:', fallbackRes.status, fbErr);
        let errMsg = 'Menu scanning failed. Please try again.';
        try { errMsg = JSON.parse(fbErr)?.error?.message || errMsg; } catch {}
        return res.status(502).json({ error: errMsg });
      }

      const fbData = await fallbackRes.json();
      const fbContent = fbData.choices?.[0]?.message?.content;
      if (fbContent) {
        const dishes = extractDishes(fbContent);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ dishes });
      }
      return res.status(502).json({ error: 'Menu scanning failed. Please try again.' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'No response from vision AI' });
    }

    const dishes = extractDishes(content);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ dishes });
  } catch (err) {
    console.error('Menu scan error:', err);
    return res.status(500).json({ error: 'Failed to scan menu' });
  }
}

// Extract dishes array from AI response text (may contain markdown or extra text)
function extractDishes(text: string): string[] {
  try {
    // Try direct JSON parse first
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.dishes)) {
      return parsed.dishes.filter((d: unknown) => typeof d === 'string' && d.trim().length > 0).slice(0, 30);
    }
  } catch {
    // Try to find JSON in the response text
    const jsonMatch = text.match(/\{[\s\S]*"dishes"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.dishes)) {
          return parsed.dishes.filter((d: unknown) => typeof d === 'string' && d.trim().length > 0).slice(0, 30);
        }
      } catch { /* fall through */ }
    }
  }
  return [];
}

// ─────────────────────────────────────────────────
// Dish Analysis — Groq LLM
// ─────────────────────────────────────────────────
async function handleDishAnalysis(
  dishName: unknown, restaurant: string | undefined, city: string | undefined, res: VercelResponse
) {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'TasteLens service not configured.' });
  }

  if (!dishName || typeof dishName !== 'string') {
    return res.status(400).json({ error: 'dishName is required' });
  }

  if (dishName.length > 200) {
    return res.status(400).json({ error: 'dishName must be 200 characters or less' });
  }

  const restaurantContext = restaurant
    ? `The user is viewing the menu at "${restaurant}". Your response MUST be specific to this restaurant's version of the dish — branded name, how THEY serve it, their specific ingredients, and their pricing. Do NOT give generic dish info.`
    : '';

  const cityContext = city ? `The user is currently in ${city}.` : '';

  const systemPrompt = `You are TasteLens, a restaurant-specific food analysis AI for the NxStops travel app.
When given a dish name${restaurant ? ` and a specific restaurant (${restaurant})` : ''}, respond with a JSON object containing:
- name: the dish name as it appears on ${restaurant ? `${restaurant}'s menu` : 'the menu'}
- restaurant: "${restaurant || 'Unknown'}"
- description: 2-3 sentence visual description — what it looks like on the plate, key ingredients, how it's served. Be specific${restaurant ? ` to ${restaurant}` : ''}.
- imageSearchQuery: a search query to find a photo of this SPECIFIC DISH (not the restaurant). Use the dish's common/traditional name. Example: for "Big Mac" use "Big Mac hamburger", for "Pad Thai" use "Pad Thai noodles", for "Jollof Rice" use "Jollof Rice". Keep it short — just the dish name and its food type.
- servingSize: serving description like "10-piece box", "Large plate", "12 oz cup", etc.${restaurant ? ` Specific to ${restaurant}'s portions.` : ''}
- calories: estimated calorie count as a string like "540 cal" or "350-450 cal"${restaurant ? `. Use ${restaurant}'s actual published nutrition data if known.` : ''}
- dietaryTags: array of applicable tags from: vegetarian, vegan, gluten-free, dairy-free, nut-free, halal, kosher, pescatarian, contains-alcohol
- spiceLevel: 0-5 (0=not spicy, 5=extremely spicy)
- allergens: array of common allergens present from: nuts, dairy, gluten, shellfish, eggs, soy, fish, sesame
- pairings: array of 2-3 recommended sides, drinks, or sauces that go well with this dish${restaurant ? ` from ${restaurant}'s menu` : ''}. Each item is a string like "Large Fries", "Sweet Tea", "Ranch Sauce".
- category: one of: appetizer, main, side, dessert, drink, snack, soup, salad
- culturalNote: a brief 1-sentence note — for chain restaurants, this can be a fun fact about the dish's origin or popularity
${restaurantContext}
${cityContext}
Respond ONLY with valid JSON. No markdown, no code blocks, no explanation.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: restaurant
            ? `Tell me about "${dishName}" from ${restaurant}'s menu`
            : `Tell me about this dish: ${dishName}` },
        ],
        temperature: 0.3,
        max_tokens: 700,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      return res.status(response.status).json({ error: 'AI analysis failed' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'Empty AI response' });
    }

    const dishInfo = JSON.parse(content);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    return res.status(200).json(dishInfo);
  } catch (err) {
    console.error('TasteLens error:', err);
    return res.status(500).json({ error: 'Failed to analyze dish' });
  }
}
