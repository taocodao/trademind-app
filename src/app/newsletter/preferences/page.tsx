import type { Metadata } from 'next';
import '../newsletter.css';
import PreferencesForm from '@/components/newsletter/PreferencesForm';
import { NewsletterFooter } from '@/components/newsletter/NewsletterShell';

export const metadata: Metadata = { title: 'Email preferences - TradeMind', robots: { index: false } };

export default async function PreferencesPage({ searchParams }: { searchParams: Promise<{ k?: string }> }) {
    const { k } = await searchParams;
    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <PreferencesForm k={k ?? ''} />
                <NewsletterFooter />
            </div>
        </main>
    );
}
