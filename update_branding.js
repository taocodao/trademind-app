const fs = require('fs');
const path = require('path');

// All TurboBounce → TradeMind@bot replacements inside translation files
const replacements = [
    { lang: 'en', key: ['hero', 'subtitle'], value: 'TradeMind@bot delivers AI trade signals — you pull the trigger' },
    { lang: 'en', key: ['footer', 'disclaimer'], value: 'IMPORTANT DISCLAIMER: TradeMind@bot is a software technology platform, not a registered investment advisor, broker-dealer, or financial planner. We do not provide personalized investment advice. All trade signals are algorithmically generated and delivered identically to all subscribers. Past performance, whether actual or indicated by backtests, is not indicative of future results. Trading options involves substantial risk of loss and is not appropriate for all investors. You could lose some or all of your invested capital. Consult a qualified financial professional before making investment decisions. See full Risk Disclosure for details.' },
    { lang: 'en', key: ['footer', 'brokerage'], value: 'Brokerage services are provided by third-party broker-dealers. TradeMind@bot never holds customer funds or executes trades outside of user-authorized broker API configurations.' },
    { lang: 'en', key: ['footer', 'rights'], value: 'TradeMind@bot LLC. All rights reserved.' },

    { lang: 'es', key: ['hero', 'subtitle'], value: 'TradeMind@bot entrega señales de trading con IA — tú aprietas el gatillo' },
    { lang: 'es', key: ['footer', 'disclaimer'], value: 'AVISO IMPORTANTE: TradeMind@bot es una plataforma de tecnología de software, no un asesor de inversiones registrado, corredor de bolsa o planificador financiero. No proporcionamos asesoramiento de inversión personalizado. Todas las señales de operación se generan algorítmicamente y se entregan de manera idéntica a todos los suscriptores. El rendimiento pasado, ya sea real o indicado por pruebas retrospectivas, no es indicativo de resultados futuros. Operar con opciones implica un riesgo sustancial de pérdida y no es apropiado para todos los inversores. Podrías perder una parte o la totalidad de tu capital invertido. Consulta a un profesional financiero calificado antes de tomar decisiones de inversión. Consulta el Aviso de Riesgo completo para obtener más detalles.' },
    { lang: 'es', key: ['footer', 'brokerage'], value: 'Los servicios de corretaje son proporcionados por corredores de bolsa externos. TradeMind@bot nunca retiene los fondos de los clientes ni ejecuta operaciones fuera de las configuraciones API del corredor autorizadas por el usuario.' },
    { lang: 'es', key: ['footer', 'rights'], value: 'TradeMind@bot LLC. Todos los derechos reservados.' },

    { lang: 'zh', key: ['hero', 'subtitle'], value: 'TradeMind@bot 提供 AI 交易信号 —— 由您来执行' },
    { lang: 'zh', key: ['footer', 'disclaimer'], value: '重要免责声明：TradeMind@bot 是一家软件技术平台，而非注册的投资顾问、经纪交易商或财务规划师。我们不提供个性化的投资建议。所有交易信号均由算法生成，并统一发送给所有订阅者。过往业绩（无论是实际的还是回测显示的）均不能预示未来结果。期权交易涉及重大的损失风险，并不适合所有投资者。您可能会损失部分或全部投资本金。在做出投资决定之前，请咨询合格的金融专业人士。详情请参阅完整的《风险披露》。' },
    { lang: 'zh', key: ['footer', 'brokerage'], value: '经纪服务由第三方经纪交易商提供。TradeMind@bot 绝不会持有客户资金，也不会在用户授权的经纪 API 配置之外执行交易。' },
    { lang: 'zh', key: ['footer', 'rights'], value: 'TradeMind@bot LLC。保留所有权利。' },
];

const baseDir = path.join(process.cwd(), 'public', 'locales');
const files = {};

replacements.forEach(({ lang, key, value }) => {
    const p = path.join(baseDir, lang, 'translation.json');
    if (!files[lang]) {
        files[lang] = { path: p, data: JSON.parse(fs.readFileSync(p, 'utf8')) };
    }
    // Navigate and set nested key
    let obj = files[lang].data;
    for (let i = 0; i < key.length - 1; i++) {
        if (!obj[key[i]]) obj[key[i]] = {};
        obj = obj[key[i]];
    }
    obj[key[key.length - 1]] = value;
});

Object.entries(files).forEach(([lang, { path: p, data }]) => {
    fs.writeFileSync(p, JSON.stringify(data, null, 4), 'utf8');
    console.log('✅ Updated translations for', lang);
});
