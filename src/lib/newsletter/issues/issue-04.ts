export default {
    number: 4,
    slug: 'pmcc-is-not-free-income',
    title: 'PMCC Is Not Free Income',
    subtitle: 'PMCC changes the return distribution of a position, but premium comes with management obligations and trade-offs.',
    publishDate: '2026-08-27',
    readTime: '6 min',
    tags: ['PMCC', 'Options', 'Income Strategies', 'Portfolio Strategy'],
    excerpt:
        'PMCC changes the return distribution of a position, but premium comes with management obligations and trade-offs.',
    emailSubject: 'PMCC is not free income',
    previewText: 'Premium may look attractive, but PMCC is a managed trade-off, not a free return source.',
    deepLinks: [
        { href: '/newsletter/guides/pmcc', label: 'PMCC Guide' },
        { href: '/risk-disclosure', label: 'Options Risk FAQ' },
    ],
    body: `
The poor man's covered call is often introduced as a capital-efficient way to generate premium while keeping upside exposure. That description is incomplete. PMCC works by changing the shape of the position, not by creating extra return out of nowhere.

## What PMCC does well

- Converts some upside into premium
- Uses less capital than a traditional covered call structure
- Can fit a systematic options overlay process

## What investors often miss

- Upside can be capped or impaired
- Assignment and roll decisions matter
- The long call and short call interact in ways many retail traders oversimplify
- Position management is part of the strategy, not an optional afterthought

## The better framing

PMCC should be seen as a managed return-shaping tool. The key question is not how much premium it brings in. The key question is whether that premium justifies the trade-offs under the current market regime.

## Before using PMCC, define

- Long-call selection rule
- Short-call strike rule
- Roll threshold
- Max tolerated upside sacrifice
- Exit and assignment plan
    `.trim(),
};
