/** The six "Start here" sections. Order and labels match the Explore row in the retail emails. */
export type SectionKey = 'brief' | 'strategies' | 'rules' | 'challenge' | 'verify' | 'panel';

export interface SectionMeta { key: SectionKey; label: string; headline: string; blurb: string }

export const SECTION_LIST: SectionMeta[] = [
    { key: 'brief', label: 'Weekly brief', headline: 'A weekly QQQ brief, with the doubts shown', blurb: 'What the free weekly brief covers, and a sample issue to read first.' },
    { key: 'strategies', label: 'Strategies', headline: 'Two QQQ strategies, explained plainly', blurb: 'How QQQ LEAPS and QQQ Defensive work, and one simulation with its limits.' },
    { key: 'rules', label: 'Rules and plans', headline: 'The rules are written before the market moves', blurb: 'Four rules we publish, and a sample of the daily briefing.' },
    { key: 'challenge', label: 'The challenge', headline: 'Would you have kept following it?', blurb: 'Almost 11 months with no positions in the simulation. What would you have done?' },
    { key: 'verify', label: 'Verify our numbers', headline: 'Check the numbers yourself', blurb: 'The figures to match, where to find the data, and how to send what you find.' },
    { key: 'panel', label: 'Research panel', headline: 'Help shape TradeMind', blurb: 'A small panel of QQQ investors: free for 30 days, with optional tasks.' },
];

export const SECTION_KEYS = SECTION_LIST.map((s) => s.key);
export function isSection(v: string): v is SectionKey { return (SECTION_KEYS as string[]).includes(v); }

export const TASKS: { task: string; effort: string; counts: string }[] = [
    { task: 'Verify', effort: '1 to 3 hours', counts: 'You send your method and your numbers, whether they match ours or not.' },
    { task: 'Challenge', effort: '30 minutes', counts: 'You name one assumption and say why, with a source or an example.' },
    { task: 'Advise', effort: '20 minutes', counts: 'You answer a specific question about the model, such as a scenario or a rule.' },
    { task: 'Feedback', effort: '10 minutes', counts: 'You mark which lines of one briefing were unclear.' },
    { task: 'Find an error', effort: 'Varies', counts: 'We confirm a mistake in a figure, a chart or the wording.' },
];
