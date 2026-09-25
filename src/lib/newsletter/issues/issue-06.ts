export default {
    number: 6,
    slug: 'what-machine-learning-can-and-cannot-do',
    title: 'What machine learning can and cannot do for investors',
    subtitle: 'A useful model narrows decisions and vetoes bad ones. It does not see the future, and it should never be asked to.',
    publishDate: '2026-09-09',
    readTime: '7 min',
    tags: ['Machine Learning', 'Systematic Investing'],
    excerpt:
        'Our model ranks setups and can veto a trade, but it cannot start one. Knowing exactly where the model ends is what makes the rest of the system trustworthy.',
    deepLinks: ['/newsletter/research/ml-framework'],
    body: `
## The Question

Every fintech pitch now includes "AI". What does machine learning actually contribute to an investment process, and where does it stop?

## Market Regime

Markets are non-stationary: the statistical patterns of one decade decay in the next. Any model trained on history is always partially out of date. A useful system accepts this and asks the model a narrow question, not "what will the market do?"

## Model Lens

Our model does two jobs. It classifies the current regime and it ranks candidate setups against historical analogs. On our trade gates, one of the seven conditions is a confidence score from the model. That score can veto a trade. It cannot start one. The final decision always comes from the full rule set, not from the model alone.

## Strategy Insight

The inputs are deliberately boring: price, trend, volatility, breadth, regime labels. No news sentiment scraping, no alternative data exhaust. Boring inputs age more slowly and are easier to audit. The model is retrained on a schedule, and every version is logged so a past decision can be traced to the exact model that informed it.

## Risk Desk

The biggest ML risk is overconfidence: a smooth backtest curve invites the belief that the model knows something. It does not. It knows history. That is why position sizing and drawdown limits live outside the model, in rules the model cannot touch.

## Takeaway

Machine learning earns its place by vetoing and ranking, not by predicting. The moment a model can start trades by itself, accountability ends. The full framework, including what the model cannot do, is on the ML framework page.
`,
} as const;
