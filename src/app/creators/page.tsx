'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Star, TrendingUp, Shield, Users, Video, DollarSign, AlertTriangle } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

export default function CreatorsPage() {
    const { authenticated } = usePrivy();
    const [form, setForm] = useState({
        tiktokHandle: '',
        youtubeHandle: '',
        instagramHandle: '',
        followerCount: '',
        contentDescription: '',
        whyTrademind: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/creators/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Submission failed');
            setSubmitted(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const benefits = [
        { icon: DollarSign, title: '20% Recurring Commission', desc: 'Earn 20% of each referred subscriber\'s monthly or annual payment — every single renewal.' },
        { icon: Star, title: 'Diamond Tier Status', desc: 'Instantly granted Diamond tier: 1 year free subscription + all tier rewards.' },
        { icon: Video, title: 'Media Kit & Assets', desc: 'Brand assets, talking points, demo video clips, and pre-written risk disclosures — reducing your production effort.' },
        { icon: Users, title: 'Discord Creator Channel', desc: 'Private Discord channel with the TradeMind team + other top creators. Monthly performance calls.' },
        { icon: TrendingUp, title: 'Co-Creation Opportunities', desc: 'Be featured in official TradeMind TikTok content. Get early access to new features before public launch.' },
        { icon: Shield, title: 'Compliance Support', desc: 'We provide pre-approved disclosure language you can use in your content — protecting you and us.' },
    ];

    return (
        <main className="min-h-screen bg-tm-bg text-white pb-24">

            {/* Hero */}
            <div className="relative overflow-hidden px-6 pt-12 pb-16 text-center">
                <div className="absolute inset-0 bg-gradient-to-b from-tm-purple/10 to-transparent pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-tm-purple/15 blur-[120px] rounded-full pointer-events-none" />
                <div className="relative z-10 max-w-2xl mx-auto">
                    <Link href="/refer" className="inline-flex items-center gap-1 text-tm-muted text-sm hover:text-white transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4" /> Back to Referral Dashboard
                    </Link>
                    <div className="inline-flex items-center gap-2 bg-tm-purple/20 border border-tm-purple/30 text-tm-purple text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                        💎 Exclusive — Apply to Join
                    </div>
                    <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight">
                        TradeMind Creator Program
                    </h1>
                    <p className="text-lg text-tm-muted max-w-xl mx-auto">
                        Turn your TikTok, YouTube, or Instagram audience into recurring income.
                        Create authentic content about trading signals — we handle the rest.
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6">

                {/* Benefits Grid */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-center mb-8">What You Get</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {benefits.map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="bg-tm-surface border border-tm-border rounded-2xl p-5 hover:border-tm-purple/40 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-tm-purple/15 flex items-center justify-center mb-3">
                                    <Icon className="w-5 h-5 text-tm-purple" />
                                </div>
                                <h3 className="font-bold text-white mb-1.5 text-sm">{title}</h3>
                                <p className="text-xs text-tm-muted leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Compliance Notice */}
                <section className="mb-12">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-amber-400 mb-2">Compliance Requirements</h3>
                                <p className="text-sm text-tm-muted mb-3">
                                    TradeMind operates in the financial services sector. All creators must adhere to FTC, SEC, and FINRA guidelines. By applying, you agree to:
                                </p>
                                <ul className="space-y-2">
                                    {[
                                        'Include "#ad" or "Sponsored" disclosures in all TradeMind-related posts',
                                        'Add "this is not financial advice" to all signal-related content',
                                        'Use only pre-approved performance claims provided by TradeMind',
                                        'Not make specific investment recommendations to your audience',
                                        'Allow TradeMind to review content upon request for compliance purposes',
                                    ].map(req => (
                                        <li key={req} className="flex items-start gap-2 text-xs text-tm-muted">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                            {req}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Application Form */}
                <section id="apply" className="mb-12">
                    <h2 className="text-2xl font-bold text-center mb-2">Apply Now</h2>
                    <p className="text-sm text-tm-muted text-center mb-8">We review applications within 48 hours.</p>

                    {!authenticated ? (
                        <div className="text-center bg-tm-surface border border-tm-border rounded-2xl p-8">
                            <p className="text-tm-muted mb-4">Please sign in to your TradeMind account to apply.</p>
                            <Link href="/dashboard" className="bg-tm-purple text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-tm-purple/90 transition-colors">
                                Sign In
                            </Link>
                        </div>
                    ) : submitted ? (
                        <div className="text-center bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8">
                            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                            <h3 className="font-bold text-white text-lg mb-2">Application Submitted!</h3>
                            <p className="text-tm-muted text-sm">We'll review it and get back to you within 48 hours.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="bg-tm-surface border border-tm-border rounded-2xl p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { key: 'tiktokHandle', label: 'TikTok Handle', placeholder: '@yourusername' },
                                    { key: 'youtubeHandle', label: 'YouTube Channel', placeholder: '@yourchannel' },
                                    { key: 'instagramHandle', label: 'Instagram Handle', placeholder: '@yourusername' },
                                ].map(({ key, label, placeholder }) => (
                                    <div key={key}>
                                        <label className="block text-xs font-semibold text-tm-muted mb-1.5 uppercase tracking-wider">{label}</label>
                                        <input
                                            type="text"
                                            placeholder={placeholder}
                                            value={(form as any)[key]}
                                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                            className="w-full bg-tm-bg border border-tm-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-tm-muted focus:outline-none focus:border-tm-purple transition-colors"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-tm-muted mb-1.5 uppercase tracking-wider">Combined Follower Count</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 15000"
                                    value={form.followerCount}
                                    onChange={e => setForm(f => ({ ...f, followerCount: e.target.value }))}
                                    className="w-full bg-tm-bg border border-tm-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-tm-muted focus:outline-none focus:border-tm-purple transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-tm-muted mb-1.5 uppercase tracking-wider">
                                    What kind of content do you create? <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    required
                                    placeholder="e.g. I post 60-second FinTok videos explaining options strategies. My audience is 80% Gen Z retail investors aged 18–28."
                                    value={form.contentDescription}
                                    onChange={e => setForm(f => ({ ...f, contentDescription: e.target.value }))}
                                    rows={3}
                                    className="w-full bg-tm-bg border border-tm-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-tm-muted focus:outline-none focus:border-tm-purple transition-colors resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-tm-muted mb-1.5 uppercase tracking-wider">Why do you want to partner with TradeMind?</label>
                                <textarea
                                    placeholder="Tell us how TradeMind fits your content and audience..."
                                    value={form.whyTrademind}
                                    onChange={e => setForm(f => ({ ...f, whyTrademind: e.target.value }))}
                                    rows={2}
                                    className="w-full bg-tm-bg border border-tm-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-tm-muted focus:outline-none focus:border-tm-purple transition-colors resize-none"
                                />
                            </div>

                            <p className="text-[11px] text-tm-muted leading-relaxed">
                                By submitting, you confirm you have read and agree to the compliance requirements above, including FTC disclosure obligations and the requirement not to provide specific investment advice.
                            </p>

                            {error && <p className="text-red-400 text-sm">{error}</p>}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-tm-purple hover:bg-tm-purple/90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
                            >
                                {submitting ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </form>
                    )}
                </section>

                {/* FAQ */}
                <section className="mb-12">
                    <h2 className="text-xl font-bold mb-6">FAQ</h2>
                    <div className="space-y-4">
                        {[
                            {
                                q: 'Is there a minimum follower requirement?',
                                a: 'No hard minimum — we care more about engagement and niche relevance than raw follower counts. A 5K highly-engaged FinTok audience beats 100K passive followers.',
                            },
                            {
                                q: 'How does the 20% commission work?',
                                a: 'Every time a subscriber you referred pays their monthly or annual bill, you earn 20% of that payment. This recurs for as long as they stay subscribed.',
                            },
                            {
                                q: 'Can I still say whatever I want?',
                                a: 'Yes — we do not mandate scripts or talking points. The only requirements are compliance disclosures (#ad, not financial advice) and not making specific investment recommendations.',
                            },
                            {
                                q: 'How long until I hear back?',
                                a: 'We review all applications within 48 hours and respond by email.',
                            },
                        ].map(({ q, a }) => (
                            <div key={q} className="bg-tm-surface border border-tm-border rounded-xl p-4">
                                <p className="font-bold text-sm text-white mb-1.5">{q}</p>
                                <p className="text-xs text-tm-muted leading-relaxed">{a}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
