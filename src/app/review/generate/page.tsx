'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { PromoNav } from '../components/PromoNav';
import { PromoFooter } from '../components/PromoFooter';
import { PlatformSelector } from '../components/PlatformSelector';
import { ThemeGrid } from '../components/ThemeGrid';
import { ToneDropdown } from '../components/ToneDropdown';
import { PostVariationCard } from '../components/PostVariationCard';
import {
  Platform, Theme, Tone, GeneratePostResponse,
} from '@/lib/promo/types';

const STEP_LABELS = ['Platform', 'Theme', 'Tone', 'Details'];

export default function GeneratePage() {
  const { authenticated, login } = usePrivy();
  const router = useRouter();

  // Form state
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [customThemeText, setCustomThemeText] = useState('');
  const [tone, setTone] = useState<Tone | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [daysAsMember, setDaysAsMember] = useState('');
  const [personalNote, setPersonalNote] = useState('');

  // Results state
  const [loading, setLoading] = useState(false);
  const [variations, setVariations] = useState<string[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<boolean[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [savedAll, setSavedAll] = useState(false);
  const [regenLoading, setRegenLoading] = useState<boolean[]>([false, false, false]);

  const canGenerate = platform && theme && tone && (theme !== 'custom' || customThemeText.trim());

  async function handleGenerate() {
    if (!canGenerate) return;
    if (!authenticated) { login(); return; }

    setLoading(true);
    setError(null);
    setVariations([]);

    try {
      const res = await fetch('/api/promo/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          theme,
          tone,
          customThemeText: theme === 'custom' ? customThemeText : undefined,
          referralCode: referralCode || undefined,
          daysAsMember: daysAsMember ? parseInt(daysAsMember) : undefined,
          personalNote: personalNote || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data: GeneratePostResponse = await res.json();
      setVariations(data.variations);
      setComplianceStatus(data.complianceStatus);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleVariationChange(index: number, value: string) {
    setVariations((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleRegenerate(index: number) {
    if (!canGenerate || !authenticated) return;

    setRegenLoading((prev) => { const n = [...prev]; n[index] = true; return n; });

    try {
      const res = await fetch('/api/promo/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform, theme, tone, customThemeText, referralCode,
          daysAsMember: daysAsMember ? parseInt(daysAsMember) : undefined,
          personalNote,
        }),
      });

      if (res.ok) {
        const data: GeneratePostResponse = await res.json();
        if (data.variations[index]) {
          setVariations((prev) => {
            const next = [...prev];
            next[index] = data.variations[index];
            return next;
          });
          setComplianceStatus((prev) => {
            const next = [...prev];
            next[index] = data.complianceStatus[index];
            return next;
          });
        }
      }
    } catch { /* silent */ } finally {
      setRegenLoading((prev) => { const n = [...prev]; n[index] = false; return n; });
    }
  }

  async function handleSaveAll() {
    if (!variations.length || !authenticated || !platform) return;
    setSavingAll(true);

    try {
      await Promise.all(
        variations.map((content) =>
          fetch('/api/promo/save-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform, postContent: content }),
          })
        )
      );
      setSavedAll(true);
      setTimeout(() => setSavedAll(false), 3000);
    } catch { /* silent */ } finally {
      setSavingAll(false);
    }
  }

  async function copyAll() {
    const text = variations.join('\n\n---\n\n');
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="min-h-screen">
      <PromoNav />

      {/* Auth gate overlay */}
      {!authenticated && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="promo-glass p-8 max-w-sm w-full mx-4 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">Sign in to generate posts</h2>
            <p className="text-sm text-[#94A3B8] mb-6">
              Ambassador-only feature. Sign in with your TradeMind account.
            </p>
            <button
              onClick={() => login()}
              className="promo-cta-btn w-full text-white font-semibold py-3 rounded-xl"
            >
              Sign In with Privy
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] mb-2">
            AI Post Generator
          </h1>
          <p className="text-[#94A3B8] text-sm">
            Build platform-optimised promotional posts in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── LEFT: Controls ─────────────────────────────── */}
          <div className="space-y-6">

            {/* Step 1: Platform */}
            <div className="promo-glass p-5">
              <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
                Step 1 — Select Platform
              </label>
              <PlatformSelector selected={platform} onSelect={setPlatform} />
            </div>

            {/* Step 2: Theme */}
            <div className="promo-glass p-5">
              <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
                Step 2 — Select Theme
              </label>
              <ThemeGrid
                selected={theme}
                onSelect={setTheme}
                customText={customThemeText}
                onCustomChange={setCustomThemeText}
              />
            </div>

            {/* Step 3: Tone */}
            <div className="promo-glass p-5">
              <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
                Step 3 — Select Tone
              </label>
              <ToneDropdown selected={tone} onSelect={setTone} />
            </div>

            {/* Step 4: Details */}
            <div className="promo-glass p-5">
              <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
                Step 4 — Add Your Details <span className="text-[#64748B] normal-case font-normal">(optional)</span>
              </label>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1">Your referral code</label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="e.g. ALEX2024"
                    className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#7C3AED] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1">Days as a member</label>
                  <input
                    type="number"
                    value={daysAsMember}
                    onChange={(e) => setDaysAsMember(e.target.value)}
                    placeholder="e.g. 45"
                    min="1"
                    className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#7C3AED] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1">Personal result or observation</label>
                  <textarea
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                    placeholder="e.g. 'The BULL signal last Monday matched perfectly with QQQ +1.8%'"
                    rows={2}
                    className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#7C3AED] transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className={`w-full py-4 rounded-xl font-semibold text-white text-base transition-all duration-200 flex items-center justify-center gap-2 ${
                canGenerate && !loading
                  ? 'promo-cta-btn'
                  : 'bg-[#1A1A2E] text-[#64748B] cursor-not-allowed border border-white/10'
              }`}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Crafting your posts…
                </>
              ) : (
                <>✨ Generate 3 Post Variations</>
              )}
            </button>

            {error && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl p-4 text-sm text-[#EF4444]">
                ⚠ {error}
              </div>
            )}
          </div>

          {/* ── RIGHT: Results ──────────────────────────────── */}
          <div>
            {variations.length === 0 && !loading ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="text-5xl mb-4 opacity-30">✨</div>
                <p className="text-[#64748B] text-sm max-w-xs">
                  Configure your platform, theme, and tone on the left, then click Generate.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider">
                    Generated Posts
                  </h2>
                  {variations.length > 0 && (
                    <span className="text-xs text-[#64748B]">{platform ? `For ${platform}` : ''}</span>
                  )}
                </div>

                {/* Loading skeletons */}
                {loading &&
                  [0, 1, 2].map((i) => (
                    <div key={i} className="post-card space-y-3">
                      <div className="skeleton h-4 w-1/3" />
                      <div className="skeleton h-24" />
                      <div className="skeleton h-4 w-1/2" />
                    </div>
                  ))}

                {/* Variation cards */}
                {!loading &&
                  variations.map((v, i) => (
                    <PostVariationCard
                      key={i}
                      index={i}
                      content={v}
                      platform={platform!}
                      complianceOk={complianceStatus[i] ?? true}
                      onCopy={() => {}}
                      onRegenerate={handleRegenerate}
                      onChange={handleVariationChange}
                      isRegenerating={regenLoading[i]}
                    />
                  ))}

                {/* Bulk actions */}
                {variations.length > 0 && !loading && (
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={copyAll}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#94A3B8] border border-white/10 hover:border-white/20 hover:text-[#F8FAFC] transition-colors"
                    >
                      Copy All 3
                    </button>
                    <button
                      onClick={handleSaveAll}
                      disabled={savingAll || savedAll}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        savedAll
                          ? 'bg-[#10B981] text-white'
                          : 'bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30 hover:bg-[#7C3AED]/30'
                      }`}
                    >
                      {savedAll ? '✓ Saved to Library' : savingAll ? 'Saving…' : '💾 Save to Library'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <PromoFooter />
    </div>
  );
}
