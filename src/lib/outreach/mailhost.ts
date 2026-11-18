/**
 * Who hosts a recipient's mailbox, and where a retail or newsletter email to that mailbox is sent from.
 * Gmail and Google Workspace mailboxes go through Resend, Microsoft mailboxes (Outlook.com, Hotmail, Live, Microsoft 365) through
 * Workspace (Gmail API), everything else through Resend. All of it from the settings listed below.
 */
import { workspaceReady, type Transport } from './transport';

export type MailHost = 'google' | 'microsoft' | 'other' | 'unknown';
const CACHE = new Map<string, MailHost>();
const GOOGLE = /^(gmail|googlemail)\.com$/;
const MICROSOFT = /^(outlook|hotmail|live|msn|passport)\.(com|co\.uk|fr|de|it|es|ca|com\.au)$|^(hotmail|live|outlook)\.[a-z.]+$/;

export async function mailHostOfEmail(email: string): Promise<MailHost> {
    const dom = String(email).split('@')[1]?.trim().toLowerCase() || '';
    if (!dom) return 'unknown';
    if (GOOGLE.test(dom)) return 'google';
    if (MICROSOFT.test(dom)) return 'microsoft';
    if (CACHE.has(dom)) return CACHE.get(dom)!;
    let h: MailHost = 'unknown';
    try {
        const { resolveMx } = await import('dns/promises');
        const hosts = (await resolveMx(dom)).map((m) => m.exchange.toLowerCase()).join(' ');
        h = /google\.com|googlemail\.com/.test(hosts) ? 'google' : /protection\.outlook\.com|mail\.protection|outlook\.com|hotmail\.com/.test(hosts) ? 'microsoft' : hosts ? 'other' : 'unknown';
    } catch { h = 'unknown'; }
    CACHE.set(dom, h);
    return h;
}

const csv = (v: string | undefined) => String(v || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);

/**
 * Retail route. Settings: retail_route_google_domains (default vochat.ai, sent through Resend), retail_route_ms_domains (default vochat.ai,
 * sent through Workspace), retail_route_other_domains (default vochat.ai, sent through Resend).
 */
export function retailRouteFor(host: MailHost, s: Record<string, string>): { transport: Transport; domain: string } | null {
    if (host === 'microsoft') {
        const d = csv(s.retail_route_ms_domains || 'vochat.ai').find((x) => workspaceReady(x));
        return d ? { transport: 'workspace', domain: d } : null;   // no Workspace login: the email waits rather than going to Microsoft through Resend
    }
    const list = csv((host === 'google' ? s.retail_route_google_domains : s.retail_route_other_domains) || 'vochat.ai');
    return list.length ? { transport: 'resend', domain: list[Math.floor(Math.random() * list.length)] } : null;
}

export async function retailRoute(email: string, s: Record<string, string>) {
    return retailRouteFor(await mailHostOfEmail(email), s);
}
