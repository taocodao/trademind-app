import type { Metadata } from 'next';
import '../../newsletter.css';
import SimpleTokenAction from '@/components/newsletter/SimpleTokenAction';
import { NewsletterFooter } from '@/components/newsletter/NewsletterShell';

export const metadata: Metadata = {
    title: 'Cancel email change - The AI Systematic Investor',
    robots: { index: false },
};

export default async function ChangeEmailCancelPage({
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
                    endpoint="/api/newsletter/change-email/cancel"
                    heading="Cancel the email change request."
                    body="Someone requested moving your newsletter subscription to a different address. Press the button below to cancel that request and keep everything at this address."
                    buttonLabel="This was not me - cancel the change"
                    successHeading="Change request cancelled."
                    successBody="Your subscription stays exactly as it was. If you did not make the original request, consider resetting your email account credentials."
                />
                <NewsletterFooter />
            </div>
        </main>
    );
}
