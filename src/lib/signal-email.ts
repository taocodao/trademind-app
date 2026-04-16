/**
 * Signal Email Notifications via Resend
 * ======================================
 * Sends human-readable order execution emails to users who have
 * email_signal_alerts = true in user_settings.
 *
 * All order instructions use plain English, e.g.:
 *   "Buy 12 shares of TQQQ at Market Price"
 *   "Sell to Open 2 TQQQ $48.00 Put (exp. Apr 25) at Limit $0.45"
 *   "Buy to Close 2 TQQQ $48.00 Put — 50% profit target reached"
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
        return `${strategyLabel} — No Changes Today (${dateStr})`;
    }

    const regime = data.regime ? ` | ${data.regime.replace('_', ' ')}` : '';
    return `${strategyLabel} Signal Executed — ${dateStr}${regime}`;
}

// ─── Plain-Text Body ──────────────────────────────────────────────────────────

function buildTextBody(data: SignalEmailData): string {
    const lines: string[] = [];
    const strategyLabel = data.strategy.includes('PRO') ? 'TurboCore Pro' : 'TurboCore';

    lines.push(`📊 TradeMind ${strategyLabel} — Daily Signal`);
    lines.push('─'.repeat(48));

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

    // Closing positions
    if (data.optionsCloses.length > 0) {
        lines.push('🔴 Closing Positions:');
        for (const leg of data.optionsCloses) {
            lines.push(`  • ${leg.instruction}`);
        }
        lines.push('');
    }

    // Equity rebalance
    if (data.equityOrders.length > 0) {
        lines.push('📈 Equity Rebalance:');
        for (const order of data.equityOrders) {
            lines.push(`  • ${order.instruction}`);
        }
        lines.push('');
    } else {
        lines.push('📈 Equity Rebalance:');
        lines.push('  • No equity changes required — portfolio is at target allocation');
        lines.push('');
    }

    // New options entries
    if (data.optionsEntries.length > 0) {
        lines.push('⚡ Options Orders:');
        for (const leg of data.optionsEntries) {
            lines.push(`  • ${leg.instruction}`);
        }
        lines.push('');
    } else if (data.skipOptions && data.skipReason) {
        lines.push('⚡ Options Orders:');
        lines.push(`  ℹ️ Skipped: ${data.skipReason}`);
        lines.push('');
    }

    // Execution status
    lines.push('─'.repeat(48));
    if (data.live) {
        lines.push('✅ Execution: Live Tastytrade order submitted');
    } else {
        lines.push('📊 Execution: Virtual portfolio updated');
    }

    lines.push('');
    lines.push('View your portfolio at https://www.trademind.bot');
    lines.push('');
    lines.push('Manage email preferences in your account settings.');

    return lines.join('\n');
}

// ─── HTML Body ────────────────────────────────────────────────────────────────

function buildHtmlBody(data: SignalEmailData): string {
    const strategyLabel = data.strategy.includes('PRO') ? 'TurboCore Pro' : 'TurboCore';

    const regimeColor: Record<string, string> = {
        'BULL_STRONG': '#22c55e', 'BULL': '#86efac',
        'SIDEWAYS': '#facc15', 'BEAR': '#f87171', 'CRASH': '#ef4444',
    };
    const regimeBg = regimeColor[data.regime || ''] || '#64748b';

    const closeLegsHtml = data.optionsCloses.length > 0 ? `
        <div style="margin: 20px 0;">
            <h3 style="color:#ef4444;margin:0 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;">
                🔴 Closing Positions
            </h3>
            ${data.optionsCloses.map(l => `
                <div style="background:#1e293b;border-left:3px solid #ef4444;padding:10px 14px;margin:4px 0;border-radius:4px;font-family:monospace;font-size:13px;color:#f1f5f9;">
                    ${escHtml(l.instruction)}
                </div>`).join('')}
        </div>` : '';

    const equityHtml = `
        <div style="margin: 20px 0;">
            <h3 style="color:#22c55e;margin:0 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;">
                📈 Equity Rebalance
            </h3>
            ${data.equityOrders.length > 0
                ? data.equityOrders.map(o => `
                    <div style="background:#1e293b;border-left:3px solid ${o.action === 'buy' ? '#22c55e' : '#f59e0b'};padding:10px 14px;margin:4px 0;border-radius:4px;font-family:monospace;font-size:13px;color:#f1f5f9;">
                        ${escHtml(o.instruction)}
                    </div>`).join('')
                : `<div style="background:#1e293b;padding:10px 14px;border-radius:4px;font-size:13px;color:#94a3b8;">
                        No equity changes required — portfolio is at target allocation
                   </div>`}
        </div>`;

    const optionsHtml = data.optionsEntries.length > 0 ? `
        <div style="margin: 20px 0;">
            <h3 style="color:#a78bfa;margin:0 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;">
                ⚡ Options Orders
            </h3>
            ${data.optionsEntries.map(l => `
                <div style="background:#1e293b;border-left:3px solid #a78bfa;padding:10px 14px;margin:4px 0;border-radius:4px;font-family:monospace;font-size:13px;color:#f1f5f9;">
                    ${escHtml(l.instruction)}
                </div>`).join('')}
        </div>` : data.skipOptions && data.skipReason ? `
        <div style="margin: 20px 0;">
            <h3 style="color:#a78bfa;margin:0 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;">
                ⚡ Options Orders
            </h3>
            <div style="background:#1e293b;border-left:3px solid #64748b;padding:10px 14px;border-radius:4px;font-size:13px;color:#94a3b8;">
                ℹ️ ${escHtml(data.skipReason || '')}
            </div>
        </div>` : '';

    const statusHtml = data.live
        ? `<div style="background:#14532d;border:1px solid #22c55e;border-radius:6px;padding:12px 16px;margin:20px 0;color:#86efac;font-size:13px;">
               ✅ <strong>Live Execution</strong> — Order submitted to Tastytrade
           </div>`
        : `<div style="background:#1e3a5f;border:1px solid #3b82f6;border-radius:6px;padding:12px 16px;margin:20px 0;color:#93c5fd;font-size:13px;">
               📊 <strong>Virtual Portfolio</strong> — Your TradeMind virtual account has been updated
           </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>TradeMind Signal</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:4px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <span style="font-size:24px;">🤖</span>
            <div>
                <div style="color:#f1f5f9;font-size:18px;font-weight:700;">TradeMind ${escHtml(strategyLabel)}</div>
                <div style="color:#64748b;font-size:12px;">Daily Signal Report</div>
            </div>
        </div>
        ${data.regime ? `<span style="background:${regimeBg}22;color:${regimeBg};border:1px solid ${regimeBg}44;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;">
            ${escHtml(data.regime.replace(/_/g, ' '))}
        </span>` : ''}
        ${data.confidence ? `<span style="margin-left:8px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:20px;padding:4px 12px;font-size:12px;">
            Confidence: ${(data.confidence * 100).toFixed(0)}%
        </span>` : ''}
    </div>

    <!-- Orders -->
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:20px;margin-top:4px;">
        ${closeLegsHtml}
        ${equityHtml}
        ${optionsHtml}
        ${statusHtml}
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px 0;color:#475569;font-size:12px;">
        <a href="https://www.trademind.bot" style="color:#6366f1;text-decoration:none;">View Portfolio →</a>
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <a href="https://www.trademind.bot/settings" style="color:#475569;text-decoration:none;">Manage Notifications</a>
    </div>
</div>
</body></html>`;
}

function escHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
