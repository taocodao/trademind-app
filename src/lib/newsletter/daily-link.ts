import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Click links for the daily brief: /d/<tok>/<kind>. The token is "<subscriberId>.<signature>", a signature of the id
 * with a server secret, so it needs no database row, never expires and cannot be guessed. A bad or missing signature
 * never breaks a button: the reader still lands on the right page, the click is just not attributed to anyone.
 */
function secret(): string { return process.env.DAILY_LINK_SECRET || process.env.CRON_SECRET || process.env.PRIVY_APP_SECRET || ''; }
const sig = (id: number) => createHmac('sha256', secret()).update(`tm-daily-link.${id}`).digest('base64url').slice(0, 22);

export function makeDailyLinkToken(subscriberId: number): string { return `${subscriberId}.${sig(subscriberId)}`; }

export function readDailyLinkToken(tok: string): number | null {
    if (!secret()) return null;
    const m = /^(\d{1,12})\.([A-Za-z0-9_-]{22})$/.exec(tok);
    if (!m) return null;
    const id = Number(m[1]);
    const a = Buffer.from(m[2]), b = Buffer.from(sig(id));
    return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

/** Fixed destinations only, so a link can never be turned into an open redirect. */
export const DAILY_KINDS = ['acct', 'va', 'sim', 'pl', 'wk', 'h'] as const;
export type DailyKind = typeof DAILY_KINDS[number];

export function dailyDestination(kind: DailyKind, accountId: number | null, utm: string): string {
    switch (kind) {
        case 'acct': return accountId ? `/account/${accountId}?${utm}` : `/accounts?${utm}`;
        case 'va': return `/live-record?${utm}`;
        case 'sim': return `/simulated-record?${utm}`;
        case 'pl': return `/plans?${utm}`;
        case 'wk': return `/newsletter/join?cadence=weekly&${utm}`;
        default: return `/?${utm}`;
    }
}
