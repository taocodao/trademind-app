'use client';

/**
 * Campaign landing pages: after 3 visible seconds, tell the server a real person is here
 * (POST /api/engage). Scanners that fetch the page without running scripts never trigger this.
 * Does nothing unless the URL carries a campaign token (t=).
 */
import { useEffect } from 'react';

const TOKEN_RE = /^[A-Za-z0-9_-]{10,11}$/;

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
        // A real person also scrolls, taps, or types. Scanners that run scripts rarely do. Reported once, after the 3 second check.
        const t0 = Date.now();
        let interacted = false;
        const onUser = (e: Event) => {
            if (interacted || !e.isTrusted) return;
            interacted = true;
            window.setTimeout(() => {
                void fetch('/api/engage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ t, interacted: true }),
                    keepalive: true,
                });
            }, Math.max(0, 3800 - (Date.now() - t0)));
        };
        const evts = ['scroll', 'pointerdown', 'keydown', 'touchstart', 'wheel'];
        evts.forEach((n) => window.addEventListener(n, onUser, { passive: true }));
        return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVis); evts.forEach((n) => window.removeEventListener(n, onUser)); };
    }, []);
    return null;
}
