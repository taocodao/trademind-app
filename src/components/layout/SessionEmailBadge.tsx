'use client';

import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { loginEmailOf } from '@/lib/privy-email';

/** Small fixed label on every page showing which login is active, with a sign-out link. */
export function SessionEmailBadge() {
    const { ready, authenticated, user } = usePrivy();
    const email = authenticated ? loginEmailOf(user) : null;
    // Record the login email once per browser session so alerts, newsletter checks and payment matching can use it.
    useEffect(() => {
        if (!authenticated || !email) return;
        const key = `tm_login_email_${email}`;
        try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch { /* ignore */ }
        fetch('/api/auth/login-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }).catch(() => {});
    }, [authenticated, email]);
    if (!ready || !authenticated) return null;
    return (
        <div
            style={{
                position: 'fixed', top: 8, right: 12, zIndex: 60, maxWidth: 'calc(100vw - 24px)',
                background: 'rgba(15,17,26,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999,
                padding: '4px 12px', fontSize: 12, color: '#fff', backdropFilter: 'blur(6px)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none',
            }}
            data-testid="session-email"
        >
            {email ?? 'your account'}
        </div>
    );
}
