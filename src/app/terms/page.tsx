import { LegalPageLayout } from "@/components/layout/LegalPageLayout";
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Terms of Service | TradeMind@bot',
    description: 'Terms of Service for TradeMind@bot',
};

export default function TermsPage() {
    return (
        <LegalPageLayout>
            <h1 className="text-4xl font-black text-white mb-2">Terms of Service</h1>
            <p className="text-sm text-tm-muted font-mono mb-8">
                <strong>Effective Date:</strong> March 1, 2026<br />
                <strong>Last Updated:</strong> March 14, 2026
            </p>

            <p>
                These Terms of Service ("Terms") govern your access to and use of the TradeMind@bot platform, website, mobile application, and related services (collectively, the "Service") operated by TradeMind@bot LLC ("Company," "we," "us," or "our").
            </p>
            <p>
                By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
            </p>

            <hr />

            <h3>1. Eligibility</h3>
            <p>
                You must be at least 18 years of age and legally permitted to access financial information services in your jurisdiction to use the Service. By using the Service, you represent and warrant that you meet these requirements. The Service is intended for users in the United States. Access from other jurisdictions is at the user's own risk and may not comply with local laws.
            </p>

            <h3>2. Description of Service</h3>
            <p>TradeMind@bot is a software technology platform that provides:</p>
            <ul>
                <li>Algorithmically generated trading signals and market regime classifications</li>
                <li>Virtual portfolio simulation tools</li>
                <li>Optional broker API integration (currently Tastytrade) for order submission with user authorization</li>
                <li>Financial education content and strategy documentation</li>
            </ul>
            <p>
                <strong>TradeMind@bot is not a registered investment advisor, broker-dealer, commodity trading advisor (CTA), or financial planner under any applicable law, including the Investment Advisers Act of 1940 or the Commodity Exchange Act.</strong> All signals are generated algorithmically and delivered identically to all subscribers. Nothing in the Service constitutes personalized investment advice.
            </p>

            <h3>3. Subscriptions & Billing</h3>
            <p>
                <strong>3.1 Plans.</strong> The Service is offered on a subscription basis. Current plans, pricing, and features are described at <Link href="/#pricing">trademind.bot/#pricing</Link>.
            </p>
            <p>
                <strong>3.2 Free Trial.</strong> New subscribers receive a 14-day free trial. A valid payment method is required at signup. If you do not cancel before the trial ends, you will be automatically charged for the applicable subscription plan.
            </p>
            <p>
                <strong>3.3 Billing.</strong> Subscriptions are billed monthly or annually as selected. Annual plans are billed as a single upfront payment. All fees are in USD and are non-refundable except as required by law or at the Company's sole discretion.
            </p>
            <p>
                <strong>3.4 Upgrades & Downgrades.</strong> You may change your subscription plan at any time. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of the current billing period.
            </p>
            <p>
                <strong>3.5 Cancellation.</strong> You may cancel your subscription at any time through your account dashboard. Cancellation takes effect at the end of your current billing period. You will retain access to the Service until that date.
            </p>

            <h3>4. Broker API Integration</h3>
            <p>
                If you connect a third-party brokerage account (e.g., Tastytrade) to the Service, you authorize TradeMind@bot to access your brokerage account solely for the purpose of submitting orders and retrieving position data as directed by you. TradeMind@bot:
            </p>
            <ul>
                <li>Does <strong>not</strong> hold, custody, or control your funds</li>
                <li>Does <strong>not</strong> execute trades without your authorization (unless you have enabled auto-approval)</li>
                <li>Is <strong>not</strong> responsible for errors, delays, or failures caused by third-party broker APIs</li>
                <li>May lose access to your brokerage if the broker changes or revokes API access</li>
            </ul>
            <p>
                You are solely responsible for all trades executed in your brokerage account, whether submitted manually or via the Service.
            </p>

            <h3>5. No Investment Advice</h3>
            <p>
                All content provided through the Service — including signals, regime classifications, confidence scores, performance data, and educational materials — is for <strong>informational and educational purposes only</strong> and does not constitute:
            </p>
            <ul>
                <li>Personalized investment advice</li>
                <li>A recommendation to buy or sell any security</li>
                <li>A guarantee of any specific investment outcome</li>
            </ul>
            <p>
                <strong>Past performance, whether actual or derived from backtests, is not indicative of future results.</strong> You should consult a qualified financial professional before making investment decisions. See our full <Link href="/risk-disclosure">Risk Disclosure</Link> for details.
            </p>

            <h3>6. Referral Program</h3>
            <p>
                TradeMind@bot may offer a referral credit program. Credits are issued in the form of subscription account balance and have no cash value. Credits are subject to modification or termination at any time. Credits may not be transferred, sold, or exchanged. TradeMind@bot reserves the right to revoke credits issued fraudulently or in violation of program terms.
            </p>

            <h3>7. Prohibited Conduct</h3>
            <p>You agree not to:</p>
            <ul>
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to reverse-engineer, scrape, or republish any signals or algorithmic outputs</li>
                <li>Share your account credentials or resell access to the Service</li>
                <li>Use the Service to manipulate markets or engage in any form of securities fraud</li>
                <li>Submit false information during registration or for trial abuse purposes</li>
            </ul>

            <h3>8. Intellectual Property</h3>
            <p>
                All content, algorithms, software, branding, and materials comprising the Service are owned by TradeMind@bot LLC and protected under applicable copyright, trademark, and trade secret laws. You are granted a limited, non-exclusive, non-transferable license to access the Service for personal, non-commercial use.
            </p>

            <h3>9. Disclaimer of Warranties</h3>
            <p className="uppercase text-sm">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
            </p>

            <h3>10. Limitation of Liability</h3>
            <p className="uppercase text-sm">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRADEMIND@BOT LLC AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS OR INVESTMENT LOSSES, ARISING FROM YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>

            <h3>11. Governing Law & Disputes</h3>
            <p>
                These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles. Any dispute arising from these Terms shall be resolved by binding arbitration under the rules of the American Arbitration Association in New York, New York, on an individual basis. <strong>You waive any right to participate in a class action lawsuit or class-wide arbitration.</strong>
            </p>

            <h3>12. Modifications</h3>
            <p>
                We reserve the right to modify these Terms at any time. We will provide notice of material changes via email or in-app notification at least 14 days before the changes take effect. Continued use of the Service after changes take effect constitutes your acceptance.
            </p>

            <h3>13. Contact</h3>
            <p>
                TradeMind@bot LLC<br />
                Email: <a href="mailto:legal@trademind.bot">legal@trademind.bot</a><br />
                Website: <Link href="/">trademind.bot</Link>
            </p>
        </LegalPageLayout>
    );
}
