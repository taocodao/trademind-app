import Link from 'next/link';

export function PromoFooter() {
  return (
    <footer className="mt-24 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center text-white font-bold text-sm">
                TM
              </div>
              <span className="font-semibold text-[#F8FAFC]">TradeMind</span>
            </div>
            <p className="text-[#94A3B8] text-sm leading-relaxed max-w-sm">
              AI-powered trade signal platform for Nasdaq ETF strategies. TurboCore delivers daily regime signals at 3 PM ET.
            </p>
            <a
              href="https://trademind.bot"
              className="inline-block mt-3 text-[#7C3AED] text-sm hover:text-[#A78BFA] transition-colors"
            >
              trademind.bot →
            </a>
          </div>

          {/* Ambassador Links */}
          <div>
            <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
              Ambassador Hub
            </h4>
            <ul className="space-y-2">
              {[
                { href: '/review/generate', label: 'Post Generator' },
                { href: '/review/library', label: 'My Library' },
                { href: '/review/results', label: 'Backtest Results' },
                { href: '/review/about', label: 'About TradeMind' },
                { href: '/review/pricing', label: 'Pricing' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
              Legal
            </h4>
            <ul className="space-y-2">
              {[
                { href: '/privacy', label: 'Privacy Policy' },
                { href: '/terms', label: 'Terms of Service' },
                { href: '/risk-disclosure', label: 'Risk Disclosure' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="promo-divider mb-6" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-[#64748B]">
            © 2026 TradeMind. All rights reserved.
          </p>
          <p className="text-xs text-[#64748B] max-w-xl leading-relaxed">
            <strong className="text-[#94A3B8]">Disclaimer:</strong> Not financial advice. Past performance does not guarantee future results. All backtest data reflects historical simulation (2019–2025). Live trading involves risk of loss.
          </p>
        </div>
      </div>
    </footer>
  );
}
