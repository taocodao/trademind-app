'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';

const PLATFORMS = [
    'TikTok',
    'YouTube',
    'X / Twitter',
    'Discord',
    'Newsletter / Substack',
    'Reddit',
    'Instagram / Reels',
    'Other',
];

const AUDIENCE_SIZES = [
    'Under 1K',
    '1K – 10K',
    '10K – 50K',
    '50K – 200K',
    '200K+',
];

interface FormState {
    name: string;
    email: string;
    platform: string;
    profileUrl: string;
    audienceSize: string;
    message: string;
}

export default function PartnersApplyPage() {
    const [form, setForm] = useState<FormState>({
        name: '',
        email: '',
        platform: '',
        profileUrl: '',
        audienceSize: '',
        message: '',
    });
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    function update(field: keyof FormState, value: string) {
        setForm(prev => ({ ...prev, [field]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name || !form.email || !form.platform || !form.profileUrl) return;

        setStatus('submitting');
        setErrorMsg('');

        try {
            const res = await fetch('/api/partners/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Submission failed');
            }
            setStatus('success');
        } catch (err: any) {
            setErrorMsg(err.message || 'Something went wrong. Please try again.');
            setStatus('error');
        }
    }

    // ── Success state ──────────────────────────────────────────────────────────
    if (status === 'success') {
        return (
            <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-8">
                        <CheckCircle className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-black mb-4">Application received.</h1>
                    <p className="text-gray-400 text-lg leading-relaxed mb-8">
                        We review applications within <strong className="text-white">24 hours</strong>.
                        You&apos;ll receive your unique affiliate link and the full content kit by email once approved.
                    </p>
                    <p className="text-gray-500 text-sm mb-8">
                        Questions? Reply to the confirmation email or reach out at{' '}
                        <a href="mailto:partnerships@trademind.bot" className="text-purple-400 hover:underline">
                            partnerships@trademind.bot
                        </a>
                    </p>
                    <Link
                        href="/partners"
                        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Partner Program
                    </Link>
                </div>
            </main>
        );
    }

    // ── Form ──────────────────────────────────────────────────────────────────
    return (
        <main className="min-h-screen bg-black text-white">

            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
                    <Link
                        href="/partners"
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Partner Program
                    </Link>
                    <span className="text-gray-700">·</span>
                    <span className="text-sm text-gray-400">Apply</span>
                </div>
            </nav>

            <div className="pt-32 pb-24 px-4">
                <div className="max-w-xl mx-auto">

                    {/* Header */}
                    <div className="mb-10">
                        <h1 className="text-4xl font-black mb-3">Become a TradeMind Partner</h1>
                        <p className="text-gray-400 text-lg">
                            Fill out the form below. Approvals take 24 hours. Your affiliate link and content kit arrive by email.
                        </p>
                    </div>

                    {/* Commission reminder */}
                    <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-2xl p-4 mb-10 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-bold text-emerald-300">Your earnings</div>
                            <div className="text-xs text-gray-400 mt-0.5">Paid weekly via Whop</div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-black text-emerald-400">$15</div>
                            <div className="text-xs text-gray-500">per $5 signup</div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-semibold text-gray-300 mb-2">
                                Full name <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={form.name}
                                onChange={e => update('name', e.target.value)}
                                placeholder="Jane Smith"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.07] transition-all"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2">
                                Email address <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={form.email}
                                onChange={e => update('email', e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.07] transition-all"
                            />
                        </div>

                        {/* Platform */}
                        <div>
                            <label htmlFor="platform" className="block text-sm font-semibold text-gray-300 mb-2">
                                Primary platform <span className="text-red-400">*</span>
                            </label>
                            <select
                                id="platform"
                                required
                                value={form.platform}
                                onChange={e => update('platform', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.07] transition-all appearance-none"
                            >
                                <option value="" disabled className="bg-zinc-900">Select a platform…</option>
                                {PLATFORMS.map(p => (
                                    <option key={p} value={p} className="bg-zinc-900">{p}</option>
                                ))}
                            </select>
                        </div>

                        {/* Profile URL */}
                        <div>
                            <label htmlFor="profileUrl" className="block text-sm font-semibold text-gray-300 mb-2">
                                Link to your profile or channel <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="profileUrl"
                                type="url"
                                required
                                value={form.profileUrl}
                                onChange={e => update('profileUrl', e.target.value)}
                                placeholder="https://tiktok.com/@yourhandle"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.07] transition-all"
                            />
                        </div>

                        {/* Audience size */}
                        <div>
                            <label htmlFor="audienceSize" className="block text-sm font-semibold text-gray-300 mb-2">
                                Estimated monthly audience size
                            </label>
                            <select
                                id="audienceSize"
                                value={form.audienceSize}
                                onChange={e => update('audienceSize', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.07] transition-all appearance-none"
                            >
                                <option value="" className="bg-zinc-900">Select a range…</option>
                                {AUDIENCE_SIZES.map(s => (
                                    <option key={s} value={s} className="bg-zinc-900">{s}</option>
                                ))}
                            </select>
                        </div>

                        {/* Message */}
                        <div>
                            <label htmlFor="message" className="block text-sm font-semibold text-gray-300 mb-2">
                                Why would your audience value TradeMind?{' '}
                                <span className="text-gray-500 font-normal">(3 sentences max)</span>
                            </label>
                            <textarea
                                id="message"
                                rows={4}
                                value={form.message}
                                onChange={e => update('message', e.target.value)}
                                placeholder="My audience is mostly TQQQ traders looking for systematic edge…"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.07] transition-all resize-none"
                            />
                        </div>

                        {/* FTC disclosure note */}
                        <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
                            By applying, you agree to include a clear affiliate disclosure (&quot;#ad&quot; or &quot;affiliate link&quot;) on all content featuring your link, and to only use the performance figures approved in the content kit (39% CAGR backtest, -11% max drawdown).
                        </div>

                        {/* Error */}
                        {status === 'error' && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                                {errorMsg}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={status === 'submitting'}
                            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-xl text-lg hover:bg-gray-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {status === 'submitting' ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Submitting…
                                </>
                            ) : (
                                'Apply now'
                            )}
                        </button>

                        <p className="text-xs text-gray-600 text-center">
                            Applications are reviewed within 24 hours. Content kit and affiliate link arrive by email once approved.
                        </p>
                    </form>
                </div>
            </div>
        </main>
    );
}
