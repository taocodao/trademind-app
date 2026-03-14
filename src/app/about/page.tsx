import { LegalPageLayout } from "@/components/layout/LegalPageLayout";
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About Us | TradeMind@bot',
    description: 'The AI Behind Your Best Trades.',
};

export default function AboutPage() {
    return (
        <LegalPageLayout>
            <p className="text-xl font-medium text-white mb-8 border-l-2 border-tm-purple pl-4">
                <strong>TradeMind@bot</strong> — <em>Trade Smarter. Compound Faster.</em>
            </p>

            <p>
                TradeMind@bot is a financial technology platform built on a simple conviction: the same AI-driven strategies used by institutional traders shouldn't require a hedge fund minimum to access.
            </p>
            <p>
                We built TradeMind@bot to answer one question — <em>what if every investor, regardless of account size, had access to a systematic, backtested strategy that tells them exactly when to be aggressive and when to protect what they've built?</em>
            </p>

            <h2>What We Do</h2>
            <p>
                TradeMind@bot delivers daily AI-generated trading signals powered by multi-layer machine learning models — including Hidden Markov Model regime detection, XGBoost signal scoring, and Neural Network allocation optimization. Every morning, our engine classifies the market as BULL, SIDEWAYS, or BEAR, and delivers a clear, confidence-scored signal directly to your dashboard.
            </p>
            <p>
                You follow the signal on any brokerage you already use. If you have a Tastytrade account, you can connect it directly and let TradeMind@bot submit orders on your behalf — with your approval or fully automated.
            </p>
            <p className="font-semibold text-white bg-white/5 p-4 rounded-lg my-6">
                No black box. No guesswork. Every signal comes with a plain-English explanation of why.
            </p>

            <h2>Our Strategies</h2>
            <p>
                <strong>TurboCore</strong> is our ETF-based strategy, built for any investor — no options account or minimum balance required. It operates on the Nasdaq-100, rotating intelligently between TQQQ, QQQ, and SGOV (T-bills) based on market regime. Backtested from 2019–2026, TurboCore delivered a <strong>27.8% CAGR</strong> — more than 2× QQQ's return over the same period.
            </p>
            <p>
                <strong>TurboCore Pro</strong> upgrades the engine with QQQ LEAPS options as the primary growth instrument — delivering <strong>39.3% CAGR</strong> historically, equivalent to 3× QQQ's return, while recording a <strong>+21.4% gain in 2022</strong>, the year QQQ fell −33%. TurboCore Pro requires an options-approved brokerage account.
            </p>

            <h2>Our Commitment</h2>
            <p>
                TradeMind@bot is a technology platform, not a financial advisor. We do not manage your money, hold your funds, or execute trades without your authorization. We build tools that make institutional-grade systematic strategies accessible, transparent, and easy to act on — then get out of your way.
            </p>
            
            <hr />
            
            <p className="text-sm italic text-white/50 text-center">
                Built in 2026. Designed for the next generation of investors.
            </p>
        </LegalPageLayout>
    );
}
