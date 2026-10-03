export default {
    number: 13,
    slug: 'managing-the-pmcc-when-the-market-rips-higher',
    title: 'Managing the PMCC When the Market Rips Higher',
    subtitle: 'Premium income has a price, and it is paid in rallies.',
    publishDate: '2026-10-23',
    readTime: '7 min',
    tags: ['PMCC', 'Risk Management', 'QQQ Research'],
    excerpt:
        'The best month for QQQ can be the hardest month for your short call. Here is what a rally does to a PMCC and the three rules that keep it survivable.',
    emailSubject: 'The best month for QQQ can be the hardest month for your short call',
    previewText: "Premium income has a price, and it's paid in rallies.",
    deepLinks: [
        { href: '/newsletter/guides/pmcc', label: 'PMCC management rules' },
    ],
    body: `
What happens to a poor man's covered call (PMCC) when QQQ rallies hard?

## The mechanics

In a PMCC, you sell a shorter-dated call against your long LEAPS. When QQQ rises sharply:

- The short call's losses can grow quickly as it moves into the money.
- Your long LEAPS gains, but your upside is capped near the short strike.
- Rolling the short call up and out usually costs money, so premium you already collected gets handed back.

## Three rules for advanced investors

- **Strike width must exceed net debit.** The distance between the short strike and the long strike should be larger than what you paid for the position. Otherwise, early assignment can lock in a loss.
- **Know your assignment triggers.** A short call deep in the money, especially near an ex-dividend date, is more likely to be assigned early.
- **Decide your rally rule in advance.** Before you are under pressure, choose whether you will roll, close or accept the capped upside.

## The honest trade-off

Premium overlays tend to help in flat or slowly rising markets and tend to hurt in strong rallies. Over a long bull market, writing calls too aggressively can leave a strategy trailing plain QQQ. So the regime matters: a strong-trend regime may call for fewer short calls or strikes further out.

## TradeMind application

TradeMind's regime model adjusts the overlay's short-call aggressiveness, meaning how far out the strike sits and how much of the position is covered. Strong uptrends get more room to run. Range-bound markets get more premium collection.

## Strategy Integrity Check

Ask: "Over the last strong rally, did my overlay add return or give it away?"
    `.trim(),
};
