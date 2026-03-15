import { LegalPageLayout } from "@/components/layout/LegalPageLayout";
import { RiskContent } from "@/components/legal/RiskContent";
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Risk Disclosure | TradeMind@bot',
    description: 'Risk Disclosure for TradeMind@bot',
};

export default function RiskDisclosurePage() {
    return (
        <LegalPageLayout>
            <RiskContent />
        </LegalPageLayout>
    );
}
