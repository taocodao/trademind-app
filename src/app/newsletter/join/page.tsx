import type { Metadata } from 'next';
import Link from 'next/link';
import '../newsletter.css';
import SignupForm from '@/components/newsletter/SignupForm';
import { NewsletterFooter } from '@/components/newsletter/NewsletterShell';
import { cookies } from 'next/headers';
import { getContact } from '@/lib/outreach/db';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Subscribe free - AI Investor Copilot by TradeMind',
    robots: { index: false },
};

export default async function JoinPage({
    searchParams,
}: {
    searchParams: Promise<{ t?: string; email?: string; next?: string; cadence?: string }>;
}) {
    const { t, email: emailParam, next: nextParam, cadence: cadenceParam } = await searchParams;
    // The personal link carries ?t=. If a visitor reaches this page some other way (a menu link, a second visit),
    // fall back to the token remembered from their last click on one of our email links.
    const remembered = (await cookies()).get('tm_t')?.value;
    const token = t || remembered || '';
    const contact = token ? await getContact(token) : null;
    const typedEmail = emailParam && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailParam) ? emailParam.trim() : '';
    const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '';
    // Already subscribed: pre-check what they receive today.
    let cadence: 'weekly' | 'daily' | 'both' = cadenceParam === 'daily' ? 'daily' : cadenceParam === 'both' ? 'both' : 'weekly';
    const lookup = (contact?.email ?? typedEmail ?? '').toLowerCase();
    if (lookup) {
        try {
            const r = await query(`SELECT cadence FROM newsletter_subscribers WHERE lower(email) = $1 AND status IN ('confirmed','pending') ORDER BY id DESC LIMIT 1`, [lookup]);
            const c = (r.rows?.[0] as { cadence?: string } | undefined)?.cadence;
            if (c === 'daily' || c === 'weekly' || c === 'both') cadence = c;
        } catch { /* keep the default */ }
    }
    const known = !!contact || (!!typedEmail && !!next);
    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <p className="tm-nl-eyebrow">AI Investor Copilot</p>
                <h1 className="tm-nl-h1">Subscribe free</h1>
                <p className="tm-nl-sub">
                    A free weekly brief on systematic investing: the market regime, what our ML research detects, one strategy concept, and what could go wrong.
                    {known
                        ? `Press Subscribe and your first issue arrives right away.${next ? ' Subscribing unlocks the 30% subscriber price, and you go straight back to the plans.' : ''} You can unsubscribe at any time.`
                        : 'You will get a confirmation email first. Nothing is sent until you confirm.'}
                </p>
                <SignupForm source={contact ? 'coldlist' : 'plans-gate'} initialEmail={contact?.email ?? typedEmail} outreachToken={contact ? token : ''} nextPath={next} cadence={cadence} implicitConsent />
                <p className="tm-nl-offerline">
                    Confirmed subscribers are entitled to 30% off the first year of a yearly TradeMind Strategy subscription, using the same email within 90 days of confirming.
                    {' '}<Link href="/newsletter/offer" className="tm-nl-link">Offer terms</Link>
                </p>
                <NewsletterFooter />
            </div>
        </main>
    );
}
