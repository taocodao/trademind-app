'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Copy, Gift, Sparkles } from 'lucide-react';
import { ShareModal } from './ShareModal';
import { useTranslation } from 'react-i18next';

interface ShareSectionProps {
    promoCode: string;
    referralLink: string;
    userTier: string;
    isCreator: boolean;
}

export function ShareSection({ promoCode, referralLink, userTier, isCreator }: ShareSectionProps) {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, { status: string; connectedAt: string | null }>>({});
    const [copiedCode, setCopiedCode] = useState(false);

    const fetchConnections = useCallback(() => {
        fetch('/api/composio/status').then((response) => response.json()).then((data) => setConnectedPlatforms(data.connections ?? {})).catch(console.error);
    }, []);
    useEffect(() => { fetchConnections(); }, [fetchConnections, showModal]);

    async function copyCode() {
        await navigator.clipboard.writeText(promoCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 3000);
    }

    return <>
        <div className="space-y-4 rounded-2xl border border-tm-purple/20 bg-gradient-to-br from-tm-purple/10 to-transparent p-5">
            <div className="flex items-start gap-3"><Gift className="mt-0.5 h-5 w-5 text-purple-300" /><p className="text-sm leading-relaxed text-zinc-300">Your friend receives a $50 day grant at first payment. Your selected reward account receives a $100 day grant after your friend stays active for 14 days.</p></div>
            <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-tm-muted">Your referral link</p>
                <div className="flex items-center gap-3"><div className="min-w-0 flex-1 rounded-xl border-2 border-tm-purple/40 bg-tm-bg px-4 py-3"><span className="block truncate font-mono text-sm font-bold text-white">{referralLink}</span></div><button onClick={copyCode} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-tm-purple/30 bg-tm-purple/20 px-3 py-2.5 text-xs font-bold text-tm-purple transition-colors hover:bg-tm-purple/30">{copiedCode ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copiedCode ? t('share_earn.copied', 'Copied') : 'Copy link'}</button></div>
                <p className="mt-2 text-[11px] leading-relaxed text-tm-muted">$100 is about 142 days on QQQ Basic or 107 days on QQQ LEAPS. $50 is about 71 days on QQQ Basic or 53 days on QQQ LEAPS. Day grants are subscription benefits, not cash.</p>
            </div>
            <button onClick={() => setShowModal(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-tm-purple py-3 font-bold text-white shadow-[0_4px_20px_rgba(168,85,247,0.3)] transition-all hover:bg-tm-purple/90"><Sparkles className="h-4 w-4" />Create AI post and share</button>
        </div>
        {showModal && <ShareModal promoCode={promoCode} referralLink={referralLink} userTier={userTier} isCreator={isCreator} connectedPlatforms={connectedPlatforms} onClose={() => setShowModal(false)} onRefreshConnections={fetchConnections} />}
    </>;
}
