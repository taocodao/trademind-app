import { LegalPageLayout } from "@/components/layout/LegalPageLayout";
import { PrivacyContent } from "@/components/legal/PrivacyContent";
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy | TradeMind@bot',
    description: 'Privacy Policy for TradeMind@bot',
};

export default function PrivacyPage() {
    return (
        <LegalPageLayout>
            <PrivacyContent />
        </LegalPageLayout>
    );
}
