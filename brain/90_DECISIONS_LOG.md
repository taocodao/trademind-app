# Decisions Log - TradeMind Frontend

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
