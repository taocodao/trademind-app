import { NextRequest, NextResponse } from 'next/server';
import { checkAIBudget, consumeMessages, getUserFromRequest } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const budget = await checkAIBudget(user.privyDid, 1);
    
    if (!budget.allowed) {
      return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 402 });
    }

    const { message, sessionId, history } = await req.json();

    // In a real app, query the database for today's active TurboCore signal
    const turboRegime = 'BULL';
    const turboConf = 87;
    const mlScore = 92;

    const recentHistory = (history || []).slice(-8); // Keep last 8 messages (4 exchanges)

    const systemPrompt = {
      role: 'system',
      content: `You are TradeMind AI — an educational investment copilot (not a financial advisor).
TurboCore signal today: ${turboRegime} (${turboConf}% confidence), ML Score: ${mlScore}/100.
User plan: ${budget.tier}.
Rules: Be educational, not directive. Never say "you should buy/sell X". 
Use "If your thesis is X, then..." framing. Be concise (under 200 words unless asked for more).
Always mention the TurboCore signal context when directly relevant.`
    };

    const completionMessages = [
      systemPrompt,
      ...recentHistory,
      { role: 'user', content: message }
    ];

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: completionMessages,
        max_tokens: 350,
        stream: true
      })
    });

    if (!res.ok) {
        throw new Error(`Perplexity API Error: ${res.statusText}`);
    }

    // Deduct budget immediately
    await consumeMessages(user.privyDid, 1, 'chat', undefined, sessionId);

    // Return the stream directly to the client
    return new NextResponse(res.body, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });

  } catch (error: any) {
    console.error('AI Chat Error:', error);
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
