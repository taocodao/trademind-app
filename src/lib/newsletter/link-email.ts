/**
 * Subscriber email: plain text only. A short description of what is on the site and the link to it, then the
 * standard footer. No HTML and no images, because plain text with one link is what reaches the inbox.
 * Every subscriber email (welcome, weekly, daily, library issues) uses this. Pure rendering: no database or network access.
 */
export interface LinkEmailInput {
    subject: string;
    /** One or two short sentences about what the reader will find on the page. */
    description: string;
    url: string;
    firstName?: string | null;
    unsubscribeUrl: string;
    preferencesUrl?: string | null;
    address: string;
}

const DISCLAIMER = 'Educational research, not personalized investment advice. Investing involves risk, including loss.';

export function renderLinkEmail(i: LinkEmailInput): { subject: string; html: string; text: string } {
    const hi = i.firstName ? `Hi ${i.firstName},` : 'Hi,';
    const text = [
        hi, '',
        i.description, '',
        `Read it here: ${i.url}`, '',
        'Eric Huang',
        'Founder, TradeMind', '',
        'You are getting this because you subscribed to the free TradeMind brief.',
        `Unsubscribe: ${i.unsubscribeUrl}`,
        ...(i.preferencesUrl ? [`Preferences: ${i.preferencesUrl}`] : []),
        i.address,
        DISCLAIMER,
    ].join('\n');
    return { subject: i.subject, html: '', text };
}
