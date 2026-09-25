export default {
    number: 5,
    slug: 'smh-put-selling-not-hedging-qqq',
    title: 'Why selling puts on SMH is not the same as hedging QQQ',
    subtitle: 'Two tickers that move together in bull markets can still break your account in different ways.',
    publishDate: '2026-09-02',
    readTime: '6 min',
    tags: ['SMH Put Sleeve', 'Risk Management'],
    excerpt:
        'SMH and QQQ overlap heavily, so a short-put sleeve on semiconductors is not protection for a QQQ book. It is a second, correlated risk that has to earn its own allocation.',
    deepLinks: ['/newsletter/guides/smh-puts'],
    body: `
## The Question

If you already run a QQQ strategy, does adding put selling on SMH diversify it, or double it?

## Market Regime

SMH holds the semiconductor names that also drive much of QQQ. In calm uptrends they drift together and selling puts on SMH feels like free extra yield. In selloffs the correlation snaps toward one: both fall, the semis often fall faster, and the "hedge" turns out to be the same trade wearing different clothes.

## Model Lens

A real hedge pays you when the main book loses. A short put loses when the underlying falls, which is exactly when the QQQ book is also losing. The model therefore treats an SMH put sleeve as its own strategy with its own entry conditions, not as a hedge and not as a bolt-on.

## Strategy Insight

The sleeve has a logic of its own: semiconductors carry high implied volatility, so puts pay meaningful premium, and the sector's demand cycle has real long-run tailwinds. Sold at rules-based strikes, with cash reserved to take assignment, it can stand on its own numbers. But it must justify itself on its own track record, not borrow credibility from QQQ.

## Risk Desk

Correlated sleeves are sized as one risk. Our framework caps combined technology and semiconductor exposure, because two positions that fall together are one position with extra steps.

## Takeaway

Selling SMH puts is a separate risk that must carry its own weight, with its own rules and its own limits. Calling it a hedge does not make it one. Mechanics in the SMH put sleeve guide.
`,
} as const;
