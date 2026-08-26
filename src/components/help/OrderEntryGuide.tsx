'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BROKERS, ORDER_TYPES, getBroker, getFlow, type OrderTypeKey } from './orderEntryData';
import { CheckCircle2, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react';

const FRICTION_STYLE: Record<string, { label: string; cls: string }> = {
    smooth: { label: 'Smoothest for this strategy', cls: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
    moderate: { label: 'Some setup required', cls: 'text-amber-300 border-amber-300/30 bg-amber-300/10' },
    high: { label: 'High friction for this strategy', cls: 'text-rose-300 border-rose-300/30 bg-rose-300/10' },
};

const STEP_MS = 4200;

export default function OrderEntryGuide() {
    const [brokerKey, setBrokerKey] = useState('schwab');
    const [orderType, setOrderType] = useState<OrderTypeKey>('leaps');
    const [stepIdx, setStepIdx] = useState(0);
    const [playing, setPlaying] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const broker = getBroker(brokerKey);
    const flow = getFlow(brokerKey, orderType);
    const steps = flow?.steps ?? [];
    const done = stepIdx >= steps.length;

    const restart = () => { setStepIdx(0); setPlaying(true); };

    useEffect(() => {
        if (!playing || done) return;
        const t = setTimeout(() => setStepIdx((i) => i + 1), STEP_MS);
        return () => clearTimeout(t);
    }, [playing, stepIdx, done]);

    useEffect(() => {
        const el = scrollRef.current?.querySelector(`[data-step="${Math.min(stepIdx, steps.length - 1)}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [stepIdx, steps.length]);

    const checklist = broker?.checklist[orderType];
    const friction = broker ? FRICTION_STYLE[broker.friction] : null;
    const typeInfo = ORDER_TYPES.find((t) => t.key === orderType);

    const signals = useMemo(() => orderType === 'etf', [orderType]);

    return (
        <div className="w-full">
            {/* Broker selector */}
            <div className="flex flex-wrap gap-2 mb-3">
                {BROKERS.map((b) => (
                    <button
                        key={b.key}
                        onClick={() => { setBrokerKey(b.key); restart(); }}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
                            brokerKey === b.key
                                ? 'bg-white text-tm-bg border-white'
                                : 'text-tm-muted border-white/15 hover:border-white/40 hover:text-white'
                        }`}
                    >
                        {b.name}
                    </button>
                ))}
            </div>

            {broker && friction && (
                <div className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border mb-6 ${friction.cls}`}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {friction.label}
                </div>
            )}

            {/* Order type selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
                {ORDER_TYPES.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => { setOrderType(t.key); restart(); }}
                        className={`text-left p-3 rounded-xl border transition-all duration-200 ${
                            orderType === t.key
                                ? 'border-white/60 bg-white/10'
                                : 'border-white/10 hover:border-white/30 bg-white/[0.03]'
                        }`}
                    >
                        <div className={`text-sm font-bold ${orderType === t.key ? 'text-white' : 'text-tm-muted'}`}>{t.label}</div>
                        <div className="text-[11px] text-tm-muted mt-0.5">{t.strategies}</div>
                    </button>
                ))}
            </div>

            <div className="grid md:grid-cols-5 gap-6">
                {/* Animated step panel */}
                <div className="md:col-span-3 rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.03]">
                        <div>
                            <div className="text-sm font-bold text-white">
                                {broker?.name}
                            </div>
                            <div className="text-[11px] text-tm-muted">{flow?.platform}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setStepIdx((i) => Math.max(0, i - 1))} className="p-1.5 rounded-lg border border-white/10 text-tm-muted hover:text-white hover:border-white/30 transition-colors" aria-label="Previous step">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={() => (done ? restart() : setPlaying((p) => !p))} className="p-1.5 rounded-lg border border-white/10 text-tm-muted hover:text-white hover:border-white/30 transition-colors" aria-label={playing ? 'Pause' : 'Play'}>
                                {done ? <RotateCcw className="w-4 h-4" /> : playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setStepIdx((i) => Math.min(steps.length, i + 1))} className="p-1.5 rounded-lg border border-white/10 text-tm-muted hover:text-white hover:border-white/30 transition-colors" aria-label="Next step">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1 bg-white/5">
                        <div
                            className="h-full bg-emerald-400 transition-all duration-700 ease-out"
                            style={{ width: `${steps.length ? (Math.min(stepIdx, steps.length) / steps.length) * 100 : 0}%` }}
                        />
                    </div>

                    <div ref={scrollRef} className="max-h-[420px] overflow-y-auto p-4 space-y-3 scroll-smooth">
                        {steps.map((s, i) => {
                            const active = i === stepIdx;
                            const passed = i < stepIdx;
                            return (
                                <div
                                    key={i}
                                    data-step={i}
                                    className={`rounded-xl border p-4 transition-all duration-500 ${
                                        active
                                            ? 'border-emerald-400/50 bg-emerald-400/[0.07] scale-[1.01]'
                                            : passed
                                                ? 'border-white/10 bg-white/[0.03] opacity-70'
                                                : 'border-white/5 bg-transparent opacity-50'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-500 ${
                                            passed ? 'bg-emerald-400 text-black' : active ? 'bg-white text-black' : 'bg-white/10 text-tm-muted'
                                        }`}>
                                            {passed ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <div className={`text-sm font-semibold ${active ? 'text-white' : 'text-white/80'}`}>{s.title}</div>
                                            <p className="text-[13px] leading-relaxed text-tm-muted mt-1">{s.detail}</p>
                                            {s.chips && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {s.chips.map((c, ci) => (
                                                        <span
                                                            key={ci}
                                                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all duration-500 ${
                                                                active || passed
                                                                    ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10'
                                                                    : 'border-white/10 text-tm-muted'
                                                            }`}
                                                            style={{ transitionDelay: `${ci * 120}ms` }}
                                                        >
                                                            {c}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {s.note && (active || passed) && (
                                                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300/25 bg-amber-300/[0.07] p-3">
                                                    <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                                                    <p className="text-[12px] leading-relaxed text-amber-200/90">{s.note}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {done && (
                            <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-center">
                                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                                <div className="text-sm font-bold text-white">Order submitted</div>
                                <p className="text-[12px] text-tm-muted mt-1">
                                    Once filled, mark the order as done in your TradeMind account so your virtual account and your broker stay in sync.
                                </p>
                                <button onClick={restart} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200">
                                    <RotateCcw className="w-3.5 h-3.5" /> Replay walkthrough
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Checklist + example + links */}
                <div className="md:col-span-2 space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                        <div className="text-xs font-bold uppercase tracking-wider text-tm-muted mb-2">The order in your email</div>
                        <p className="text-sm text-white font-mono leading-relaxed bg-black/40 border border-white/10 rounded-lg px-3 py-2.5">
                            {typeInfo?.example}
                        </p>
                        {signals && (
                            <p className="text-[11px] text-tm-muted mt-2">QQQ Basic emails contain only share orders like this one, no options approval needed.</p>
                        )}
                    </div>

                    {checklist && (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                            <div className="text-xs font-bold uppercase tracking-wider text-tm-muted mb-3">What your {broker?.name} account needs first</div>
                            <ul className="space-y-3 text-[13px]">
                                <li>
                                    <span className="text-tm-muted">Approval level: </span>
                                    <span className="text-white">{checklist.approval}</span>
                                </li>
                                <li>
                                    <span className="text-tm-muted">Account type: </span>
                                    <span className="text-white">{checklist.account}</span>
                                </li>
                                <li>
                                    <span className="text-tm-muted">IRA: </span>
                                    <span className="text-white">{checklist.ira}</span>
                                </li>
                            </ul>
                            <p className="text-[12px] text-tm-muted mt-3 pt-3 border-t border-white/10 leading-relaxed">
                                {broker?.frictionNote}
                            </p>
                        </div>
                    )}

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                        <div className="text-xs font-bold uppercase tracking-wider text-tm-muted mb-3">Official guides</div>
                        <ul className="space-y-2">
                            {broker?.officialLinks.map((l) => (
                                <li key={l.url}>
                                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] text-emerald-300 hover:text-emerald-200 transition-colors">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        {l.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                        {flow && (
                            <p className="text-[11px] text-tm-muted mt-3 pt-3 border-t border-white/10">
                                Walkthrough labels verified against the broker&apos;s official documentation, August 2026. Interfaces change; the broker&apos;s page is authoritative.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
