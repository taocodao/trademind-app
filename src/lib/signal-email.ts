/**
 * Signal email notifications via Resend.
 *
 * Every order is rendered as a complete broker-neutral instruction. TradeMind
 * does not connect to or submit orders to a customer's brokerage.
 */

import type { DeltaOrder, OptionsOrder } from '@/lib/per-user-order-generator';
import type { CloseLeg } from '@/lib/options-exit-scanner';
import {
    buildUniversalOrderInstruction,
    type UniversalOrderInstruction,
} from '@/lib/universal-order';

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
    /** Account name, for personalization and order-entry instructions. */
    accountName?: string;
    /** ISO timestamp when the signal was generated. */
    signalTimestamp?: string;
}

/**
 * Send a signal execution email to a user.
 * Non-blocking: errors are logged but do not throw.
 */
export async function sendSignalEmail(toEmail: string, data: SignalEmailData): Promise<void> {
    if (!RESEND_API_KEY) {
        console.warn('[Email] RESEND_API_KEY not configured - skipping email');
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
    phaseCap: number;
}

/**
 * Send a standalone phase-transition alert email. Non-blocking.
 * Fired when an account's capital-scaling phase changes so the user knows
 * their sizing cap has changed.
 */
export async function sendPhaseTransitionEmail(toEmail: string, data: PhaseTransitionEmailData): Promise<void> {
    if (!RESEND_API_KEY) {
        console.warn('[Email] RESEND_API_KEY not configured - skipping phase email');
        return;
    }

    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const isPromotion = data.reason === 'PROMOTION';
    const subject = `[TradeMind] ${data.accountName} - Phase ${data.fromPhase} to ${data.toPhase} (${dateStr})`;
    const capPct = (data.phaseCap * 100).toFixed(0);

    const text = [
        'TradeMind - Account Phase Transition',
        '='.repeat(48),
        `Account: ${data.accountName} (${data.strategy} / ${data.riskLevel})`,
        `Phase: ${data.fromPhase} to ${data.toPhase}`,
        `Reason: ${data.reason}`,
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
            <p style="margin:0 0 6px;font-size:14px"><strong>${escHtml(data.accountName)}</strong> <span style="color:#6b7280">(${escHtml(data.strategy)} / ${escHtml(data.riskLevel)})</span></p>
            <p style="margin:0 0 6px;font-size:16px;font-weight:700">${escHtml(data.fromPhase)} to ${escHtml(data.toPhase)}</p>
            <p style="margin:0;font-size:13px;color:#374151">${escHtml(data.reason)} / Total value $${data.nlv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
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

// ─── Signal Email ───────────────────────────────────────────────────────────

function buildSubject(data: SignalEmailData): string {
    const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
    });
    const strategyLabel = strategyLabelFor(data.strategy);
    const hasActivity = data.equityOrders.length > 0 || data.optionsCloses.length > 0 || data.optionsEntries.length > 0;

    if (!hasActivity) {
        return `[TradeMind] ${strategyLabel} - No Changes Today (${dateStr})`;
    }

    const regime = data.regime ? ` | ${data.regime.replace('_', ' ')}` : '';
    return `[TradeMind] ${strategyLabel} Signal Executed - ${dateStr}${regime}`;
}

function buildTextBody(data: SignalEmailData): string {
    const lines: string[] = [];
    const strategyLabel = strategyLabelFor(data.strategy);

    lines.push(`TradeMind ${strategyLabel} - Daily Signal`);
    lines.push('='.repeat(48));

    if (data.accountName) lines.push(`Account: ${data.accountName}`);
    if (data.regime) lines.push(`Regime: ${data.regime.replace(/_/g, ' ')}`);
    if (data.confidence) lines.push(`Confidence: ${(data.confidence * 100).toFixed(0)}%`);
    if (data.rationale) lines.push(`Rationale: ${data.rationale}`);
    lines.push('');

    appendTextInstructions(lines, 'CLOSING POSITIONS', data.optionsCloses.map((order) => closeInstruction(order, data.accountName)));
    appendTextInstructions(lines, 'EQUITY REBALANCE', data.equityOrders.map((order) => equityInstruction(order, data.accountName)));
    appendTextInstructions(lines, 'OPTIONS ORDERS', data.optionsEntries.map((order) => optionInstruction(order, data.accountName)));

    if (data.equityOrders.length === 0) {
        lines.push('EQUITY REBALANCE: No equity changes required. The portfolio is at its target allocation.');
        lines.push('');
    }
    if (data.optionsEntries.length === 0 && data.skipOptions && data.skipReason) {
        lines.push(`OPTIONS ORDERS: Skipped. ${data.skipReason}`);
        lines.push('');
    }

    lines.push('='.repeat(48));
    lines.push('Virtual execution: Your TradeMind virtual account has been updated.');
    lines.push('TradeMind never connects to or submits orders to your brokerage.');
    lines.push('');
    lines.push('View your dashboard: https://www.trademind.bot/signals');
    lines.push('Manage notifications: https://www.trademind.bot/settings');

    return lines.join('\n');
}

function appendTextInstructions(lines: string[], heading: string, instructions: UniversalOrderInstruction[]) {
    if (instructions.length === 0) return;
    lines.push(`${heading}:`);
    instructions.forEach((instruction, index) => {
        if (index > 0) lines.push('');
        lines.push(instruction.text);
    });
    lines.push('');
}

export function buildHtmlBody(data: SignalEmailData): string {
    const strategyLabel = strategyLabelFor(data.strategy);
    const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const signalTs = data.signalTimestamp ? new Date(data.signalTimestamp) : null;
    const signalTsStr = signalTs && !Number.isNaN(signalTs.getTime())
        ? signalTs.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
        : null;
    const closeLegsHtml = renderInstructionSection('Closing Positions', data.optionsCloses.map((order) => closeInstruction(order, data.accountName)));
    const equityHtml = data.equityOrders.length > 0
        ? renderInstructionSection('Equity Rebalance', data.equityOrders.map((order) => equityInstruction(order, data.accountName)))
        : emptySection('Equity Rebalance', 'No equity changes required. The portfolio is at its target allocation.');
    const optionsHtml = data.optionsEntries.length > 0
        ? renderInstructionSection('Options Orders', data.optionsEntries.map((order) => optionInstruction(order, data.accountName)))
        : data.skipOptions && data.skipReason
            ? emptySection('Options Orders', `Skipped: ${data.skipReason}`)
            : '';
    const statusHtml = `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px 16px;margin:0 0 8px;color:#374151;font-size:13px">
        <strong>Virtual Execution</strong> - Your TradeMind virtual account has been updated. TradeMind never connects to or submits orders to your brokerage.
    </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>TradeMind Signal</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:32px 16px">
  <tr><td>
  <table width="600" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <tr>
      <td style="background:#111827;padding:24px 32px">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td>
            <span style="font-size:20px;font-weight:800;color:#ffffff">TradeMind</span><br>
            <span style="font-size:12px;color:#9ca3af">${escHtml(strategyLabel)} &middot; Execution Report</span>
          </td>
          <td align="right" style="vertical-align:middle">
            ${data.regime ? `<span style="background:#374151;color:#f9fafb;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:600">${escHtml(data.regime)}</span>` : ''}
          </td>
        </tr></table>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 32px;background:#f9fafb;border-bottom:1px solid #e5e7eb">
        <span style="color:#6b7280;font-size:12px">${escHtml(dateStr)}</span>
        ${signalTsStr ? `<span style="margin-left:12px;color:#6b7280;font-size:12px">Signal generated: ${escHtml(signalTsStr)}</span>` : ''}
        ${data.confidence ? `<span style="margin-left:12px;color:#374151;font-size:12px;font-weight:600">Confidence: ${(data.confidence * 100).toFixed(0)}%</span>` : ''}
        ${data.accountName ? `<span style="margin-left:12px;color:#6b7280;font-size:12px">${escHtml(data.accountName)}</span>` : ''}
      </td>
    </tr>
    <tr><td style="padding:28px 32px">
        ${data.rationale ? `<p style="border-left:3px solid #e5e7eb;padding:8px 14px;font-size:13px;color:#6b7280;margin:0 0 24px;line-height:1.7;font-style:italic">${escHtml(data.rationale)}</p>` : ''}
        ${closeLegsHtml}
        ${equityHtml}
        ${optionsHtml}
        ${statusHtml}
        <div style="text-align:center;padding-top:20px">
          <a href="https://www.trademind.bot/signals" style="display:inline-block;background:#111827;color:#ffffff;padding:13px 36px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px">
            View Your Dashboard &rarr;
          </a>
          <p style="margin:14px 0 0;font-size:12px;color:#6b7280">
            Not sure where these orders go at your broker?
            <a href="https://www.trademind.bot/help/enter-orders" style="color:#111827;text-decoration:underline;font-weight:600">Step-by-step order entry guide</a>
          </p>
        </div>
    </td></tr>
    <tr>
      <td style="padding:18px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;text-align:center">
        <p style="color:#9ca3af;font-size:11px;margin:0 0 4px">TradeMind &middot; Automated Trade Signals</p>
        <p style="color:#9ca3af;font-size:11px;margin:0">
          <a href="https://www.trademind.bot/settings" style="color:#6b7280;text-decoration:underline">Manage email preferences</a>
        </p>
      </td>
    </tr>
  </table>
  </td></tr>
</table>
</body>
</html>`;
}

function renderInstructionSection(title: string, instructions: UniversalOrderInstruction[]): string {
    if (instructions.length === 0) return '';
    return `
        <div style="margin:0 0 24px 0">
            <p style="margin:0 0 10px;color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em">${escHtml(title)}</p>
            ${instructions.map((instruction) => instruction.html).join('')}
        </div>`;
}

function emptySection(title: string, message: string): string {
    return `
        <div style="margin:0 0 24px 0">
            <p style="margin:0 0 10px;color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em">${escHtml(title)}</p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;padding:10px 14px;border-radius:4px;font-size:13px;color:#6b7280">${escHtml(message)}</div>
        </div>`;
}

function equityInstruction(order: DeltaOrder, accountName?: string): UniversalOrderInstruction {
    return buildUniversalOrderInstruction({
        accountName,
        action: order.action,
        symbol: order.symbol,
        quantity: order.quantity,
        instrumentType: 'Stock/ETF',
        referencePrice: order.price,
    });
}

function optionInstruction(order: OptionsOrder, accountName?: string): UniversalOrderInstruction {
    return buildUniversalOrderInstruction({
        accountName,
        action: order.action,
        symbol: order.symbol,
        quantity: order.quantity,
        instrumentType: order.instrumentType,
        referencePrice: order.limitPrice,
        priceEffect: order.priceEffect,
    });
}

function closeInstruction(order: CloseLeg, accountName?: string): UniversalOrderInstruction {
    return buildUniversalOrderInstruction({
        accountName,
        action: order.action,
        symbol: order.symbol,
        quantity: order.quantity,
        instrumentType: order.instrumentType,
    });
}

function strategyLabelFor(strategy: string): string {
    const strategyUpper = strategy.toUpperCase();
    return strategyUpper.includes('LEAPS') ? 'QQQ LEAPS' : 'QQQ Basic';
}

function escHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
