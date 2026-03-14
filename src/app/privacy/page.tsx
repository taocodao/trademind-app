import { LegalPageLayout } from "@/components/layout/LegalPageLayout";
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy | TradeMind@bot',
    description: 'Privacy Policy for TradeMind@bot',
};

export default function PrivacyPage() {
    return (
        <LegalPageLayout>
            <h1 className="text-4xl font-black text-white mb-2">Privacy Policy</h1>
            <p className="text-sm text-tm-muted font-mono mb-8">
                <strong>Effective Date:</strong> March 1, 2026<br />
                <strong>Last Updated:</strong> March 14, 2026
            </p>

            <p>
                This Privacy Policy describes how TradeMind@bot LLC ("Company," "we," "us") collects, uses, and protects information when you use the TradeMind@bot platform and related services.
            </p>

            <hr />

            <h3>1. Information We Collect</h3>
            <p><strong>1.1 Information You Provide</strong></p>
            <ul>
                <li>Account registration data: name, email address, authentication credentials (via Privy)</li>
                <li>Payment information (processed by Stripe — we do not store card numbers)</li>
                <li>Brokerage account connection credentials (encrypted, used only for API order submission)</li>
                <li>Communication data: support tickets, feedback, referral submissions</li>
            </ul>

            <p><strong>1.2 Information Collected Automatically</strong></p>
            <ul>
                <li>Usage data: pages visited, features used, signals viewed, session duration</li>
                <li>Device data: browser type, operating system, IP address, device identifiers</li>
                <li>Trading activity within the virtual portfolio (not your actual brokerage account)</li>
                <li>Payment method fingerprint (for free trial fraud prevention only)</li>
            </ul>

            <p><strong>1.3 Information from Third Parties</strong></p>
            <ul>
                <li>Authentication data from Privy (your Decentralized Identifier / DID)</li>
                <li>Brokerage position and account data from connected broker APIs (Tastytrade), read-only unless you have enabled order submission</li>
            </ul>

            <hr />

            <h3>2. How We Use Your Information</h3>
            <p>We use your information to:</p>
            <ul>
                <li>Provide, operate, and improve the Service</li>
                <li>Deliver trading signals and personalize your virtual portfolio experience</li>
                <li>Process payments and manage subscriptions via Stripe</li>
                <li>Detect and prevent free trial abuse (via payment method fingerprinting)</li>
                <li>Send transactional emails (signal alerts, billing notices, trial reminders)</li>
                <li>Comply with legal obligations</li>
                <li>Respond to support requests</li>
            </ul>
            <p className="font-semibold text-white">
                We do <strong>not</strong> sell your personal information to third parties. We do <strong>not</strong> use your information to provide personalized investment advice.
            </p>

            <hr />

            <h3>3. Automated Decision-Making</h3>
            <p>
                TradeMind@bot uses automated algorithms to generate trading signals and regime classifications. These systems do not make decisions <em>about you</em> as an individual — they analyze market data and generate identical outputs for all subscribers. Per 2026 CCPA amendments, you have the right to opt out of any future use of Automated Decision-Making Technology (ADMT) that makes significant decisions about you as a person. Currently, no such decisions are made.
            </p>

            <hr />

            <h3>4. Data Sharing</h3>
            <p>We share data only with:</p>
            <ul>
                <li><strong>Stripe</strong> — payment processing (PCI-DSS compliant)</li>
                <li><strong>Privy</strong> — authentication and wallet services</li>
                <li><strong>Tastytrade</strong> — only if you connect your account; limited to order submission and position retrieval</li>
                <li><strong>Vercel / AWS</strong> — cloud infrastructure and database hosting</li>
                <li><strong>Legal authorities</strong> — when required by law, court order, or to protect rights and safety</li>
            </ul>

            <hr />

            <h3>5. Data Retention</h3>
            <p>
                We retain your account data for as long as your account is active. Upon account deletion, personal data is removed within 30 days, except where retention is required by law (e.g., financial records for 7 years per IRS requirements).
            </p>

            <hr />

            <h3>6. Your Rights (CCPA / California Residents)</h3>
            <p>If you are a California resident, you have the right to:</p>
            <ul>
                <li><strong>Know</strong> what personal information we collect, use, and share</li>
                <li><strong>Delete</strong> your personal information (subject to legal exceptions)</li>
                <li><strong>Correct</strong> inaccurate personal information</li>
                <li><strong>Opt out</strong> of the sale or sharing of personal information (we do not sell data)</li>
                <li><strong>Non-discrimination</strong> for exercising your privacy rights</li>
                <li><strong>Confirm</strong> that opt-out requests have been honored</li>
            </ul>
            <p>To exercise these rights, email: <strong>privacy@trademind.bot</strong></p>

            <hr />

            <h3>7. Security</h3>
            <p>
                We implement industry-standard security measures including TLS encryption in transit, AES-256 encryption at rest for sensitive data, and access controls limiting data access to authorized personnel only. Payment card data is never stored on our servers — all payment processing is handled by Stripe.
            </p>

            <hr />

            <h3>8. Children's Privacy</h3>
            <p>
                The Service is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If we learn that a minor has provided information, we will delete it promptly.
            </p>

            <hr />

            <h3>9. Changes to This Policy</h3>
            <p>
                We will notify you of material changes to this Privacy Policy via email or in-app notice at least 14 days before changes take effect.
            </p>

            <hr />

            <h3>10. Contact</h3>
            <p>
                TradeMind@bot LLC<br />
                Privacy inquiries: <a href="mailto:privacy@trademind.bot">privacy@trademind.bot</a>
            </p>
        </LegalPageLayout>
    );
}
