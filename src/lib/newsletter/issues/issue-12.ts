export default {
    number: 12,
    slug: 'choosing-the-leaps-strike-expiration-cost-of-time',
    title: 'Choosing the LEAPS: Strike, Expiration and the Cost of Time',
    subtitle: 'The cheaper contract is often the more expensive bet.',
    publishDate: '2026-10-21',
    readTime: '7 min',
    tags: ['LEAPS', 'QQQ Research', 'Backtest Audit'],
    excerpt:
        'Deep in the money or at the money? Which expiration? Extrinsic value is what you pay for time and uncertainty, and most investors pay too much of it.',
    emailSubject: 'Deep in-the-money or at-the-money? The trade-off most investors get wrong',
    previewText: 'The cheaper contract is often the more expensive bet.',
    deepLinks: [
        { href: '/newsletter/guides/leaps', label: 'LEAPS selection guide' },
    ],
    body: `
Which LEAPS contract gives you growth exposure without paying too much for time?

## The trade-offs

- **Deep in the money (higher delta):** moves more like the shares, with less extrinsic value lost to time decay. The cost: higher upfront capital.
- **At the money:** lower cost and more leverage per dollar. The cost: mostly extrinsic value, so more sensitive to time decay and implied volatility.
- **Longer expiration:** slower daily time decay and more time to be right. The cost: higher premium, and wider bid-ask spreads on some strikes.
- **Shorter expiration:** cheaper. The cost: time decay speeds up and there is less room for drawdowns.

## The principle

Extrinsic value is what you pay for time and uncertainty. A long-horizon growth position usually wants to own mostly intrinsic value and as little extrinsic value as practical. That is why systematic LEAPS frameworks often prefer higher-delta, longer-dated contracts over cheap at-the-money calls.

## Execution matters

On long-dated options, the bid-ask spread can quietly eat into returns. Treat backtests that assume midpoint fills with skepticism. A realistic test assumes fills closer to the less favorable side.

## TradeMind application

TradeMind uses fixed rules for delta range, minimum days to expiration and when to roll, so contract selection is not left to impulse. The research page shows how results change when these settings are moved.

## Strategy Integrity Check

Ask: "What percentage of my option premium is extrinsic value, and how much of it will decay before my thesis plays out?"
    `.trim(),
};
