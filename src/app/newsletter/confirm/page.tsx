import type { Metadata } from 'next';
import '../newsletter.css';
import ConfirmClient from '@/components/newsletter/ConfirmClient';
import { NewsletterFooter } from '@/components/newsletter/NewsletterShell';

export const metadata: Metadata = {
    title: 'Confirm your subscription - The AI Systematic Investor',
    robots: { index: false },
};

export default async function ConfirmPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const { token } = await searchParams;
    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <ConfirmClient token={token ?? ''} />
                <NewsletterFooter />
            </div>
        </main>
    );
}
