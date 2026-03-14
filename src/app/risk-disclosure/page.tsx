import { LegalPageLayout } from "@/components/layout/LegalPageLayout";
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Risk Disclosure | TradeMind@bot',
    description: 'Risk Disclosure for TradeMind@bot',
};

export default function RiskDisclosurePage() {
    return (
        <LegalPageLayout>
            <h1 className="text-4xl font-black text-white mb-2">Risk Disclosure</h1>
            <p className="text-sm text-tm-muted font-mono mb-8">
                <strong>Effective Date:</strong> March 1, 2026
            </p>

            <p>
                Please read this Risk Disclosure carefully before using TradeMind@bot. By using the Service, you acknowledge that you have read, understood, and accepted the risks described herein.
            </p>

            <hr />

            <h3>Not Investment Advice</h3>
            <p>
                TradeMind@bot is a software technology platform, not a registered investment advisor, broker-dealer, commodity trading advisor (CTA), or financial planner. We do not provide personalized investment advice. All trading signals are algorithmically generated and delivered identically to all subscribers. Nothing on this platform should be construed as a recommendation to buy or sell any security, ETF, option, or financial instrument.
            </p>
            <p className="font-semibold text-tm-red">
                Consult a qualified financial professional before making any investment decisions.
            </p>

            <hr />

            <h3>Risk of Loss</h3>
            <p>
                Trading and investing in securities, ETFs, and options involves <strong>substantial risk of loss</strong>. You may lose some or all of your invested capital. Options trading involves additional risks including, but not limited to, the potential loss of the entire premium paid. Leveraged ETFs such as TQQQ and QLD can decline significantly in value, especially during periods of high market volatility.
            </p>
            <p className="font-semibold text-white bg-red-950/30 p-4 border border-red-500/20 rounded-lg">
                Never invest money you cannot afford to lose.
            </p>

            <hr />

            <h3>CFTC Rule 4.41 — Hypothetical Performance Disclosure</h3>
            <p className="uppercase text-sm leading-relaxed text-white/60">
                HYPOTHETICAL OR SIMULATED PERFORMANCE RESULTS HAVE CERTAIN LIMITATIONS. UNLIKE AN ACTUAL PERFORMANCE RECORD, SIMULATED RESULTS DO NOT REPRESENT ACTUAL TRADING. ALSO, SINCE THE TRADES HAVE NOT BEEN EXECUTED, THE RESULTS MAY HAVE UNDER- OR OVER-COMPENSATED FOR THE IMPACT, IF ANY, OF CERTAIN MARKET FACTORS, SUCH AS LACK OF LIQUIDITY. SIMULATED TRADING PROGRAMS IN GENERAL ARE ALSO SUBJECT TO THE FACT THAT THEY ARE DESIGNED WITH THE BENEFIT OF HINDSIGHT. NO REPRESENTATION IS BEING MADE THAT ANY ACCOUNT WILL OR IS LIKELY TO ACHIEVE PROFIT OR LOSSES SIMILAR TO THOSE SHOWN.
            </p>
            <p>
                All backtested performance data presented on TradeMind@bot (including but not limited to historical CAGR, win rates, and drawdown figures) reflects simulated results, not actual live trading. Past performance — whether from live trading or backtesting — is <strong>not indicative of future results</strong>.
            </p>

            <hr />

            <h3>Market & Strategy Risk</h3>
            <ul>
                <li><strong>Regime misclassification:</strong> The AI regime detection system may incorrectly classify market conditions, resulting in suboptimal positioning.</li>
                <li><strong>Nasdaq concentration:</strong> All TradeMind@bot strategies are 100% concentrated in Nasdaq-100 assets. Diversification across asset classes is not provided.</li>
                <li><strong>Leverage risk:</strong> Strategies using leveraged ETFs (TQQQ, QLD) or LEAPS options are subject to amplified losses in declining markets.</li>
                <li><strong>Execution risk:</strong> Market orders submitted through broker APIs may fill at prices different from signal prices due to slippage, latency, or market conditions.</li>
                <li><strong>API dependency:</strong> Automated order execution depends on third-party broker APIs. API outages, changes, or revocations may prevent execution.</li>
                <li><strong>Model risk:</strong> Machine learning models are trained on historical data and may not generalize to future market conditions.</li>
            </ul>

            <hr />

            <h3>Broker & Counterparty Risk</h3>
            <p>
                Brokerage services are provided by independent, third-party broker-dealers (currently Tastytrade). TradeMind@bot never holds customer funds or executes trades outside of user-authorized broker API configurations. TradeMind@bot is not responsible for the solvency, availability, or actions of any third-party broker.
            </p>

            <hr />

            <h3>No Guarantee</h3>
            <p>
                No representation is being made that any investment strategy, signal, or model described on TradeMind@bot will achieve results similar to historical or backtested performance. Market conditions change. All investments carry risk.
            </p>

            <hr />

            <h3>Contact</h3>
            <p>
                For questions about this Risk Disclosure:<br />
                <a href="mailto:legal@trademind.bot">legal@trademind.bot</a><br />
                <span className="text-sm mt-2 block opacity-60">TradeMind@bot LLC — &copy; 2026 All rights reserved.</span>
            </p>
        </LegalPageLayout>
    );
}
