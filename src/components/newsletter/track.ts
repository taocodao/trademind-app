/** Fire-and-forget analytics for the newsletter surface. */
export function trackNewsletter(event: string, meta: Record<string, unknown> = {}): void {
    try {
        void fetch('/api/newsletter/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, meta }),
            keepalive: true,
        });
    } catch { /* analytics must never break the page */ }
}
