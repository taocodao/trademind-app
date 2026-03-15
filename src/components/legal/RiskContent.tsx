'use client';
import { useTranslation } from 'react-i18next';

export function RiskContent() {
    const { i18n } = useTranslation();
    const lang = i18n.language?.startsWith('es') ? 'es' : i18n.language?.startsWith('zh') ? 'zh' : 'en';

    if (lang === 'es') {
        return (
            <>
                <h1 className="text-4xl font-black text-white mb-2">Divulgación de Riesgos</h1>
                <p className="text-sm text-tm-muted font-mono mb-8"><strong>Fecha de Vigencia:</strong> 1 de marzo de 2026</p>
                <p>Lee esta Divulgación de Riesgos cuidadosamente antes de usar TradeMind@bot.</p>
                <hr />
                <h3>No es Asesoramiento de Inversión</h3>
                <p>TradeMind@bot es una plataforma de software tecnológico, no un asesor de inversiones registrado. Todas las señales de trading son generadas algorítmicamente y entregadas de forma idéntica a todos los suscriptores.</p>
                <p className="font-semibold text-tm-red">Consulta a un profesional financiero calificado antes de tomar decisiones de inversión.</p>
                <hr />
                <h3>Riesgo de Pérdida</h3>
                <p>El trading conlleva un riesgo sustancial de pérdida. Puedes perder parte o la totalidad de tu capital invertido.</p>
                <p className="font-semibold text-white bg-red-950/30 p-4 border border-red-500/20 rounded-lg">Nunca inviertas dinero que no puedas permitirte perder.</p>
                <hr />
                <h3>Regla 4.41 de la CFTC — Divulgación de Rendimiento Hipotético</h3>
                <p className="uppercase text-sm leading-relaxed text-white/60">LOS RESULTADOS DE RENDIMIENTO HIPOTÉTICO O SIMULADO TIENEN CIERTAS LIMITACIONES. A DIFERENCIA DE UN HISTORIAL DE RENDIMIENTO REAL, LOS RESULTADOS SIMULADOS NO REPRESENTAN OPERACIONES REALES. NO SE GARANTIZA QUE NINGUNA CUENTA LOGRE GANANCIAS O PÉRDIDAS SIMILARES A LAS MOSTRADAS.</p>
                <hr />
                <h3>Riesgo de Mercado y Estrategia</h3>
                <ul>
                    <li><strong>Clasificación errónea del régimen:</strong> La IA puede clasificar incorrectamente las condiciones del mercado.</li>
                    <li><strong>Concentración en Nasdaq:</strong> Todas las estrategias están 100% concentradas en activos del Nasdaq-100. No se proporciona diversificación.</li>
                    <li><strong>Riesgo de apalancamiento:</strong> Los ETFs apalancados y las opciones LEAPS están sujetos a pérdidas amplificadas en mercados a la baja.</li>
                </ul>
                <hr />
                <h3>Riesgo del Bróker y Contraparte</h3>
                <p>TradeMind@bot nunca custodia fondos de clientes ni ejecuta operaciones fuera de las configuraciones de API del bróker autorizadas por el usuario.</p>
                <hr />
                <h3>Sin Garantía</h3>
                <p>No se garantiza que ninguna estrategia logre resultados similares al rendimiento histórico.</p>
                <hr />
                <h3>Contacto</h3>
                <p><a href="mailto:legal@trademind.bot">legal@trademind.bot</a><br /><span className="text-sm mt-2 block opacity-60">TradeMind@bot LLC — © 2026 Todos los derechos reservados.</span></p>
            </>
        );
    }

    if (lang === 'zh') {
        return (
            <>
                <h1 className="text-4xl font-black text-white mb-2">风险披露</h1>
                <p className="text-sm text-tm-muted font-mono mb-8"><strong>生效日期：</strong>2026年3月1日</p>
                <p>在使用TradeMind@bot之前，请仔细阅读本风险披露。</p>
                <hr />
                <h3>非投资建议</h3>
                <p>TradeMind@bot是一个软件技术平台，而非注册投资顾问。所有交易信号均由算法生成，并以相同方式发送给所有订阅用户。</p>
                <p className="font-semibold text-tm-red">在做出任何投资决策前，请咨询合格的金融专业人士。</p>
                <hr />
                <h3>亏损风险</h3>
                <p>交易涉及重大亏损风险。您可能损失部分或全部投入资本。</p>
                <p className="font-semibold text-white bg-red-950/30 p-4 border border-red-500/20 rounded-lg">切勿投入您承担不起损失的资金。</p>
                <hr />
                <h3>CFTC第4.41条——假设性绩效披露</h3>
                <p className="uppercase text-sm leading-relaxed text-white/60">假设性或模拟性绩效结果具有一定局限性。模拟结果不代表实际交易。不保证任何账户能够实现与所示类似的盈利或亏损。</p>
                <hr />
                <h3>市场与策略风险</h3>
                <ul>
                    <li><strong>市场状态误判：</strong>AI可能对市场状况做出错误分类。</li>
                    <li><strong>纳斯达克集中度：</strong>所有策略100%集中于纳斯达克100资产，不提供多元化配置。</li>
                    <li><strong>杠杆风险：</strong>杠杆ETF和LEAPS期权在市场下跌时面临放大的亏损风险。</li>
                </ul>
                <hr />
                <h3>券商与对手方风险</h3>
                <p>TradeMind@bot从不持有客户资金，也不在用户授权的券商API配置之外执行交易。</p>
                <hr />
                <h3>无收益保证</h3>
                <p>不保证任何策略能实现与历史表现相似的结果。</p>
                <hr />
                <h3>联系方式</h3>
                <p><a href="mailto:legal@trademind.bot">legal@trademind.bot</a><br /><span className="text-sm mt-2 block opacity-60">TradeMind@bot LLC — © 2026 保留所有权利。</span></p>
            </>
        );
    }

    // Default: English
    return (
        <>
            <h1 className="text-4xl font-black text-white mb-2">Risk Disclosure</h1>
            <p className="text-sm text-tm-muted font-mono mb-8"><strong>Effective Date:</strong> March 1, 2026</p>
            <p>Please read this Risk Disclosure carefully before using TradeMind@bot.</p>
            <hr />
            <h3>Not Investment Advice</h3>
            <p>TradeMind@bot is a software technology platform, not a registered investment advisor. All trading signals are algorithmically generated and delivered identically to all subscribers.</p>
            <p className="font-semibold text-tm-red">Consult a qualified financial professional before making any investment decisions.</p>
            <hr />
            <h3>Risk of Loss</h3>
            <p>Trading involves substantial risk of loss. You may lose some or all of your invested capital.</p>
            <p className="font-semibold text-white bg-red-950/30 p-4 border border-red-500/20 rounded-lg">Never invest money you cannot afford to lose.</p>
            <hr />
            <h3>CFTC Rule 4.41 — Hypothetical Performance Disclosure</h3>
            <p className="uppercase text-sm leading-relaxed text-white/60">HYPOTHETICAL OR SIMULATED PERFORMANCE RESULTS HAVE CERTAIN LIMITATIONS. UNLIKE AN ACTUAL PERFORMANCE RECORD, SIMULATED RESULTS DO NOT REPRESENT ACTUAL TRADING. NO REPRESENTATION IS BEING MADE THAT ANY ACCOUNT WILL ACHIEVE PROFIT OR LOSSES SIMILAR TO THOSE SHOWN.</p>
            <hr />
            <h3>Market &amp; Strategy Risk</h3>
            <ul>
                <li><strong>Regime misclassification:</strong> The AI may incorrectly classify market conditions.</li>
                <li><strong>Nasdaq concentration:</strong> All strategies are 100% concentrated in Nasdaq-100 assets. Diversification is not provided.</li>
                <li><strong>Leverage risk:</strong> Leveraged ETFs and LEAPS options are subject to amplified losses in declining markets.</li>
            </ul>
            <hr />
            <h3>Broker &amp; Counterparty Risk</h3>
            <p>TradeMind@bot never holds customer funds or executes trades outside of user-authorized broker API configurations.</p>
            <hr />
            <h3>No Guarantee</h3>
            <p>No representation is being made that any strategy will achieve results similar to historical performance.</p>
            <hr />
            <h3>Contact</h3>
            <p><a href="mailto:legal@trademind.bot">legal@trademind.bot</a><br /><span className="text-sm mt-2 block opacity-60">TradeMind@bot LLC — © 2026 All rights reserved.</span></p>
        </>
    );
}
