import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { TRADEMIND_KNOWLEDGE_BASE } from '@/lib/ai/knowledge-base';

export const dynamic = 'force-dynamic';

/** Newsletter and other public pages get guest access to support chat.
 *  Guests get tighter limits: fewer remembered turns, shorter answers, a
 *  scope-limited prompt, and a per-IP hourly cap (in-memory, per instance). */
const GUEST_LIMIT = 20;          // messages per hour per IP
const GUEST_WINDOW_MS = 3600e3;
const guestBuckets = new Map<string, { count: number; reset: number }>();

function guestAllowed(ip: string): boolean {
    const now = Date.now();
    const b = guestBuckets.get(ip);
    if (!b || now > b.reset) {
        guestBuckets.set(ip, { count: 1, reset: now + GUEST_WINDOW_MS });
        return true;
    }
    if (b.count >= GUEST_LIMIT) return false;
    b.count += 1;
    return true;
}

const GUEST_PREAMBLE = `
The person asking is a guest on the public website (likely the newsletter pages) and is not logged in.
Answer questions about TradeMind, the newsletter (The AI Systematic Investor), the 30% subscriber offer,
pricing, strategies, and how to get started. The offer: every address that receives the newsletter carries
30% off a first-year plan; logging in with that address applies it automatically at checkout.
Do not discuss account-specific data (guests have none), and do not promise features that are not in the
knowledge base. Keep answers short. If asked anything unrelated to TradeMind or investing basics, politely
redirect to TradeMind topics.
`;

export async function POST(req: NextRequest) {
    try {
        let guest = false;
        try {
            await getUserFromRequest(req);
        } catch {
            guest = true;
        }

        if (guest) {
            const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
            if (!guestAllowed(ip)) {
                return NextResponse.json(
                    { error: 'Guest chat limit reached. Email support@trademind.bot and we will help you there.' },
                    { status: 429 }
                );
            }
        }

        const { message, history } = await req.json();
        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const recentHistory = (history || []).slice(guest ? -4 : -6);

        const systemPrompt = {
            role: 'system',
            content: guest ? GUEST_PREAMBLE + TRADEMIND_KNOWLEDGE_BASE : TRADEMIND_KNOWLEDGE_BASE,
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
                max_tokens: guest ? 300 : 400,
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
