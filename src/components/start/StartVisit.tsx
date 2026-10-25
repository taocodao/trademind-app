'use client';

/** After 3 visible seconds on a section page, tell the server this person viewed that section. */
import { useEffect } from 'react';
import { useToken } from './TokenLink';

export default function StartVisit({ section }: { section: string }) {
    const tok = useToken();
    useEffect(() => {
        if (!tok) return;
        let visible = document.visibilityState === 'visible' ? Date.now() : 0;
        let total = 0;
        let done = false;
        const onVis = () => {
            if (document.visibilityState === 'visible') visible = Date.now();
            else if (visible) { total += Date.now() - visible; visible = 0; }
        };
        document.addEventListener('visibilitychange', onVis);
        const timer = window.setInterval(() => {
            const t = total + (visible ? Date.now() - visible : 0);
            if (!done && t >= 3000) {
                done = true;
                void fetch('/api/start/visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: tok, section }), keepalive: true });
                window.clearInterval(timer);
            }
        }, 500);
        return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVis); };
    }, [tok, section]);
    return null;
}
