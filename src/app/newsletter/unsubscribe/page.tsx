import type { Metadata } from 'next';
import '../newsletter.css';
import SimpleTokenAction from '@/components/newsletter/SimpleTokenAction';
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
                <SimpleTokenAction
                    token={token ?? ''}
                    endpoint="/api/newsletter/unsubscribe"
                    heading="Unsubscribe from The AI Systematic Investor."
                    body="You will stop receiving the newsletter and marketing emails. If your 30% annual offer is still inside its 90-day window, it stays valid until it expires."
                    buttonLabel="Unsubscribe"
                    successHeading="You are unsubscribed."
                    successBody="No more newsletter emails. Your discount eligibility, if any, remains until its expiry date."
                />
                <NewsletterFooter />
            </div>
        </main>
    );
}
