import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Subscribed - TradeMind', robots: { index: false } };

/**
 * There is no confirm step any more: signing up subscribes at once. This page only exists so a
 * confirmation link in an older email still works. It confirms any waiting signup and goes to the thank-you page.
 */
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token } = await searchParams;
    if (token) {
        const base = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';
        try {
            const res = await fetch(`${base}/api/newsletter/confirm`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), cache: 'no-store',
            });
            if (res.status === 410 || res.status === 404) redirect('/newsletter/join');
        } catch { /* fall through to the thank-you page */ }
    }
    redirect('/newsletter/thanks');
}
