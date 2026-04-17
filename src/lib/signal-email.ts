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

// ─── Subject Line ─────────────────────────────────────────────────────────────

function buildSubject(data: SignalEmailData): string {
    const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
    });
    const strategyLabel = data.strategy.includes('PRO') ? 'TurboCore Pro' : 'TurboCore';
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
    const strategyLabel = data.strategy.includes('PRO') ? 'TurboCore Pro' : 'TurboCore';

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

function buildHtmlBody(data: SignalEmailData): string {
    const strategyLabel = data.strategy.includes('PRO') ? 'TurboCore Pro' : 'TurboCore';
    const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

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
                </div>`).join('')}
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
        ${data.confidence ? `<span style="margin-left:12px;color:#374151;font-size:12px;font-weight:600">Confidence: ${(data.confidence * 100).toFixed(0)}%</span>` : ''}
      </td>
    </tr>

    <!-- Body -->
    <tr><td style="padding:28px 32px">
        ${data.rationale ? `<p style="border-left:3px solid #e5e7eb;padding:8px 14px;font-size:13px;
                  color:#6b7280;margin:0 0 24px;line-height:1.7;font-style:italic">${escHtml(data.rationale)}</p>` : ''}
        ${closeLegsHtml}
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
