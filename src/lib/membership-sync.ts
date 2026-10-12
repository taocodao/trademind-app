import { getStripe } from '@/lib/stripe-server';
import { updateMembership, type AccountMembership } from '@/lib/membership';

const lastChecked = new Map<number, number>();

/**
 * Make the stored membership match Stripe. A subscription that was canceled or refunded in Stripe (or no longer exists)
 * becomes expired; auto renew and the paid-through date are refreshed. Webhooks normally do this, this is the safety net.
 */
export async function syncMembershipsFromStripe<T extends AccountMembership>(list: T[]): Promise<T[]> {
    const out: T[] = [];
    for (const m of list) {
        const subId = m.stripe_subscription_id;
        const recent = lastChecked.get(m.account_id);
        if (!subId || ['expired'].includes(m.status) || (recent && Date.now() - recent < 15000)) { out.push(m); continue; }
        lastChecked.set(m.account_id, Date.now());
        try {
            const sub = await getStripe().subscriptions.retrieve(subId) as unknown as { status: string; cancel_at_period_end: boolean; current_period_end?: number };
            if (['canceled', 'incomplete_expired', 'unpaid', 'incomplete'].includes(sub.status)) {
                const fields = { status: 'expired' as const, stripe_subscription_id: null, cancel_at_period_end: false, current_period_end: new Date().toISOString() };
                await updateMembership(m.account_id, fields);
                out.push({ ...m, ...fields, current_period_end: fields.current_period_end } as T);
                continue;
            }
            const end = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : m.current_period_end;
            const status = sub.status === 'past_due' ? 'past_due' : sub.cancel_at_period_end ? 'canceled' : 'active';
            if (status !== m.status || sub.cancel_at_period_end !== m.cancel_at_period_end) {
                await updateMembership(m.account_id, { status, cancel_at_period_end: sub.cancel_at_period_end, current_period_end: end });
                out.push({ ...m, status, cancel_at_period_end: sub.cancel_at_period_end, current_period_end: end } as T);
            } else out.push(m);
        } catch (err) {
            if (err instanceof Error && /^No such subscription/i.test(err.message)) {
                const fields = { status: 'expired' as const, stripe_subscription_id: null, cancel_at_period_end: false, current_period_end: new Date().toISOString() };
                await updateMembership(m.account_id, fields);
                out.push({ ...m, ...fields } as T);
            } else { console.warn('[membership-sync]', err); out.push(m); }
        }
    }
    return out;
}
