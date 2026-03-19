import { NextRequest, NextResponse } from 'next/server';
import { checkFeatureAccess, getUserFromRequest } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const access = await checkFeatureAccess(user.privyDid, 'screenshot');
    if (!access.allowed) {
      return NextResponse.json({ error: 'FEATURE_LOCKED' }, { status: 403 });
    }

    const { description, imageBase64, imageMediaType } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Build the user message content — include image if provided
    const userContent: any[] = [];

    if (imageBase64) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${imageMediaType || 'image/jpeg'};base64,${imageBase64}`,
          detail: 'high'
        }
      });
    }

    if (description?.trim()) {
      userContent.push({ type: 'text', text: description });
    }

    if (userContent.length === 0) {
      return NextResponse.json({ error: 'No image or description provided' }, { status: 400 });
    }

    // Use streaming with GPT-4o
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        stream: true,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: `You are an expert trading position analyzer for TradeMind users.
You analyze charts or trade ideas in the context of the TurboCore signal system.
Keep your response concise and educational (under 250 words).
Structure your response with:
1. What you see (chart pattern / trade setup)
2. Signal alignment (is it aligned with BULL/BEAR/NEUTRAL regime?)
3. Key levels to watch
4. One actionable insight
Always remind the user this is educational, not financial advice.`
          },
          {
            role: 'user',
            content: userContent
          }
        ]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('OpenAI API Error:', errText);
      throw new Error(`OpenAI API Error: ${res.statusText}`);
    }

    // Return the SSE stream directly to client
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
