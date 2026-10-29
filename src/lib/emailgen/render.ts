import type { DraftSections, EditionPlan, Rendered, RenderContext } from './types';
import { ADDRESS, DISCLAIMER, FIXED_LINKS, SIM_SENTENCE, STUDY_RULES } from './editions';

const BG = '#0b0f17', FG = '#f3f5f9', MUTED = '#9aa4b5', BLUE = '#7aa2ff', CARD = '#131a28', LINE = '#26324a';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const row = (inner: string, pad = '0 0 16px 0') => `<tr><td style="padding:${pad};font-size:15px;color:${FG};line-height:1.65;">${inner}</td></tr>`;
const link = (u: string, t: string) => `<a href="${u}" style="color:${BLUE};font-weight:700;">${esc(t)}</a>`;
const button = (u: string, t: string) => `<tr><td style="padding:4px 0 20px 0;"><a href="${u}" style="display:inline-block;background:${BLUE};color:#0b0f17;font-weight:800;font-size:15px;padding:13px 22px;border-radius:8px;text-decoration:none;">${esc(t)}</a></td></tr>`;
const cardHtml = (title: string, inner: string) => `<tr><td style="padding:0 0 14px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CARD};border:1px solid ${LINE};border-radius:10px;"><tr><td style="padding:14px 16px;"><div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${BLUE};padding-bottom:6px;">${esc(title)}</div><div style="font-size:14px;color:${FG};line-height:1.65;">${inner}</div></td></tr></table></td></tr>`;
const card = (title: string, body: string) => cardHtml(title, esc(body));

function glance(plan: EditionPlan): string {
    const d = plan.facts.defensive;
    const lines = d.risk_levels.map((r) => `<div>QQQ Defensive, ${esc(r.level)} risk level: ${esc(r.text)}</div>`).join('');
    const t = plan.facts.trend;
    const trend = t.state === 'unavailable' ? '' : `<div>Trend reading: QQQ is ${t.state} its 200 day average${t.changed ? ', changed since the last reading' : ', unchanged since the last reading'}.</div>`;
    const status = d.status === 'VERIFIED' ? '' : '<div>No new instruction today. The model run did not complete its data checks. This is not a confirmation that anything is unchanged.</div>';
    return `<div style="font-size:14px;color:${FG};line-height:1.7;">${status}${plan.status_fallback ? '' : lines}${plan.status_fallback ? '' : trend}<div>QQQ LEAPS: ${esc(plan.facts.leaps.sentence)}</div></div>`;
}

function recordCard(r: RenderContext['record_lines']): string {
    const l = (k: string, v: string) => `<div><span style="color:${MUTED};">${k}</span> ${esc(v)}</div>`;
    return `<tr><td style="padding:0 0 14px 0;font-size:12px;color:${MUTED};line-height:1.6;">${l('Research record.', '')}${l('Facts run', r.facts_run_id)}${l('Facts hash', r.facts_hash)}${l('Defensive cutoff', r.defensive_cutoff)}${l('LEAPS cutoff', r.leaps_cutoff)}${l('Model file hash', r.model_file_hash)}${l('Mapping version', r.mapping_version)}${l('Feed', r.feed)}${l('Corrections', r.corrections)}</td></tr>`;
}

function fixedLinks(): string {
    return `<tr><td style="padding:6px 0 16px 0;font-size:13px;color:${MUTED};line-height:1.9;">${link(FIXED_LINKS.plans, 'Plans and pricing')} &middot; ${link(FIXED_LINKS.study, 'Apply to the study program')} &middot; ${link(FIXED_LINKS.simulation, 'QQQ LEAPS two year simulation')} &middot; ${link(FIXED_LINKS.home, 'trademind.bot')}</td></tr>`;
}

function footer(c: RenderContext): string {
    return `<tr><td style="padding:14px 0 0 0;border-top:1px solid ${LINE};font-size:11px;color:${MUTED};line-height:1.6;">${esc(DISCLAIMER)}<br><br>${esc(ADDRESS)}<br><a href="${c.unsubscribe_url}" style="color:${MUTED};">Unsubscribe</a> &middot; <a href="${c.preferences_url}" style="color:${MUTED};">Preferences</a></td></tr>`;
}

const SUBJECTS: Record<string, (p: EditionPlan) => string> = {
    weekly_free: (p) => `Flight Plan: week of ${p.date_label}`,
    outreach_weekly: (p) => `A sample of the TradeMind Flight Plan, week of ${p.date_label}`,
    daily_quiet: (p) => `TradeMind daily, ${p.date_label}`,
    daily_action: (p) => `TradeMind daily instruction, ${p.date_label}`,
};

export function renderEdition(plan: EditionPlan, d: DraftSections, ctx: RenderContext): Rendered {
    const daily = plan.edition_type.startsWith('daily');
    const goalUrl = plan.goal.url.replace('{{token}}', ctx.token_placeholder);
    const parts: string[] = [];
    parts.push(`<tr><td style="padding:0 0 18px 0;font-size:13px;font-weight:800;color:${FG};">TradeMind<span style="color:${BLUE};">.bot</span></td></tr>`);
    parts.push(`<tr><td style="padding:0 0 6px 0;font-size:${daily ? 22 : 26}px;font-weight:800;color:${FG};line-height:1.2;">${daily ? 'Daily' : 'Flight Plan'}: <span style="color:${BLUE};">${esc(plan.date_label)}</span></td></tr>`);
    parts.push(`<tr><td style="padding:0 0 14px 0;font-size:13px;color:${MUTED};">Risk first. Clear rules. Patient investing.</td></tr>`);
    parts.push(row(esc(d.hook)));
    parts.push(cardHtml('At a glance', glance(plan)));
    if (plan.edition_type === 'outreach_weekly') parts.push(button(goalUrl, plan.goal.label));
    if (!daily) {
        parts.push(card('Market weather', d.cards.market_weather));
        parts.push(card('Model readout', d.cards.copilot_readout));
        parts.push(card('Flight plan', d.cards.flight_plan));
        parts.push(card('Turbulence test', d.cards.turbulence_test));
        parts.push(row(esc(SIM_SENTENCE), '0 0 12px 0'));
    } else {
        parts.push(card('Why this matters', d.cards.copilot_readout));
        parts.push(card('Turbulence test', d.cards.turbulence_test));
    }
    parts.push(button(goalUrl, plan.goal.label));
    parts.push(row(esc('Study program rules: ' + STUDY_RULES), '0 0 12px 0'));
    parts.push(fixedLinks());
    parts.push(row('P.S. ' + esc(d.ps), '0 0 14px 0'));
    if (!daily) parts.push(recordCard(ctx.record_lines));
    parts.push(footer(ctx));
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>TradeMind</title></head><body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><div style="display:none;max-height:0;overflow:hidden;color:${BG};">${esc(d.preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};"><tr><td align="center" style="padding:24px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">${parts.join('')}</table></td></tr></table></body></html>`;
    const text = html.replace(/<style[^]*?<\/style>/g, '').replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g, '$2 ($1)').replace(/<\/(tr|div|p)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&middot;/g, '|').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
    return { subject: SUBJECTS[plan.edition_type](plan), html, text };
}
