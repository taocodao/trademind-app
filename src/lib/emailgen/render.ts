import type { DraftSections, EditionPlan, Rendered, RenderContext } from './types';
import { ADDRESS, DISCLAIMER, FIXED_LINKS } from './editions';

const BG = '#0b0f17', PANEL = '#121a2b', PANEL2 = '#0f1626', FG = '#f3f5f9', MUTED = '#9aa4b5', BLUE = '#7aa2ff', LINE = '#26324a', GREEN = '#5fd39a', AMBER = '#f2c14e';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Table based button that renders in Outlook, Gmail and Apple Mail. */
function btn(url: string, label: string, kind: 'primary' | 'outline' = 'primary', full = false): string {
    const bg = kind === 'primary' ? BLUE : 'transparent';
    const color = kind === 'primary' ? '#0b0f17' : BLUE;
    const border = kind === 'primary' ? BLUE : '#3a4a70';
    return `<table role="presentation" cellpadding="0" cellspacing="0" ${full ? 'width="100%"' : ''} style="border-collapse:separate;"><tr><td align="center" bgcolor="${bg === 'transparent' ? PANEL : bg}" style="border-radius:10px;border:1px solid ${border};background:${bg === 'transparent' ? PANEL : bg};"><a href="${url}" style="display:block;padding:${kind === 'primary' ? '15px 26px' : '12px 16px'};font-family:${FONT};font-size:${kind === 'primary' ? 16 : 14}px;font-weight:800;color:${color};text-decoration:none;line-height:1.2;">${esc(label)}</a></td></tr></table>`;
}

const sp = (h: number) => `<tr><td style="height:${h}px;line-height:${h}px;font-size:0;">&nbsp;</td></tr>`;
const wrap = (inner: string, pad = '0') => `<tr><td style="padding:${pad};font-family:${FONT};">${inner}</td></tr>`;

function section(num: string, title: string, bodyHtml: string): string {
    return wrap(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PANEL};border:1px solid ${LINE};border-left:3px solid ${BLUE};border-radius:10px;"><tr><td style="padding:16px 18px;"><div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${BLUE};padding-bottom:8px;">${num} &nbsp; ${esc(title)}</div><div style="font-size:15px;color:${FG};line-height:1.7;">${bodyHtml}</div></td></tr></table>`) + sp(12);
}

function statusRow(name: string, text: string, tone: 'ok' | 'warn'): string {
    const c = tone === 'ok' ? GREEN : AMBER;
    return `<tr><td style="padding:9px 0;border-top:1px solid ${LINE};font-size:14px;color:${FG};line-height:1.5;"><span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:${c};margin-right:8px;"></span><strong>${esc(name)}</strong><br><span style="color:${MUTED};padding-left:16px;display:inline-block;">${esc(text)}</span></td></tr>`;
}

function glance(plan: EditionPlan): string {
    const d = plan.facts.defensive;
    let rows = '';
    if (d.status !== 'VERIFIED') {
        rows += statusRow('QQQ Defensive', 'No new instruction today. The model run did not complete its data checks. This is not a confirmation that anything is unchanged.', 'warn');
    } else {
        for (const r of d.risk_levels) rows += statusRow(`QQQ Defensive, ${r.level} risk level`, r.text, 'ok');
        const t = plan.facts.trend;
        if (t.state !== 'unavailable') rows += statusRow('Trend reading', `QQQ is ${t.state} its 200 day average${t.changed ? ', changed since the last reading.' : ', unchanged since the last reading.'}`, 'ok');
    }
    rows += statusRow('QQQ LEAPS', plan.facts.leaps.sentence, plan.facts.leaps.status === 'VERIFIED' ? 'ok' : 'warn');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function simTiles(): string {
    const tile = (label: string, big: string, small: string, color: string) => `<td width="50%" valign="top" style="padding:0 5px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PANEL2};border:1px solid ${LINE};border-radius:10px;"><tr><td style="padding:14px;font-family:${FONT};"><div style="font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${MUTED};">${label}</div><div style="font-size:28px;font-weight:800;color:${color};padding:4px 0;">${big}</div><div style="font-size:13px;color:${MUTED};line-height:1.5;">${small}</div></td></tr></table></td>`;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${tile('QQQ LEAPS', '+229.48%', 'Largest drop 14.59%', GREEN)}${tile('QQQ buy and hold', '+49.46%', 'Largest drop 22.88%', FG)}</tr></table><div style="font-size:12px;color:${MUTED};line-height:1.6;padding:10px 5px 0 5px;">October 14, 2024 to October 13, 2026. A simulation with model-priced options, not live trading.</div>`;
}

function studyCard(): string {
    const li = (t: string) => `<tr><td style="padding:3px 0;font-size:14px;color:${FG};line-height:1.5;">&bull;&nbsp; ${esc(t)}</td></tr>`;
    const items = ['4 months, 20 seats, applications reviewed by hand', '30 days free to start, no card', 'A short feedback questionnaire each month', 'Each completed month adds 3 months free on one strategy and one account you choose', 'Unused days are kept, and you can exit any time and keep what you earned', '30 percent off the standard price afterward, and no payment for taking part'];
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items.map(li).join('')}</table>`;
}

function linkGrid(skipUrl = ''): string {
    // A tile that repeats the main button of the email is left out; its link is already in that button.
    const cell = (u: string, t: string) => u === skipUrl ? '' : `<td width="50%" style="padding:5px;">${btn(u, t, 'outline', true)}</td>`;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cell(FIXED_LINKS.plans, 'Plans and pricing')}${cell(FIXED_LINKS.study, 'Study program')}</tr><tr>${cell(FIXED_LINKS.simulation, 'Two year simulation')}${cell(FIXED_LINKS.home, 'trademind.bot')}</tr></table>`;
}

function recordCard(r: RenderContext['record_lines']): string {
    const l = (k: string, v: string) => `<tr><td style="padding:2px 0;font-size:12px;color:${MUTED};width:130px;">${k}</td><td style="padding:2px 0;font-size:12px;color:${FG};">${esc(v)}</td></tr>`;
    return wrap(`<div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${MUTED};padding-bottom:6px;">Research record</div><table role="presentation" cellpadding="0" cellspacing="0">${l('Facts run', r.facts_run_id)}${l('Facts hash', r.facts_hash)}${l('Defensive cutoff', r.defensive_cutoff)}${l('LEAPS cutoff', r.leaps_cutoff)}${l('Model file hash', r.model_file_hash)}${l('Mapping version', r.mapping_version)}${l('Feed', r.feed)}${l('Corrections', r.corrections)}</table>`) + sp(14);
}

const SUBJECTS: Record<string, (p: EditionPlan) => string> = {
    weekly_free: (p) => `Flight Plan: week of ${p.date_label}`,
    outreach_weekly: (p) => `A sample of the TradeMind Flight Plan, week of ${p.date_label}`,
    daily_quiet: (p) => `TradeMind daily, ${p.date_label}`,
    daily_action: (p) => `TradeMind daily instruction, ${p.date_label}`,
};
const BADGE: Record<string, string> = { weekly_free: 'Weekly Flight Plan', outreach_weekly: 'Sample issue', daily_quiet: 'Daily', daily_action: 'Daily instruction' };

export function renderEdition(plan: EditionPlan, d: DraftSections, ctx: RenderContext): Rendered {
    const daily = plan.edition_type.startsWith('daily');
    const goalUrl = plan.goal.url.replace('{{token}}', ctx.token_placeholder);
    const P: string[] = [];
    P.push(wrap(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:18px;font-weight:800;color:${FG};">TradeMind<span style="color:${BLUE};">.bot</span></td><td align="right"><span style="display:inline-block;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${BLUE};border:1px solid #3a4a70;border-radius:20px;padding:5px 11px;">${BADGE[plan.edition_type]}</span></td></tr></table>`) + sp(22));
    P.push(wrap(`<div style="font-size:12px;color:${MUTED};letter-spacing:.04em;padding-bottom:6px;">${esc(plan.date_label)} &middot; Risk first. Clear rules. Patient investing.</div><div style="font-size:${daily ? 24 : 28}px;font-weight:800;color:${FG};line-height:1.25;">${esc(d.hook)}</div>`) + sp(18));
    if (plan.edition_type === 'outreach_weekly') P.push(wrap(btn(goalUrl, plan.goal.label, 'primary')) + sp(8) + wrap(`<div style="font-size:13px;color:${MUTED};line-height:1.6;">This is a sample. Press the button and you confirm on the next page.</div>`) + sp(18));
    P.push(section('01', 'At a glance', glance(plan)));
    if (!daily) {
        P.push(section('02', 'Market weather', esc(d.cards.market_weather)));
        P.push(section('03', 'Model readout', esc(d.cards.copilot_readout)));
        P.push(section('04', 'Flight plan', esc(d.cards.flight_plan)));
        P.push(section('05', 'Turbulence test', esc(d.cards.turbulence_test)));
        P.push(wrap(`<div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${BLUE};padding:6px 0 10px 0;">The two year record</div>${simTiles()}`) + sp(20));
    } else {
        P.push(section('02', 'Why this matters', esc(d.cards.copilot_readout)));
        P.push(section('03', 'Turbulence test', esc(d.cards.turbulence_test)));
    }
    if (plan.edition_type !== 'outreach_weekly') P.push(wrap(btn(goalUrl, plan.goal.label, 'primary')) + sp(20));
    P.push(section('', 'The study program', studyCard()));
    P.push(wrap(`<div style="font-size:14px;color:${FG};line-height:1.7;">P.S. ${esc(d.ps)}</div>`) + sp(16));
    P.push(wrap(linkGrid(goalUrl)) + sp(14));
    if (!daily) P.push(recordCard(ctx.record_lines));
    P.push(wrap(`<div style="border-top:1px solid ${LINE};padding-top:14px;font-size:11px;color:${MUTED};line-height:1.6;">${esc(DISCLAIMER)}<br><br>${esc(ADDRESS)}<br><a href="${ctx.unsubscribe_url}" style="color:${MUTED};">Unsubscribe</a> &middot; <a href="${ctx.preferences_url}" style="color:${MUTED};">Preferences</a></div>`));
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>TradeMind</title></head><body style="margin:0;padding:0;background:${BG};"><div style="display:none;max-height:0;overflow:hidden;color:${BG};">${esc(d.preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};"><tr><td align="center" style="padding:24px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">${P.join('')}</table></td></tr></table></body></html>`;
    const text = html.replace(/<div style="display:none[^]*?<\/div>/, '').replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g, '$2 ($1)').replace(/<\/(tr|div|p|table)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&middot;/g, '|').replace(/&bull;/g, '-').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    return { subject: SUBJECTS[plan.edition_type](plan), html, text };
}
