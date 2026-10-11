'use client';

/**
 * Campaign landing pages: after 3 visible seconds, tell the server a real person is here
 * (POST /api/engage). Scanners that fetch the page without running scripts never trigger this.
 * Does nothing unless the URL carries a campaign token (t=).
 */
import { useEffect } from 'react';

const TOKEN_RE = /^[a-z2-9]{10}$/;

export default function OutreachEngage() {
    useEffect(() => {
        const t = new URLSearchParams(window.location.search).get('t') ?? '';
        if (!TOKEN_RE.test(t)) return;
        let visibleMs = 0;
        let last = document.visibilityState === 'visible' ? Date.now() : 0;
        let sent = false;
        const onVis = () => {
            if (document.visibilityState === 'visible') last = Date.now();
            else if (last) { visibleMs += Date.now() - last; last = 0; }
        };
        document.addEventListener('visibilitychange', onVis);
        const timer = window.setInterval(() => {
            const total = visibleMs + (last ? Date.now() - last : 0);
            if (!sent && total >= 3000) {
                sent = true;
                void fetch('/api/engage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ t, page: window.location.pathname }),
                    keepalive: true,
                });
                window.clearInterval(timer);
            }
        }, 500);
        return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVis); };
    }, []);
    return null;
}
