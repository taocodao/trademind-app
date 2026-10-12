import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getContact } from '@/lib/outreach/db';
import PlansClient from './PlansClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
    title: 'Choose your plan - TradeMind',
    robots: { index: false },
};

const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/**
 * Dedicated plans page for people who arrive from our emails. The address in the link (?email=, or the
 * personal invitation link remembered in a cookie) is carried through sign in and payment.
 */
export default async function PlansPage({ searchParams }: { searchParams: Promise<{ email?: string; t?: string; sub?: string }> }) {
    const { email, t, sub } = await searchParams;
    let linkEmail = email && looksLikeEmail(email) ? email.trim() : '';
    if (!linkEmail) {
        const token = t || (await cookies()).get('tm_t')?.value || '';
        const contact = token ? await getContact(token) : null;
        linkEmail = contact?.email ?? '';
    }
    return <PlansClient linkEmail={linkEmail} justSubscribed={sub === '1'} />;
}
