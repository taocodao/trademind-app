'use client';

import { useEffect, useState } from 'react';
import { Gift, X } from 'lucide-react';

/**
 * Referred-visitor acknowledgment banner. When the landing page is opened
 * with a referral link (?ref=CODE, or a code stored from an earlier visit),
 * the visitor sees who invited them and what they get: the normal free month
 * plus the $50 referee day grant at their first payment. First name only,
 * resolved server-side from the code. Dismissible per session.
 */
export function ReferredBanner() {
    const [firstName, setFirstName] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        try {
            if (sessionStorage.getItem('tm_refBannerDismissed')) return;
            const params = new URLSearchParams(window.location.search);
            const code = params.get('ref') || params.get('code') || localStorage.getItem('tm_referralCode');
            if (!code) return;
            fetch(`/api/referrals/lookup?code=${encodeURIComponent(code)}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                    if (d && 'firstName' in d) {
                        setFirstName(d.firstName || null);
                        setVisible(true);
                    }
                })
                .catch(() => {});
        } catch {
            // Storage can be unavailable in some browsers.
        }
    }, []);

    if (!visible) return null;

    const dismiss = () => {
        setVisible(false);
        try { sessionStorage.setItem('tm_refBannerDismissed', '1'); } catch { /* ignore */ }
    };

    return (
        <div className="relative z-40 border-b border-tm-purple/30 bg-gradient-to-r from-tm-purple/20 via-tm-purple/10 to-transparent">
            <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
                <Gift className="h-4 w-4 shrink-0 text-purple-300" />
                <p className="flex-1 text-xs leading-relaxed text-zinc-200 sm:text-sm">
                    <span className="font-bold text-white">{firstName ? `${firstName} invited you to TradeMind.` : 'A friend invited you to TradeMind.'}</span>
                    {' '}Start with a free month, and when you subscribe we add about two extra months to your plan ($50 in subscription days).
                </p>
                <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 p-1 text-tm-muted transition-colors hover:text-white">
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
