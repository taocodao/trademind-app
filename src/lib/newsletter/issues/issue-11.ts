export default {
    number: 11,
    slug: 'delta-budgeting-sizing-leverage-on-purpose',
    title: 'Delta Budgeting: Sizing Leverage on Purpose',
    subtitle: 'Think in share-equivalents, not contracts.',
    publishDate: '2026-10-22',
    readTime: '6 min',
    tags: ['LEAPS', 'Risk Management', 'Systematic Investing'],
    excerpt:
        'The capital you paid for an option is not the same as the exposure you carry. Delta budgeting is how you size leverage on purpose instead of by accident.',
    emailSubject: 'The number that matters more than how many contracts you hold',
    previewText: 'Think in share-equivalents, not contracts.',
    deepLinks: [
        { href: '/newsletter/research/risk-framework', label: 'Position sizing and exposure limits' },
        { href: '/newsletter/guides/leaps', label: 'LEAPS Guide' },
    ],
    body: `
How much QQQ exposure do you actually have?

## The concept

A LEAPS call with a delta of 0.80 behaves roughly like owning 80 shares of QQQ for small price moves. Ten contracts at that delta is about 800 share-equivalents. The capital you paid is not the same as the exposure you carry, and that gap is where leverage becomes dangerous.

## A delta budget

Instead of asking "How many contracts can I afford?", set limits like these:

- **Target exposure:** what share-equivalent QQQ exposure fits your portfolio and how much drawdown you can tolerate.
- **Net delta:** long LEAPS delta, minus short-call delta, plus short-put delta. Remember that a short put adds long exposure.
- **Combined technology exposure:** QQQ and SMH tend to fall together, so count both against one combined budget.
- **Premium at risk:** the total you could lose if the long options expired worthless.

## A worked frame

Say your portfolio would have the equivalent of 100% QQQ exposure at full allocation. A disciplined framework then sets a ceiling, a normal range and a defensive floor, and lets the regime model move exposure between them. The model adjusts exposure inside fixed limits. It never removes the limits.

## TradeMind application

TradeMind tracks net delta, short-put exposure and combined QQQ and SMH exposure as one number. That way, a premium overlay cannot quietly push total risk past its ceiling.

## Strategy Integrity Check

Ask: "If QQQ falls 20% next month, what is my estimated loss across all positions together?" If you cannot answer within a few seconds, you are not budgeting delta.
    `.trim(),
};
