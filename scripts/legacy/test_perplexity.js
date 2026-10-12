require('dotenv').config({ path: '.env.local' });

async function testPerplexity() {
    console.log("Testing Perplexity API...");
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'sonar-reasoning', // Use reasoning model for options math
            messages: [{
                role: 'system',
                content: `You are an elite options structurer. TurboCore regime: BULL (87% conf).`
            }, {
                role: 'user',
                content: `Build 3 realistic options strategies for AAPL based on this thesis: "sell put".`
            }],
            max_tokens: 800
        })
    });

    console.log("Status:", res.status, res.statusText);
    const text = await res.text();
    console.log("Body:", text);
}

testPerplexity().catch(console.error);
