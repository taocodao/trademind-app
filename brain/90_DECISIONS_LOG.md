# Decisions Log - TradeMind Frontend

---

## 2026-03-15: Subscription Webhook & Access Flow Enhancements

**Decision**: Reimplemented Stripe Webhook handling for robustness and fixed Vercel deployment/redirect issues causing webhook failures (307).

**Context**: 
- Vercel's "Deployment Protection" (Vercel Authentication) was intercepting unauthenticated Stripe webhooks with a 307 redirect.
- Stripe's Strict URL matching meant requests hitting `trademind.bot` were being redirected to `www.trademind.bot`, dropping POST payloads.
- Subscription database updates (`user_settings`) lacked `cancel_at_period_end` tracking, creating UI inconsistencies.
- Cross-domain cookie mismatch required explicitly attaching Privy tokens to client-side API requests for subscription updates.

**Resolution**:
- Disabled Vercel Authentication on production deployment to fix 307 redirect loops on webhooks.
- Updated Stripe webhook URL to explicitly use `https://www.trademind.bot/api/stripe/webhook`.
- Webhooks now track `cancel_at_period_end` and `cancel_at` for graceful subscription cessation.
- The `checkout.session.completed` hook now uses `INSERT ... ON CONFLICT DO UPDATE` to safely handle first-time vs returning users.
- Explicitly attach Privy's `getAccessToken()` to `Authorization: Bearer <token>` on all `/api/settings/tier` API calls from the client.

**Affected**: `src/app/api/stripe/webhook/route.ts`, `src/components/settings/SubscriptionManager.tsx`, `src/app/dashboard/page.tsx`, `Vercel Settings`, `Stripe Settings`.

---

## 2026-03-10: Migration of Equity Execution to Vercel (Next.js)

**Decision**: Move the TurboCore (Equity/ETF Rebalancing) delta calculation and order submission logic from the EC2 Python backend directly into the Vercel (Next.js) frontend client.

**Context**:
- The EC2 proxy approach introduced unnecessary latency and points of failure.
- Vercel securely manages the user's Tastytrade session natively.

**Resolution**:
- Removed EC2 proxy routing for `TURBOCORE` signals.
- Implemented `executeTurboCoreStrategy` natively in TypeScript within `strategy-executor.ts` to fetch live net liq, positions, prices, and calculate the rebalance delta.
- Added equity-specific Tastytrade API methods in `tastytrade-api.ts`.
- Forced exact "Buy to Open" / "Sell to Close" action definitions for equity orders based on Tastytrade SDK constraints.

**Affected**: `src/app/api/signals/[id]/approve/route.ts`, `src/lib/tastytrade-api.ts`, `src/lib/strategy-executor.ts`.

---

## 2026-02-05: Workspace-Scoped Brain Structure

**Decision**: Create file-based brain directory for persistent memory.

**Context**: Enable session continuity across different logins/machines.

**Resolution**: Created `brain/` directory with structured documentation.

---

## 2026-02-05: Gen Z UX Enhancements

**Decision**: Add gamification, social sharing, and auto-approve features.

**Context**: Target younger traders with engaging UX.

**Resolution**: 
- Added streak counters
- Achievement cards  
- Social share buttons
- Auto-approve toggle

---

## 2026-03-02: Landing Page Restructure & Compliance Implementation

**Decision**: Shift landing page from narrative audio timeline to static dashboard with Education Center and Compliance components.

**Context**: User requested removal of the cinematic audio sync, trading feed, and calculator. Instead, wanted to emphasize downloadable performance reports (Education Center), Pricing tiers, Referral incentives, and rigorous Legal Disclaimers (TurboBounce Legal Compliance Plan).

**Resolution**:
- Stripped `SynchronizedTradeFeed` and `CompoundingCalculator` from page.
- Stripped auto-play controls from `InteractiveTimeline`.
- Designed `EducationCenter.tsx`, `LegalFooter.tsx`, and conversion blocks (`PricingSection`, `FamilySection`, `ReferralPromoSection`).

**Affected**: `src/app/page.tsx`, `InteractiveTimeline.tsx`, and introduced new components.
