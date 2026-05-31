import { PromoNav } from '../components/PromoNav';
import { PromoFooter } from '../components/PromoFooter';

const PLANS = [
  {
    name: 'Standard',
    price: '$29',
    period: '/month',
    trial: '$15 for 30 days',
    badge: null,
    color: '#94A3B8',
    features: [
      'Daily TurboCore regime signal (3 PM ET)',
      'QQQ / QLD / TQQQ / SGOV allocations',
      'Morning brief each trading day',
      'Live Discord + Whop chatbot (!signal, !regime)',
      '7-year backtest dashboard',
      'Community access',
    ],
    cta: 'Start $15 Trial',
    href: 'https://whop.com/trademind',
  },
  {
    name: 'Bundle',
    price: '$49',
    period: '/month',
    trial: null,
    badge: '🔥 Most Popular',
    color: '#7C3AED',
    features: [
      'Everything in Standard',
      'QQQ LEAPS signals (IV-Switch alerts)',
      'Options entry / exit timing',
      'Bundle-only research reports',
      'Priority Discord support',
      'Ambassador program access',
    ],
    cta: 'Join Bundle',
    href: 'https://whop.com/trademind',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <PromoNav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center mb-14">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#F8FAFC] mb-4">Simple Pricing</h1>
          <p className="text-[#94A3B8] max-w-xl mx-auto">
            Start with a $15 trial. No contracts. Cancel anytime.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="promo-glass p-7 flex flex-col"
              style={plan.badge ? { borderColor: '#7C3AED', borderWidth: '1.5px' } : {}}
            >
              {plan.badge && (
                <div className="text-xs font-semibold text-[#A78BFA] mb-3">{plan.badge}</div>
              )}
              <div className="mb-1 text-lg font-bold text-[#F8FAFC]">{plan.name}</div>
              <div className="mb-1">
                <span className="text-4xl font-bold" style={{ color: plan.color }}>{plan.price}</span>
                <span className="text-[#64748B] text-sm">{plan.period}</span>
              </div>
              {plan.trial && (
                <div className="text-xs text-[#10B981] font-semibold mb-4 bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg px-3 py-1.5 w-fit">
                  🎉 {plan.trial}
                </div>
              )}
              <ul className="space-y-2.5 mb-8 flex-1 mt-4">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#94A3B8]">
                    <span className="text-[#10B981] mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={plan.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`block text-center font-semibold py-3 rounded-xl text-sm transition-all duration-200 ${
                  plan.badge
                    ? 'promo-cta-btn text-white'
                    : 'bg-white/5 text-[#F8FAFC] hover:bg-white/10 border border-white/10'
                }`}
              >
                {plan.cta} →
              </a>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-[#64748B]">
          Not financial advice. Past performance does not guarantee future results. All plans billed via Whop.
        </p>
      </div>
      <PromoFooter />
    </div>
  );
}
