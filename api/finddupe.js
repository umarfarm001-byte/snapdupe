export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, imageBase64 } = req.body;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `You are a skincare dupe expert for the Indian beauty market.
Find dupes for: ${query || 'the product in the image'}.
Return ONLY a raw JSON object. No markdown. No backticks. No explanation. Just JSON.
Format:
{"original":{"name":"Full product name","brand":"Brand","price":"₹XXXX","keyIngredients":["ing1","ing2"]},"dupes":[{"name":"Product name","brand":"Indian brand","price":"₹XXX","savings":"Save ₹XXXX","matchScore":90,"reason":"One sentence why it is a good dupe","tags":["Best Value"],"available":"Nykaa / Amazon India"},{"name":"Product name","brand":"Indian brand","price":"₹XXX","savings":"Save ₹XXXX","matchScore":85,"reason":"One sentence why it is a good dupe","tags":["Dermat Approved"],"available":"Nykaa"},{"name":"Product name","brand":"Indian brand","price":"₹XXX","savings":"Save ₹XXXX","matchScore":80,"reason":"One sentence why it is a good dupe","tags":["Same Ingredients"],"available":"Amazon India"}]}
Use real Indian brands only. Prices in INR. Return ONLY the JSON.`;

  try {
    let parts = [];
    if (imageBase64) {
      parts = [
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
      ];
    } else {
      parts = [{ text: prompt }];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com//v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.2 }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: 'Gemini error: ' + (data?.error?.message || JSON.stringify(data)) });
    }

    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'No JSON found in response' });

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);

  } catch (e) {
    return res.status(500).json({ error: 'Error: ' + e.message });
  }
}
