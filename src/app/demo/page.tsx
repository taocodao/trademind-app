"use client";

import { useState, useEffect } from "react";
import {
    Home, Bot, TrendingUp, Briefcase, Activity, Gift, Settings, Zap,
    Copy, Check, ChevronDown, ArrowRight, Brain, BarChart3,
    Wallet, RefreshCw, Wifi, Bell, Users, DollarSign, Clock,
    HelpCircle, Trophy, Rocket, Target, Coffee, FileSearch,
    LineChart, MessageSquare, CheckCircle, XCircle, PlusCircle,
    AlertTriangle, Shield, LogIn, Star, ExternalLink
} from "lucide-react";

// ─── Static Fixture Data ────────────────────────────────────────────────────

const DEMO_USER = {
    email: "test-9478@privy.io",
    password: "110332",
    name: "Demo Trader",
    plan: "Both Bundle",
    planPrice: "$69/mo",
};

const TURBOCORE_PRO_SIGNAL = {
    strategy: "TQQQ_TURBOCORE_PRO",
    regime: "SIDEWAYS",
    confidence: 0.502,
    action: "REBALANCE",
    capital_required: 3972,
    virtualBalance: 3971.755,
    created_at: "Apr 11, 7:54 PM",
    legs: [
        { symbol: "QQQ",  target_pct: 0.55, amount: 2184, color: "text-blue-400" },
        { symbol: "QLD (2x)", target_pct: 0.10, amount: 397,  color: "text-indigo-300" },
        { symbol: "LEAPS",  target_pct: 0.38, amount: 1192, color: "text-amber-400" },
        { symbol: "SGOV",   target_pct: 0.05, amount: 199,  color: "text-emerald-400" },
    ],
    orders: [
        { action: "BUY",         symbol: "QQQ",              type: "Market",     amount: 1222, qty: "2 sh",         detail: null },
        { action: "BUY",         symbol: "QLD (2x)",         type: "Market",     amount: 136,  qty: "1 sh",         detail: null },
        { action: "BUY TO OPEN", symbol: "QQQ LEAPS Call",   type: "Limit (ask)", amount: 2412, qty: "+0 contracts", detail: "Strike = $395 | ~12 months out | 0.70 delta ITM call — approx ~$214/contract" },
        { action: "BUY",         symbol: "SGOV",             type: "Market",     amount: 188,  qty: "1 sh",         detail: null },
    ],
    rationale: "IV is compressing in a sideways regime — holding QQQ/QLD core, extending via LEAPS for leveraged upside. SGOV provides a liquidity buffer during consolidation.",
};

const TURBOCORE_SIGNAL = {
    strategy: "TQQQ_TURBOCORE",
    regime: "BULL",
    confidence: 0.712,
    action: "REBALANCE",
    capital_required: 5000,
    virtualBalance: 26840.12,
    created_at: "Apr 11, 7:53 PM",
    legs: [
        { symbol: "TQQQ", target_pct: 0.35, amount: 9394, color: "text-purple-400" },
        { symbol: "QQQ",  target_pct: 0.50, amount: 13420, color: "text-blue-400" },
        { symbol: "SGOV", target_pct: 0.15, amount: 4026, color: "text-emerald-400" },
    ],
    orders: [
        { action: "BUY",  symbol: "TQQQ", type: "Market", amount: 9394, qty: "89 sh", detail: null },
        { action: "BUY",  symbol: "QQQ",  type: "Market", amount: 13420, qty: "22 sh", detail: null },
        { action: "SELL", symbol: "SGOV", type: "Market", amount: 974,  qty: "10 sh", detail: null },
    ],
    rationale: "Strong bull momentum confirmed. ML model confidence 71.2%. Increasing TQQQ allocation to capture leveraged upside while maintaining QQQ core exposure.",
};

const DEMO_POSITIONS = [
    { symbol: "QQQ",  qty: 23, avgPrice: 468.20, currentPrice: 479.84, color: "text-blue-400" },
    { symbol: "TQQQ", qty: 12, avgPrice: 58.40,  currentPrice: 61.22,  color: "text-purple-400" },
    { symbol: "SGOV", qty: 50, avgPrice: 50.18,  currentPrice: 50.19,  color: "text-emerald-400" },
];

const DEMO_ACTIVITY = [
    { id: 1, source: "trademind", symbol: "REBALANCE", strategy: "tqqq_turbocore_pro", status: "executed", created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), executed_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 90000).toISOString() },
    { id: 2, source: "virtual",   symbol: "QQQ",       strategy: "tqqq_turbocore_pro", type: "buy",     amount: 1222, quantity: 2,  price: 479.84, created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
    { id: 3, source: "trademind", symbol: "SIGNAL",    strategy: "tqqq_turbocore",     status: "skipped", created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    { id: 4, source: "virtual",   symbol: null,        strategy: "tqqq_turbocore",     type: "deposit", amount: 5000, quantity: null, price: null, created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
    { id: 5, source: "trademind", symbol: "REBALANCE", strategy: "tqqq_turbocore",     status: "executed", created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), executed_at: new Date(Date.now() - 72 * 60 * 60 * 1000 + 60000).toISOString() },
    { id: 6, source: "virtual",   symbol: "TQQQ",      strategy: "tqqq_turbocore",     type: "buy",     amount: 9394, quantity: 89, price: 58.40, created_at: new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString() },
];

const TICKER_DATA = [
    { sym: "QQQ",  chg: "+1.24%", pos: true },
    { sym: "TQQQ", chg: "+3.87%", pos: true },
    { sym: "SQQQ", chg: "-3.80%", pos: false },
    { sym: "SGOV", chg: "+0.01%", pos: true },
    { sym: "SPY",  chg: "+0.82%", pos: true },
    { sym: "VIX",  chg: "-4.12%", pos: false },
];

const AI_FEATURES = [
    { key: "screenshot", title: "Screenshot Analysis",  icon: <FileSearch className="h-6 w-6 text-indigo-400" />,  price: 5, active: true,  desc: "Upload screenshots of trades or charts for instant AI analysis." },
    { key: "deepdive",   title: "Deep Dive",           icon: <LineChart className="h-6 w-6 text-green-400" />,    price: 5, active: false, desc: "In-depth ticker analysis with live news catalysts and options risk profiling." },
    { key: "briefing",   title: "Morning Briefing",    icon: <Coffee className="h-6 w-6 text-amber-400" />,       price: 5, active: true,  desc: "Daily morning market briefing tailored to the active TurboCore regime." },
    { key: "strategy",   title: "Strategy Builder",    icon: <Target className="h-6 w-6 text-rose-400" />,        price: 5, active: false, desc: "Build realistic multi-leg options strategies optimized for your thesis." },
    { key: "debrief",    title: "Trade Debrief",       icon: <Briefcase className="h-6 w-6 text-purple-400" />,   price: 5, active: false, desc: "Weekly performance review and educational insights on your closed trades." },
];

const REFERRALS = [
    { name: "Alex T.", joinedAt: "2026-03-01", signupBonusPaid: true, stage1Paid: true },
    { name: "Maria S.", joinedAt: "2026-03-15", signupBonusPaid: true, stage1Paid: false },
    { name: "James K.", joinedAt: "2026-04-02", signupBonusPaid: false, stage1Paid: false },
];

const TABS = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "ai",        label: "AI",        icon: Bot },
    { id: "signals",   label: "Signals",   icon: TrendingUp },
    { id: "positions", label: "Positions", icon: Briefcase },
    { id: "activity",  label: "Activity",  icon: Activity },
    { id: "refer",     label: "Refer",     icon: Gift },
    { id: "setup",     label: "Setup",     icon: Settings },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(v: number) {
    return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(d: string) {
    return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function pct(v: number) { return `${(v * 100).toFixed(0)}%`; }

// ─── Sub-components ───────────────────────────────────────────────────────────

function DemoToast({ message, onClose }: { message: string; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3000);
        return () => clearTimeout(t);
    }, [onClose]);
    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a2e] border border-purple-500/40 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Zap className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="text-sm font-medium">{message}</span>
        </div>
    );
}

function ActionBadge({ action }: { action: string }) {
    const isOpen = action.includes("OPEN");
    const isBuy = action.includes("BUY");
    return (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono
            ${isOpen ? (isBuy ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300")
                     : (isBuy ? "bg-blue-500/20 text-blue-300" : "bg-orange-500/20 text-orange-300")}`}>
            {action.length > 14 ? action.replace("BUY TO ", "BTO ") : action}
        </span>
    );
}

// ─── Tab: Dashboard & Signals shared card ────────────────────────────────────

function SignalCard({ signal, onApprove, onSkip }: { signal: typeof TURBOCORE_PRO_SIGNAL; onApprove: () => void; onSkip: () => void }) {
    const [expanded, setExpanded] = useState(true);
    const isPro = signal.strategy.includes("PRO");

    return (
        <div className="glass-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-base">{isPro ? "TurboCore Pro" : "TurboCore"}</span>
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded font-bold">
                                {signal.regime}
                            </span>
                        </div>
                        <p className="text-xs text-[#94a3b8]">Target Rebalance · {signal.created_at}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-emerald-400">{pct(signal.confidence)}</p>
                    <p className="text-[10px] text-[#94a3b8]">ML Score</p>
                </div>
            </div>

            {/* Allocation tiles */}
            <div className={`grid gap-2 px-5 mb-4 ${signal.legs.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
                {signal.legs.map(leg => (
                    <div key={leg.symbol} className="bg-black/30 rounded-lg px-3 py-2 border border-white/5">
                        <p className="text-[10px] text-[#94a3b8] font-bold">{leg.symbol}</p>
                        <p className={`text-sm font-black ${leg.color}`}>{pct(leg.target_pct)}</p>
                        <p className="text-[10px] text-[#94a3b8] font-mono">${leg.amount.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            {/* Virtual Balance */}
            <div className="px-5 py-2 border-t border-white/5 flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
                    <Wallet className="w-3.5 h-3.5" />
                    Virtual Balance
                </div>
                <span className="text-sm font-bold font-mono text-white">
                    ${signal.virtualBalance.toLocaleString("en-US", { minimumFractionDigits: 3 })}
                </span>
            </div>

            {/* Order preview */}
            {expanded && (
                <div className="px-5 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-xs font-bold text-purple-300">Virtual Order Preview</span>
                    </div>
                    <div className="text-[10px] text-amber-400 font-bold mb-2">
                        ⚡ MANUAL ORDER INSTRUCTIONS — enter these in your broker
                    </div>
                    <div className="space-y-1.5">
                        {signal.orders.map((o, i) => (
                            <div key={i} className="bg-black/40 rounded-lg px-3 py-2 border border-white/5">
                                <div className="flex items-center justify-between mb-0.5">
                                    <div className="flex items-center gap-2">
                                        <ActionBadge action={o.action} />
                                        <span className="text-xs font-semibold text-white">{o.symbol}</span>
                                        <span className="text-[10px] text-[#94a3b8]">· {o.type}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-mono font-bold">${o.amount.toLocaleString()}</p>
                                        <p className="text-[10px] text-[#94a3b8]">{o.qty}</p>
                                    </div>
                                </div>
                                {o.detail && (
                                    <p className="text-[10px] text-amber-400/80 mt-1">↳ {o.detail}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Connect banner */}
            <div className="px-5 pb-3">
                <div className="border border-purple-500/20 rounded-lg py-2.5 text-center text-[11px] text-purple-300">
                    ⚡ Connect Tastytrade for live pricing & one-click execution
                </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-3">
                <button
                    onClick={onSkip}
                    className="flex-1 py-3 rounded-xl border border-white/20 text-[#94a3b8] hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                >
                    <XCircle className="w-4 h-4" /> Skip
                </button>
                <button
                    onClick={onApprove}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition-colors font-bold text-sm flex items-center justify-center gap-2"
                >
                    <CheckCircle className="w-4 h-4" /> Execute Trade
                </button>
            </div>
        </div>
    );
}

// ─── Tab: Dashboard ───────────────────────────────────────────────────────────

function DashboardTab({ onToast }: { onToast: (m: string) => void }) {
    const [activeStrat, setActiveStrat] = useState<"core" | "pro">("pro");
    const signal = activeStrat === "pro" ? TURBOCORE_PRO_SIGNAL : TURBOCORE_SIGNAL;

    return (
        <div className="space-y-4">
            {/* Header banners */}
            <div className="glass-card px-4 py-3 flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-white">{DEMO_USER.plan}</p>
                    <p className="text-[11px] text-emerald-400">● Active Subscription</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="text-[10px] bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-full font-bold">
                        Setup Guide
                    </button>
                </div>
            </div>

            {/* Auto-approve toggle */}
            <div className="glass-card px-4 py-3 flex items-center gap-3">
                <div className="w-5 h-5 border border-white/20 rounded flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-white/20 rounded-sm" />
                </div>
                <div>
                    <p className="text-sm font-semibold">Auto-Approve Trades</p>
                    <p className="text-[11px] text-[#94a3b8]">Manually approve each signal before execution</p>
                </div>
            </div>

            {/* Core / Pro tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveStrat("core")}
                    className={`px-5 py-2 rounded-full text-sm font-bold border transition-all ${activeStrat === "core" ? "border-purple-500 text-white bg-purple-500/20" : "border-white/10 text-[#94a3b8]"}`}
                >
                    ⊙ Core
                </button>
                <button
                    onClick={() => setActiveStrat("pro")}
                    className={`px-5 py-2 rounded-full text-sm font-bold border transition-all ${activeStrat === "pro" ? "border-purple-500 text-white bg-purple-500/20" : "border-white/10 text-[#94a3b8]"}`}
                >
                    ⚡ Pro
                </button>
            </div>

            {/* Signal card */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">
                        TurboCore {activeStrat === "pro" ? "Pro " : ""}Signals
                    </h2>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">
                        1 Active Target Change
                    </span>
                </div>
                <SignalCard
                    signal={signal as any}
                    onApprove={() => onToast("🎯 Demo mode — no real trades executed")}
                    onSkip={() => onToast("↩️ Signal skipped (demo)")}
                />
            </div>

            {/* Computing overlay */}
            <div className="glass-card px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    <div>
                        <p className="text-sm font-semibold text-purple-300">Computing IV-Switching overlay...</p>
                        <p className="text-[11px] text-[#94a3b8]">Signal will update in a few seconds</p>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-[#94a3b8]" />
            </div>
        </div>
    );
}

// ─── Tab: AI ──────────────────────────────────────────────────────────────────

function AITab({ onToast }: { onToast: (m: string) => void }) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-[#1a1a2e]/80 border-b border-white/5 -mx-4 px-4 py-5">
                <div className="flex items-center gap-3 mb-2">
                    <Bot className="w-8 h-8 text-purple-400" />
                    <h1 className="text-2xl font-bold">AI Copilot</h1>
                </div>
                <p className="text-sm text-[#94a3b8]">Your personal market analyst powered by Perplexity Pro real-time engine.</p>

                {/* Tier badge */}
                <div className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-400" /> Subscription Tier:
                            <span className="uppercase text-purple-400 font-bold">Both Bundle</span>
                        </span>
                        <span className="text-xs font-semibold bg-purple-500/20 px-2 py-1 rounded text-purple-300">
                            2 / 2 free picks used
                        </span>
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-1">Additional features are $5/mo each.</p>
                </div>
            </div>

            {/* Features grid */}
            <div>
                <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
                    <BarChart3 className="h-5 w-5 text-[#94a3b8]" /> Available Features
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    {AI_FEATURES.map(f => (
                        <div key={f.key} className={`glass-card p-4 relative overflow-hidden ${f.active ? "border-purple-500/30" : "border-white/10"}`}>
                            {f.active && (
                                <div className="absolute top-2 right-2">
                                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">ACTIVE</span>
                                </div>
                            )}
                            <div className="mb-2">{f.icon}</div>
                            <p className="text-sm font-bold mb-1">{f.title}</p>
                            <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-3">{f.desc}</p>
                            {!f.active && (
                                <button
                                    onClick={() => onToast("💡 Demo mode — subscribe at trademind.bot to activate")}
                                    className="text-[11px] font-bold text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg hover:bg-purple-500/10 transition w-full"
                                >
                                    Add · $5/mo
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Static chat snippet */}
            <div>
                <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
                    <MessageSquare className="h-5 w-5 text-[#94a3b8]" /> AI Chat Preview
                </h2>
                <div className="glass-card p-4 space-y-3">
                    <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#94a3b8]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs">👤</span>
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm">
                            Why is TurboCore showing SIDEWAYS regime today?
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Bot className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#94a3b8] leading-relaxed">
                            The ML model detected compressed IV across QQQ options (VIX at 16.2) combined with declining volume confirming a consolidation phase. In SIDEWAYS regime, the portfolio shifts toward LEAPS for leveraged upside participation while maintaining SGOV as a liquidity buffer. The 50.2% confidence reflects genuine uncertainty — the model is near its decision boundary, suggesting a potential regime change within 3–5 sessions.
                        </div>
                    </div>
                    <div className="border-t border-white/5 pt-3">
                        <div className="flex gap-2">
                            <input readOnly placeholder="Ask about your portfolio..." className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder:text-[#94a3b8] focus:outline-none" />
                            <button onClick={() => onToast("💡 Log in to chat with the real AI Copilot")} className="bg-purple-600 hover:bg-purple-500 rounded-xl px-4 py-2.5 transition">
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Tab: Signals ─────────────────────────────────────────────────────────────

function SignalsTab({ onToast }: { onToast: (m: string) => void }) {
    const [activeStrat, setActiveStrat] = useState<"core" | "pro">("pro");
    const signal = activeStrat === "pro" ? TURBOCORE_PRO_SIGNAL : TURBOCORE_SIGNAL;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">Trade Signals</h1>
                    <p className="text-sm text-[#94a3b8]">1 pending</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full">
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">Connected</span>
                </div>
            </div>

            <div className="flex gap-2">
                {["core", "pro"].map(s => (
                    <button
                        key={s}
                        onClick={() => setActiveStrat(s as "core" | "pro")}
                        className={`px-5 py-2 rounded-full text-sm font-bold border transition-all ${activeStrat === s ? "border-purple-500 text-white bg-purple-500/20" : "border-white/10 text-[#94a3b8]"}`}
                    >
                        {s === "core" ? "⊙ Core" : "⚡ Pro"}
                    </button>
                ))}
            </div>

            <SignalCard
                signal={signal as any}
                onApprove={() => onToast("🎯 Demo mode — no real trades executed")}
                onSkip={() => onToast("↩️ Signal skipped (demo)")}
            />
        </div>
    );
}

// ─── Tab: Positions ───────────────────────────────────────────────────────────

function PositionsTab({ onToast }: { onToast: (m: string) => void }) {
    const positions = DEMO_POSITIONS.map(p => ({
        ...p,
        marketValue: p.qty * p.currentPrice,
        pnl: (p.currentPrice - p.avgPrice) * p.qty,
        pnlPct: ((p.currentPrice - p.avgPrice) / p.avgPrice) * 100,
    }));
    const totalMv = positions.reduce((s, p) => s + p.marketValue, 0);
    const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);
    const cash = 4600;
    const totalValue = totalMv + cash;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        Positions
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold">VIRTUAL</span>
                    </h1>
                    <p className="text-sm text-[#94a3b8]">{positions.length} equity · 2 spreads</p>
                </div>
                <button className="w-9 h-9 rounded-full bg-[#1a1a2e] flex items-center justify-center text-[#94a3b8]">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Account Summary */}
            <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Wallet className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold">Account Overview</h3>
                    <div className="ml-auto flex gap-2">
                        <button onClick={() => onToast("💡 Demo mode — amounts are virtual")} className="text-[10px] bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-bold">DEPOSIT</button>
                        <button onClick={() => onToast("💡 Demo mode — amounts are virtual")} className="text-[10px] bg-red-500/20 text-red-400 px-3 py-1 rounded-full font-bold">WITHDRAW</button>
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                    {[
                        { label: "Total Value",      val: formatCurrency(totalValue), color: "text-white" },
                        { label: "Cash",             val: formatCurrency(cash),        color: "text-emerald-400" },
                        { label: "Positions Value",  val: formatCurrency(totalMv),     color: "text-purple-400" },
                        { label: "Realized P&L",     val: "+$847",                     color: "text-emerald-400" },
                    ].map(({ label, val, color }) => (
                        <div key={label}>
                            <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider font-semibold mb-1">{label}</p>
                            <p className={`text-base font-black font-mono ${color}`}>{val}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Equity Table */}
            <div>
                <h2 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Equity Holdings</h2>
                <div className="glass-card overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                {["Symbol", "Price", "Cost/sh", "Market Value", "Unrealized G/L"].map(h => (
                                    <th key={h} className="px-4 py-3 text-[10px] uppercase font-bold text-[#94a3b8] text-right first:text-left">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {positions.map(pos => (
                                <tr key={pos.symbol} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition">
                                    <td className="px-4 py-3">
                                        <span className={`font-bold font-mono ${pos.color}`}>{pos.symbol}</span>
                                        <span className="text-[10px] text-[#94a3b8] font-mono bg-white/5 px-1.5 py-0.5 rounded ml-2">x{pos.qty}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-sm">${pos.currentPrice.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right font-mono text-sm text-[#94a3b8]">${pos.avgPrice.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right font-mono text-sm">{formatCurrency(pos.marketValue)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <p className={`font-mono text-sm font-bold ${pos.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                            {pos.pnl >= 0 ? "+" : ""}{formatCurrency(pos.pnl)}
                                        </p>
                                        <p className={`font-mono text-[10px] ${pos.pnl >= 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
                                            {pos.pnl >= 0 ? "+" : ""}{pos.pnlPct.toFixed(2)}%
                                        </p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Options Spreads */}
            <div>
                <h2 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Options Spreads · TurboCore Pro
                </h2>
                <div className="space-y-3">
                    {/* ZEBRA Spread */}
                    <div className="glass-card p-4 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center text-sm font-bold">2L</div>
                                <div>
                                    <p className="font-bold text-sm">QQQ · Long Spread <span className="text-[9px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded ml-1">2 LEGS</span></p>
                                    <p className="text-xs text-[#94a3b8]">1 contract · $2.14/contract · Exp Apr 25</p>
                                </div>
                            </div>
                        </div>
                        {[
                            { act: "BTO", sym: "QQQ $395 Call", exp: "Apr 25, '26", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
                            { act: "STO", sym: "QQQ $415 Call", exp: "Apr 25, '26", badge: "bg-red-500/20 text-red-400 border-red-500/30" },
                        ].map((leg, i) => (
                            <div key={i} className="flex items-center justify-between bg-black/40 rounded-lg px-3 py-2 border border-white/5 mb-1.5 last:mb-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${leg.badge}`}>{leg.act}</span>
                                    <div>
                                        <p className="font-mono text-sm font-semibold">{leg.sym}</p>
                                        <p className="text-[10px] text-[#94a3b8] font-mono">Exp {leg.exp}</p>
                                    </div>
                                </div>
                                <p className="text-xs font-mono text-[#94a3b8]">x1</p>
                            </div>
                        ))}
                    </div>

                    {/* Bear Call Spread */}
                    <div className="glass-card p-4 border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center text-sm font-bold">2L</div>
                                <div>
                                    <p className="font-bold text-sm">QQQ · Bear Call Spread <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded ml-1">2 LEGS</span></p>
                                    <p className="text-xs text-[#94a3b8]">2 contracts · $1.85/contract · Exp May 2</p>
                                </div>
                            </div>
                        </div>
                        {[
                            { act: "STO", sym: "QQQ $490 Call", exp: "May 2, '26", badge: "bg-red-500/20 text-red-400 border-red-500/30" },
                            { act: "BTO", sym: "QQQ $500 Call", exp: "May 2, '26", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
                        ].map((leg, i) => (
                            <div key={i} className="flex items-center justify-between bg-black/40 rounded-lg px-3 py-2 border border-white/5 mb-1.5 last:mb-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${leg.badge}`}>{leg.act}</span>
                                    <div>
                                        <p className="font-mono text-sm font-semibold">{leg.sym}</p>
                                        <p className="text-[10px] text-[#94a3b8] font-mono">Exp {leg.exp}</p>
                                    </div>
                                </div>
                                <p className="text-xs font-mono text-[#94a3b8]">x2</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Tab: Activity ────────────────────────────────────────────────────────────

function ActivityTab() {
    const [filter, setFilter] = useState("");
    const [stratFilter, setStratFilter] = useState("all");

    const filtered = DEMO_ACTIVITY.filter(item => {
        const q = filter.toLowerCase();
        const sym = (item.symbol || "").toLowerCase();
        const strat = (item.strategy || "").toLowerCase();
        const matchSearch = !q || sym.includes(q) || strat.includes(q);
        const matchStrat = stratFilter === "all" || strat.includes(stratFilter);
        return matchSearch && matchStrat;
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">Activity Log</h1>
                    <p className="text-sm text-[#94a3b8]">Track all trade lifecycle events</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-purple-400" />
                </div>
            </div>

            {/* Strategy filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {["all", "turbocore", "turbocore_pro"].map(s => (
                    <button
                        key={s}
                        onClick={() => setStratFilter(s)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${stratFilter === s ? "border-purple-500 text-white bg-purple-500/20" : "border-white/10 text-[#94a3b8]"}`}
                    >
                        {s === "all" ? "All" : s === "turbocore" ? "TurboCore" : "TurboCore Pro"}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <input
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    placeholder="Filter by symbol, strategy or status..."
                    className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl pl-4 pr-4 py-2.5 text-sm placeholder:text-[#94a3b8] focus:outline-none focus:border-purple-500/50"
                />
            </div>

            {/* Items */}
            <div className="space-y-3">
                {filtered.map(item => {
                    const isVirt = item.source === "virtual";
                    const isTM = item.source === "trademind";
                    const isDeposit = isVirt && (item as any).type === "deposit";
                    const isExecuted = item.status === "executed";
                    const isSkipped = item.status === "skipped";

                    return (
                        <div key={item.id} className="glass-card p-4 hover:bg-[#1a1a2e]/70 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-white/5">
                                        {isExecuted ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                                            : isSkipped ? <XCircle className="w-5 h-5 text-[#94a3b8]" />
                                            : isDeposit ? <Wallet className="w-5 h-5 text-purple-400" />
                                            : <CheckCircle className="w-5 h-5 text-emerald-400" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-sm">{item.symbol || (isDeposit ? "DEPOSIT" : "SIGNAL")}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${item.strategy?.includes("pro") ? "bg-purple-500/20 text-purple-300" : "bg-blue-500/20 text-blue-300"}`}>
                                                {item.strategy?.replace("tqqq_", "").replace("_", " ")}
                                            </span>
                                            {isVirt && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">VIRTUAL</span>}
                                        </div>
                                        <p className="text-xs text-[#94a3b8] capitalize mt-0.5">
                                            {isVirt ? `${(item as any).type}${(item as any).quantity ? ` · ${(item as any).quantity} shares @ $${(item as any).price?.toFixed(2)}` : ""}`
                                                : item.status?.replace("_", " ")}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {isVirt && <p className={`text-xs ${(item as any).type === "deposit" ? "text-emerald-400" : (item as any).type === "buy" ? "text-red-400" : "text-emerald-400"}`}>
                                        {(item as any).type === "buy" ? "-" : "+"} ${(item as any).amount?.toLocaleString()}
                                    </p>}
                                    <p className="text-[10px] text-[#94a3b8] mt-1">{formatDate(item.created_at)}</p>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="bg-white/5 rounded-xl p-3 space-y-2 relative overflow-hidden">
                                <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-white/10" />
                                {isTM && (
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-2 h-2 rounded-full bg-purple-400 ring-4 ring-[#1a1a2e]" />
                                        <span className="text-xs text-[#94a3b8]">Signal Received · {formatDate(item.created_at)}</span>
                                    </div>
                                )}
                                {isExecuted && (
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-[#1a1a2e]" />
                                        <span className="text-xs text-emerald-300 font-medium">Executed · {formatDate((item as any).executed_at || item.created_at)}</span>
                                    </div>
                                )}
                                {isVirt && (
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className={`w-2 h-2 rounded-full ring-4 ring-[#1a1a2e] ${isDeposit ? "bg-purple-400" : "bg-emerald-400"}`} />
                                        <span className={`text-xs font-medium ${isDeposit ? "text-purple-300" : "text-emerald-300"}`}>
                                            {isDeposit ? "Ledger Updated" : "Virtual Trade Executed"} · {formatDate(item.created_at)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="glass-card p-8 text-center">
                        <Activity className="w-10 h-10 text-[#94a3b8] mx-auto mb-3 opacity-50" />
                        <p className="text-[#94a3b8] text-sm">No activity matches your filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Tab: Refer ───────────────────────────────────────────────────────────────

function ReferTab({ onToast }: { onToast: (m: string) => void }) {
    const [showDetails, setShowDetails] = useState(false);
    const refLink = "https://trademind.bot/?ref=DEMO2024";

    const copyLink = () => {
        navigator.clipboard.writeText(refLink).catch(() => {});
        onToast("📋 Referral link copied!");
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-bold">Referral Dashboard</h1>
            </div>

            {/* Share section */}
            <div className="glass-card p-5">
                <p className="text-sm font-bold mb-2 flex items-center gap-2"><Gift className="w-4 h-4 text-purple-400" /> Your Referral Link</p>
                <div className="flex gap-2">
                    <div className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-[#94a3b8] truncate">{refLink}</div>
                    <button onClick={copyLink} className="bg-purple-600 hover:bg-purple-500 rounded-xl px-4 py-2.5 transition flex items-center gap-1.5 text-xs font-bold">
                        <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Total Referred", val: "3",    icon: <Users className="w-5 h-5 text-blue-400" />,    bg: "bg-blue-500/10" },
                    { label: "Total Earned",   val: "$150", icon: <DollarSign className="w-5 h-5 text-emerald-400" />, bg: "bg-emerald-500/10" },
                    { label: "Potential",      val: "$100", icon: <Clock className="w-5 h-5 text-amber-400" />,   bg: "bg-amber-500/10" },
                ].map(s => (
                    <div key={s.label} className="glass-card p-4 flex flex-col items-center gap-2 text-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${s.bg}`}>{s.icon}</div>
                        <p className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-wider">{s.label}</p>
                        <p className="text-xl font-black">{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Tier progress */}
            <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🥉</span>
                        <div>
                            <p className="font-bold text-sm">Bronze Affiliate</p>
                            <p className="text-xs text-[#94a3b8]">Current Tier</p>
                        </div>
                    </div>
                    <p className="text-xs text-[#94a3b8]">3 / 5 referrals to Silver</p>
                </div>
                <div className="w-full bg-[#0A0A0F] rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-700" style={{ width: "60%" }} />
                </div>
                <p className="text-[11px] text-[#94a3b8] mt-2">2 more referrals to unlock <strong className="text-white">🥈 Silver</strong></p>
            </div>

            {/* Referrals list */}
            <div>
                <h3 className="text-base font-bold flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-blue-400" /> Your Referrals</h3>
                <div className="glass-card overflow-hidden divide-y divide-white/5">
                    {REFERRALS.map(ref => (
                        <div key={ref.name} className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold">{ref.name}</p>
                                <p className="text-xs text-[#94a3b8]">Joined {new Date(ref.joinedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-1.5 bg-[#0A0A0F] p-2 rounded-lg border border-white/5">
                                {[
                                    { label: "Signed Up", done: true },
                                    { label: "+$50 Sent", done: ref.signupBonusPaid },
                                    { label: "+$50 Paid", done: ref.stage1Paid },
                                ].map((stage, i) => (
                                    <div key={stage.label} className="flex flex-col items-center gap-1 w-14">
                                        {i > 0 && <div className="absolute w-4 h-px bg-white/10 -translate-x-9 translate-y-1.5" />}
                                        <div className={`w-3 h-3 rounded-full ${stage.done ? (i === 2 ? "bg-emerald-400 shadow-[0_0_8px_#10b981]" : "bg-purple-400 shadow-[0_0_8px_#a855f7]") : "bg-white/10"}`} />
                                        <div className="text-[9px] text-[#94a3b8] uppercase text-center leading-tight">{stage.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* How it works collapsible */}
            <div className="glass-card overflow-hidden">
                <button onClick={() => setShowDetails(!showDetails)} className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-purple-400" />
                        <h3 className="text-base font-bold">How It Works & Rewards</h3>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-[#94a3b8] transition-transform duration-300 ${showDetails ? "rotate-180" : ""}`} />
                </button>
                {showDetails && (
                    <div className="p-5 border-t border-white/5 space-y-4 bg-black/20">
                        {[
                            { num: "1", color: "bg-purple-500/20 text-purple-400", title: "Stage 1 — Friend Signs Up (Both Get $50)", desc: "Your friend gets $50 in bonus trial days. You get your subscription extended by $50 in free days." },
                            { num: "2", color: "bg-emerald-500/20 text-emerald-400", title: "Stage 2 — First Charge (Both Get Another $50)", desc: "When your friend's card is first charged, you both receive another $50 in free subscription days." },
                            { num: "★", color: "bg-amber-500/20 text-amber-400", title: "Annual Plan Bonus", desc: "Friend subscribes annually? Both receive a larger $75 bonus in one shot." },
                        ].map(step => (
                            <div key={step.num} className="flex gap-4">
                                <div className={`w-8 h-8 rounded-full ${step.color} font-bold flex items-center justify-center flex-shrink-0`}>{step.num}</div>
                                <div>
                                    <p className="font-bold text-sm mb-1">{step.title}</p>
                                    <p className="text-xs text-[#94a3b8] leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Tab: Setup ───────────────────────────────────────────────────────────────

function SetupTab({ onToast }: { onToast: (m: string) => void }) {
    const [autoApproveCore, setAutoApproveCore] = useState(false);
    const [autoApprovePro, setAutoApprovePro] = useState(false);
    const [emailAlerts, setEmailAlerts] = useState(true);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold">Settings</h1>
                <p className="text-sm text-[#94a3b8]">Configure your strategy</p>
            </div>

            {/* Subscription */}
            <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Star className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <p className="font-bold">Both Bundle</p>
                        <p className="text-sm text-emerald-400">Active · $69/mo</p>
                    </div>
                    <button onClick={() => onToast("💡 Manage subscription at trademind.bot")} className="ml-auto text-xs text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg hover:bg-purple-500/10 transition">
                        Manage
                    </button>
                </div>
                <div className="space-y-2">
                    {[
                        { label: "TurboCore", desc: "AI-driven TQQQ/QQQ portfolio rebalancing", color: "emerald" },
                        { label: "TurboCore Pro", desc: "Options overlays: CSP, Bear Call Spread, ZEBRA, LEAPS", color: "purple" },
                    ].map(s => (
                        <div key={s.label} className={`flex items-center gap-3 bg-${s.color}-500/5 border border-${s.color}-500/20 rounded-xl px-4 py-3`}>
                            <CheckCircle className={`w-4 h-4 text-${s.color}-400 flex-shrink-0`} />
                            <div>
                                <p className="text-sm font-bold">{s.label}</p>
                                <p className="text-xs text-[#94a3b8]">{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Auto-Approve */}
            <div className="glass-card p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Auto-Approve Settings</h3>
                <div className="space-y-3">
                    {[
                        { label: "TurboCore Auto-Approve",     val: autoApproveCore, set: setAutoApproveCore },
                        { label: "TurboCore Pro Auto-Approve", val: autoApprovePro,  set: setAutoApprovePro  },
                    ].map(s => (
                        <div key={s.label} className="flex items-center justify-between">
                            <p className="text-sm">{s.label}</p>
                            <button
                                onClick={() => { s.set(!s.val); onToast(`${s.label}: ${!s.val ? "Enabled" : "Disabled"} (demo)`); }}
                                className={`relative w-12 h-6 rounded-full transition-colors ${s.val ? "bg-purple-600" : "bg-white/10"}`}
                            >
                                <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${s.val ? "left-6" : "left-0.5"}`} />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="mt-4">
                    <p className="text-xs text-[#94a3b8] mb-2">Risk Level</p>
                    <div className="flex gap-2">
                        {["Low", "Medium", "High"].map(r => (
                            <button
                                key={r}
                                onClick={() => onToast(`Risk level set to ${r} (demo)`)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${r === "Medium" ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "border-white/10 text-[#94a3b8] hover:border-white/20"}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Email Alerts */}
            <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold flex items-center gap-2"><Bell className="w-4 h-4 text-blue-400" /> Signal Email Alerts</h3>
                    <button
                        onClick={() => { setEmailAlerts(!emailAlerts); onToast(`Email alerts ${!emailAlerts ? "enabled" : "disabled"} (demo)`); }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${emailAlerts ? "bg-purple-600" : "bg-white/10"}`}
                    >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${emailAlerts ? "left-6" : "left-0.5"}`} />
                    </button>
                </div>
                <p className="text-xs text-[#94a3b8]">Alerts sent to: <span className="text-white font-mono">{DEMO_USER.email}</span></p>
            </div>

            {/* Tastytrade */}
            <div className="glass-card p-5">
                <h3 className="font-bold mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-[#94a3b8]" /> Tastytrade Integration</h3>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300">Not connected — running in virtual/shadow mode. Connect in real app for one-click execution.</p>
                </div>
                <button onClick={() => onToast("💡 Connect Tastytrade in the real app at trademind.bot")} className="mt-3 w-full py-2.5 rounded-xl border border-white/10 text-sm text-[#94a3b8] hover:text-white hover:border-white/20 transition">
                    Connect Tastytrade Account
                </button>
            </div>

            {/* Risk Warning */}
            <div className="glass-card p-4 border border-yellow-500/20">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-yellow-400 mb-1 text-sm">Risk Warning</h3>
                        <p className="text-xs text-[#94a3b8] leading-relaxed">
                            TQQQ is a 3× leveraged ETF. Higher risk levels mean larger positions and significantly increased loss exposure during market reversals. Options on leveraged ETFs carry elevated gamma and volatility risk.
                        </p>
                    </div>
                </div>
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400">Live system · All signals automated</span>
            </div>
        </div>
    );
}

// ─── Hero Screen ──────────────────────────────────────────────────────────────

function HeroScreen({ onStart }: { onStart: () => void }) {
    const [copiedCred, setCopiedCred] = useState(false);
    const [tickerIdx, setTickerIdx] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setTickerIdx(i => (i + 1) % TICKER_DATA.length), 1500);
        return () => clearInterval(t);
    }, []);

    const copyCreds = () => {
        navigator.clipboard.writeText(`Email: ${DEMO_USER.email}\nPassword: ${DEMO_USER.password}`).catch(() => {});
        setCopiedCred(true);
        setTimeout(() => setCopiedCred(false), 2000);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
            {/* Background glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-blue-600/15 rounded-full blur-[80px]" />
            </div>

            <div className="relative z-10 max-w-md w-full text-center space-y-8">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(124,58,237,0.6)]">
                        <Brain className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-3xl font-black tracking-tight">TradeMind</span>
                </div>
                <p className="text-lg text-[#94a3b8] leading-relaxed">
                    The smartest automated trading copilot — AI-driven signals, options strategies, and portfolio automation.
                </p>

                {/* Ticker strip */}
                <div className="flex items-center justify-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
                    {TICKER_DATA.map(t => (
                        <div key={t.sym} className="flex items-center gap-1.5 text-xs">
                            <span className="font-bold text-white">{t.sym}</span>
                            <span className={`font-mono font-bold ${t.pos ? "text-emerald-400" : "text-red-400"}`}>{t.chg}</span>
                        </div>
                    ))}
                </div>

                {/* CTAs */}
                <div className="space-y-3">
                    <button
                        onClick={onStart}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 font-bold text-lg transition-all shadow-[0_8px_32px_rgba(124,58,237,0.4)] hover:shadow-[0_12px_40px_rgba(124,58,237,0.6)] flex items-center justify-center gap-2"
                    >
                        Start Interactive Tour <ArrowRight className="w-5 h-5" />
                    </button>
                    <a
                        href="https://trademind.bot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 rounded-2xl border border-white/20 hover:border-purple-500/50 font-semibold transition-all flex items-center justify-center gap-2 text-[#94a3b8] hover:text-white"
                    >
                        <ExternalLink className="w-4 h-4" /> Go to trademind.bot
                    </a>
                </div>

                {/* Demo credentials card */}
                <div className="bg-[#1a1a2e]/80 border border-purple-500/30 rounded-2xl p-5 text-left">
                    <div className="flex items-center gap-2 mb-3">
                        <LogIn className="w-4 h-4 text-purple-400" />
                        <p className="text-sm font-bold text-purple-300">Demo Account Credentials</p>
                    </div>
                    <p className="text-xs text-[#94a3b8] mb-4 leading-relaxed">
                        Log in at <a href="https://trademind.bot" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline">trademind.bot</a> with these credentials to explore the real app with live signals.
                    </p>
                    <div className="space-y-2 font-mono text-sm">
                        <div className="flex justify-between items-center bg-black/30 rounded-xl px-4 py-2.5 border border-white/5">
                            <span className="text-[#94a3b8] text-xs">Email</span>
                            <span className="text-white">{DEMO_USER.email}</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/30 rounded-xl px-4 py-2.5 border border-white/5">
                            <span className="text-[#94a3b8] text-xs">Password</span>
                            <span className="text-white">{DEMO_USER.password}</span>
                        </div>
                    </div>
                    <button
                        onClick={copyCreds}
                        className="mt-3 w-full py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-sm font-bold text-purple-300 transition flex items-center justify-center gap-2"
                    >
                        {copiedCred ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Credentials</>}
                    </button>
                </div>

                <p className="text-xs text-[#94a3b8]">No account required for the interactive tour below ↓</p>
            </div>
        </div>
    );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function DemoPage() {
    const [showHero, setShowHero] = useState(true);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [toast, setToast] = useState<string | null>(null);
    const showToast = (msg: string) => setToast(msg);

    if (showHero) {
        return (
            <>
                <HeroScreen onStart={() => setShowHero(false)} />
                {toast && <DemoToast message={toast} onClose={() => setToast(null)} />}
            </>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0F]">
            {/* Demo banner */}
            <div className="bg-purple-600/20 border-b border-purple-500/30 px-4 py-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span className="text-xs font-bold text-purple-300">INTERACTIVE DEMO</span>
                    <span className="text-xs text-[#94a3b8] hidden sm:inline">— All data is simulated. No real trades.</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowHero(true)} className="text-[11px] text-[#94a3b8] hover:text-white transition">← Hero</button>
                    <a href="https://trademind.bot" target="_blank" rel="noopener noreferrer" className="text-[11px] bg-purple-600 text-white px-3 py-1 rounded-full font-bold hover:bg-purple-500 transition flex items-center gap-1">
                        Get Real Access <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>

            {/* Main content */}
            <div className="max-w-4xl mx-auto w-full border-x border-white/5 min-h-screen">
                <div className="px-4 pt-5 pb-32">
                    {activeTab === "dashboard" && <DashboardTab onToast={showToast} />}
                    {activeTab === "ai"        && <AITab onToast={showToast} />}
                    {activeTab === "signals"   && <SignalsTab onToast={showToast} />}
                    {activeTab === "positions" && <PositionsTab onToast={showToast} />}
                    {activeTab === "activity"  && <ActivityTab />}
                    {activeTab === "refer"     && <ReferTab onToast={showToast} />}
                    {activeTab === "setup"     && <SetupTab onToast={showToast} />}
                </div>
            </div>

            {/* Bottom nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a2e]/90 backdrop-blur-md border-t border-white/5">
                <div className="max-w-4xl mx-auto flex items-center justify-around px-1 py-2">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const isRefer = tab.id === "refer";
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${isActive ? "text-purple-400" : isRefer ? "text-zinc-400 hover:text-purple-400" : "text-[#94a3b8] hover:text-white"}`}
                            >
                                {isRefer && !isActive && (
                                    <span className="absolute top-1 right-1.5 w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_6px_rgba(168,85,247,0.8)] animate-pulse" />
                                )}
                                <Icon className="w-5 h-5 mb-1" />
                                <span className="text-[10px] font-medium">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {toast && <DemoToast message={toast} onClose={() => setToast(null)} />}
        </div>
    );
}
