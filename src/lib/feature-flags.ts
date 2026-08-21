/* ─────────────────────────────────────────────────────────────────────────────
   Feature flags — runtime kill switches for capabilities that must be
   universally disabled without deleting the underlying code.

   BROKERAGE_INTEGRATION_ENABLED
     Controls every code path that connects to, executes at, or fetches account
     data from a brokerage on the user's behalf (currently Tastytrade). Under
     the current signals-only product model this MUST stay false: TradeMind
     never connects to or submits orders to a user's brokerage. Signals are
     delivered by email/UI and the user enters their own orders manually.

     Setting to true anywhere except a controlled test environment reintroduces
     features that contradict the product's compliance posture. Do not do it
     without an explicit product decision.
   ─────────────────────────────────────────────────────────────────────────── */

export const BROKERAGE_INTEGRATION_ENABLED = false as const;

/**
 * True on both server and client. Kept as a function so future dynamic sources
 * (env var, remote config) can slot in without changing every call site.
 */
export function isBrokerageIntegrationEnabled(): boolean {
    return BROKERAGE_INTEGRATION_ENABLED;
}

/* ---------------------------------------------------------------------------
   AUTO_APPROVE_ENABLED
     Controls the Auto-Approve feature that automatically dispatches signals
     to execution without user click. Under the current signals-only product
     model this MUST stay false: every signal is delivered to the user's
     email/dashboard, and the user chooses whether to enter the corresponding
     order in their own broker. There is no auto-execution to a brokerage
     (see BROKERAGE_INTEGRATION_ENABLED) and no auto-mutation of the virtual
     account either — the user is always the actor. Flip only for a controlled
     product decision to reintroduce the feature.
   ------------------------------------------------------------------------- */

export const AUTO_APPROVE_ENABLED = false as const;

export function isAutoApproveEnabled(): boolean {
    return AUTO_APPROVE_ENABLED;
}
