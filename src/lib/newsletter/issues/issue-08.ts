export default {
    number: 8,
    slug: 'risk-framework-drawdown-exposure-discipline',
    title: 'Building a risk framework around drawdown, exposure, and discipline',
    subtitle: 'Returns are what remain after risk is controlled. These are the limits that keep a strategy alive to compound.',
    publishDate: '2026-09-23',
    readTime: '7 min',
    tags: ['Risk Management', 'Systematic Investing'],
    excerpt:
        'One third of the account per position, three positions max, 5% cash reserve, losers cut at twice the credit received. Simple limits, enforced without negotiation.',
    deepLinks: ['/newsletter/research/risk-framework'],
    body: `
## The Question

Most investors think about returns first and risk second. What happens when you design the system the other way around?

## Market Regime

Every strategy has a drawdown waiting for it. The only choice is whether you meet it with a plan or with hope. A 30% drawdown needs a 43% gain to recover; a 50% drawdown needs 100%. Risk control is not about avoiding losses. It is about keeping losses small enough that recovery is arithmetic, not a miracle.

## Model Lens

The model's job ends at ranking and veto. Risk limits live in a separate layer the model cannot override. That separation is deliberate: a confident model on a bad streak is exactly when limits matter most.

## Strategy Insight

The working rules are simple enough to say in one breath: one third of the account per position, three positions at most, 5% of the account always in cash, and every loser cut at twice the credit received. Each rule exists because a specific failure mode taught it.

## Risk Desk

Exposure is also capped across sleeves: QQQ LEAPS, the PMCC overlay, and any semiconductor put positions are counted together, so "diversified" positions that fall together never exceed one budget. When limits are hit, the system reduces, pauses, or stands down, in that order.

## Takeaway

Discipline you can describe in one breath is discipline you can follow on the worst day of the year. The full framework, including reduction rules and exposure caps, is permanent on the risk framework page.
`,
} as const;
