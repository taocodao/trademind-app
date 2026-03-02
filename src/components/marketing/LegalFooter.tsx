import React from 'react';

export function LegalFooter() {
    return (
        <footer className="w-full bg-[#05050A] py-12 px-6 border-t border-white/10 mt-10 z-20 relative">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start mb-12 border-b border-white/10 pb-8 gap-8">
                    <div>
                        <h3 className="text-2xl font-black tracking-tighter text-white mb-2">TurboBounce</h3>
                        <p className="text-tm-muted text-sm">Automated Options Engineering.</p>
                    </div>
                    <div className="flex gap-8 text-sm">
                        <div className="flex flex-col gap-2">
                            <span className="text-white font-bold mb-1">Company</span>
                            <a href="#" className="text-tm-muted hover:text-white transition-colors">About Us</a>
                            <a href="#" className="text-tm-muted hover:text-white transition-colors">Education Center</a>
                            <a href="#" className="text-tm-muted hover:text-white transition-colors">Pricing</a>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-white font-bold mb-1">Legal</span>
                            <a href="#" className="text-tm-muted hover:text-white transition-colors">Terms of Service</a>
                            <a href="#" className="text-tm-muted hover:text-white transition-colors">Privacy Policy</a>
                            <a href="#" className="text-tm-muted hover:text-white transition-colors">Risk Disclosure</a>
                        </div>
                    </div>
                </div>

                <div className="text-[10px] md:text-xs text-tm-muted/70 leading-relaxed font-mono space-y-6">
                    <p>
                        <strong>IMPORTANT DISCLAIMER:</strong> TurboBounce is a software technology platform, not a registered investment advisor, broker-dealer, or financial planner. We do not provide personalized investment advice. All trade signals are algorithmically generated and delivered identically to all subscribers. Past performance, whether actual or indicated by backtests, is not indicative of future results. Trading options involves substantial risk of loss and is not appropriate for all investors. You could lose some or all of your invested capital. Consult a qualified financial professional before making investment decisions. See full Risk Disclosure for details.
                    </p>
                    <p>
                        <strong>CFTC RULE 4.41:</strong> Hypothetical or simulated performance results have certain limitations. Unlike an actual performance record, simulated results do not represent actual trading. Also, since the trades have not been executed, the results may have under- or over-compensated for the impact, if any, of certain market factors, such as lack of liquidity. Simulated trading programs in general are also subject to the fact that they are designed with the benefit of hindsight. No representation is being made that any account will or is likely to achieve profit or losses similar to those shown.
                    </p>
                    <p>
                        Brokerage services are provided by third-party broker-dealers. TurboBounce never holds customer funds or executes trades outside of user-authorized broker API configurations.
                    </p>
                    <p className="text-center pt-6">
                        &copy; {new Date().getFullYear()} TurboBounce LLC. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
