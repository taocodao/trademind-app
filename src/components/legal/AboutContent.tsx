'use client';
import { useTranslation } from 'react-i18next';

export function AboutContent() {
    const { i18n } = useTranslation();
    const lang = i18n.language?.startsWith('es') ? 'es' : i18n.language?.startsWith('zh') ? 'zh' : 'en';

    if (lang === 'es') {
        return (
            <>
                <p className="text-xl font-medium text-white mb-8 border-l-2 border-tm-purple pl-4">
                    <strong>TradeMind@bot</strong> — <em>Opera con Inteligencia. Crece sin Límites.</em>
                </p>
                <p>TradeMind@bot es una plataforma de tecnología financiera basada en una convicción simple: las mismas estrategias impulsadas por IA que utilizan los traders institucionales no deberían requerir el capital mínimo de un fondo de cobertura para acceder a ellas.</p>
                <p>Creamos TradeMind@bot para responder una pregunta: <em>¿qué pasaría si cada inversor, sin importar el tamaño de su cuenta, tuviera acceso a una estrategia sistemática y probada históricamente?</em></p>
                <h2>Qué Hacemos</h2>
                <p>TradeMind@bot entrega señales de trading generadas diariamente por IA, impulsadas por modelos de aprendizaje automático de múltiples capas. Cada mañana, nuestro motor clasifica el mercado como ALCISTA, LATERAL o BAJISTA, y entrega una señal clara con puntuación de confianza directamente a tu panel.</p>
                <p>Sigues la señal en cualquier bróker que ya utilices. Si tienes una cuenta en Tastytrade, puedes conectarla directamente y permitir que TradeMind@bot envíe órdenes en tu nombre.</p>
                <p className="font-semibold text-white bg-white/5 p-4 rounded-lg my-6">Sin caja negra. Sin suposiciones. Cada señal viene con una explicación clara de por qué.</p>
                <h2>Nuestras Estrategias</h2>
                <p><strong>TurboCore</strong> es nuestra estrategia basada en ETFs, diseñada para cualquier inversor — sin cuenta de opciones ni saldo mínimo requerido. Con pruebas históricas de 2019 a 2026, TurboCore logró un <strong>CAGR del 27.8%</strong> — más del doble del rendimiento de QQQ en el mismo período.</p>
                <p><strong>TurboCore Pro</strong> mejora el motor con opciones LEAPS sobre QQQ, entregando históricamente un <strong>CAGR del 39.3%</strong> — 3 veces el rendimiento de QQQ — con una <strong>ganancia del +21.4% en 2022</strong>, el año en que QQQ cayó −33%.</p>
                <h2>Nuestro Compromiso</h2>
                <p>TradeMind@bot es una plataforma tecnológica, no un asesor financiero. No gestionamos tu dinero, ni custodiamos tus fondos, ni ejecutamos operaciones sin tu autorización.</p>
                <hr />
                <p className="text-sm italic text-white/50 text-center">Creado en 2026. Diseñado para la próxima generación de inversores.</p>
            </>
        );
    }

    if (lang === 'zh') {
        return (
            <>
                <p className="text-xl font-medium text-white mb-8 border-l-2 border-tm-purple pl-4">
                    <strong>TradeMind@bot</strong> — <em>智慧交易，加速复利增长。</em>
                </p>
                <p>TradeMind@bot是一个金融科技平台，基于一个简单的信念：机构交易者使用的AI驱动策略，不应该需要对冲基金的最低资金门槛。</p>
                <p>我们创建TradeMind@bot是为了回答一个问题——<em>如果每位投资者，无论账户规模大小，都能获得系统化、经过历史验证的策略，会怎样？</em></p>
                <h2>我们做什么</h2>
                <p>TradeMind@bot每日提供由多层机器学习模型驱动的AI生成交易信号。每天早晨，我们的引擎将市场分类为牛市、横盘或熊市，并直接向您的控制台推送带有置信度评分的清晰信号。</p>
                <p>您可以在任意已使用的券商平台上跟随信号操作。如果您拥有Tastytrade账户，可以直接连接并让TradeMind@bot代您提交订单。</p>
                <p className="font-semibold text-white bg-white/5 p-4 rounded-lg my-6">无黑箱，无猜测。每个信号都附有清晰的理由说明。</p>
                <h2>我们的策略</h2>
                <p><strong>TurboCore</strong>是我们基于ETF的策略，适合任何投资者——无需期权账户或最低余额要求。经2019至2026年历史回测，TurboCore实现了<strong>27.8%的年化复合增长率（CAGR）</strong>——超过同期QQQ回报的2倍。</p>
                <p><strong>TurboCore Pro</strong>以QQQ LEAPS期权升级引擎，历史年化复合增长率达<strong>39.3%</strong>——QQQ回报的3倍——并在QQQ下跌−33%的<strong>2022年录得+21.4%的收益</strong>。</p>
                <h2>我们的承诺</h2>
                <p>TradeMind@bot是一个技术平台，而非财务顾问。我们不管理您的资金，不托管您的资产，也不在未经授权的情况下执行交易。</p>
                <hr />
                <p className="text-sm italic text-white/50 text-center">创立于2026年，专为下一代投资者而设计。</p>
            </>
        );
    }

    // Default: English
    return (
        <>
            <p className="text-xl font-medium text-white mb-8 border-l-2 border-tm-purple pl-4">
                <strong>TradeMind@bot</strong> — <em>Trade Smarter. Compound Faster.</em>
            </p>
            <p>TradeMind@bot is a financial technology platform built on a simple conviction: the same AI-driven strategies used by institutional traders shouldn&apos;t require a hedge fund minimum to access.</p>
            <p>We built TradeMind@bot to answer one question — <em>what if every investor, regardless of account size, had access to a systematic, backtested strategy that tells them exactly when to be aggressive and when to protect what they&apos;ve built?</em></p>
            <h2>What We Do</h2>
            <p>TradeMind@bot delivers daily AI-generated trading signals powered by multi-layer machine learning models — including Hidden Markov Model regime detection, XGBoost signal scoring, and Neural Network allocation optimization. Every morning, our engine classifies the market as BULL, SIDEWAYS, or BEAR, and delivers a clear, confidence-scored signal directly to your dashboard.</p>
            <p>You follow the signal on any brokerage you already use. If you have a Tastytrade account, you can connect it directly and let TradeMind@bot submit orders on your behalf — with your approval or fully automated.</p>
            <p className="font-semibold text-white bg-white/5 p-4 rounded-lg my-6">No black box. No guesswork. Every signal comes with a plain-English explanation of why.</p>
            <h2>Our Strategies</h2>
            <p><strong>TurboCore</strong> is our ETF-based strategy, built for any investor — no options account or minimum balance required. Backtested from 2019–2026, TurboCore delivered a <strong>27.8% CAGR</strong> — more than 2× QQQ&apos;s return over the same period.</p>
            <p><strong>TurboCore Pro</strong> upgrades the engine with QQQ LEAPS options, delivering <strong>39.3% CAGR</strong> historically — 3× QQQ&apos;s return — while recording a <strong>+21.4% gain in 2022</strong>, the year QQQ fell −33%.</p>
            <h2>Our Commitment</h2>
            <p>TradeMind@bot is a technology platform, not a financial advisor. We do not manage your money, hold your funds, or execute trades without your authorization.</p>
            <hr />
            <p className="text-sm italic text-white/50 text-center">Built in 2026. Designed for the next generation of investors.</p>
        </>
    );
}
