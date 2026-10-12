import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe-server';
import { query } from '@/lib/db';
import { sendInvoiceEmail } from '@/lib/newsletter/email';

const fmtDate = (unix: number) => new Date(unix * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });

/** Emails the paid invoice for a completed checkout session, once per invoice. Safe to call from several places. */
export async function emailInvoiceForSession(session: Stripe.Checkout.Session): Promise<void> {
    try {
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        if (!subId || session.payment_status !== 'paid') return;
        const stripe = getStripe();
        const sub = await stripe.subscriptions.retrieve(subId, { expand: ['latest_invoice'] });
        const inv = sub.latest_invoice as Stripe.Invoice | null;
        if (!inv || typeof inv === 'string' || inv.status !== 'paid') return;
        const to = (session.metadata?.guest_email || session.customer_details?.email || inv.customer_email || '').trim();
        if (!to) return;

        await query('CREATE TABLE IF NOT EXISTS invoice_emails (invoice_id TEXT PRIMARY KEY, email TEXT, sent_at TIMESTAMPTZ DEFAULT NOW())');
        const claim = await query('INSERT INTO invoice_emails (invoice_id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING invoice_id', [inv.id, to]);
        if (!claim.rows.length) return;

        const plan = /leaps/i.test(session.metadata?.plan ?? '') ? 'QQQ LEAPS' : session.metadata?.plan ? 'QQQ Basic' : 'TradeMind';
        const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
        const ok = await sendInvoiceEmail({
            to,
            planLabel: plan,
            amount: `${(inv.amount_paid / 100).toLocaleString('en-US', { style: 'currency', currency: (inv.currency || 'usd').toUpperCase() })}`,
            paidOn: fmtDate(inv.status_transitions?.paid_at ?? inv.created),
            invoiceNumber: inv.number,
            renewalDate: periodEnd ? fmtDate(periodEnd) : null,
            hostedUrl: inv.hosted_invoice_url,
            pdfUrl: inv.invoice_pdf,
        });
        if (!ok) await query('DELETE FROM invoice_emails WHERE invoice_id = $1', [inv.id]);
    } catch (err) {
        console.warn('[invoice-email] failed', err);
    }
}
