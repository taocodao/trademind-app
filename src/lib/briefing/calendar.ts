/** US stock market calendar (Eastern time). Holidays and early closes for 2026 and 2027. */

const HOLIDAYS = new Set([
    '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03',
    '2026-09-07', '2026-11-26', '2026-12-25',
    '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31', '2027-06-18', '2027-07-05',
    '2027-09-06', '2027-11-25', '2027-12-24',
]);
const EARLY_CLOSE = new Set(['2026-11-27', '2026-12-24', '2027-11-26']);

export function etDate(d: Date = new Date()): string {
    return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export function etMinutes(d: Date = new Date()): number {
    const p = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d);
    const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
    return (g('hour') % 24) * 60 + g('minute');
}

export function isMarketDay(date: string): boolean {
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
    return dow !== 0 && dow !== 6 && !HOLIDAYS.has(date);
}

export function isEarlyClose(date: string): boolean {
    return EARLY_CLOSE.has(date);
}

/** Minutes after midnight ET when the model run is expected, then review and send deadlines. */
export function schedule(date: string): { run: number; send: number; fallback: number } {
    // Early-close days follow the earlier close: everything moves 3 hours earlier.
    const shift = isEarlyClose(date) ? -180 : 0;
    return { run: 15 * 60 + shift, send: 15 * 60 + 30 + shift, fallback: 15 * 60 + 45 + shift };
}

export function previousMarketDay(date: string): string {
    let d = new Date(`${date}T12:00:00Z`);
    for (let i = 0; i < 10; i++) {
        d = new Date(d.getTime() - 86400_000);
        const s = d.toISOString().slice(0, 10);
        if (isMarketDay(s)) return s;
    }
    return date;
}

export function longDate(date: string): string {
    return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
        timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric',
    });
}

export function shortDate(date: string): string {
    return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
}
