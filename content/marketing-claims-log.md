# Marketing Claims Substantiation Log

Purpose: satisfies constraint C7 of the homepage hero v3 plan. Each visible
performance or capability claim is recorded with its precise wording, page
location, supporting evidence, stated limitations, responsible individual,
and review date. Attorney pre-read is scheduled post-deploy (Phase 5 runs
after production, per owner decision Sep 8, 2026).

Responsible individual: Eric Huang (founder). Review date: September 8, 2026.

## Claim 1 — Backtested return figure

- Precise claim: "36.3% — Backtested CAGR, model-priced, Jan 2021 to Aug 2026."
- Location: homepage hero, Card 1 (numeral + label).
- Evidence: /verify record table and methodology section; artifacts under
  /public/verify with SHA-256 checksums; harness commit and tag published
  in the lineage module on /verify.
- Limitations stated inline: "model-priced" and "backtested" appear in the
  same card; the 15-month real-quote tape drawdown (-30.4%) appears beside
  the model figure (-17.8%) at equal visual weight; "No rate is guaranteed
  to persist" appears in the same card.
- Review date: 2026-09-08.

## Claim 2 — Compounding arithmetic

- Precise claim: "At 36%, compounding turns $10,000 into roughly $1M in 15
  years."
- Location: homepage hero Card 1 body; rate-sensitivity calculator default
  state; /verify illustration module.
- Evidence: closed-form arithmetic. 10,000 × 1.36^15 = 1,007,126. Not a
  performance representation; the grammatical subject is the rate and the
  arithmetic, never TradeMind's future results (constraint C2).
- Limitations stated inline: the same card and the calculator both state
  "No rate is guaranteed to persist." The calculator disclosure notes the
  36% default is the backtested, model-priced CAGR rounded down, that the
  window included a -9.5% losing year and a near-flat 2025, and that
  sustaining 36% for 15 years would exceed almost any verified
  long-horizon public track record.
- Review date: 2026-09-08.

## Claim 3 — Machine learning behavior

- Precise claim: "It does not predict where QQQ goes. It scores whether
  current conditions resemble those where this setup historically worked,
  and it holds veto power, not steering power."
- Location: homepage hero Card 3 (numeral "1 of 7").
- Evidence: walk-forward training described in /verify methodology; the
  published record shows the engine declining the overlay 1,032 times
  (the "when the model refuses to trade" section on /verify).
- Limitations: describes conditional scoring and veto power only; no
  predictive claim ("predicts", "knows", "AI-powered" are prohibited
  vocabulary per C7).
- Review date: 2026-09-08.

## Claim 4 — Cross-validation robustness

- Precise claim: "18 of 21 — Cross-validation paths where the strategy held
  up."
- Location: homepage hero Card 4.
- Evidence: cross-validation artifacts published on /verify (21 recombined
  sub-windows, 18 passing).
- Limitations: card body also publishes the position-sizing caps (one third
  of account, three positions max, 5% cash reserve, losers cut at twice
  credit received) and points to the public ledger, config, code, and
  checksums.
- Review date: 2026-09-08.

## Claim 5 — Strategy structure

- Precise claim: deep in-the-money QQQ LEAPS call, 12 to 24 months, delta
  0.80 to 0.85; 32-day short calls at delta 0.15 to 0.28.
- Location: homepage hero Card 2.
- Evidence: matches the published /verify methodology parameters.
- Limitations: "the way a swing trader harvests range" is an analogy for
  premium-harvesting cadence, not a claim that the structure is a swing
  trade; the structure is a diagonal spread.
- Review date: 2026-09-08.

## Claim 6 — Account eligibility

- Precise claim: long-dated calls plus covered calls permitted in most
  IRAs and Roth IRAs, subject to broker approval; standard employer 401(k)
  plans generally do not offer options.
- Location: homepage retirement band (mechanism paragraph); /verify
  illustration module ("Which accounts can run this").
- Evidence: broker options-approval guides; the published subscriber
  onboarding doc.
- Limitations stated inline: "subject to your broker's approval"; 401(k)
  explicitly excluded.
- Review date: 2026-09-08.
