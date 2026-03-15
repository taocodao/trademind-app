import { LegalPageLayout } from "@/components/layout/LegalPageLayout";
import { AboutContent } from "@/components/legal/AboutContent";
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About Us | TradeMind@bot',
    description: 'The AI Behind Your Best Trades.',
};

export default function AboutPage() {
    return (
        <LegalPageLayout>
            <AboutContent />
        </LegalPageLayout>
    );
}
