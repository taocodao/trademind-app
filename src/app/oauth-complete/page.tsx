'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function OAuthCompleteInner() {
    const params = useSearchParams();
    const platform = params.get('platform') ?? '';
    const status = params.get('status') ?? 'success';
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        // Notify the parent modal window via postMessage, then close popup.
        // If not in a popup (window.opener is null), redirect to settings page.
        const isPopup = !!window.opener;

        if (isPopup) {
            // Tell the parent modal the OAuth finished
            try {
                window.opener.postMessage(
                    { type: 'COMPOSIO_OAUTH_COMPLETE', platform, status },
                    '*'
                );
            } catch (_) {
                // Cross-origin opener — postMessage may fail silently, focus trigger covers us
            }
            setClosing(true);
            // Small delay so user sees the success message
            setTimeout(() => window.close(), 1200);
        } else {
            // Direct navigation (settings page flow) — redirect to settings
            const base = '/settings/social-connections';
            if (status === 'success') {
                window.location.replace(`${base}?success=true&platform=${platform}`);
            } else {
                window.location.replace(`${base}?error=${status}&platform=${platform}`);
            }
        }
    }, [platform, status]);

    if (status !== 'success') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#0d0d0d', color: '#fff' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
                <p style={{ fontSize: 18, color: '#ff6b6b' }}>Connection failed. Please close this window and try again.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#0d0d0d', color: '#fff' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <p style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Connected successfully!</p>
            <p style={{ fontSize: 14, color: '#aaa' }}>{closing ? 'Closing window…' : 'Redirecting…'}</p>
        </div>
    );
}

export default function OAuthCompletePage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0d0d', color: '#fff', fontFamily: 'system-ui' }}>
                <p>Completing connection…</p>
            </div>
        }>
            <OAuthCompleteInner />
        </Suspense>
    );
}
