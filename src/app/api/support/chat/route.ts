import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { TRADEMIND_KNOWLEDGE_BASE } from '@/lib/ai/knowledge-base';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        // Require authentication but no tier gating — support is for everyone
        const user = await getUserFromRequest(req);

        const { message, history } = await req.json();
        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const recentHistory = (history || []).slice(-6); // Keep 3 exchanges

        const systemPrompt = {
            role: 'system',
            content: TRADEMIND_KNOWLEDGE_BASE,
        };

        const completionMessages = [
            systemPrompt,
            ...recentHistory,
            { role: 'user', content: message },
        ];

        const res = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: completionMessages,
                max_tokens: 400,
                stream: true,
            }),
        });

        if (!res.ok) {
            throw new Error(`Perplexity API Error: ${res.statusText}`);
        }

        return new NextResponse(res.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    } catch (error: any) {
        console.error('Support Chat Error:', error);
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
