import type { Metadata } from 'next';
import Link from 'next/link';
import '../newsletter.css';
import { NewsletterFooter } from '@/components/newsletter/NewsletterShell';
import ThanksCadence from '@/components/newsletter/ThanksCadence';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Thank you - AI Investor Copilot by TradeMind', robots: { index: false } };

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ t?: string; c?: string; already?: string }> }) {
    const { t, c, already } = await searchParams;
    const token = t && /^[A-Za-z0-9_-]{10,11}$/.test(t) ? t : '';
    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <p className="tm-nl-eyebrow">AI Investor Copilot</p>
                <h1 className="tm-nl-h1">Thank you, you are subscribed</h1>
                <p className="tm-nl-sub">
                    {already
                        ? 'You were already on the list, so there is nothing more to do. The next issue lands in your inbox.'
                        : 'Your first issue is on its way. Check your inbox, and the Promotions or Spam folder the first time. If it lands there, move it to your inbox so the next one arrives where you expect it.'}
                </p>
                {token && <ThanksCadence token={token} initial={c === 'daily' ? 'daily' : 'weekly'} />}
                <p className="tm-nl-offerline">
                    Confirmed subscribers are entitled to 30% off the first year of a yearly TradeMind Strategy subscription, using the same email within 90 days of subscribing.
                    {' '}<Link href="/newsletter/offer" className="tm-nl-link">Offer terms</Link>
                </p>
                <p className="tm-nl-muted" style={{ fontSize: 13.5 }}>You can unsubscribe at any time from the link at the bottom of every email.</p>
                <p><Link href="/newsletter" className="tm-nl-link">Read recent issues</Link></p>
                <NewsletterFooter />
            </div>
        </main>
    );
}
