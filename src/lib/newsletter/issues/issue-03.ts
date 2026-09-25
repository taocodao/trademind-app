export default {
    number: 3,
    slug: 'what-leaps-add-to-systematic-strategy',
    title: 'What LEAPS actually add to a systematic strategy',
    subtitle: 'Long-dated calls are not lottery tickets. Used correctly, they are stock exposure with a fixed cost of being wrong.',
    publishDate: '2026-08-19',
    readTime: '7 min',
    tags: ['LEAPS', 'Systematic Investing'],
    excerpt:
        'A LEAPS call with a year or more to run behaves like a leveraged but controlled stock position: defined cost, no margin call, and time for a thesis to work.',
    deepLinks: ['/newsletter/guides/leaps'],
    body: `
## The Question

Why would a systematic strategy bother with options at all, when buying QQQ shares is simpler?

## Market Regime

Shares tie up capital one-for-one. In a choppy market, that capital sits exposed the whole time. A deep in-the-money LEAPS call, say 0.70 delta or higher with 12 months or more to expiry, moves almost dollar-for-dollar with the stock but costs a fraction of the share price. The difference stays in cash, and cash in a drawdown is optionality.

## Model Lens

The model does not buy LEAPS because they are exciting. It buys them when its five conditions agree: momentum, trend, volatility, regime, and confidence. The LEAPS structure simply defines the trade in advance: the most you can lose is the premium, decided before entry.

## Strategy Insight

Three selection rules do most of the work. Delta high enough that the option tracks the stock. Time long enough that decay is slow and a bad month is survivable. Liquidity good enough that entering and exiting does not donate the edge to the spread.

## Risk Desk

LEAPS still lose money when the underlying falls. The premium is real money, and a slow grind down bleeds it. That is why entries are gated by the model and exits are mechanical: losers are cut at defined levels instead of nurtured.

## Takeaway

LEAPS turn "I am long QQQ" into a trade with known cost, known max loss, and time to be right. The full mechanics, including selection rules, live in the LEAPS guide.
`,
} as const;
