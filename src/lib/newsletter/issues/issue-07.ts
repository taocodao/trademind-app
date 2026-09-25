export default {
    number: 7,
    slug: 'backtest-assumptions-must-survive-scrutiny',
    title: 'Backtest results only matter if the assumptions survive scrutiny',
    subtitle: 'Why validation matters more than headline CAGR',
    publishDate: '2026-09-16',
    readTime: '6 min',
    tags: ['Backtest Audit', 'Risk Management'],
    excerpt:
        'A 55% backtested annual return means nothing until you ask how fills, slippage, and real quotes were handled. We publish the whole stack so you can check it.',
    deepLinks: ['/newsletter/research/backtest-validation'],
    body: `
## The Question

Every signal seller shows a beautiful backtest. How do you tell a tested strategy from a tuned one?

## Market Regime

Backtests fail in predictable ways: fills assumed at prices nobody got, no commissions, no slippage on options spreads, parameters tuned until the past looks perfect. The chart goes up and to the right because it was built to.

## Model Lens

Our published record is priced with a math model, not live quotes, and we say so on the same line as the number. The headline: 55.1% backtested annual return, January 2021 to August 2026, 1,570 fills. Then the reconciliation, printed next to it: a 15-month real-quote test of the same rules drew down 30.4% where the model's window showed 14.5%. Both numbers are ours. Both are published.

*Hypothetical or simulated performance results have inherent limitations. Past performance, real or simulated, does not guarantee future results.*

## Strategy Insight

Validation is a stack, not a chart: walk-forward testing so no parameter sees the data it is judged on, cross-validation across 21 recombined sub-windows (the rules held up in 18), and cost assumptions written down before the run, not after.

## Risk Desk

The honest question is never "how high is the CAGR?" It is "what happens to this system in 2022?" If the seller cannot answer with numbers and a ledger, the backtest is decoration.

## Takeaway

Trust backtests that publish their assumptions, their costs, and their failures. The full methodology, stress tests, and limitations are permanent on the backtest validation page, and every fill is in the public ledger.
`,
} as const;
