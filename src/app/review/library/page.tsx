'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { PromoNav } from '../components/PromoNav';
import { PromoFooter } from '../components/PromoFooter';
import { Platform, PLATFORM_LABELS, THEME_LABELS } from '@/lib/promo/types';

const PLATFORMS: (Platform | 'all')[] = ['all', 'tiktok', 'discord', 'whop', 'twitter', 'instagram', 'linkedin'];
const RANGES = ['all', 'week', 'month'] as const;

interface SavedPost {
  id: number;
  platform: Platform;
  theme: string;
  tone: string;
  post_content: string;
  label: string | null;
  created_at: string;
}

export default function LibraryPage() {
  const { authenticated, login } = usePrivy();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [rangeFilter, setRangeFilter] = useState<string>('all');
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    if (!authenticated) { setLoading(false); return; }
    fetchPosts();
  }, [authenticated, platformFilter, rangeFilter]);

  async function fetchPosts() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ platform: platformFilter, range: rangeFilter });
      const res = await fetch(`/api/promo/library?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this post?')) return;
    await fetch('/api/promo/library', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleCopy(id: number, content: string) {
    await navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen">
      <PromoNav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] mb-2">My Post Library</h1>
          <p className="text-[#94A3B8] text-sm">Your saved generated posts, organised by platform.</p>
        </div>

        {!authenticated ? (
          <div className="promo-glass p-12 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-lg font-bold text-[#F8FAFC] mb-2">Sign in to view your library</h2>
            <p className="text-sm text-[#94A3B8] mb-6">Your saved posts are tied to your account.</p>
            <button
              onClick={() => login()}
              className="promo-cta-btn text-white font-semibold px-6 py-3 rounded-xl"
            >
              Sign In
            </button>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              {/* Platform tabs */}
              <div className="flex gap-1 flex-wrap">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatformFilter(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      platformFilter === p
                        ? 'bg-[#7C3AED] text-white'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {p === 'all' ? 'All Platforms' : PLATFORM_LABELS[p as Platform]}
                  </button>
                ))}
              </div>

              {/* Date range */}
              <div className="flex gap-1 ml-auto">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRangeFilter(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      rangeFilter === r
                        ? 'bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] bg-white/5'
                    }`}
                  >
                    {r === 'all' ? 'All Time' : r === 'week' ? 'This Week' : 'This Month'}
                  </button>
                ))}
              </div>
            </div>

            {/* Posts grid */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="promo-glass p-5 space-y-3">
                    <div className="skeleton h-4 w-1/4" />
                    <div className="skeleton h-16" />
                    <div className="skeleton h-4 w-1/3" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="promo-glass p-16 text-center">
                <div className="text-5xl mb-4 opacity-30">📚</div>
                <h3 className="font-semibold text-[#F8FAFC] mb-2">No saved posts yet</h3>
                <p className="text-sm text-[#94A3B8] mb-6">
                  Generate posts and click "Save to Library" to see them here.
                </p>
                <a
                  href="/review/generate"
                  className="promo-cta-btn inline-block text-white font-semibold px-6 py-3 rounded-xl text-sm"
                >
                  ✨ Generate Your First Post
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-[#64748B]">{posts.length} post{posts.length !== 1 ? 's' : ''} saved</p>
                {posts.map((post) => (
                  <div key={post.id} className="promo-glass p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-[#A78BFA] uppercase bg-[#7C3AED]/10 px-2 py-0.5 rounded">
                          {PLATFORM_LABELS[post.platform] || post.platform}
                        </span>
                        {post.theme && (
                          <span className="text-xs text-[#64748B]">
                            {THEME_LABELS[post.theme as keyof typeof THEME_LABELS] || post.theme}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#64748B]">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-sm text-[#E2E8F0] leading-relaxed whitespace-pre-wrap mb-4 line-clamp-4">
                      {post.post_content}
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(post.id, post.post_content)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                          copied === post.id
                            ? 'bg-[#10B981] text-white'
                            : 'bg-[#7C3AED]/20 text-[#A78BFA] hover:bg-[#7C3AED]/30'
                        }`}
                      >
                        {copied === post.id ? '✓ Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-xs text-[#64748B] hover:text-[#EF4444] px-3 py-1.5 rounded-lg border border-white/5 hover:border-[#EF4444]/20 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <PromoFooter />
    </div>
  );
}
