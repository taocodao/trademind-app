'use client';

import { usePrivy } from '@privy-io/react-auth';
import { loginEmailOf } from '@/lib/privy-email';

/** Small fixed label on every page showing which login is active, with a sign-out link. */
export function SessionEmailBadge() {
    const { ready, authenticated, user, logout } = usePrivy();
    if (!ready || !authenticated) return null;
    const email = loginEmailOf(user);
    return (
        <div
            style={{
                position: 'fixed', left: 12, bottom: 76, zIndex: 60, maxWidth: 'calc(100vw - 96px)',
                background: 'rgba(15,17,26,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999,
                padding: '5px 12px', fontSize: 12, color: '#cbd5e1', display: 'flex', gap: 8, alignItems: 'center',
                backdropFilter: 'blur(6px)',
            }}
            data-testid="session-email"
        >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Signed in as <strong style={{ color: '#fff' }}>{email ?? 'your account'}</strong>
            </span>
            <button
                type="button"
                onClick={() => void logout()}
                style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', padding: 0, font: 'inherit', textDecoration: 'underline', flexShrink: 0 }}
            >
                Sign out
            </button>
        </div>
    );
}
