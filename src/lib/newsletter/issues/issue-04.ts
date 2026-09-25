export default {
    number: 4,
    slug: 'pmcc-is-not-free-income',
    title: 'PMCC Is Not Free Income',
    subtitle: 'The poor man\'s covered call converts part of your upside into premium, but it also introduces new management obligations.',
    publishDate: '2026-08-27',
    readTime: '6 min',
    tags: ['PMCC', 'Risk Management'],
    excerpt:
        'The poor man\'s covered call is a managed trade-off, not a shortcut to effortless income.',
    deepLinks: [
        { href: '/newsletter/guides/pmcc', label: 'Full PMCC guide' },
        { href: '/newsletter/research/risk-framework', label: 'Assignment, roll, and structure risk' },
    ],
    body: `
The poor man's covered call is one of the most misunderstood options structures in retail investing. It is often marketed as a clever way to collect income while keeping upside exposure. That description is incomplete enough to be dangerous.

A PMCC is a structured trade-off. The investor uses a long-dated call to create directional exposure, then sells a shorter-dated call against it to collect premium. That premium may help offset cost, but it is not free yield. It comes with capped upside, assignment management, strike risk, and timing risk.

## What investors like about PMCC

- Lower capital outlay than a classic covered call
- Ability to generate premium
- Flexible strike and expiration design
- Potential fit for growth-oriented underlyings such as QQQ

## What investors often miss

- The short call can cap upside during strong moves
- Roll decisions matter
- Assignment dynamics create operational complexity
- The long call is still exposed to time and volatility changes
- Premium does not make the position low-risk

## Why this matters in TradeMind's framework

TradeMind does not frame PMCC as an income product. It frames PMCC as a conditional overlay inside a broader systematic process. That means the short call is not sold just because premium exists. It is sold when the regime, exposure, and reward trade-off make sense relative to the base thesis.

A systematic investor should never sell premium without knowing what is being given up in return.
`,
} as const;
