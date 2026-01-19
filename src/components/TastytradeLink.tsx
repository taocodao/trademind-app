"use client";

import { useState } from "react";
import { Link2, ExternalLink, AlertCircle, Loader2 } from "lucide-react";

interface TastytradeLinkProps {
    onLinked?: () => void;
    onSkip?: () => void;
}

export function TastytradeLink({ onLinked, onSkip }: TastytradeLinkProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConnect = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get OAuth URL from backend
            const response = await fetch("/api/tastytrade/oauth/url");
            const data = await response.json();

            if (data.url) {
                // Redirect to Tastytrade OAuth
                window.location.href = data.url;
            } else {
                throw new Error("Failed to get authorization URL");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Connection failed");
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-6">
            <div className="glass-card max-w-md w-full p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-4">
                        <Link2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">
                        Connect Your Brokerage
                    </h1>
                    <p className="text-tm-muted">
                        Link your Tastytrade account to enable real-time trading
                        and position tracking
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Features */}
                <div className="space-y-3 mb-8">
                    <Feature text="View account balance & positions" />
                    <Feature text="Execute trades from signals" />
                    <Feature text="Real-time P&L tracking" />
                    <Feature text="Secure OAuth2 connection" />
                </div>

                {/* Connect Button */}
                <button
                    onClick={handleConnect}
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-3 text-lg"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Connecting...
                        </>
                    ) : (
                        <>
                            Connect Tastytrade
                            <ExternalLink className="w-5 h-5" />
                        </>
                    )}
                </button>

                {/* Skip Option */}
                {onSkip && (
                    <button
                        onClick={onSkip}
                        className="w-full mt-4 text-tm-muted hover:text-tm-text text-sm transition-colors"
                    >
                        Skip for now
                    </button>
                )}

                {/* Security Note */}
                <p className="text-xs text-tm-muted text-center mt-6">
                    🔒 Your credentials are never stored. We use secure OAuth2
                    tokens that you can revoke anytime from Tastytrade settings.
                </p>
            </div>
        </main>
    );
}

function Feature({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-tm-green/20 flex items-center justify-center">
                <svg
                    className="w-3 h-3 text-tm-green"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                    />
                </svg>
            </div>
            <span className="text-sm text-tm-text">{text}</span>
        </div>
    );
}
