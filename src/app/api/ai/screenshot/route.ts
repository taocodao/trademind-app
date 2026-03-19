import { NextRequest, NextResponse } from 'next/server';
import { checkAIBudget, consumeMessages, getUserFromRequest } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const budget = await checkAIBudget(user.privyDid, 3);
    if (!budget.allowed) {
      return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 402 });
    }

    const { messages, imageBase64 } = await req.json();

    // In a real implementation with Sonar, we'd pass the image to a multimodal model.
    // Since Perplexity Sonar is text-only right now, we simulate extraction or rely
    // on a user's text description included in the messages array.
    // We will append our system prompt to the messages.
    
    // Hardcoded TurboCore context (in production this would come from the database/scanner)
    const turboRegime = 'BULL';
    const turboConf = 87;

    const systemPrompt = {
      role: 'system',
      content: `You are an educational TradeMind position analyzer.
TurboCore signal today: ${turboRegime} (${turboConf}% confidence).
If a user shares a trade idea or position, evaluate it strictly from an educational perspective.
Is it aligned with the ${turboRegime} regime? Suggest structural improvements. Never give financial advice. Keep output under 200 words.`
    };

    const completionMessages = [systemPrompt, ...messages];

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
    await consumeMessages(user.privyDid, 3, 'screenshot');

    // Return the stream directly to the client
    return new NextResponse(res.body, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });

  } catch (error: any) {
    console.error('AI Screenshot Error:', error);
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
