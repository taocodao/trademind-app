import type { Metadata } from 'next';
import Link from 'next/link';
import '../newsletter.css';
import SignupForm from '@/components/newsletter/SignupForm';
import { NewsletterFooter } from '@/components/newsletter/NewsletterShell';
import { getContact } from '@/lib/outreach/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Subscribe free - AI Investor Copilot by TradeMind',
    robots: { index: false },
};

export default async function JoinPage({
    searchParams,
}: {
    searchParams: Promise<{ t?: string }>;
}) {
    const { t } = await searchParams;
    const contact = t ? await getContact(t) : null;
    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <p className="tm-nl-eyebrow">AI Investor Copilot</p>
                <h1 className="tm-nl-h1">Subscribe free</h1>
                <p className="tm-nl-sub">
                    A free weekly brief on systematic investing: the market regime, what our ML research detects, one strategy concept, and what could go wrong.
                    You will get a confirmation email first. Nothing is sent until you confirm.
                </p>
                <SignupForm source="coldlist" initialEmail={contact?.email ?? ''} implicitConsent />
                <p className="tm-nl-offerline">
                    Confirmed subscribers are entitled to 30% off the first year of a yearly TradeMind Strategy subscription, using the same email within 90 days of confirming.
                    {' '}<Link href="/newsletter/offer" className="tm-nl-link">Offer terms</Link>
                </p>
                <NewsletterFooter />
            </div>
        </main>
    );
}
