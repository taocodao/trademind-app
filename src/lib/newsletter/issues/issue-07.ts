export default {
    number: 7,
    slug: 'backtest-results-only-matter-if-assumptions-survive',
    title: 'Backtest Results Only Matter If the Assumptions Survive',
    subtitle: 'A high CAGR is persuasive. A durable methodology is more important.',
    publishDate: '2026-09-17',
    readTime: '8 min',
    tags: ['Backtest Audit', 'Risk Management'],
    excerpt:
        'A strong backtest is not a conclusion. It is the start of a harder validation conversation.',
    deepLinks: [
        { href: '/newsletter/research/backtest-validation', label: 'Full backtest validation' },
        { href: '/newsletter/research/backtest-validation', label: 'Methodology and assumptions' },
    ],
    body: `
Retail investors are often shown one number first: return. That number can be so compelling that it crowds out every other question. But a backtest is not just an output. It is a chain of assumptions.

If any part of that chain is weak, the result may be far less meaningful than it appears. This is especially true in options-based strategies, where execution, spread assumptions, roll logic, assignment behavior, and volatility conditions can materially change outcomes.

## What must be disclosed

- Start and end dates
- In-sample and out-of-sample boundaries
- Signal rules
- Position sizing
- Option selection rules
- Commission and slippage assumptions
- Assignment handling
- Cash and collateral treatment
- Benchmark comparison

## What investors should ask first

- How sensitive are results to different execution assumptions?
- Does the result still hold under stress or parameter changes?
- How much of the outcome depends on a favorable market regime?
- What happens when the clean assumptions become messy?

## How TradeMind uses backtests

TradeMind uses backtests as research evidence, not marketing bait. A strong methodology page always sits behind the summary result, and the newsletter points readers there instead of repeating long assumption tables in email.

The job of the newsletter is to educate the reader about what makes the result trustworthy or fragile.

*Hypothetical or simulated performance results have inherent limitations. Past performance, real or simulated, does not guarantee future results.*
`,
} as const;
