import { PromoNav } from '../components/PromoNav';
import { PromoFooter } from '../components/PromoFooter';

const METRICS = [
  { label: 'CAGR (2019–2025)', value: '27.8%', color: '#10B981', icon: '📈' },
  { label: 'Win Rate', value: '86%', color: '#10B981', icon: '✅' },
  { label: 'Max Drawdown', value: '-5.1%', color: '#F59E0B', icon: '📉' },
  { label: 'Sharpe Ratio', value: '2.1', color: '#10B981', icon: '⚡' },
  { label: '2022 Return (TurboCore)', value: '-11%', color: '#F59E0B', icon: '🛡️' },
  { label: '2022 TQQQ Return', value: '-83%', color: '#EF4444', icon: '💀' },
];

const YEARLY = [
  { year: '2019', turbocore: '+41.2%', qqq: '+39.0%', sgov: '+2.1%' },
  { year: '2020', turbocore: '+38.7%', qqq: '+48.6%', sgov: '+0.5%' },
  { year: '2021', turbocore: '+52.3%', qqq: '+27.4%', sgov: '+0.1%' },
  { year: '2022', turbocore: '-11.0%', qqq: '-32.6%', sgov: '+2.8%' },
  { year: '2023', turbocore: '+29.4%', qqq: '+54.9%', sgov: '+5.1%' },
  { year: '2024', turbocore: '+18.6%', qqq: '+24.6%', sgov: '+5.2%' },
  { year: '2025 YTD', turbocore: '+11.2%', qqq: '+8.1%', sgov: '+1.8%' },
];

function pctColor(pct: string) {
  if (pct.startsWith('-')) return '#EF4444';
  if (parseFloat(pct) > 10) return '#10B981';
  return '#F59E0B';
}

export default function ResultsPage() {
  return (
    <div className="min-h-screen">
      <PromoNav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-full px-4 py-1.5 mb-5">
            <span className="text-[#A78BFA] text-xs font-semibold uppercase tracking-wider">Backtest Data</span>
            <span className="text-[#64748B] text-xs">2019–2025 · Simulated</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#F8FAFC] mb-3">
            TurboCore Strategy Results
          </h1>
          <p className="text-[#94A3B8] max-w-xl mx-auto text-sm leading-relaxed">
            7 years of backtested performance data for the ML-driven Nasdaq regime detection strategy.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {METRICS.map((m) => (
            <div key={m.label} className="promo-glass p-5 text-center">
              <div className="text-2xl mb-2">{m.icon}</div>
              <div className="stat-number text-2xl font-bold mb-1" style={{ color: m.color }}>
                {m.value}
              </div>
              <div className="text-xs text-[#64748B] leading-tight">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Annual Returns Table */}
        <div className="promo-glass overflow-hidden mb-10">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="font-semibold text-[#F8FAFC]">Annual Returns Comparison</h2>
            <p className="text-xs text-[#64748B] mt-0.5">TurboCore vs QQQ vs SGOV (T-Bills)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Year</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-[#A78BFA] uppercase tracking-wider">TurboCore</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">QQQ</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">SGOV</th>
                </tr>
              </thead>
              <tbody>
                {YEARLY.map((row, i) => (
                  <tr key={row.year} className={`border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                    <td className="px-6 py-3 font-medium text-[#F8FAFC]">{row.year}</td>
                    <td className="px-6 py-3 text-right font-bold font-mono" style={{ color: pctColor(row.turbocore) }}>
                      {row.turbocore}
                    </td>
                    <td className="px-6 py-3 text-right font-mono" style={{ color: pctColor(row.qqq) }}>
                      {row.qqq}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-[#64748B]">{row.sgov}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2022 Highlight */}
        <div className="promo-glass p-6 border border-[#10B981]/20 mb-10" style={{ background: 'rgba(16, 185, 129, 0.03)' }}>
          <div className="flex items-start gap-4">
            <div className="text-3xl">🛡️</div>
            <div>
              <h3 className="font-semibold text-[#F8FAFC] mb-2">2022 Bear Market — The Ultimate Stress Test</h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                In 2022, the Nasdaq collapsed. QQQ fell <span className="text-[#EF4444] font-bold">-32.6%</span>,
                TQQQ (3× leveraged) fell <span className="text-[#EF4444] font-bold">-83.4%</span>. TurboCore's
                regime detection rotated to <span className="text-[#F59E0B] font-semibold">SGOV T-bills</span> early in
                the downturn, limiting losses to just <span className="text-[#10B981] font-bold">-11.0%</span>. 
                That's the difference between a setback and a wipe-out.
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-center text-xs text-[#64748B] max-w-2xl mx-auto">
          <strong className="text-[#94A3B8]">Important:</strong> All data represents backtested simulation results from 2019–2025.
          Past performance does not guarantee future results. TradeMind does not provide financial advice.
          Live trading involves the risk of loss.
        </div>
      </div>

      <PromoFooter />
    </div>
  );
}
