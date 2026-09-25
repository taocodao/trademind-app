/** Topic tags for newsletter issues. An issue can carry more than one. */
export const TOPICS = [
    'Systematic Investing',
    'QQQ Research',
    'LEAPS',
    'PMCC',
    'SMH Put Sleeve',
    'Machine Learning',
    'Backtest Audit',
    'Risk Management',
] as const;

export type Topic = (typeof TOPICS)[number];

/** Permanent research pages and strategy guides that issues deep-link to. */
export const RESEARCH_PAGES = [
    {
        slug: 'backtest-validation',
        title: 'Backtest Validation',
        blurb: 'Methodology, assumptions, stress tests, and limitations behind every performance number we publish.',
        href: '/newsletter/research/backtest-validation',
    },
    {
        slug: 'ml-framework',
        title: 'ML Framework',
        blurb: 'What the model classifies and ranks, its inputs, how often it is retrained, and what it cannot do.',
        href: '/newsletter/research/ml-framework',
    },
    {
        slug: 'risk-framework',
        title: 'Risk Framework',
        blurb: 'Drawdown limits, exposure caps, and the rules for when to reduce, pause, or scale risk.',
        href: '/newsletter/research/risk-framework',
    },
] as const;

export const GUIDES = [
    {
        slug: 'qqq',
        title: 'QQQ Guide',
        blurb: 'Why one basket of 100 companies is the engine, and what concentration really costs.',
        href: '/newsletter/guides/qqq',
    },
    {
        slug: 'leaps',
        title: 'LEAPS Guide',
        blurb: 'How long-dated calls replace stock exposure with defined, limited capital at risk.',
        href: '/newsletter/guides/leaps',
    },
    {
        slug: 'pmcc',
        title: 'PMCC Guide',
        blurb: 'Selling calls against LEAPS: a managed trade-off, not free income.',
        href: '/newsletter/guides/pmcc',
    },
    {
        slug: 'smh-puts',
        title: 'SMH Put Sleeve Guide',
        blurb: 'Why selling puts on semiconductors is its own risk, not a hedge for QQQ.',
        href: '/newsletter/guides/smh-puts',
    },
] as const;
