import type { Metadata } from 'next';
import '../newsletter.css';
import ChangeEmailClient from '@/components/newsletter/ChangeEmailClient';
import { NewsletterFooter } from '@/components/newsletter/NewsletterShell';

export const metadata: Metadata = {
    title: 'Change email address - The AI Systematic Investor',
    robots: { index: false },
};

export default async function ChangeEmailPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const { token } = await searchParams;
    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <ChangeEmailClient token={token ?? ''} />
                <NewsletterFooter />
            </div>
        </main>
    );
}
