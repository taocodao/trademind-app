'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { PromoNav } from '../components/PromoNav';
import { PromoFooter } from '../components/PromoFooter';
import { PLATFORM_LABELS, Platform } from '@/lib/promo/types';

interface AdminStats {
  totalGenerated: number;
  byPlatform: Record<string, number>;
  byTheme: Record<string, number>;
  recentActivity: {
    user_id: string;
    platform: string;
    theme: string;
    created_at: string;
    char_count: number;
    compliance_verified: boolean;
  }[];
}

export default function AdminPage() {
  const { authenticated, user } = usePrivy();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) { setLoading(false); return; }
    fetch('/api/promo/admin')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setStats(d);
      })
      .catch(() => setError('Failed to load stats'))
      .finally(() => setLoading(false));
  }, [authenticated]);

  const topPlatforms = stats
    ? Object.entries(stats.byPlatform).sort((a, b) => b[1] - a[1])
    : [];

  const topThemes = stats
    ? Object.entries(stats.byTheme).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];

  const maxPlatformCount = topPlatforms[0]?.[1] ?? 1;

  if (!authenticated) {
    return (
      <div className="min-h-screen">
        <PromoNav />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-[#F8FAFC] mb-2">Admin Only</h1>
          <p className="text-sm text-[#94A3B8]">Sign in as an admin to access this page.</p>
        </div>
        <PromoFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PromoNav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F8FAFC]">Admin Dashboard</h1>
            <p className="text-xs text-[#64748B] mt-1">Post generator usage analytics</p>
          </div>
          <span className="text-xs text-[#94A3B8] bg-[#7C3AED]/10 px-3 py-1 rounded-full border border-[#7C3AED]/20">
            Admin
          </span>
        </div>

        {error && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl p-4 text-sm text-[#EF4444] mb-6">
            ⚠ {error} — This page requires admin role verification in the database.
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="promo-glass p-6 skeleton h-28" />)}
          </div>
        ) : stats ? (
          <>
            {/* Top Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="promo-glass p-6 text-center">
                <div className="text-4xl font-bold text-[#A78BFA] mb-1">{stats.totalGenerated.toLocaleString()}</div>
                <div className="text-xs text-[#64748B]">Total Posts Generated</div>
              </div>
              <div className="promo-glass p-6 text-center">
                <div className="text-4xl font-bold text-[#10B981] mb-1">{Object.keys(stats.byPlatform).length}</div>
                <div className="text-xs text-[#64748B]">Platforms Active</div>
              </div>
              <div className="promo-glass p-6 text-center">
                <div className="text-4xl font-bold text-[#F59E0B] mb-1">{Object.keys(stats.byTheme).length}</div>
                <div className="text-xs text-[#64748B]">Themes Used</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* By Platform */}
              <div className="promo-glass p-6">
                <h2 className="font-semibold text-[#F8FAFC] mb-4 text-sm">Posts by Platform</h2>
                <div className="space-y-3">
                  {topPlatforms.map(([platform, count]) => (
                    <div key={platform}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#94A3B8]">{PLATFORM_LABELS[platform as Platform] || platform}</span>
                        <span className="text-[#F8FAFC] font-mono">{count}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] rounded-full"
                          style={{ width: `${(count / maxPlatformCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Themes */}
              <div className="promo-glass p-6">
                <h2 className="font-semibold text-[#F8FAFC] mb-4 text-sm">Top Themes</h2>
                <div className="space-y-2.5">
                  {topThemes.map(([theme, count], i) => (
                    <div key={theme} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#64748B] font-mono w-4">#{i + 1}</span>
                        <span className="text-sm text-[#94A3B8]">{theme}</span>
                      </div>
                      <span className="text-sm font-semibold text-[#A78BFA]">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="promo-glass overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5">
                <h2 className="font-semibold text-[#F8FAFC] text-sm">Recent Activity</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['User', 'Platform', 'Theme', 'Chars', 'Compliant', 'Date'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[#64748B] uppercase tracking-wider font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.recentActivity || []).slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-[#94A3B8] font-mono">{row.user_id?.slice(0, 8)}…</td>
                        <td className="px-4 py-2.5 text-[#F8FAFC]">{PLATFORM_LABELS[row.platform as Platform] || row.platform}</td>
                        <td className="px-4 py-2.5 text-[#94A3B8]">{row.theme}</td>
                        <td className="px-4 py-2.5 text-[#64748B] font-mono">{row.char_count}</td>
                        <td className="px-4 py-2.5">
                          {row.compliance_verified
                            ? <span className="text-[#10B981]">✓</span>
                            : <span className="text-[#EF4444]">⚠</span>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-[#64748B]">{new Date(row.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
      <PromoFooter />
    </div>
  );
}
