/** Checklist wording shared by the checklist page and the adviser issue page. No imports. */
export const CHECKLIST_TITLE = 'Five benchmarks to ask for before a QQQ strategy goes into a client plan';

export const CHECKLIST_ITEMS: { name: string; question: string }[] = [
    { name: 'Buy and hold QQQ', question: 'Does the strategy add value over plain market exposure?' },
    { name: 'A 2x leveraged QQQ ETF', question: 'Does the options structure beat simple packaged leverage?' },
    { name: 'Static LEAPS with no model', question: 'Does the timing model add value?' },
    { name: 'Rules based PMCC with no model', question: 'Does the regime adjusted overlay add value?' },
    { name: 'QQQ plus cash at matched risk', question: 'Is the extra return just extra risk?' },
];

export const CHECKLIST_INTRO = 'If a strategy is more complex than buying QQQ or a leveraged QQQ ETF, does that complexity earn its keep? These are the five benchmarks every QQQ options strategy should face. Ask for each one, on the same dates and after costs.';
export const CHECKLIST_BETTER = 'Higher return alone is not enough. A strategy is better only if it improves results after costs on at least one of these: return per unit of drawdown, recovery time, worst rolling period, or consistency across different regimes.';
export const CHECKLIST_FOOT = 'Written by Eric Huang, Founder, TradeMind. TradeMind publishes educational research. It is not personalized investment advice. It never connects to a brokerage or places trades.';

