/**
 * Signal Email Notifications via Resend
 * ======================================
 * Sends clean black-and-white execution confirmation emails to users
 * who have email_signal_alerts = true in user_settings.
 *
 * Order instructions use plain English, e.g.:
 *   "Buy 12 shares of TQQQ at Market Price"
 *   "Sell to Open 2 TQQQ $48.00 Put (exp. Apr 25) at Limit $0.45"
 */

import type { DeltaOrder, OptionsOrder } from '@/lib/per-user-order-generator';
import type { CloseLeg } from '@/lib/options-exit-scanner';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = 'TradeMind Signals <signals@trademind.bot>';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://trademind.bot';

// Public URL of the annotated broker-ticket guide for an equity order (embedded in the email).
function brokerGuideUrl(o: DeltaOrder, broker: string): string {
    return `${BASE_URL}/api/broker-guide?broker=${encodeURIComponent(broker)}&symbol=${encodeURIComponent(o.symbol)}&action=${o.action}&quantity=${o.quantity}`;
}

// Public URL of the annotated broker-ticket guide for an options order.
// Parses the OCC symbol (e.g. QQQ_20271217C00770) into the expiry/strike/right
// params the broker-guide route expects. Returns null if the symbol doesn't parse.
function optionsGuideUrl(l: OptionsOrder, broker: string): string | null {
    const m = /^([A-Z.]+)_(\d{4})(\d{2})(\d{2})([CP])(\d+(?:\.\d+)?)$/.exec(l.symbol || '');
    if (!m) return null;
    const underlying = m[1];
    const expiry = `${m[2]}-${m[3]}-${m[4]}`;
    const right = m[5] === 'P' ? 'put' : 'call';
    const strike = String(parseFloat(m[6])); // strip OCC leading zeros (00770 -> 770)
    const a = (l.action || '').toLowerCase();
    const action = a.startsWith('sell') ? 'sell' : 'buy';
    const openClose = a.includes('close') ? 'close' : 'open';
    return `${BASE_URL}/api/broker-guide?broker=${encodeURIComponent(broker)}&symbol=${encodeURIComponent(underlying)}&action=${action}&quantity=${l.quantity}&expiry=${expiry}&strike=${encodeURIComponent(strike)}&right=${right}&openclose=${openClose}`;
}

// Broker order-entry guide block (image + compliance caption) reused by the
// equity and options sections. Returns '' when no guide applies (e.g. E*TRADE
// equity orders, for which we have no ticket image yet).
function brokerGuideBlock(url: string | null, brokerName: string, symbol: string): string {
    if (!url) return '';
    return `
                    <div style="margin:2px 0 10px">
                        <p style="margin:0 0 6px;font-size:11px;color:#374151;font-family:monospace">
                            Enter at ${escHtml(brokerName)} — follow the numbered fields:
                        </p>
                        <img src="${url}" alt="${escHtml(brokerName)} order entry guide for ${escHtml(symbol)}"
                             style="width:100%;max-width:560px;border:1px solid #e5e7eb;border-radius:6px;display:block" />
                        <p style="margin:4px 0 0;font-size:10px;color:#9ca3af;font-family:monospace">
                            Review on ${escHtml(brokerName)} and press Preview order yourself. TradeMind never submits orders to your brokerage.
                        </p>
                    </div>`;
}

export interface SignalEmailData {
    strategy: string;
    regime?: string;
    confidence?: number;
    rationale?: string;
    equityOrders: DeltaOrder[];
    optionsCloses: CloseLeg[];
    optionsEntries: OptionsOrder[];
    skipOptions: boolean;
    skipReason?: string;
    live: boolean;
    /** Account name, for personalisation. */
    accountName?: string;
    /** The account's brokerage (e.g. 'etrade' | 'fidelity'); drives the order-entry guide. */
    broker?: string;
    /** ISO timestamp when the signal was generated. */
    signalTimestamp?: string;
}

/**
 * Send a signal execution email to a user.
 * Non-blocking — errors are logged but do not throw.
 */
export async function sendSignalEmail(toEmail: string, data: SignalEmailData): Promise<void> {
    if (!RESEND_API_KEY) {
        console.warn('[Email] RESEND_API_KEY not configured — skipping email');
        return;
    }

    const subject = buildSubject(data);
    const textBody = buildTextBody(data);
    const htmlBody = buildHtmlBody(data);

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: toEmail,
                subject,
                text: textBody,
                html: htmlBody,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(`[Email] Resend failed (${res.status}):`, err);
        } else {
            console.log(`[Email] Signal email sent to ${toEmail}`);
        }
    } catch (err) {
        console.error('[Email] Failed to send signal email:', err);
    }
}

// ─── Phase Transition Alert ─────────────────────────────────────────────────

export interface PhaseTransitionEmailData {
    accountName: string;
    strategy: string;
    riskLevel: string;
    fromPhase: string;
    toPhase: string;
    reason: string;
    nlv: number;
    phaseCap: number; // new per-position sizing cap (fraction of NLV)
}

/**
 * Send a standalone phase-transition alert email. Non-blocking.
 * Fired when an account's capital-scaling phase changes (promotion, demotion,
 * or emergency demotion), so the user knows their sizing cap has changed.
 */
export async function sendPhaseTransitionEmail(toEmail: string, data: PhaseTransitionEmailData): Promise<void> {
    if (!RESEND_API_KEY) {
        console.warn('[Email] RESEND_API_KEY not configured — skipping phase email');
        return;
    }

    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const isPromotion = data.reason === 'PROMOTION';
    const subject = `[TradeMind] ${data.accountName} — Phase ${data.fromPhase} → ${data.toPhase} (${dateStr})`;
    const capPct = (data.phaseCap * 100).toFixed(0);

    const text = [
        `TradeMind — Account Phase Transition`,
        '='.repeat(48),
        `Account:    ${data.accountName} (${data.strategy} · ${data.riskLevel})`,
        `Phase:      ${data.fromPhase} → ${data.toPhase}`,
        `Reason:     ${data.reason}`,
        `Total Value: $${data.nlv.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        '',
        `Your position sizing cap is now ${capPct}% of account value per position.`,
        isPromotion
            ? 'The account has grown into a new capital-scaling phase.'
            : 'The account moved to a more conservative phase to protect capital.',
        '',
        'View your account: https://www.trademind.bot/accounts',
    ].join('\n');

    const accent = isPromotion ? '#059669' : '#d97706';
    const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111827">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#374151;margin:0 0 4px">TradeMind</p>
        <h2 style="margin:0 0 16px;font-size:20px">Account Phase Transition</h2>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:4px solid ${accent};border-radius:6px;padding:16px 18px;margin:0 0 20px">
            <p style="margin:0 0 6px;font-size:14px"><strong>${escHtml(data.accountName)}</strong> <span style="color:#6b7280">(${escHtml(data.strategy)} · ${escHtml(data.riskLevel)})</span></p>
            <p style="margin:0 0 6px;font-size:16px;font-weight:700">${escHtml(data.fromPhase)} &rarr; ${escHtml(data.toPhase)}</p>
            <p style="margin:0;font-size:13px;color:#374151">${escHtml(data.reason)} · Total value $${data.nlv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <p style="font-size:14px;color:#111827;margin:0 0 8px">Your position sizing cap is now <strong>${capPct}% of account value</strong> per position.</p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 20px">${isPromotion
            ? 'The account has grown into a new capital-scaling phase.'
            : 'The account moved to a more conservative phase to protect capital.'}</p>
        <a href="https://www.trademind.bot/accounts" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:6px">View Account</a>
    </div>`;

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: FROM_EMAIL, to: toEmail, subject, text, html }),
        });
        if (!res.ok) {
            console.error(`[Email] Phase email failed (${res.status}):`, await res.text());
        } else {
            console.log(`[Email] Phase transition email sent to ${toEmail}`);
        }
    } catch (err) {
        console.error('[Email] Failed to send phase transition email:', err);
    }
}

// ─── Subject Line ─────────────────────────────────────────────────────────────

function buildSubject(data: SignalEmailData): string {
    const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
    });
    const stratUp = data.strategy.toUpperCase();
    const strategyLabel =
        stratUp.includes('LEAPS') ? 'QQQ LEAPS'  :
        stratUp.includes('PRO')   ? 'QQQ Basic'   : 'QQQ Basic';
    const hasActivity = data.equityOrders.length > 0 || data.optionsCloses.length > 0 || data.optionsEntries.length > 0;

    if (!hasActivity) {
        return `[TradeMind] ${strategyLabel} — No Changes Today (${dateStr})`;
    }

    const regime = data.regime ? ` | ${data.regime.replace('_', ' ')}` : '';
    return `[TradeMind] ${strategyLabel} Signal Executed — ${dateStr}${regime}`;
}

// ─── Plain-Text Body ──────────────────────────────────────────────────────────

function buildTextBody(data: SignalEmailData): string {
    const lines: string[] = [];
    const stratUp = data.strategy.toUpperCase();
    const strategyLabel =
        stratUp.includes('LEAPS') ? 'QQQ LEAPS'  :
        stratUp.includes('PRO')   ? 'QQQ Basic'   : 'QQQ Basic';

    lines.push(`TradeMind ${strategyLabel} — Daily Signal`);
    lines.push('='.repeat(48));

    if (data.regime) {
        lines.push(`Regime:     ${data.regime.replace(/_/g, ' ')}`);
    }
    if (data.confidence) {
        lines.push(`Confidence: ${(data.confidence * 100).toFixed(0)}%`);
    }
    if (data.rationale) {
        lines.push(`Rationale:  ${data.rationale}`);
    }
    lines.push('');

    if (data.optionsCloses.length > 0) {
        lines.push('CLOSING POSITIONS:');
        for (const leg of data.optionsCloses) {
            lines.push(`  - ${leg.instruction}`);
        }
        lines.push('');
    }

    if (data.equityOrders.length > 0) {
        lines.push('EQUITY REBALANCE:');
        for (const order of data.equityOrders) {
            lines.push(`  - ${order.instruction}`);
        }
        lines.push('');
    } else {
        lines.push('EQUITY REBALANCE:');
        lines.push('  - No equity changes required — portfolio is at target allocation');
        lines.push('');
    }

    if (data.optionsEntries.length > 0) {
        lines.push('OPTIONS ORDERS:');
        for (const leg of data.optionsEntries) {
            lines.push(`  - ${leg.instruction}`);
        }
        lines.push('');
    } else if (data.skipOptions && data.skipReason) {
        lines.push('OPTIONS ORDERS:');
        lines.push(`  Skipped: ${data.skipReason}`);
        lines.push('');
    }

    lines.push('-'.repeat(48));
    if (data.live) {
        lines.push('Execution: Live Tastytrade order submitted');
    } else {
        lines.push('Execution: Virtual portfolio updated');
    }

    lines.push('');
    lines.push('View your dashboard: https://www.trademind.bot/signals');
    lines.push('Manage notifications: https://www.trademind.bot/settings');

    return lines.join('\n');
}

// ─── HTML Body — Clean Black & White ─────────────────────────────────────────

export function buildHtmlBody(data: SignalEmailData): string {
    const stratUp = data.strategy.toUpperCase();
    const strategyLabel =
        stratUp.includes('LEAPS') ? 'QQQ LEAPS'  :
        stratUp.includes('PRO')   ? 'QQQ Basic'   : 'QQQ Basic';
    const brokerKey = (data.broker || 'fidelity').toLowerCase();
    const brokerName = brokerKey === 'etrade' ? 'E*TRADE' : 'Fidelity';
    const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    // Signal generation timestamp (when the strategy fired), distinct from send time.
    const signalTs = data.signalTimestamp ? new Date(data.signalTimestamp) : null;
    const signalTsStr = signalTs && !isNaN(signalTs.getTime())
        ? signalTs.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
        : null;

    // ── LEAPS contract infographic ─────────────────────────────────────────
    // Parse the first option entry (e.g. QQQ_20271217C00770) into a visual
    // contract card: underlying, strike, expiry, DTE, contracts, est. debit.
    const firstOpt = data.optionsEntries[0];
    let leapsCardHtml = '';
    if (firstOpt) {
        const m = /^([A-Z.]+)_(\d{4})(\d{2})(\d{2})([CP])(\d+(?:\.\d+)?)$/.exec(firstOpt.symbol || '');
        if (m) {
            const underlying = m[1];
            const expIso = `${m[2]}-${m[3]}-${m[4]}`;
            const expDate = new Date(`${expIso}T00:00:00Z`);
            const expStr = expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
            const dte = Math.max(0, Math.round((expDate.getTime() - Date.now()) / 86400000));
            const strikeNum = parseFloat(m[6]);
            const right = m[5] === 'C' ? 'CALL' : 'PUT';
            const qty = firstOpt.quantity;
            const px = firstOpt.limitPrice ?? 0;
            const debit = qty * px * 100;
            const isCredit = firstOpt.priceEffect === 'Credit';
            const amtLabel = isCredit ? 'est. credit' : 'est. debit';
            const amtColor = isCredit ? '#34d399' : '#fbbf24';
            leapsCardHtml = `
        <div style="margin:0 0 24px 0">
            <p style="margin:0 0 10px;color:#374151;font-size:11px;font-weight:700;
                      text-transform:uppercase;letter-spacing:0.07em">LEAPS Contract</p>
            <div style="background:#0f172a;border-radius:10px;padding:18px 20px;color:#e2e8f0">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td>
                        <div style="font-size:11px;color:#94a3b8;letter-spacing:0.05em">${escHtml(underlying)} LEAPS</div>
                        <div style="font-size:26px;font-weight:800;color:#ffffff;line-height:1.1">$${strikeNum.toFixed(0)} <span style="font-size:15px;font-weight:700;color:#60a5fa">${right}</span></div>
                    </td>
                    <td align="right">
                        <div style="font-size:11px;color:#94a3b8">Expires</div>
                        <div style="font-size:15px;font-weight:700;color:#ffffff">${escHtml(expStr)}</div>
                        <div style="font-size:11px;color:#64748b">${dte}d DTE</div>
                    </td>
                </tr></table>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-top:1px solid #1e293b;padding-top:12px"><tr>
                    <td align="center">
                        <div style="font-size:16px;font-weight:800;color:#ffffff">${qty}</div>
                        <div style="font-size:10px;color:#94a3b8">contract${qty !== 1 ? 's' : ''}</div>
                    </td>
                    <td align="center">
                        <div style="font-size:16px;font-weight:800;color:#ffffff">$${px.toFixed(2)}</div>
                        <div style="font-size:10px;color:#94a3b8">per share</div>
                    </td>
                    <td align="center">
                        <div style="font-size:16px;font-weight:800;color:${amtColor}">$${debit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <div style="font-size:10px;color:#94a3b8">${amtLabel}</div>
                    </td>
                </tr></table>
            </div>
        </div>`;
        }
    }

    // Closing positions section
    const closeLegsHtml = data.optionsCloses.length > 0 ? `
        <div style="margin:0 0 24px 0">
            <p style="margin:0 0 10px;color:#374151;font-size:11px;font-weight:700;
                      text-transform:uppercase;letter-spacing:0.07em">Closing Positions</p>
            ${data.optionsCloses.map(l => `
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:3px solid #374151;
                            padding:10px 14px;margin:4px 0;border-radius:4px;font-family:monospace;
                            font-size:13px;color:#111827">
                    ${escHtml(l.instruction)}
                </div>`).join('')}
        </div>` : '';

    // Equity rebalance section
    const equityHtml = `
        <div style="margin:0 0 24px 0">
            <p style="margin:0 0 10px;color:#374151;font-size:11px;font-weight:700;
                      text-transform:uppercase;letter-spacing:0.07em">Equity Rebalance</p>
            ${data.equityOrders.length > 0
                ? data.equityOrders.map(o => `
                    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:3px solid ${o.action === 'buy' ? '#111827' : '#6b7280'};
                                padding:10px 14px;margin:4px 0;border-radius:4px;font-family:monospace;
                                font-size:13px;color:#111827">
                        ${escHtml(o.instruction)}
                    </div>
                    <div style="margin:2px 0 10px">
                        <p style="margin:0 0 6px;font-size:11px;color:#374151;font-family:monospace">
                            Enter at ${escHtml(brokerName)} — follow the numbered fields:
                        </p>
                        <img src="${brokerGuideUrl(o, brokerKey)}" alt="${escHtml(brokerName)} order entry guide for ${escHtml(o.symbol)}"
                             style="width:100%;max-width:560px;border:1px solid #e5e7eb;border-radius:6px;display:block" />
                        <p style="margin:4px 0 0;font-size:10px;color:#9ca3af;font-family:monospace">
                            Review on ${escHtml(brokerName)} and press Preview order yourself. TradeMind never submits orders to your brokerage.
                        </p>
                    </div>`).join('')
                : `<div style="background:#f9fafb;border:1px solid #e5e7eb;padding:10px 14px;
                              border-radius:4px;font-size:13px;color:#6b7280;">
                        No equity changes required — portfolio is at target allocation
                   </div>`}
        </div>`;

    // Options section
    const optionsHtml = data.optionsEntries.length > 0 ? `
        <div style="margin:0 0 24px 0">
            <p style="margin:0 0 10px;color:#374151;font-size:11px;font-weight:700;
                      text-transform:uppercase;letter-spacing:0.07em">Options Orders</p>
            ${data.optionsEntries.map(l => `
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:3px solid #374151;
                            padding:10px 14px;margin:4px 0;border-radius:4px;font-family:monospace;
                            font-size:13px;color:#111827">
                    ${escHtml(l.instruction)}
                </div>
                ${brokerGuideBlock(optionsGuideUrl(l, brokerKey), brokerName, l.symbol)}`).join('')}
        </div>` : data.skipOptions && data.skipReason ? `
        <div style="margin:0 0 24px 0">
            <p style="margin:0 0 10px;color:#374151;font-size:11px;font-weight:700;
                      text-transform:uppercase;letter-spacing:0.07em">Options Orders</p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;padding:10px 14px;
                        border-radius:4px;font-size:13px;color:#6b7280;">
                Skipped: ${escHtml(data.skipReason || '')}
            </div>
        </div>` : '';

    // Execution status
    const statusHtml = data.live
        ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;
                      border-radius:6px;padding:12px 16px;margin:0 0 8px;
                      color:#111827;font-size:13px;">
               <strong>Live Execution</strong> — Order submitted to Tastytrade
           </div>`
        : `<div style="background:#f9fafb;border:1px solid #e5e7eb;
                      border-radius:6px;padding:12px 16px;margin:0 0 8px;
                      color:#374151;font-size:13px;">
               <strong>Virtual Execution</strong> — Your TradeMind virtual account has been updated
           </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>TradeMind Signal</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:#f3f4f6;padding:32px 16px">
  <tr><td>
  <table width="600" cellpadding="0" cellspacing="0" border="0" align="center"
         style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;
                border-radius:8px;overflow:hidden">

    <!-- Header -->
    <tr>
      <td style="background:#111827;padding:24px 32px">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td>
            <span style="font-size:20px;font-weight:800;color:#ffffff">TradeMind</span><br>
            <span style="font-size:12px;color:#9ca3af">${escHtml(strategyLabel)} &middot; Execution Report</span>
          </td>
          <td align="right" style="vertical-align:middle">
            ${data.regime ? `<span style="background:#374151;color:#f9fafb;padding:5px 14px;
                         border-radius:20px;font-size:12px;font-weight:600">${escHtml(data.regime)}</span>` : ''}
          </td>
        </tr></table>
      </td>
    </tr>

    <!-- Date bar -->
    <tr>
      <td style="padding:12px 32px;background:#f9fafb;border-bottom:1px solid #e5e7eb">
        <span style="color:#6b7280;font-size:12px">${escHtml(dateStr)}</span>
        ${signalTsStr ? `<span style="margin-left:12px;color:#6b7280;font-size:12px">Signal generated: ${escHtml(signalTsStr)}</span>` : ''}
        ${data.confidence ? `<span style="margin-left:12px;color:#374151;font-size:12px;font-weight:600">Confidence: ${(data.confidence * 100).toFixed(0)}%</span>` : ''}
        ${data.accountName ? `<span style="margin-left:12px;color:#6b7280;font-size:12px">${escHtml(data.accountName)}</span>` : ''}
      </td>
    </tr>

    <!-- Body -->
    <tr><td style="padding:28px 32px">
        ${data.rationale ? `<p style="border-left:3px solid #e5e7eb;padding:8px 14px;font-size:13px;
                  color:#6b7280;margin:0 0 24px;line-height:1.7;font-style:italic">${escHtml(data.rationale)}</p>` : ''}
        ${closeLegsHtml}
        ${leapsCardHtml}
        ${equityHtml}
        ${optionsHtml}
        ${statusHtml}

        <!-- CTA -->
        <div style="text-align:center;padding-top:20px">
          <a href="https://www.trademind.bot/signals"
             style="display:inline-block;background:#111827;color:#ffffff;
                    padding:13px 36px;border-radius:6px;text-decoration:none;
                    font-weight:700;font-size:14px">
            View Your Dashboard &rarr;
          </a>
        </div>
    </td></tr>

    <!-- Footer -->
    <tr>
      <td style="padding:18px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;text-align:center">
        <p style="color:#9ca3af;font-size:11px;margin:0 0 4px">TradeMind &middot; Automated Trade Signals</p>
        <p style="color:#9ca3af;font-size:11px;margin:0">
          <a href="https://www.trademind.bot/settings" style="color:#6b7280;text-decoration:underline">
            Manage email preferences
          </a>
        </p>
      </td>
    </tr>
  </table>
  </td></tr>
</table>
</body>
</html>`;
}

function escHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
