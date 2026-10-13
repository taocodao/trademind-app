"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";

/**
 * Signs a member out after a period of inactivity, and after a maximum session length.
 * Privy keeps a session alive by refreshing its token for weeks, so without this a
 * shared or lost device stays signed in indefinitely.
 *
 * Idle: no pointer, key, scroll or touch activity for IDLE_MINUTES.
 * Absolute: signed in for more than MAX_SESSION_HOURS, regardless of activity.
 * Both survive closing the tab, because timestamps live in localStorage and are
 * checked again when the page loads or becomes visible.
 */
const IDLE_MINUTES = 30;
const MAX_SESSION_HOURS = 12;
const ACTIVE_KEY = "tm_last_active";
const START_KEY = "tm_session_start";

export function SessionTimeout() {
    const { ready, authenticated, logout } = usePrivy();
    const loggingOut = useRef(false);

    useEffect(() => {
        if (!ready) return;
        if (!authenticated) {
            try {
                localStorage.removeItem(ACTIVE_KEY);
                localStorage.removeItem(START_KEY);
            } catch { /* storage unavailable */ }
            loggingOut.current = false;
            return;
        }

        const now = () => Date.now();
        const read = (k: string) => {
            try { return Number(localStorage.getItem(k) || 0); } catch { return 0; }
        };
        const write = (k: string, v: number) => {
            try { localStorage.setItem(k, String(v)); } catch { /* ignore */ }
        };

        if (!read(START_KEY)) write(START_KEY, now());
        if (!read(ACTIVE_KEY)) write(ACTIVE_KEY, now());

        const expired = () => {
            const idleMs = now() - read(ACTIVE_KEY);
            const ageMs = now() - read(START_KEY);
            return idleMs > IDLE_MINUTES * 60_000 || ageMs > MAX_SESSION_HOURS * 3_600_000;
        };

        const signOut = async () => {
            if (loggingOut.current) return;
            loggingOut.current = true;
            try { localStorage.removeItem(ACTIVE_KEY); localStorage.removeItem(START_KEY); } catch { /* ignore */ }
            try { await logout(); } finally {
                window.location.href = "/signin?reason=timeout";
            }
        };

        // Returning to an old tab or reopening the browser: check before anything else.
        if (expired()) { void signOut(); return; }

        let lastWrite = 0;
        const bump = () => {
            const t = now();
            if (t - lastWrite > 15_000) { // throttle storage writes
                lastWrite = t;
                write(ACTIVE_KEY, t);
            }
        };
        const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"];
        events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

        const onVisible = () => { if (document.visibilityState === "visible" && expired()) void signOut(); };
        document.addEventListener("visibilitychange", onVisible);
        const timer = window.setInterval(() => { if (expired()) void signOut(); }, 30_000);

        return () => {
            events.forEach((e) => window.removeEventListener(e, bump));
            document.removeEventListener("visibilitychange", onVisible);
            window.clearInterval(timer);
        };
    }, [ready, authenticated, logout]);

    return null;
}
