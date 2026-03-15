import { LegalPageLayout } from "@/components/layout/LegalPageLayout";
import { TermsContent } from "@/components/legal/TermsContent";
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service | TradeMind@bot',
    description: 'Terms of Service for TradeMind@bot',
};

export default function TermsPage() {
    return (
        <LegalPageLayout>
            <TermsContent />
        </LegalPageLayout>
    );
}
