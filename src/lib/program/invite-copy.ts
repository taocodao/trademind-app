/** Invite email copy for the founding program. Pure, so it can be tested and checked by the claim guard. */

export interface InviteInput { firstName: string | null; applyUrl: string; sampleUrl: string; unsubscribeUrl: string; address: string }

export const INVITE_SUBJECT = 'Join the TradeMind study preview';

export function inviteText(i: InviteInput): string {
    return [
        `Hi ${i.firstName ?? 'there'},`,
        '',
        'TradeMind is opening a small study preview, with 20 seats, for readers who follow rules based QQQ strategies.',
        '',
        'Selected readers follow the signals with a virtual account for 30 days at no charge. Each short activity you complete adds 30 more days, up to 90 days in total.',
        '',
        'No card is needed. Nothing turns into a paid plan automatically. Honest criticism is welcome, and you never need to trade, refer anyone, or write a review.',
        '',
        `Apply here: ${i.applyUrl}`,
        `See a sample daily briefing first: ${i.sampleUrl}`,
        '',
        'Every TradeMind result shown so far comes from a simulation, not live trading. You place every order yourself.',
        '',
        'Eric Huang, TradeMind',
        `${i.address}`,
        `Unsubscribe: ${i.unsubscribeUrl}`,
    ].join('\n');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function inviteHtml(i: InviteInput): string {
    const p = (t: string) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#111827;">${t}</p>`;
    return `<!doctype html><html lang="en"><body style="margin:0;padding:24px 12px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><div style="max-width:560px;margin:0 auto;">
${p(`Hi ${esc(i.firstName ?? 'there')},`)}
${p('TradeMind is opening a small study preview, with 20 seats, for readers who follow rules based QQQ strategies.')}
${p('Selected readers follow the signals with a virtual account for 30 days at no charge. Each short activity you complete adds 30 more days, up to 90 days in total.')}
${p('No card is needed. Nothing turns into a paid plan automatically. Honest criticism is welcome, and you never need to trade, refer anyone, or write a review.')}
<p style="margin:20px 0;"><a href="${i.applyUrl}" style="display:inline-block;background:#2f6bff;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:16px;">Apply to the program</a></p>
${p(`Or <a href="${i.sampleUrl}" style="color:#2f6bff;">see a sample daily briefing</a> first.`)}
${p('Every TradeMind result shown so far comes from a simulation, not live trading. You place every order yourself.')}
${p('Eric Huang, TradeMind')}
<p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#6b7280;">${esc(i.address)}<br><a href="${i.unsubscribeUrl}" style="color:#6b7280;">Unsubscribe</a></p>
</div></body></html>`;
}
