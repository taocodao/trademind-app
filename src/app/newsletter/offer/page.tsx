import type { Metadata } from 'next';
import Link from 'next/link';
import '../newsletter.css';
import { NewsletterFooter, Breadcrumb } from '@/components/newsletter/NewsletterShell';
import EligibilityChecker from '@/components/newsletter/EligibilityChecker';
import SignupForm from '@/components/newsletter/SignupForm';

export const metadata: Metadata = {
    title: '30% Annual Offer - The AI Systematic Investor',
    description:
        'Offer terms: confirmed subscribers get 30% off their first year of an annual TradeMind subscription, redeemable within 90 days of confirming.',
};

const TERMS = [
    'Available to confirmed newsletter subscribers only.',
    '30% off the first year of a one-year TradeMind subscription (QQQ Basic or QQQ LEAPS).',
    'Redeem within 90 days of your first confirmation. Changing your newsletter email never restarts this window.',
    'The discount applies to the same confirmed email address, or its replacement through the official change-email flow.',
    'One redemption per subscriber identity. Plus-address and Gmail-dot variants of an address count as the same identity.',
    'Already a TradeMind customer? You can still use this offer when buying an additional plan.',
    'Not combinable with other discounts or referral credits.',
    'Renews at the standard annual price after the first year.',
    'Unsubscribing from the newsletter keeps your discount valid until the window ends.',
    'Refunded purchases do not restore the offer. Chargebacks revoke it.',
];

export default function OfferPage() {
    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <Breadcrumb items={[{ label: 'Newsletter', href: '/newsletter' }, { label: 'Offer terms' }]} />
                <p className="tm-nl-eyebrow">Subscriber Offer</p>
                <h1 className="tm-nl-h1">30% off your first year, on the record.</h1>
                <p className="tm-nl-sub">
                    The terms are short and written down. If you qualify, the site will say so; if you do
                    not, it will say that too.
                </p>

                <section className="tm-nl-section" style={{ marginTop: 36 }}>
                    <h2 className="tm-nl-h2">Terms</h2>
                    <ul style={{ color: '#BCC6D8', lineHeight: 1.8, fontSize: 15, paddingLeft: 20, margin: 0 }}>
                        {TERMS.map((t) => (
                            <li key={t}>{t}</li>
                        ))}
                    </ul>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">Check my eligibility</h2>
                    <p className="tm-nl-muted" style={{ marginBottom: 16, fontSize: 14.5 }}>
                        Enter the email you subscribed with.
                    </p>
                    <EligibilityChecker />
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">Not subscribed yet?</h2>
                    <p className="tm-nl-muted" style={{ marginBottom: 16, fontSize: 14.5 }}>
                        Subscribe and confirm your email to start your 3-month window.
                    </p>
                    <SignupForm source="offer-page" />
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">How redemption works</h2>
                    <p className="tm-nl-sub" style={{ marginBottom: 0 }}>
                        After confirming, use the same email address when you create your TradeMind account or
                        start checkout. The 30% discount is applied to the first annual term automatically for
                        eligible addresses. Questions: <a href="mailto:support@trademind.bot" className="tm-nl-link">support@trademind.bot</a>.
                    </p>
                </section>

                <NewsletterFooter />
            </div>
        </main>
    );
}
