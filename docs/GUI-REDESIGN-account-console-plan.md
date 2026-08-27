# TradeMind GUI Redesign Plan: Account Console

Status: DECISIONS LOCKED by Eric, August 27, 2026. Ready to build.
Scope: app UX restructure around a single account-level console. No strategy, pricing, or backend signal-flow changes.

---

## 1. What already exists (important, we build on it)

- `/accounts` — account list page (create/rename/delete, membership badges, risk tier picker).
- `/account/[id]` — account detail page that already has:
  - an account switcher dropdown (AccountSwitcher component),
  - deep-linkable tabs: `?tab=positions|signals|activity`,
  - a Signals tab (signal cards, newest first, timestamp, per-account status),
  - an Activity tab that already supports recording a manual activity with a note like "filled at a different price" (POST `/api/accounts/[id]/activities`, edit, delete with reversal),
  - live position refresh every 15s.
- APIs ready today: `GET /api/accounts/[id]/signals` (joins `account_signals` + `signals`, 50 newest), `positions`, `activities`, `summary`, `membership`.
- `/help/enter-orders` is live with per-broker animated walkthroughs, incl. universal email-to-broker mapping.
- Signal emails: "View Your Dashboard" button currently lands on `/signals` (a legacy redirect).

So the redesign is mostly a re-skin + two new features (fill confirmation, email deep links), not a rewrite.

## 2. Target design

One route is the member's home: `/account/[id]`. Everything hangs off it.

### Navigation: bottom nav with account switcher (DECIDED, Q2)

Eric chose a bottom nav as the primary navigation on all viewports, with account switching built in. Final arrangement:

- Bottom nav: **Signals | Positions | Activity | Account | Refer** (5 tabs).
- A persistent **account pill** above the bottom nav (account name + strategy tag + membership dot). Tapping it opens a bottom sheet listing all accounts, with "Create account" at the bottom. This beats a literal dropdown inside the nav row, which crowds 5 tabs; the sheet pattern keeps switching one tap away and stays thumb-friendly.
- Desktop shows the same bottom nav (centered, max-width) so the app looks and behaves identically on phone and desktop. Top of page keeps only the logo and a refresh control.
- Refer stays as a tab per Eric's call for a clean 5-tab bar (it is still user-level data inside; the tab just opens the refer view).

### Tab 1: Signals (the centerpiece of this redesign)

Signal cards, newest first (already the API order). Each card shows:

- Timestamp (published time, email time), strategy + account name, regime badge.
- The order instructions rendered as readable order blocks (same wording as the email: "Buy to open 1 QQQ Jan 21 2028 700 Call, limit $52.40").
- **"How to enter this order" link placed directly on the signal card**, deep-linking to `/help/enter-orders` with broker + order type preselected via query params (`?broker=schwab&type=pmcc`), defaulting to the member's saved broker preference (new: stored per user, editable in Account tab). If no broker saved, link opens the guide's broker picker.
- **Execution confirmation control**, three states per signal:

| State | What user sees | What happens |
|---|---|---|
| Open | Button: "I entered this order" | Marks the signal acknowledged for this account. Card flips to "Waiting for fill". |
| Waiting for fill | Button: "Enter fill price" + the virtual fill shown for reference | Opens inline fill form: price (required), qty (prefilled), time (default now), note (optional). Submit posts a fill-confirmation. |
| Confirmed | Card shows virtual fill price vs your reported fill price, with variance (e.g. "+$0.15 vs model"). Collapsed to one line after 7 days. | Positions reflect the user-reported fill (see 2.4). |

Skipped/failed virtual executions keep their existing badges and get no confirm button.

### Tab 2: Positions

Mostly unchanged (existing PositionsTable is solid). Additions:
- "From signal" tag linking a position back to the signal that opened it.
- Total equity / cash / positions-value header cards stay.

### Tab 3: Activity

Unchanged list, but the "Enter fill price" flow on the Signals tab writes a fill-confirmation activity here, so Activity stays the audit trail. Reuse the existing POST route.

### Tab 4: Account (new; absorbs most of `/accounts`)

- Account name (rename), risk tier (self-selected conservative/moderate/aggressive — unchanged rules), delete.
- Membership status + billing (the MembershipBanner logic moves here).
- **Broker preference selector** (new; feeds the signal-card help links).
- Notification/email preferences summary with edit link to `/settings`.

### Tab 5: Refer

See section 4, item 1. Recommendation: Refer is a user-level page, so it becomes a top-nav button on desktop linking to the existing `/refer` page, and lives inside the Account tab on mobile.

## 3. Email changes

- The "View Your Dashboard" button in `src/lib/signal-email.ts` becomes "View This Signal" and deep-links to:
  `/account/[accountId]?tab=signals&signal=[signalId]`
  The app highlights and scrolls to that card on load. `signalId` + per-user per-account id are already available in the fan-out data (`signal-fanout.ts`).
- Keep the existing "Step-by-step order entry guide" link under it (added Aug 25).

## 4. Things the sketch missed (Eric asked)

1. ~~Refer is user-level, not account-level.~~ **RESOLVED (Q2):** Refer is the 5th bottom-nav tab. Internally it stays user-level data; the tab is just a view.
2. **Billing lives somewhere.** Membership + Stripe portal must be reachable from the console — placed in the Account tab.
3. **Empty states + onboarding.** If the user has zero accounts, the console must fall back to a create-account first-run screen (existing create flow from `/accounts` moves here).
4. **Skip path (DECIDED, Q3):** No skip button. Unconfirmed signals stay in the "waiting" state. Follow-up: a reminder email to the member if a signal stays unconfirmed ~24h after delivery (one reminder max per signal). This needs a small EC2-side or cron check over `account_signals`; tracked as P2 item.
5. **Deep link auth.** Email links hit Privy-gated pages; logged-out users need a clean sign-in-and-return flow (check existing middleware handles return URLs — item P0-5).
6. **Mobile is the real surface.** Most email opens are on phones; the tab bar and signal cards get designed mobile-first.
7. **Help guide discoverability beyond signals.** Add a "Help" entry in the Account tab linking `/help/enter-orders`.

## 5. Data/model implications

- New per-account-signal confirmation record (table `account_signal_fills` or columns on `account_signals`): `confirmed_at`, `fill_price`, `fill_qty`, `fill_note`, `skipped`.
- **Fill handling (DECIDED, Q1):** The user decides whether to fill and at what price; the virtual account fills accordingly (option B). The system-observed market fill is still stored for reference, but once the user reports a fill it becomes the position's basis. **PMCC exception (per Eric):** for PMCC sell-to-open orders the virtual account maps the order against the virtual position it already holds (LEAPS contract, strikes, quantity); the user only confirms filled/not-filled and their price, never the structure. Instrument identity always comes from the signal + virtual position, never from free-form user input. Safeguards: fill price sanity-checked (reject >20% from model price with a confirm dialog, not a hard block), every user fill recorded as an activity row so the audit trail shows system fill vs user fill.
- New user preference: `preferred_broker` (text) from the 7 supported brokers (DECIDED, Q4): Schwab, tastytrade, Fidelity, Robinhood, IBKR, E*TRADE, Webull. A simple dropdown in the Account tab; it only preselects the help guide on signal-card links.

## 6. Compliance guardrails (from locked product rules)

- No changes to signal generation, tiers, or execution. Tier picker stays self-selected in Account tab.
- Copy rules apply to every new string: no em/en dashes or `--`; emails/HTML and new components go into the dash guard roots; tsc + `check-dashes.mjs` green before every push.
- The confirm flow must read as record-keeping ("Tell us what fill you got"), never as advice or execution. No real-broker connection ever implied.
- Variance display is descriptive ("+0.15 vs model"), no quality judgment language ("great fill!").

## 7. Phases

**P0 — Signals centerpiece (1–2 focused sessions)**
1. Signal card rebuild: instruction blocks, timestamp, help-guide deep link (extend `/help/enter-orders` to read `?broker=&type=` and preselect).
2. Confirm/fill-price flow UI + `POST /api/accounts/[id]/signals/[signalId]/confirm` route + storage (decision A).
3. Email template: "View This Signal" deep link + keep guide link.
4. Scroll-and-highlight on `?signal=` param; link positions back to source signal.
5. Verify: tsc, dash guard, push, production screenshots (desktop + mobile); test-mail the template.

**P1 — Console shell**
6. Nav restructure: dropdown + 5 destinations, deep-linkable tabs add `account`, mobile bottom bar.
7. Account tab (rename/risk/delete + membership/billing move from MembershipBanner).
8. Broker preference field (user-level) + settings plumbing.
9. Empty-state/first-run create flow on the console.

**P2 — Refer + polish**
10. Refer into desktop nav + Account tab on mobile.
11. Referrer credit status surfaced in Account tab (optional).
12. Skeleton loaders, error states, 15s refresh coherence across tabs.

**Decisions locked (Aug 27):**
- Q1: User decides fill yes/no and price; virtual account fills accordingly. PMCC structure always derived from the virtual position, user only confirms + price.
- Q2: Bottom nav on all viewports: Signals | Positions | Activity | Account | Refer. Account pill opens a bottom sheet to switch accounts.
- Q3: No skip button. Unconfirmed signals stay waiting; one reminder email ~24h later (P2).
- Q4: Broker preference = dropdown with all 7 supported brokers, chosen by the user in the Account tab.
