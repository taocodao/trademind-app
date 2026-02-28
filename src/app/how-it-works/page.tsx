import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function HowItWorksPage() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-tm-bg px-6">
            <h1 className="text-4xl font-bold text-white mb-4">Mechanics & Strategy</h1>
            <p className="text-tm-muted text-lg mb-8 text-center max-w-md">Deep dive into the Volatility-Adaptive engine and mean reversion mechanics is coming soon.</p>
            <Link href="/" className="btn-primary flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
        </main>
    );
}
