export default {
    number: 7,
    slug: 'backtests-only-matter-if-assumptions-survive',
    title: 'Backtests Only Matter If the Assumptions Survive',
    subtitle: 'Backtest results deserve attention only after assumptions, costs, slippage, and validation have been stress-tested.',
    publishDate: '2026-09-17',
    readTime: '8 min',
    tags: ['Backtest Validation', 'Methodology', 'Research Audit'],
    excerpt:
        'Backtest results deserve attention only after assumptions, costs, slippage, and validation have been stress-tested.',
    emailSubject: 'Backtests only matter if the assumptions survive',
    previewText: 'CAGR alone is not enough. Trust begins with assumptions, validation, and transparency.',
    deepLinks: [
        { href: '/newsletter/research/backtest-validation', label: 'Backtest Validation' },
        { href: '/newsletter/research/backtest-validation#assumptions', label: 'Methodology and Assumptions' },
    ],
    body: `
Backtests can be useful research tools, but they are often presented as if a single attractive output proves a strategy is ready for real money. That is backwards. The headline number is the last thing to trust, not the first.

## What usually gets missed

- Execution assumptions
- Bid-ask spreads
- Rolling logic
- Assignment handling
- Position overlap
- Transaction costs
- In-sample versus out-of-sample separation

## The right question

Do the results still hold up after you make the assumptions less flattering and more realistic? If not, the backtest may be a story, not a robust strategy.

## Validation checklist

- Compare against simpler benchmarks
- Stress slippage assumptions
- Separate training from evaluation periods
- Test parameter sensitivity
- Document every meaningful rule

## How TradeMind uses this

The goal is not to publish the prettiest number. The goal is to make the research process inspectable so readers understand what the strategy depends on and where it can fail.
    `.trim(),
};
