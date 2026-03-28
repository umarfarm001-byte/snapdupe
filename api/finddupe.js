export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, imageBase64 } = req.body;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  const systemPrompt = `You are a skincare dupe expert specializing in the Indian beauty market. Return ONLY valid JSON in this exact format, no extra text:
{
  "original": {
    "name": "Full product name",
    "brand": "Brand name",
    "price": "₹XXXX",
    "keyIngredients": ["ingredient1","ingredient2"]
  },
  "dupes": [
    {
      "name": "Product name",
      "brand": "Indian brand name",
      "price": "₹XXX",
      "savings": "Save ₹XXXX",
      "matchScore": 92,
      "reason": "One sentence explaining why this is a great dupe",
      "tags": ["Best Value","Dermat Approved"],
      "available": "Nykaa / Amazon India"
    }
  ]
}
Provide 3 dupes. Focus on real Indian brands: Minimalist, Dot & Key, Plum, mCaffeine, Mamaearth, WOW, Pilgrim, Re'equil, Acne Squad, The Derma Co, Cetaphil India, Lotus, Lakme. All prices in INR. Tags: Best Value, Dermat Approved, Same Ingredients, Viral on Instagram, Nykaa Bestseller, Cruelty Free. Return ONLY valid JSON.`;

  try {
    let parts = [];

    if (imageBase64) {
      parts = [
        { text: systemPrompt + '\n\nIdentify this skincare product and find Indian dupes.' },
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
      ];
    } else {
      parts = [{ text: systemPrompt + '\n\nFind Indian dupes for: ' + query }];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      }
    );

    const data = await response.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(text);
    return res.status(200).json(result);

  } catch (e) {
    return res.status(500).json({ error: 'Something went wrong: ' + e.message });
  }
}
