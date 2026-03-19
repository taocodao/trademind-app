import { NextRequest, NextResponse } from 'next/server';
import { checkFeatureAccess, getUserFromRequest } from '@/lib/ai';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';
const CACHE_TTL = 900; // 15 mins

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const access = await checkFeatureAccess(user.privyDid, 'deepdive');
    
    if (!access.allowed) {
      return NextResponse.json({ error: 'FEATURE_LOCKED' }, { status: 403 });
    }

    const { ticker } = await req.json();

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    const upperTicker = ticker.toUpperCase().trim();
    
    // Check shared cache (same ticker within 15 min = free for any user)
    // Create a time window key
    const timeBucket = Math.floor(Date.now() / (CACHE_TTL * 1000));
    const cacheKey = `deepdive:${upperTicker}:${timeBucket}`;
    
    if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
            // Cache hit: free for user, return instantly
            const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
            return NextResponse.json(data);
        }
    }

    // Hardcoded TurboCore context (in production this would come from the database/scanner)
    const turboRegime = 'BULL';
    const turboConf = 87;

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar', // live web search
        messages: [{
          role: 'system',
          content: `You are an educational market analysis copilot. TurboCore signal: ${turboRegime} (${turboConf}%).`
        }, {
          role: 'user',
          content: `Real-time educational analysis of ${upperTicker} as of today (${new Date().toLocaleDateString()}). Return strict JSON:
{
  "whyItMoved": "2-3 sentences: today's catalyst using live news",
  "technicalSnapshot": "support/resistance + trend in 1 sentence",
  "ivEnvironment": "IV Rank estimate + what it means for options cost",
  "turboAlignment": "yes|no + 1 sentence: does this align with ${turboRegime}?",
  "turboStrength": "strong|moderate|neutral|against",
  "strategyHint": "1 educational tip based on IV + regime combination",
  "riskScore": "number 1-10",
  "riskRationale": "1 sentence"
}`
        }],
        max_tokens: 500
      })
    });

    if (!res.ok) {
        throw new Error(`Perplexity API Error: ${res.statusText}`);
    }

    const data = await res.json();
    let analysis;
    try {
        // Find JSON block in output
        const content = data.choices[0].message.content;
        const match = content.match(/\{[\s\S]*\}/);
        analysis = JSON.parse(match ? match[0] : content);
    } catch (e) {
        console.error("Deep Dive JSON Parse Error:", data.choices[0].message.content);
        throw new Error('Failed to parse AI output');
    }

    // Cache the result
    if (redis) {
       await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(analysis));
    }
    
    return NextResponse.json(analysis);

  } catch (error: any) {
    console.error('AI Deep Dive Error:', error);
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
