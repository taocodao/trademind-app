import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '../../newsletter.css';
import { GUIDE_CONTENT, getGuide } from '@/lib/newsletter/guides';
import { NewsletterFooter, Breadcrumb, OfferBlock } from '@/components/newsletter/NewsletterShell';

export function generateStaticParams() {
    return GUIDE_CONTENT.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const guide = getGuide(slug);
    if (!guide) return {};
    return {
        title: `${guide.title} - The AI Systematic Investor`,
        description: guide.description,
        openGraph: {
            title: guide.title,
            description: guide.description,
            type: 'article',
            url: `https://trademind.bot/newsletter/guides/${guide.slug}`,
        },
    };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const guide = getGuide(slug);
    if (!guide) notFound();

    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <Breadcrumb items={[{ label: 'Newsletter', href: '/newsletter' }, { label: guide.title }]} />
                <p className="tm-nl-eyebrow">Strategy Guide</p>
                <h1 className="tm-nl-h1">{guide.title}</h1>
                <p className="tm-nl-updated">Last updated: {guide.updated}</p>
                <p className="tm-nl-sub">{guide.description}</p>

                {guide.sections.map((s) => (
                    <section key={s.heading} className="tm-nl-section" style={{ marginTop: 40 }}>
                        <h2 className="tm-nl-h2">{s.heading}</h2>
                        {s.paragraphs.map((p, i) => (
                            <p key={i} className="tm-nl-sub" style={{ marginBottom: 12, fontSize: 15.5 }}>
                                {p}
                            </p>
                        ))}
                    </section>
                ))}

                <section className="tm-nl-section">
                    <OfferBlock />
                </section>

                <NewsletterFooter />
            </div>
        </main>
    );
}
