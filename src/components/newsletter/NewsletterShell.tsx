import Link from 'next/link';

/** Shared disclosure + footer block for every newsletter page. */
export function NewsletterFooter() {
    return (
        <>
            <div className="tm-nl-disclosure">
                TradeMind is software for self-directed investors, not investment advice and not a
                broker-dealer. All newsletter content is educational. Options involve risk and are
                not suitable for every investor. Any performance figures referenced are hypothetical
                or simulated, have inherent limitations, and do not guarantee future results. You
                make every decision and place every order at your own broker. See the{' '}
                <Link href="/newsletter/disclosures" className="tm-nl-link">full disclosures</Link>.
            </div>
            <footer className="tm-nl-footer">
                <Link href="/newsletter/disclosures">Disclosures</Link>
                <Link href="/privacy">Privacy policy</Link>
                <a href="mailto:support@trademind.bot">Contact</a>
                <Link href="/newsletter/rss.xml">RSS</Link>
                <Link href="/">TradeMind home</Link>
            </footer>
        </>
    );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
    return (
        <nav className="tm-nl-breadcrumb" aria-label="Breadcrumb">
            {items.map((item, i) => (
                <span key={i}>
                    {i > 0 && ' > '}
                    {item.href ? <Link href={item.href}>{item.label}</Link> : item.label}
                </span>
            ))}
        </nav>
    );
}

/** Offer CTA block used mid-article and at the end of issues. The 30% discount is
 *  attached to the newsletter recipient's email address; no separate verification
 *  step - logging in with that address at checkout applies it automatically. */
export function OfferBlock({ onClickPath }: { onClickPath?: string }) {
    return (
        <div className="tm-nl-offerblock">
            <h2 className="tm-nl-h2">Get 30% off a one-year TradeMind subscription</h2>
            <p className="tm-nl-sub" style={{ marginBottom: 10, fontSize: 15 }}>
                Every address that received this newsletter already carries 30% off. Log in
                with that address and the discount applies to your first annual term
                automatically.{' '}
                <Link href="/newsletter/offer" className="tm-nl-link">Offer terms</Link>
            </p>
            <Link href={onClickPath ?? '/upgrade'} className="tm-nl-btn tm-nl-btn-primary">
                Claim 30% off annual plan
            </Link>
        </div>
    );
}
