'use client';
import { useEffect } from 'react';

/** Sends page events for the adviser sample. A human signal is a scroll, tap or key press about 4 seconds after load. */
export function Tracker() {
    useEffect(() => {
        const r = new URLSearchParams(window.location.search).get('r');
        if (!r) return;
        const send = (type: string, label?: string) => {
            const body = JSON.stringify({ r, type, label });
            if (navigator.sendBeacon) navigator.sendBeacon('/api/advisers/event', new Blob([body], { type: 'application/json' }));
            else fetch('/api/advisers/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
        };
        send('view');
        const t0 = Date.now();
        let sent = false;
        const human = (e: Event) => {
            if (sent || !e.isTrusted || Date.now() - t0 < 4000) return;
            sent = true;
            send('human');
        };
        ['scroll', 'touchstart', 'keydown', 'mousedown'].forEach((ev) => window.addEventListener(ev, human, { passive: true }));
        const click = (e: MouseEvent) => {
            const a = (e.target as HTMLElement).closest('a[data-track]') as HTMLElement | null;
            if (a) send((a.dataset.kind as string) || 'link', a.dataset.track);
        };
        document.addEventListener('click', click);
        return () => {
            ['scroll', 'touchstart', 'keydown', 'mousedown'].forEach((ev) => window.removeEventListener(ev, human));
            document.removeEventListener('click', click);
        };
    }, []);
    return null;
}
