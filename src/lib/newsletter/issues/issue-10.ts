export default {
    number: 10,
    slug: 'where-return-actually-comes-from',
    title: 'Where Return Actually Comes From',
    subtitle: 'Market exposure, leverage, option premium and timing are four separate bets.',
    publishDate: '2026-10-15',
    readTime: '7 min',
    tags: ['QQQ Research', 'Backtest Audit', 'Systematic Investing'],
    excerpt:
        'When a strategy beats QQQ, what actually produced the extra return? Every options strategy draws on four engines, and a headline number without a breakdown is marketing, not research.',
    emailSubject: 'Your strategy has four return engines. Do you know which one is working?',
    previewText: 'Market exposure, leverage, option premium and timing are four separate bets.',
    deepLinks: [
        { href: '/newsletter/research/backtest-validation', label: 'Return attribution methodology' },
    ],
    body: `
When a strategy beats QQQ, what actually produced the extra return?

## The four engines

Any options strategy built on QQQ gets its return from some mix of these:

- **Market exposure:** you are paid for owning growth-oriented large caps. What can go wrong: a prolonged technology drawdown.
- **Leverage:** capital efficiency from LEAPS. What can go wrong: losses grow at the same rate as gains.
- **Option premium:** selling calls and puts. What can go wrong: capped upside and sharp losses in fast moves.
- **Timing:** changing exposure across market regimes. What can go wrong: overfitting and changes in how the market behaves.

## Why it matters

Most investors who "found a better strategy" just found more leverage. Leverage is not skill. It makes the same bet bigger. To judge a strategy honestly, you have to separate the engines.

## Applying it to TradeMind

TradeMind's research backtest covered 2019 to 2026. Under the tested assumptions, it produced a reported 55.1% CAGR (compound annual growth rate) with a -14.5% maximum drawdown. That figure is hypothetical and unaudited. Here is how to read it:

- How much came from QQQ simply rising?
- How much came from LEAPS leverage?
- How much came from PMCC (poor man's covered call) and SMH (semiconductor ETF) premium?
- How much came from the ML regime model choosing when to hold more or less?

TradeMind's methodology page splits performance into exactly these components. A headline CAGR with no breakdown is a marketing number. A breakdown is research.

## Strategy Integrity Check

Ask: "What would this strategy have returned with the timing model turned off?" If the answer is close to the full result, the AI is not what is earning the return.
    `.trim(),
};
