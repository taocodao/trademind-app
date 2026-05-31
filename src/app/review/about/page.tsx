import { PromoNav } from '../components/PromoNav';
import { PromoFooter } from '../components/PromoFooter';

const FEATURES = [
  { icon: '🎯', title: 'Daily Regime Signal', description: 'Every day at 3 PM ET, TurboCore classifies the market as BULL, BEAR, or SIDEWAYS with exact QQQ/QLD/TQQQ/SGOV allocations.' },
  { icon: '🤖', title: 'Live Chatbot', description: 'Commands like !signal, !regime, !backtest in the Whop community pull from a live database instantly.' },
  { icon: '☀️', title: 'Morning Brief', description: 'Each trading day, members receive a pre-market brief with market conditions and the overnight regime call.' },
  { icon: '📊', title: 'Backtest Dashboard', description: '7-year backtest (2019–2025) with full equity curve, drawdown analysis, and year-by-year attribution.' },
  { icon: '📈', title: 'LEAPS Signals (Bundle)', description: 'IV-Switch alerts for timing QQQ LEAPS entries and exits. Exclusive to the Bundle tier.' },
  { icon: '🏆', title: 'Ambassador Program', description: 'Earn commissions by referring members. This Hub helps you create compliant promo content in seconds.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <PromoNav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center mb-14">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#F8FAFC] mb-4">About TradeMind</h1>
          <p className="text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
            TradeMind is a membership-based algorithmic trading signal platform built on TurboCore — a machine-learning model that classifies the Nasdaq regime daily and outputs equity-to-cash allocation signals.
          </p>
        </div>
        <div className="promo-glass p-8 mb-10">
          <h2 className="text-xl font-bold text-[#F8FAFC] mb-4">How TurboCore Works</h2>
          <div className="space-y-4 text-sm text-[#94A3B8] leading-relaxed">
            <p>TurboCore analyses market signals daily — price momentum, volatility indicators, and macro regime data — to classify the Nasdaq as <span className="text-[#10B981] font-semibold">BULL</span>, <span className="text-[#EF4444] font-semibold">BEAR</span>, or <span className="text-[#F59E0B] font-semibold">SIDEWAYS</span>.</p>
            <p>Based on the regime, the model outputs allocations across QQQ, QLD (2×), TQQQ (3×), and SGOV (T-Bills): maximising Nasdaq exposure during bull markets while rotating to safety during drawdowns.</p>
            <p>The 7-year backtest shows <span className="text-[#F8FAFC] font-semibold">27.8% CAGR</span>, <span className="text-[#F8FAFC] font-semibold">86% win rate</span>, and max drawdown of just <span className="text-[#F8FAFC] font-semibold">-5.1%</span>.</p>
          </div>
        </div>
        <h2 className="text-xl font-bold text-[#F8FAFC] mb-6">Platform Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {FEATURES.map((f) => (
            <div key={f.title} className="promo-glass p-5">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-[#F8FAFC] mb-1.5 text-sm">{f.title}</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
        <div className="text-center">
          <a href="/review/pricing" className="promo-cta-btn inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded-xl">
            View Pricing &amp; Join →
          </a>
        </div>
      </div>
      <PromoFooter />
    </div>
  );
}
