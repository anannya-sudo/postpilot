module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama3.1-8b',
                temperature: 0.8,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            let parsedMsg = errBody;
            try {
                const parsed = JSON.parse(errBody);
                parsedMsg = parsed.error?.message || errBody;
            } catch (e) {}
            return res.status(response.status).json({ error: `API Error ${response.status}: ${parsedMsg}` });
        }

        const data = await response.json();
        let content = data.choices[0].message.content.trim();
        
        // Clean up potentially wrapped markdown from API response
        if (content.startsWith('```json')) {
            content = content.replace(/```json/i, '').replace(/```$/, '').trim();
        } else if (content.startsWith('```')) {
            content = content.replace(/```/g, '').trim();
        }

        // Find the first [ and last ] to extract only the JSON array
        const firstBracket = content.indexOf('[');
        const lastBracket = content.lastIndexOf(']');
        if (firstBracket === -1 || lastBracket === -1) {
            throw new Error('No valid JSON array found in response');
        }
        content = content.substring(firstBracket, lastBracket + 1);

        const parsed = JSON.parse(content);
        
        const validated = parsed.map((idea, i) => ({
            format: idea.format || 'text post',
            hook: idea.hook || 'Something worth saying.',
            caption: idea.caption || 'Caption coming soon — hit regenerate.',
            hashtags: idea.hashtags || '#content #creator #personal brand'
        }));

        return res.status(200).json(validated);
    } catch (err) {
        console.error("[Backend Error]", err);
        return res.status(500).json({ error: err.message });
    }
};
