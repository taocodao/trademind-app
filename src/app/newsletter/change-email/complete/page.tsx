import type { Metadata } from 'next';
import '../../newsletter.css';
import SimpleTokenAction from '@/components/newsletter/SimpleTokenAction';
import { NewsletterFooter } from '@/components/newsletter/NewsletterShell';

export const metadata: Metadata = {
    title: 'Confirm new email - The AI Systematic Investor',
    robots: { index: false },
};

export default async function ChangeEmailCompletePage({
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
                    endpoint="/api/newsletter/change-email/complete"
                    heading="Confirm this new address."
                    body="This moves your newsletter subscription to the new address. Your original signup date and 90-day offer window stay exactly as they were."
                    buttonLabel="Confirm new email"
                    successHeading="Email address updated."
                    successBody="Future issues go to your new address. Your offer window is unchanged."
                />
                <NewsletterFooter />
            </div>
        </main>
    );
}
