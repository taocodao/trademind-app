import type { Metadata } from 'next';
import '../newsletter.css';
import AutoUnsubscribe from '@/components/newsletter/AutoUnsubscribe';
import { NewsletterFooter } from '@/components/newsletter/NewsletterShell';

export const metadata: Metadata = {
    title: 'Unsubscribe - The AI Systematic Investor',
    robots: { index: false },
};

export default async function UnsubscribePage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const { token } = await searchParams;
    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <AutoUnsubscribe token={token ?? ''} />
                <NewsletterFooter />
            </div>
        </main>
    );
}
