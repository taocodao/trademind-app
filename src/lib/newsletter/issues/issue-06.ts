export default {
    number: 6,
    slug: 'what-ml-can-and-cannot-do',
    title: 'What Machine Learning Can and Cannot Do for Investors',
    subtitle: 'Machine learning can support better investment research, but it should never be sold as certainty.',
    publishDate: '2026-09-10',
    readTime: '7 min',
    tags: ['Machine Learning', 'Model Risk', 'Investor Education'],
    excerpt:
        'Machine learning can support better investment research, but it should never be sold as certainty.',
    emailSubject: 'What machine learning can and cannot do for investors',
    previewText: 'ML can improve research discipline, but it should never be sold as certainty.',
    deepLinks: [
        { href: '/newsletter/research/ml-framework', label: 'ML Framework' },
        { href: '/newsletter/research/ml-framework#limitations', label: 'Model Limitations' },
    ],
    body: `
Machine learning can be useful in investment research, but only when its role is clearly defined. The strongest use cases are classification, ranking, filtering, and regime interpretation. The weakest use case is pretending the model can remove uncertainty from markets.

## What ML can help with

- Identifying recurring market conditions
- Ranking signals or candidates
- Separating stronger from weaker setups
- Structuring a repeatable research workflow

## What ML cannot responsibly promise

- Consistent outperformance by default
- Reliable market prediction under all conditions
- Freedom from drawdowns
- Certainty about future returns

## Why interpretation matters

A model output is not a finished investment decision. It is one layer of evidence that needs to be checked against market structure, options behavior, position sizing, and downside constraints.

## A better retail framework

- Use ML to organize evidence
- Use rules to size and structure exposure
- Use risk controls to survive error
- Use review loops to improve over time
    `.trim(),
};
