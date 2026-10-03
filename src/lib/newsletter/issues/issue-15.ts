export default {
    number: 15,
    slug: 'stress-test-when-technology-falls-together',
    title: 'Stress Test: When Technology Falls Together',
    subtitle: "Concentration risk doesn't show up until everything drops at once.",
    publishDate: '2026-11-19',
    readTime: '7 min',
    tags: ['Risk Management', 'SMH Put Sleeve', 'QQQ Research'],
    excerpt:
        'What happens to a leveraged QQQ strategy with short SMH puts when technology stocks sell off together? Positions that looked diversified turn out to be one bet.',
    emailSubject: 'QQQ and semiconductors in the same storm',
    previewText: "Concentration risk doesn't show up until everything drops at once.",
    deepLinks: [
        { href: '/newsletter/research/risk-framework', label: 'Stress testing and drawdown framework' },
        { href: '/newsletter/guides/smh-puts', label: 'SMH Put Sleeve Guide' },
    ],
    body: `
What happens to a leveraged QQQ strategy with short SMH puts when technology stocks sell off together?

## The scenario

Technology bear markets, like the 2022 decline, tend to hit growth stocks and semiconductors together. In that kind of environment:

- LEAPS lose value faster than the shares do, because leverage magnifies the loss.
- Short SMH puts move toward the money and can lead to assignment.
- Implied volatility often rises, which raises the cost of new protection.
- Positions that looked diversified turn out to be one bet.

## Lessons for advanced investors

- **Premium is not a hedge.** Short puts on a related sector add to downside exposure.
- **Stress-test the whole portfolio, not each trade.** Model combined losses under a technology drawdown scenario.
- **Hold dry powder.** Cash or short-term Treasuries let you meet assignments without being forced to sell.
- **Pre-commit your defensive rules.** Deciding during a crash usually means deciding badly.

## TradeMind application

TradeMind runs portfolio-level stress scenarios: a technology drawdown, a volatility shock and a rate shock. It also limits how much SMH put exposure can be open while QQQ exposure is high. In a stress regime, the model cuts back on opening new short puts.

## Strategy Integrity Check

Ask: "What is my estimated combined loss if QQQ and SMH both fall sharply in the same month?" Then ask whether you could hold through it.
    `.trim(),
};
