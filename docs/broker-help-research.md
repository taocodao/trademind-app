# Broker Help Section — Research Base

Compiled Aug 25, 2026. Sources: Eric's deep-research PDF (approval levels, PMCC classification, margin/IRA) + direct fetch of each broker's official help-center order-entry pages (verbatim UI labels). This is the factual base for the animated help section; UI labels should be re-verified quarterly since broker UIs change.

## Launch scope (Judgment A)

Launch coverage (all live in /help/enter-orders): **Schwab (incl. thinkorswim), Fidelity, Robinhood, Interactive Brokers, tastytrade, E*TRADE, Webull**. Excluded: SoFi, moomoo, Public (thin PMCC documentation). Basis: Cboe Q2 2026 retail options volume ranking (Rule 606) — no precise market-share percentages exist; treat "90% coverage" as unconfirmed.

## Approval levels + PMCC classification (from the research PDF)

| Broker | LEAPS buy | PMCC sell-to-open | Roll | Margin for PMCC | IRA-compatible |
|---|---|---|---|---|---|
| Schwab / tos | Level 1 "Long" | **Level 2 "Spreads"** | Level 2 | Not explicitly required at L2 | **Yes** — only Level 3 blocked in IRA |
| Fidelity | Level 1 | Tier 2 + margin feature | Same | Yes (or IRA limited margin) | Yes, via limited margin |
| Robinhood | Level 2 | Level 3 + margin account | Level 3 | Yes — cash account needs 100 real shares | Unverified |
| IBKR | Level 2 | **Level 4** ("Diagonal Spread — long leg expires first") | Level 4 | Implied | Unverified |
| tastytrade | Basic | Basic + margin | Basic | Yes | **Yes** — IRA margin-provisioned by default |
| E*TRADE | Level 2 | Level 3 + margin (~2yr exp, ~$75k net worth typical, 1-3 day review) | Level 3 | Yes | Yes |
| Webull | Level 2 | Level 3 | Level 3 | Margin required for L3-4 | **No** — cash/IRA capped at Level 2 |

Key insight for copy: the identical PMCC needs the second-lowest tier at Schwab and the highest tier at IBKR — pure taxonomy artifact (IBKR sub-classifies diagonals by which leg expires first), not risk. Most favorable for IRA/Roth positioning: **Schwab and tastytrade**.

## Known failure points (must be in the help section)

- **Fidelity**: collateral check can misfire — if it doesn't recognize the held LEAPS as coverage for the sell-to-open, it demands Tier 3 + margin as if naked. Fix path: ensure the spread is entered as a spread (or call Fidelity to have the LEAPS recognized).
- **Robinhood**: PMCC needs a margin account + Level 3; on a cash account the sell-to-open is rejected unless 100 actual shares are held.
- **Webull IRA**: structurally impossible (Level 2 cap < Level 3 requirement).
- **All brokers**: options market orders only during regular hours; Robinhood additionally blocks options market orders in the first 15 min after open (9:35 AM ET) and on multi-leg orders.


> Update Aug 25, 2026 (later): E*TRADE and Webull flows added to the help section. Sources: us.etrade.com/knowledge/advanced-trading/how-to-trade-options, us.etrade.com/platforms/power-etrade/pro/how-to/tools (Positions panel add/close/roll), webull.com/blog/34-Basic-Options (mobile chain, List View), webull.hk/en/help/faq/1547-Start-Trading-Options (Single Leg selector). E*TRADE labels actions Buy Open / Sell Open; Webull mobile has no diagonal roll ticket (two orders).

## Verbatim order-entry flows (fetched from official pages Aug 25, 2026)

### Schwab (schwab.com web) — LEAPS buy-to-open
Source: https://www.schwab.com/content/how-to-place-an-options-trade
1. Click **Trade** → select **Options**
2. Look up the underlying (QQQ), click the **Strategy** drop-down, select **Call**
3. Click the **chains** icon, select the expiration date
4. Strike prices are the center column; Calls left, Puts right
5. Click in the bid/ask area of the desired strike to select it
6. Fill in **action** (Buy to Open), **quantity**, **order type** (Limit), **limit price**, **timing**
7. Click **Review Order** → verify → **Place Order**

### Schwab — covered/short call sell-to-open (PMCC leg)
Source: https://www.schwab.com/content/how-to-place-a-covered-call-trade
1. **Trade** → **All-In-One Trade Ticket**
2. Enter symbol (QQQ); under **Strategy** select **Call**
3. Under **Action** select **Sell to Open**; choose strike + expiration
4. Select order type (Limit), price, timing
5. **Review Order** → **Place Order**
Note: our subscriber holds a LEAPS, not 100 shares — Schwab treats the PMCC as a diagonal spread (Level 2). Entering both legs as a spread via the chain (click Bid of short call + Ask of long LEAPS) is the robust path; single-leg sell-to-open works if the platform recognizes the covering LEAPS.

### Schwab — multi-leg / roll (All-In-One Trade Ticket)
Source: https://help.streetsmart.schwab.com/SSCentral/1.0/Content/Placing%20Option%20Orders%20Multi%20Leg.htm
- Trade tab → All-In-One Trade Ticket → enter symbol → select strategy; modify leg details (Action per leg); **Add A Leg** drop-down for extra legs; choose order type + timing; **Place Order**. Up to 4 legs.

### thinkorswim (desktop/web/mobile)
Source: https://www.schwab.com/options/how-to-trade-options
- Click any **Bid** or **Ask** in the option chain → order ticket opens → adjust price, quantity, order type → **Confirm and Send** → review → send.

### Fidelity (Fidelity.com / Trader+ Web) — LEAPS buy-to-open
Source: https://www.fidelity.com/learning-center/trading-investing/trading-platforms/how-to-trade-options-trader-plus-web (published 2025-09-25)
1. Log in → **Accounts & Trade** → **Fidelity Trader+ Web** (or Accounts & Trade → Trade on classic Fidelity.com)
2. Enter symbol QQQ
3. Select the **Option Chain** tool panel
4. Choose **Expiration date**
5. Select the checkbox next to the strike → choose trade action (**Buy to Open**)
6. **Preview order in trade ticket** → adjust quantity, order type (Limit), limit price
7. **Place Order**; monitor in the **Orders** panel
Classic ticket fields (verbatim): Action (Buy to Open / Buy to Close / Sell to Open / Sell to Close), Quantity, Expiration, Strike, Call/Put, Order Type, Time-in-force (Day / GTC). Source: https://www.fidelity.com/webcontent/ap002390-mlo-content/18.04/help/learn_trading_options.shtml
Note: options spread orders at Fidelity are **limit orders, day only**.

### Robinhood (mobile app) — LEAPS buy-to-open
Source: https://robinhood.com/us/en/support/articles/placing-an-options-trade/
1. Search QQQ (magnifying glass) → select it
2. **Trade** → **Trade options**
3. Select expiration date → choose strike (Calls)
4. Quantity → order type (Limit) → set limit price
5. Swipe up to submit
Time-in-force: GFD (day) or GTC (90 days). Market orders for options only 9:35 AM-4 PM ET, single-leg only.
Sources: https://robinhood.com/us/en/support/articles/limit-order-options/ , https://robinhood.com/us/en/support/articles/market-order-options/
PMCC: requires margin account + Level 3. Strategy Builder path: Trade → Trade options → **Strategy builder** (top left); calendar/diagonal = set short-dated leg expiration first, then long-dated leg. Source: https://robinhood.com/us/en/support/articles/about-the-options-strategy-builder/

### IBKR Client Portal (web) — LEAPS buy-to-open
Source: https://www.interactivebrokers.com/campus/trading-lessons/portal-options-trading/ (2026-06)
1. **Trade** menu → **Option Chains** → search QQQ
2. Select expiration
3. Click the **Ask** price under Calls (left of Strike) → buy order populates in the preview window
4. Blue **Order** button (top right) → Order Ticket
5. Set quantity, order type, price, time-in-force → **Preview** or **Submit Order**
Multi-leg: build combo from the Option Chain page (up to 4 legs), then Order Ticket → Submit.
Roll: IBKR Mobile — tap position twice → **Roll Position** → select new strike → submit. Also via More menu → Options Exercise/Rollover.

### IBKR Mobile (iPhone)
Source: https://www.interactivebrokers.com/campus/trading-lessons/options-on-the-iphone/ (2026-06)
1. Tap center button (two arrows) → Trade screen → Toolbox → **Options Chain**
2. Search QQQ → select expiration → tap **Ask** (buy) or **Bid** (sell) on the strike
3. Order drawer: switch buy/sell at top, adjust quantity
4. Tap blue **Order** button → order ticket: quantity, order type, price, time-in-force
5. Slide the bottom toggle to send

### tastytrade (desktop/web) — LEAPS buy-to-open
Source: https://tastytrade.com/learn/trading-products/options/long-put/ (same flow for calls)
1. Enter symbol QQQ
2. **Trade** tab → **Table** mode
3. Click expiration to expand
4. Click the **Ask** price of the call to buy
5. Order ticket: quantity, price, order type, TIF
6. **Review & Send** → review commissions/fees → send

### tastytrade — the PMCC as one diagonal order (best UX of all five)
Source: https://tastytrade.com/learn/trading-products/options/long-call-diagonal-spread/
1. Enter symbol → **Trade** tab → **Table** mode
2. Expand the near-dated expiration → click the **Bid** of the short call (drag bar to adjust strike)
3. Expand the further-dated expiration → click the **Ask** of the long LEAPS call
4. Order ticket: quantity, net price, TIF → **Review & Send**
This enters the whole PMCC as a single diagonal spread order with one net price — the cleanest path of any broker researched.

## Design implications for the help section

1. **Per-broker account-type checklist BEFORE the animation** (research recommendation): approval level needed, margin/cash, IRA note. E.g., Robinhood: "You need: margin account + Level 3 options." Schwab: "You need: Level 2 (Spreads). Works in an IRA."
2. **Honest friction flags**: IBKR (Level 4) and Webull (IRA impossible) flagged, not hidden; Schwab/tastytrade presented as smoothest for QQQ LEAPS. Matches the disinterested-analysis compliance posture.
3. **Mobile-first**: subscribers act from phones within minutes of the email; every broker flow above has a mobile variant.
4. **Universal order-language mapping table** at the top: our email says "Sell to open 1 QQQ 2026-09-30 780C limit $5.40" → broker fields: Action = Sell to Open, Quantity = 1, Expiration = Sep 30 2026, Strike = 780, Call, Order type = Limit, Limit price = 5.40, TIF = Day.
5. **QQQ Basic needs only the ETF row** (buy/sell shares) — much simpler; every broker's stock ticket covers it. One generic ETF walkthrough + per-broker links suffices.
6. Re-verify UI labels quarterly; broker UIs change often (flagged by the research).
