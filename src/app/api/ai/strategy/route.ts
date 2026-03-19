import { NextRequest, NextResponse } from 'next/server';
import { checkAIBudget, consumeMessages, getUserFromRequest } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    // Pro-gate check
    if (!['pro', 'bundle'].includes(user.tier)) {
       return NextResponse.json({ error: 'UPGRADE_REQUIRED' }, { status: 403 });
    }

    const budget = await checkAIBudget(user.privyDid, 2);
    if (!budget.allowed) {
      return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 402 });
    }

    const { ticker, thesis, timeframe, risk } = await req.json();

    if (!ticker || !thesis) {
      return NextResponse.json({ error: 'Ticker and thesis are required' }, { status: 400 });
    }

    const upperTicker = ticker.toUpperCase().trim();

    // Hardcoded TurboCore context (in production this would come from DB)
    const turboRegime = 'BULL';
    const turboConf = 87;

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
          content: `You are an elite options structurer. TurboCore regime: ${turboRegime} (${turboConf}% conf).`
        }, {
          role: 'user',
          content: `Build 3 realistic options strategies for ${upperTicker} based on this thesis: "${thesis}".
Parameters: Timeframe ~${timeframe}, Max Risk Level: ${risk}.
Return strict JSON array ONLY (no Markdown wrappers, just the raw array ` + "`[{...}]`" + `):
[
  {
    "name": "Strategy Name (e.g. Bull Call Spread)",
    "legs": ["Buy 100c @ $3.50", "Sell 105c @ $1.20"],
    "netCost": 230,
    "maxGain": 270,
    "breakeven": 102.3,
    "probabilityOfProfit": 65,
    "turboAlignment": "strong" | "moderate" | "neutral" | "against",
    "rationale": "1 sentence why this fits the thesis",
    "riskReward": "1:1.2"
  }
]
Use current realistic estimates for strikes. Order by best fit first.`
        }],
        max_tokens: 800
      })
    });

    if (!res.ok) {
        throw new Error(`Perplexity API Error: ${res.statusText}`);
    }

    const data = await res.json();
    let strategies;
    try {
        const content = data.choices[0].message.content;
        const match = content.match(/\[[\s\S]*\]/); // match array
        strategies = JSON.parse(match ? match[0] : content);
    } catch (e) {
        console.error("Strategy Parse Error:", data.choices[0].message.content);
        throw new Error('Failed to parse strategy AI output');
    }

    await consumeMessages(user.privyDid, 2, 'strategy_builder', data.usage);
    
    return NextResponse.json({ strategies });

  } catch (error: any) {
    console.error('AI Strategy Error:', error);
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
