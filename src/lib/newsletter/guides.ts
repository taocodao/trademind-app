/** Permanent strategy guides, linked from issues and the hub approach blocks. */
export interface GuideSection {
    heading: string;
    paragraphs: string[];
}

export interface Guide {
    slug: string;
    title: string;
    description: string;
    updated: string;
    sections: GuideSection[];
}

export const GUIDE_CONTENT: Guide[] = [
    {
        slug: 'qqq',
        title: 'QQQ Guide',
        description:
            'Why one basket of 100 companies anchors the strategy: what QQQ is, what concentration costs, and how a system sizes it.',
        updated: 'September 2026',
        sections: [
            {
                heading: 'What QQQ actually is',
                paragraphs: [
                    'QQQ tracks the Nasdaq 100: the 100 largest non-financial companies listed on the Nasdaq exchange, weighted by market cap. It is not "the tech index" in a formal sense, but technology dominates it, and its top ten holdings can account for half the weight.',
                    'That weighting is momentum in disguise. Winners grow inside the index automatically, which is wonderful in a bull market and punishing in a reversal.',
                ],
            },
            {
                heading: 'Why it works for systematic options',
                paragraphs: [
                    'For options strategies the practical qualities matter most: extremely deep liquidity, tight bid-ask spreads, strikes at fine increments, weekly and longer expirations, and decades of clean price history to test against.',
                    'One underlying, understood deeply, beats a rotating cast of underlyings understood shallowly. Every rule in the system was tested on QQQ first.',
                ],
            },
            {
                heading: 'What concentration costs',
                paragraphs: [
                    'In 2022 QQQ fell roughly a third while the broader market fell less. Anyone calling QQQ "diversified" should be asked how they explain that year.',
                    'A system handles this with sizing and regime gates rather than hope: exposure is earned by conditions, capped by rule, and cut mechanically when the rules say so.',
                ],
            },
        ],
    },
    {
        slug: 'leaps',
        title: 'LEAPS Guide',
        description:
            'Long-dated deep in-the-money calls as stock replacement: selection rules, what they cost, and the ways they fail.',
        updated: 'September 2026',
        sections: [
            {
                heading: 'The core idea',
                paragraphs: [
                    'A LEAPS call is a call option with a year or more to expiration. A deep in-the-money LEAPS call, delta 0.70 or higher, moves almost dollar-for-dollar with the underlying while costing a fraction of the share price.',
                    'Compared to owning shares, the trade has a defined maximum loss (the premium paid), requires far less capital, and carries no margin call. The trade-off: time decay, and no dividends.',
                ],
            },
            {
                heading: 'Selection rules',
                paragraphs: [
                    'Three rules do most of the work. Delta at 0.70 or above so the option tracks the stock. Expiry 12 months or more out so decay stays slow and a bad stretch is survivable. Liquidity high enough that entering and exiting does not surrender the edge to the spread.',
                    'Entries only happen when the full signal gate agrees: momentum, trend, volatility, regime, and model confidence.',
                ],
            },
            {
                heading: 'How LEAPS lose money',
                paragraphs: [
                    'When the underlying falls, the LEAPS call loses with it, and the premium is real money. A slow grind down is the worst case: the position bleeds value while never triggering a dramatic exit.',
                    'That is why exits are mechanical and losses are cut at defined levels. The premium is the cost of defined risk, not a promise of safety.',
                ],
            },
        ],
    },
    {
        slug: 'pmcc',
        title: 'PMCC Guide',
        description:
            'Selling calls against LEAPS positions: the honest trade-off, the gating rules, and why income autopilot fails.',
        updated: 'September 2026',
        sections: [
            {
                heading: 'What a PMCC is',
                paragraphs: [
                    'A poor man\'s covered call pairs a long LEAPS call (the stock replacement) with a short call sold against it at a higher strike and nearer expiry. The short call collects premium while the LEAPS provides the upside exposure.',
                    'You are trading upside above the short strike for a certain, small payment now. That is the whole deal. Nothing about it is free.',
                ],
            },
            {
                heading: 'The trade-off, stated plainly',
                paragraphs: [
                    'In flat or slowly rising markets, the short call wins quietly month after month. In a sharp rally, it loses loudly: the LEAPS runs and the short call gives back much of the move.',
                    'Selling calls habitually, every month regardless of conditions, systematically truncates your best months to smooth your average ones. Sometimes that trade is worth making. It must be made on purpose.',
                ],
            },
            {
                heading: 'Our gating rules',
                paragraphs: [
                    'The overlay is volatility-gated, not habitual. The system sells calls only when implied volatility, trend, and model confidence say follow-through is less likely. When the gate says no, no call is sold.',
                    'Rolls and assignments follow written rules too: when to roll, how far, and when to accept assignment math instead. The short call is insurance mechanics around the LEAPS engine, never the engine itself.',
                ],
            },
        ],
    },
    {
        slug: 'smh-puts',
        title: 'SMH Put Sleeve Guide',
        description:
            'Selling puts on the semiconductor ETF: why it is a separate strategy with its own budget, not a hedge for QQQ.',
        updated: 'September 2026',
        sections: [
            {
                heading: 'Why semiconductors',
                paragraphs: [
                    'SMH holds the major chip names. The sector carries high implied volatility, so puts pay meaningful premium, and its long-run demand drivers (compute, automotive, industrial) are real.',
                    'High premium is not free money; it is the market pricing genuine drawdown risk in a cyclical, concentrated sector.',
                ],
            },
            {
                heading: 'Why it is not a QQQ hedge',
                paragraphs: [
                    'A hedge pays when the main book loses. A short put loses when the underlying falls, and semiconductors fall hardest exactly when QQQ falls. Correlation between the two snaps toward one in selloffs.',
                    'The sleeve is therefore run as its own strategy with its own entry conditions and its own capital budget, sized inside the combined tech exposure cap.',
                ],
            },
            {
                heading: 'Standing rules',
                paragraphs: [
                    'Puts are sold at rules-based strikes, only when the entry conditions agree, with cash reserved to take assignment if assigned. Assignment is a planned outcome, not an accident.',
                    'Losses are cut at defined levels. The sleeve stands down in regimes where the gate says premium does not compensate for the risk. Its results are tracked separately so it has to justify its own allocation.',
                ],
            },
        ],
    },
];

export function getGuide(slug: string): Guide | undefined {
    return GUIDE_CONTENT.find((g) => g.slug === slug);
}
