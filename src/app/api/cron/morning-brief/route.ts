import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // In production, uncomment the auth check to ensure only Vercel Cron can call this
    /*
    const authHeader = req.headers.get('authorization');
    if (authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    */

    // Fetch the active TurboCore signal from DB (Placeholder for actual fetch)
    const turboRegime = 'BULL';
    const turboConf = 87;
    const mlScore = 92;
    const today = new Date().toISOString().split('T')[0];

    // Check if we already generated a brief today
    const existing = await query(`SELECT id FROM ai_briefings WHERE date = $1`, [today]);
    if (existing.rowCount && existing.rowCount > 0) {
       return NextResponse.json({ message: 'Briefing already exists for today' });
    }

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{
          role: 'system',
          content: 'You are an elite market strategist writing a pre-market briefing for retail traders.'
        }, {
          role: 'user',
          content: `Write today's pre-market brief (${today}).
TurboCore signal: ${turboRegime} (${turboConf}%), ML Score: ${mlScore}/100.
Return JSON ONLY:
{
  "headline": "1 catchy sentence using today's catalyst",
  "pushBody": "Short (<60 chars) version for a push notification",
  "regimeContext": "1 sentence on why the signal is ${turboRegime} today",
  "bullets": [
    { "emoji": "📊", "text": "Broad market trend note" },
    { "emoji": "🔥", "text": "Top catalyst or sector in play today" },
    { "emoji": "💡", "text": "Options/volatility tip considering the regime" }
  ]
}`
        }],
        max_tokens: 500
      })
    });

    if (!res.ok) {
        throw new Error(`Perplexity API Error: ${res.statusText}`);
    }

    const data = await res.json();
    let content;
    try {
        const rawContent = data.choices[0].message.content;
        const match = rawContent.match(/\{[\s\S]*\}/);
        content = JSON.parse(match ? match[0] : rawContent);
    } catch (e) {
        console.error("Briefing Parse Error:", data.choices[0].message.content);
        throw new Error('Failed to parse briefing AI output');
    }

    await query(
      `INSERT INTO ai_briefings (date, regime, confidence, ml_score, content) 
       VALUES ($1, $2, $3, $4, $5)`,
      [today, turboRegime, turboConf, mlScore, content]
    );

    return NextResponse.json({ success: true, briefing: content });

  } catch (error: any) {
    console.error('AI Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
