export default {
    number: 4,
    slug: 'pmcc-managed-trade-off',
    title: 'PMCC is not free income, it is a managed trade-off',
    subtitle: 'Selling calls against your LEAPS can smooth returns and raise your effective entry, or quietly cap your best months.',
    publishDate: '2026-08-26',
    readTime: '7 min',
    tags: ['PMCC', 'Risk Management'],
    excerpt:
        'A poor man\'s covered call sells time against a LEAPS position. Done at the wrong moment it truncates winners. Done by rule, it is insurance, not an engine.',
    deepLinks: ['/newsletter/guides/pmcc'],
    body: `
## The Question

Covered calls are sold to retail investors as free money: own the stock, sell a call, collect premium. If that were true, everyone would be rich. What is actually being traded?

## Market Regime

When you sell a call, you collect a small certain payment now in exchange for giving up upside above the strike. In flat or slowly rising markets, that trade wins quietly, month after month. In a sharp rally, it loses loudly: your stock or LEAPS runs, and your short call gives much of it back.

## Model Lens

That is why our PMCC overlay is gated, not habitual. The model sells calls only when volatility, trend, and confidence say upside follow-through is less likely. It is a decision, not a default. When the gate says no, no call is sold, period.

## Strategy Insight

Used discipline-first, the short call serves two purposes: it harvests decay while the position waits, and it effectively raises your average entry by returning premium to the account. It is insurance mechanics, not a return driver. The LEAPS position remains the engine.

## Risk Desk

The main PMCC risks are assignment math gone sloppy, rolling too late, and selling calls into strength because the premium looked juicy. Each is a process failure, which is why the overlay has rules for when to sell, when to roll, and when to stand down.

## Takeaway

A PMCC is a trade-off you manage, on purpose, with rules. The day it becomes an autopilot for income is the day it starts capping your recovery. Full structure in the PMCC guide.
`,
} as const;
