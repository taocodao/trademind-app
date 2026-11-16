import type { Metadata } from 'next';
import Link from 'next/link';
import '../newsletter.css';
import { getUserId } from '@/lib/auth';
import { verifiedEmailFor } from '@/lib/verified-email';
import { query } from '@/lib/db';
import { ensureNewsletterTables } from '@/lib/newsletter/db';
import { makeDailyLinkToken } from '@/lib/newsletter/daily-link';
import { Breadcrumb } from '@/components/newsletter/NewsletterShell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My newsletter', robots: { index: false, follow: false } };

const fmt = (d: string | Date) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });

/** The reader's own page. The same login is used when they buy a plan, so one email covers both. */
export default async function MyNewsletter() {
    const did = await getUserId();
    const email = did ? await verifiedEmailFor(did) : null;
    let sub: { id: number; status: string; window_end: string | null; state: string | null } | null = null;
    if (email) {
        await ensureNewsletterTables();
        const r = await query(
            `SELECT s.id, s.status, d.window_end, d.state FROM newsletter_subscribers s
               LEFT JOIN newsletter_discounts d ON d.subscriber_id = s.id
              WHERE lower(s.email) = $1 ORDER BY s.id DESC LIMIT 1`, [email.toLowerCase()]);
        sub = r.rows[0] ?? null;
    }
    const k = sub ? encodeURIComponent(makeDailyLinkToken(sub.id)) : '';
    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <Breadcrumb items={[{ label: 'Newsletter', href: '/newsletter' }, { label: 'My newsletter' }]} />
                <p className="tm-nl-eyebrow">My newsletter</p>
                {!email ? (
                    <>
                        <h1 className="tm-nl-h1">Log in to see your issues.</h1>
                        <p className="tm-nl-sub">Use the email address your newsletter arrives at. The same login is used if you buy a plan later.</p>
                        <p style={{ marginTop: 24 }}><Link className="tm-nl-btn" href="/signin?next=/newsletter/mine">Log in</Link></p>
                    </>
                ) : !sub || sub.status !== 'confirmed' ? (
                    <>
                        <h1 className="tm-nl-h1">You are logged in as {email}.</h1>
                        <p className="tm-nl-sub">This email is not on the weekly list yet. You can join from any issue page.</p>
                        <p style={{ marginTop: 24 }}><Link className="tm-nl-btn" href="/newsletter/issues">Read the issues</Link></p>
                    </>
                ) : (
                    <>
                        <h1 className="tm-nl-h1">Your weekly issues.</h1>
                        <p className="tm-nl-sub">Logged in as {email}.</p>
                        <ul style={{ color: '#BCC6D8', lineHeight: 1.9, fontSize: 15, paddingLeft: 20, marginTop: 20 }}>
                            <li><Link href={`/newsletter/current?k=${k}`}>This week&apos;s issue</Link></li>
                            <li><Link href={`/newsletter/issues?k=${k}`}>All past issues</Link></li>
                            <li><Link href="/plans">Plans</Link></li>
                        </ul>
                        {sub.state === 'eligible' && sub.window_end && new Date(sub.window_end) > new Date() ? (
                            <p className="tm-nl-sub" style={{ marginTop: 20 }}>
                                Your 30% off the first year of a strategy subscription is open until {fmt(sub.window_end)}. Log in with this same email when you buy and it applies. <Link href="/newsletter/offer">Offer terms</Link>
                            </p>
                        ) : null}
                    </>
                )}
            </div>
        </main>
    );
}
