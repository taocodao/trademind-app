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
                <p>Sigues la señal en cualquier bróker que ya utilices. Cada señal viene con instrucciones de orden listas para ingresar — tú las revisas, las ajustas si lo deseas y colocas la operación personalmente. TradeMind nunca se conecta a tu bróker ni envía órdenes — esto solo te ayuda a ingresar la orden tú mismo.</p>
                <p className="font-semibold text-white bg-white/5 p-4 rounded-lg my-6">Sin caja negra. Sin suposiciones. Cada señal viene con una explicación clara de por qué.</p>
                <h2>Nuestras Estrategias</h2>
                <p><strong>QQQ Basic</strong> es nuestra estrategia basada en ETFs, diseñada para cualquier inversor — sin aprobación de opciones ni saldo mínimo requerido. Cada día de mercado a las 3 PM ET asigna entre QQQ, QLD, TQQQ y SGOV (bonos del Tesoro) usando tendencia, momentum, detección de régimen y confianza de ML. En backtests walk-forward 2021–2026, el nivel de riesgo moderado logró un <strong>CAGR del 13.7% con un drawdown máximo de −15.0%</strong> — sacrificando algo de rendimiento por drawdowns materialmente menores que tener QQQ directamente.</p>
                <p><strong>QQQ LEAPS</strong> es nuestra estrategia insignia de opciones: entradas raras y filtradas en calls QQQ de largo plazo, con un overlay de covered calls que cosecha prima mientras mantienes la posición. En backtests con precios de modelo 2021–2026 logró un <strong>CAGR del 36.3% con un drawdown máximo de −17.8%</strong> — casi el doble del rendimiento de QQQ con aproximadamente la mitad del drawdown. Requiere aprobación de opciones en tu bróker.</p>
                <h2>Nuestro Compromiso</h2>
                <p>TradeMind@bot es una plataforma tecnológica, no un asesor financiero. No gestionamos tu dinero, ni custodiamos tus fondos, ni ejecutamos operaciones. TradeMind nunca se conecta a tu bróker ni envía órdenes — cada orden la ingresas tú, en tu propia cuenta.</p>
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
                <p>您可以在任意已使用的券商平台上跟随信号操作。每个信号都附有可直接输入的订单指令——您自行审核、按需调整，并亲自下单。TradeMind 从不连接您的券商，也从不代为提交订单——它只是帮助您自己输入订单。</p>
                <p className="font-semibold text-white bg-white/5 p-4 rounded-lg my-6">无黑箱，无猜测。每个信号都附有清晰的理由说明。</p>
                <h2>我们的策略</h2>
                <p><strong>QQQ Basic</strong>是我们基于ETF的策略，适合任何投资者——无需期权权限或最低余额。每个交易日下午3点（美东时间），它根据趋势、动量、市场状态识别和机器学习置信度在 QQQ、QLD、TQQQ 和 SGOV（短期国债ETF）之间进行配置。在2021–2026年的步进式回测中，中等风险档位实现了<strong>13.7%的年化复合增长率，最大回撤仅为−15.0%</strong>——以部分收益换取远小于直接持有QQQ的回撤。</p>
                <p><strong>QQQ LEAPS</strong>是我们的旗舰期权策略：经过多重条件筛选的稀有入场信号，买入QQQ长期看涨期权，并配合备兑看涨期权叠加策略在持仓期间获取权利金。在2021–2026年模型定价回测中，实现了<strong>36.3%的年化复合增长率，最大回撤−17.8%</strong>——接近QQQ回报的两倍，而回撤仅约为其一半。需要您的券商开通期权交易权限。</p>
                <h2>我们的承诺</h2>
                <p>TradeMind@bot是一个技术平台，而非财务顾问。我们不管理您的资金、不托管您的资产、也不执行任何交易。TradeMind 从不连接您的券商或代为提交订单——每一笔订单都由您在自己的账户中亲自输入。</p>
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
            <p>You follow the signal on any brokerage you already use. Every signal comes with ready-to-enter order instructions — you review them, adjust if you like, and place the trade yourself. TradeMind never connects to or submits orders to your brokerage — this only helps you enter the order yourself.</p>
            <p className="font-semibold text-white bg-white/5 p-4 rounded-lg my-6">No black box. No guesswork. Every signal comes with a plain-English explanation of why.</p>
            <h2>Our Strategies</h2>
            <p><strong>QQQ Basic</strong> is our ETF-based strategy, built for any investor — no options approval or minimum balance required. Each trading day at 3 PM ET it allocates between QQQ, QLD, TQQQ, and SGOV (T-bills) using trend, momentum, regime detection, and ML confidence. In 2021–2026 walk-forward backtests, the moderate risk tier delivered a <strong>13.7% CAGR with a −15.0% maximum drawdown</strong> — trading some return for materially smaller drawdowns than owning QQQ outright.</p>
            <p><strong>QQQ LEAPS</strong> is our flagship options strategy: rare, gated entries into long-dated QQQ calls, with a covered-call overlay that harvests premium while you hold. In model-priced 2021–2026 backtests it delivered a <strong>36.3% CAGR with a −17.8% maximum drawdown</strong> — nearly double QQQ&apos;s return with about half the drawdown. Requires options approval at your broker.</p>
            <h2>Our Commitment</h2>
            <p>TradeMind@bot is a technology platform, not a financial advisor. We do not manage your money, hold your funds, or execute trades. TradeMind never connects to or submits orders to your brokerage — every order is entered by you, in your own account.</p>
            <hr />
            <p className="text-sm italic text-white/50 text-center">Built in 2026. Designed for the next generation of investors.</p>
        </>
    );
}
