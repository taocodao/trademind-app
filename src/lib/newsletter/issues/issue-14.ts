export default {
    number: 14,
    slug: 'inside-the-regime-model-what-the-machine-decides',
    title: 'Inside the Regime Model: What the Machine Actually Decides',
    subtitle: 'Telling market regimes apart is more realistic than calling tops.',
    publishDate: '2026-10-25',
    readTime: '7 min',
    tags: ['Machine Learning', 'Systematic Investing', 'Backtest Audit'],
    excerpt:
        "The model does not predict QQQ's price. It classifies the current environment and decides how much exposure to carry. Here is what it does, and what keeps it honest.",
    emailSubject: "The AI doesn't predict QQQ. It decides how much to hold.",
    previewText: 'Telling market regimes apart is more realistic than calling tops.',
    deepLinks: [
        { href: '/newsletter/research/ml-framework', label: 'ML regime framework' },
    ],
    body: `
What should machine learning actually do in a retail investment strategy?

## Prediction vs. classification

Forecasting next week's QQQ price is very hard, and the noise usually wins. Classifying the current environment is easier to defend. Is the trend strong or fading? Is volatility calm or expanding? Is participation broad or narrow? Are rates working for growth stocks or against them?

## How the regime model is used

- **Strong trend, calm volatility:** exposure sits near the top of the range; fewer short calls, with strikes further out.
- **Neutral or choppy:** the middle of the range; more premium collection.
- **Stress or expanding volatility:** the defensive floor; fewer new short puts and less SMH exposure.

## What protects the model from itself

- **Walk-forward testing:** the model is trained on past data and tested on periods it has never seen.
- **Feature discipline:** it uses a limited set of inputs with a clear economic rationale.
- **Parameter stability:** the results should not fall apart when settings change slightly.
- **Drift monitoring:** live behavior is compared with backtest behavior.

These are the main defenses against the overfitting problem that wrecks many indicator-based systems.

## TradeMind application

Every TradeMind regime call comes with a confidence level and the inputs behind it. When signals disagree, the framework treats that as a reason to reduce exposure, not to make a bigger bet.

## Strategy Integrity Check

Ask: "Was this model tested on data it never trained on?" If the answer is no, the result is a description of the past, not evidence of an edge.
    `.trim(),
};
