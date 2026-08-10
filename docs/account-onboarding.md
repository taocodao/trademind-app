# Named Account Onboarding & Signal Flow

**Audience:** TradeMind operators and users setting up a virtual account.
**Scope:** creating a named account, how signals are generated and sized per account, the capital-scaling phase system, and how to reconcile the virtual account to a real brokerage account.

---

## 1. What a named account is

A named account is a **virtual ledger** that maps to a real brokerage account you manage yourself. It is bound to exactly **one strategy** and one **risk level**, and carries its own cash balance and positions. TradeMind does **not** connect to or trade your brokerage — it generates signals, pre-executes them into the virtual account using live market data, and emails you the orders. You place the real orders yourself.

Three strategies are available:

| Key | Label | Tab |
|---|---|---|
| `TQQQ_TURBOCORE` | TurboCore | Core |
| `TQQQ_TURBOCORE_PRO` | Turbo Pro | Pro |
| `QQQ_LEAPS` | QQQ LEAPS | LEAPS |

Three risk levels (entry strictness — your preference): `conservative`, `moderate`, `aggressive`.

---

## 2. Onboarding procedure

1. **Open the Accounts page** (`/accounts`) and choose **Create Account**.
2. **Name the account** — something that maps to the real account (e.g. "IRA — QQQ").
3. **Select the strategy** the account will follow (one per account).
4. **Select the risk level** — this picks which signal tier the account receives.
5. **Enter the initial principal** — the starting cash of the real account. This can be as small as ~$8,600 for QQQ LEAPS.
6. **Create.** The account opens with `cash_balance = initial_principal`, and an opening `deposit` activity is recorded so the ledger reflects the principal from day one.

On creation the account is assigned a **capital-scaling phase** from its initial value (see §4).

---

## 3. How a signal becomes a position

When the backend emits a signal for a strategy, the fan-out engine processes **every account subscribed to that strategy**, independently:

1. **Tier selection** — the account's `risk_level` selects the matching tier from the signal payload (`conservative` / `moderate` / `aggressive`). This gates *which* entries the account takes.
2. **NLV computation** — the account's net liquidation value is computed as `cash + Σ(position qty × live price)`. This is the account's **current position + available cash**.
3. **Phase evaluation** — the account's phase is evaluated from NLV (see §4). The phase **caps sizing**.
4. **Delta sizing** — for each signal leg, the target quantity is `floor(NLV × effective_pct / live_price)`, where `effective_pct = min(tier target_pct, phase maxPositionPct)`. The delta vs the current position becomes the order. Sells are ordered first to free cash; a buy is skipped if it exceeds available cash.
5. **Pre-execution** — orders are written into the account ledger (`account_activities`) and positions updated, idempotently per (account, signal).
6. **Snapshot + email** — an NLV snapshot is saved and the account owner is emailed the order list in plain English (e.g. "Buy 13 shares of QQQ at Market Price"). If the phase changed, a separate phase-transition alert is sent.

**Net effect:** each signal is customized by **account + strategy + current position + available cash + capital-scaling phase**.

---

## 4. The capital-scaling phase system

Phases scale position sizing as the account grows. NLV is the sole trigger.

| Phase | NLV band | Per-position sizing cap |
|---|---|---|
| **SEED** | < $15,000 | 95% of NLV |
| **GROWTH** | $15,000 – $29,999 | 45% of NLV |
| **TARGET** | $30,000+ | 33% of NLV |

**Tier vs phase:** tier = entry strictness (which signals you take); phase = capital scaling (how big each position may be). Tier gates entries; phase caps sizing.

**Transition rules:**
- **Promotion** — NLV crossing into a higher band promotes the account, gated by a 5-day minimum dwell. Skip-level promotion is allowed (SEED → TARGET on a deposit).
- **Demotion** — NLV must fall **5% below** the current phase's floor (hysteresis) and the 5-day dwell must have elapsed, to prevent flip-flopping around a threshold.
- **Emergency demotion** — a close-over-close drawdown of **15%+** that crosses a phase boundary demotes immediately, bypassing the dwell.
- **Deposit-triggered promotion** — because the practical path to a larger account is adding capital (not compounding a small one), depositing into the account raises NLV and promotes sizing automatically.

Every transition is recorded in `account_phase_transitions` and emailed to the account owner.

---

## 5. Reconciling to your real account

The design goal: **if you follow every signal exactly, the virtual account exactly matches your real account.** In practice you may miss a signal, skip one, or fill at a different price. The **Activity** tab on the account page lets you reconcile:

- **Add** an activity (buy / sell / deposit / withdraw) to record a real fill the virtual account missed.
- **Edit** an activity to correct quantity or price.
- **Delete** an activity to remove one that didn't happen.

All adjustments are ledger-consistent — cash and positions update accordingly, and subsequent signals size off the corrected NLV.

---

## 6. Notifications

- **Signal email** — sent on each signal with the order list and the account's current phase.
- **Phase-transition email** — sent when the account's phase changes, showing the new sizing cap.

Manage notification preferences at `/settings`.

---

## 7. Mock test

A self-contained mock test (`mock_onboarding_test.mjs`) exercises the full flow against an in-memory ledger — onboarding, initial phase assignment, tier selection, NLV sizing, the phase cap binding, deposit-triggered skip-level promotion, emergency demotion, and threshold hysteresis. **21/21 checks pass.**
