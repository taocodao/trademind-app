export type LedgerLang = 'en' | 'es' | 'zh';

export interface GateBadge {
    key: string;
    label: string;
}

export interface LedgerCopy {
    eyebrow: string;
    title: string;
    sub: string;
    modelTagLine: string;
    banner: string;
    bannerFine: string;
    chartTitle: string;
    chartNote: string;
    chartLegendQqq: string;
    chartLegendEquity: string;
    chartLegendLeaps: string;
    chartLegendShort: string;
    ledgerTitle: string;
    ledgerNote: string;
    colDate: string;
    colInstrument: string;
    colAction: string;
    colStrike: string;
    colExpiry: string;
    colContracts: string;
    colPrice: string;
    colSpot: string;
    colIv: string;
    colDelta: string;
    colSlippage: string;
    colCommission: string;
    colPnl: string;
    colWhy: string;
    gatesTitle: string;
    gatesNote: string;
    gateBadges: Record<string, string>;
    detailDisclaimer: string;
    tooltipDisclaimer: string;
    backToVerify: string;
    backToHome: string;
    kindLeaps: string;
    kindShort: string;
    pass: string;
    fail: string;
    filterAll: string;
    filterLeaps: string;
    filterShorts: string;
    showing: string;
    rowExpanded: string;
    seoSummary: string;
}

const EN: LedgerCopy = {
    eyebrow: 'PUBLIC AUDIT - INTERACTIVE LEDGER',
    title: 'Every trade, on the chart, in the ledger.',
    sub: 'All 806 fills from the published QQQ LEAPS backtest record, plotted at their exact timestamps against real QQQ prices and the model equity curve. Click any marker or row to see the pricing inputs and which entry gates passed at that decision point.',
    modelTagLine: 'All option prices on this page are Black-Scholes model values computed in the backtest, not real market quotes. This is disclosed in the methodology on the verify page.',
    banner: 'This is the trade-by-trade record behind the $10,000 to $1,007,126 hypothetical illustration on the verify page. Every entry, exit, and gate decision that produced it, model-priced as disclosed there.*',
    bannerFine: '*Hypothetical illustration based on backtested results; not necessarily indicative of future results.',
    chartTitle: 'The chart audit',
    chartNote: 'QQQ daily candles and the strategy equity curve, January 2021 through August 2026. Violet markers are LEAPS entries and exits; amber markers are covered-call overlays. Click a marker to open that fill in the ledger below.',
    chartLegendQqq: 'QQQ (real daily prices)',
    chartLegendEquity: 'Equity curve (model NAV)',
    chartLegendLeaps: 'LEAPS fills',
    chartLegendShort: 'Covered-call fills',
    ledgerTitle: 'The full ledger',
    ledgerNote: 'Every fill the engine logged, in chronological order. Expand any row for the pricing inputs, costs, and the rule that triggered it, plus the seven entry gates as they stood at that decision.',
    colDate: 'Timestamp (ET)',
    colInstrument: 'Instrument',
    colAction: 'Action',
    colStrike: 'Strike',
    colExpiry: 'Expiry',
    colContracts: 'Contracts',
    colPrice: 'Price / share',
    colSpot: 'QQQ spot',
    colIv: 'IV used',
    colDelta: 'Delta',
    colSlippage: 'Slippage',
    colCommission: 'Commission',
    colPnl: 'P&L',
    colWhy: 'Triggering rule',
    gatesTitle: 'Entry gates at this decision',
    gatesNote: 'Gate names and pass/fail status only. Numeric thresholds are in the open harness, and the full per-fill values are disclosed to compliance counsel, not here.',
    gateBadges: {
        regime: 'Regime filter',
        vix: 'Volatility ceiling',
        above_sma100: 'Long-term trend',
        rsi_14: 'Oversold signal',
        gap_down_pct: 'Entry gap',
        ml_confidence: 'Confidence floor',
        put_demand: 'Put demand',
    },
    detailDisclaimer: 'Hypothetical backtested performance; many inherent limitations. Past performance is not necessarily indicative of future results. Option prices shown are model values, not real quotes.',
    tooltipDisclaimer: 'Model-priced, not a real quote. Hypothetical performance; past results are not necessarily indicative of future results.',
    backToVerify: 'Back to methodology',
    backToHome: 'Back to homepage',
    kindLeaps: 'LEAPS call',
    kindShort: 'Covered call',
    pass: 'passed',
    fail: 'failed',
    filterAll: 'All fills',
    filterLeaps: 'LEAPS only',
    filterShorts: 'Covered calls only',
    showing: 'fills',
    rowExpanded: 'Expanded',
    seoSummary: 'This page publishes the complete 806-fill trade ledger of the TradeMind QQQ LEAPS backtest (January 4, 2021 to August 14, 2026), with every fill plotted on an interactive chart of real QQQ prices and the model equity curve. Each fill lists its timestamp, instrument, strike, expiry, size, model price, IV, delta, slippage, commission, P&L, the rule that triggered it, and which of the seven entry gates passed. Hypothetical backtested performance; past performance is not necessarily indicative of future results.',
};

const ES: LedgerCopy = {
    eyebrow: 'AUDITORIA PUBLICA - LIBRO INTERACTIVO',
    title: 'Cada operacion, en el grafico, en el libro.',
    sub: 'Las 806 ejecuciones del backtest publicado de QQQ LEAPS, trazadas en sus marcas de tiempo exactas contra precios reales de QQQ y la curva de capital del modelo. Haz clic en cualquier marcador o fila para ver los datos de precios y que filtros de entrada pasaron en esa decision.',
    modelTagLine: 'Todos los precios de opciones en esta pagina son valores del modelo Black-Scholes calculados en el backtest, no cotizaciones reales de mercado. Esto se detalla en la metodologia de la pagina de verificacion.',
    banner: 'Este es el registro operaci\xf3n por operaci\xf3n detr\xe1s de la ilustraci\xf3n hipot\xe9tica de $10,000 a $1,007,126 en la p\xe1gina de verificaci\xf3n. Cada entrada, salida y decisi\xf3n de las compuertas que la produjo, con precios de modelo como se indica all\xed.*',
    bannerFine: '*Ilustraci\xf3n hipot\xe9tica basada en resultados de backtest; no necesariamente indicativa de resultados futuros.',
    chartTitle: 'La auditoria visual',
    chartNote: 'Velas diarias de QQQ y la curva de capital de la estrategia, de enero de 2021 a agosto de 2026. Los marcadores violetas son entradas y salidas de LEAPS; los ambar son overlays de covered calls. Haz clic en un marcador para abrir esa ejecucion en el libro.',
    chartLegendQqq: 'QQQ (precios diarios reales)',
    chartLegendEquity: 'Curva de capital (NAV del modelo)',
    chartLegendLeaps: 'Ejecuciones LEAPS',
    chartLegendShort: 'Ejecuciones covered call',
    ledgerTitle: 'El libro completo',
    ledgerNote: 'Cada ejecucion que registro el motor, en orden cronologico. Expande cualquier fila para ver los datos de precios, costos y la regla que la activo, ademas de los siete filtros de entrada tal como estaban en esa decision.',
    colDate: 'Fecha y hora (ET)',
    colInstrument: 'Instrumento',
    colAction: 'Accion',
    colStrike: 'Strike',
    colExpiry: 'Vencimiento',
    colContracts: 'Contratos',
    colPrice: 'Precio / accion',
    colSpot: 'Spot de QQQ',
    colIv: 'VI usada',
    colDelta: 'Delta',
    colSlippage: 'Deslizamiento',
    colCommission: 'Comision',
    colPnl: 'P&L',
    colWhy: 'Regla activadora',
    gatesTitle: 'Filtros de entrada en esta decision',
    gatesNote: 'Solo nombres de filtros y su estado. Los umbrales numericos estan en el codigo abierto, y los valores completos por ejecucion se entregan al asesor legal, no se publican aqui.',
    gateBadges: {
        regime: 'Filtro de regimen',
        vix: 'Techo de volatilidad',
        above_sma100: 'Tendencia de largo plazo',
        rsi_14: 'Senal de sobreventa',
        gap_down_pct: 'Gap de entrada',
        ml_confidence: 'Piso de confianza',
        put_demand: 'Demanda de puts',
    },
    detailDisclaimer: 'Rendimiento hipotetico de backtest; muchas limitaciones inherentes. El rendimiento pasado no es necesariamente indicativo de resultados futuros. Los precios de opciones mostrados son valores del modelo, no cotizaciones reales.',
    tooltipDisclaimer: 'Precio de modelo, no una cotizacion real. Rendimiento hipotetico; los resultados pasados no son necesariamente indicativos de resultados futuros.',
    backToVerify: 'Volver a la metodologia',
    backToHome: 'Volver a la p\xe1gina principal',
    kindLeaps: 'Call LEAPS',
    kindShort: 'Covered call',
    pass: 'paso',
    fail: 'fallo',
    filterAll: 'Todas las ejecuciones',
    filterLeaps: 'Solo LEAPS',
    filterShorts: 'Solo covered calls',
    showing: 'ejecuciones',
    rowExpanded: 'Expandida',
    seoSummary: 'Esta pagina publica el libro completo de 806 ejecuciones del backtest de QQQ LEAPS de TradeMind (4 de enero de 2021 a 14 de agosto de 2026), con cada ejecucion trazada sobre un grafico interactivo de precios reales de QQQ y la curva de capital del modelo. Cada ejecucion lista su fecha, instrumento, strike, vencimiento, tamano, precio de modelo, VI, delta, deslizamiento, comision, P&L, la regla que la activo y cuales de los siete filtros de entrada pasaron. Rendimiento hipotetico de backtest; el rendimiento pasado no es necesariamente indicativo de resultados futuros.',
};

const ZH: LedgerCopy = {
    eyebrow: '\u516c\u5f00\u5ba1\u8ba1 - \u4ea4\u4e92\u5f0f\u8d26\u672c',
    title: '\u6bcf\u4e00\u7b14\u4ea4\u6613\uff0c\u90fd\u5728\u56fe\u4e0a\uff0c\u90fd\u5728\u8d26\u91cc\u3002',
    sub: '\u5df2\u53d1\u5e03 QQQ LEAPS \u56de\u6d4b\u7684\u5168\u90e8 806 \u7b14\u6210\u4ea4\uff0c\u6309\u7cbe\u786e\u65f6\u95f4\u70b9\u6807\u6ce8\u5728\u771f\u5b9e QQQ \u4ef7\u683c\u4e0e\u6a21\u578b\u51c0\u503c\u66f2\u7ebf\u4e0a\u3002\u70b9\u51fb\u4efb\u4f55\u6807\u8bb0\u6216\u884c\uff0c\u67e5\u770b\u8be5\u7b14\u4ea4\u6613\u7684\u5b9a\u4ef7\u8f93\u5165\u4ee5\u53ca\u5f53\u65f6\u54ea\u4e9b\u5165\u573a\u6805\u95e8\u901a\u8fc7\u3002',
    modelTagLine: '\u672c\u9875\u6240\u6709\u671f\u6743\u4ef7\u683c\u5747\u4e3a\u56de\u6d4b\u4e2d\u8ba1\u7b97\u7684 Black-Scholes \u6a21\u578b\u503c\uff0c\u5e76\u975e\u771f\u5b9e\u5e02\u573a\u62a5\u4ef7\u3002\u76f8\u5173\u8bf4\u660e\u89c1\u9a8c\u8bc1\u9875\u7684\u65b9\u6cd5\u8bba\u90e8\u5206\u3002',
    banner: '\u8fd9\u662f\u9a8c\u8bc1\u9875\u9762\u4e0a 1 \u4e07\u7f8e\u5143\u5230 1,007,126 \u7f8e\u5143\u5047\u8bbe\u6027\u793a\u4f8b\u80cc\u540e\u7684\u9010\u7b14\u4ea4\u6613\u8bb0\u5f55\u3002\u4ea7\u751f\u8be5\u793a\u4f8b\u7684\u6bcf\u4e00\u7b14\u5165\u573a\u3001\u51fa\u573a\u548c\u95e8\u69db\u51b3\u7b56\u90fd\u5728\u8fd9\u91cc,\u4ef7\u683c\u5747\u4e3a\u6a21\u578b\u5b9a\u4ef7,\u5982\u9a8c\u8bc1\u9875\u6240\u8ff0\u3002*',
    bannerFine: '*\u57fa\u4e8e\u56de\u6d4b\u7ed3\u679c\u7684\u5047\u8bbe\u6027\u793a\u4f8b;\u5e76\u4e0d\u9884\u793a\u672a\u6765\u7ed3\u679c\u3002',
    chartTitle: '\u53ef\u89c6\u5316\u5ba1\u8ba1',
    chartNote: 'QQQ \u65e5 K \u7ebf\u4e0e\u7b56\u7565\u51c0\u503c\u66f2\u7ebf\uff0c2021 \u5e74 1 \u6708\u81f3 2026 \u5e74 8 \u6708\u3002\u7d2b\u8272\u6807\u8bb0\u4e3a LEAPS \u5f00\u5e73\u4ed3\uff1b\u7425\u73c0\u8272\u6807\u8bb0\u4e3a\u8986\u76d6\u5356\u51fa\u3002\u70b9\u51fb\u6807\u8bb0\u5373\u53ef\u5728\u4e0b\u65b9\u8d26\u672c\u4e2d\u6253\u5f00\u8be5\u7b14\u6210\u4ea4\u3002',
    chartLegendQqq: 'QQQ\uff08\u771f\u5b9e\u65e5\u7ebf\u4ef7\u683c\uff09',
    chartLegendEquity: '\u51c0\u503c\u66f2\u7ebf\uff08\u6a21\u578b NAV\uff09',
    chartLegendLeaps: 'LEAPS \u6210\u4ea4',
    chartLegendShort: '\u8986\u76d6\u5356\u51fa\u6210\u4ea4',
    ledgerTitle: '\u5b8c\u6574\u8d26\u672c',
    ledgerNote: '\u5f15\u64ce\u8bb0\u5f55\u7684\u6bcf\u4e00\u7b14\u6210\u4ea4\uff0c\u6309\u65f6\u95f4\u987a\u5e8f\u6392\u5217\u3002\u5c55\u5f00\u4efb\u4f55\u4e00\u884c\uff0c\u67e5\u770b\u5b9a\u4ef7\u8f93\u5165\u3001\u6210\u672c\u3001\u89e6\u53d1\u89c4\u5219\uff0c\u4ee5\u53ca\u5f53\u65f6\u4e03\u4e2a\u5165\u573a\u6805\u95e8\u7684\u72b6\u6001\u3002',
    colDate: '\u65f6\u95f4\uff08\u7f8e\u4e1c\uff09',
    colInstrument: '\u6807\u7684',
    colAction: '\u64cd\u4f5c',
    colStrike: '\u884c\u6743\u4ef7',
    colExpiry: '\u5230\u671f\u65e5',
    colContracts: '\u5408\u7ea6\u6570',
    colPrice: '\u6bcf\u80a1\u4ef7\u683c',
    colSpot: 'QQQ \u73b0\u4ef7',
    colIv: '\u6240\u7528\u9690\u6ce2',
    colDelta: 'Delta',
    colSlippage: '\u6ed1\u70b9',
    colCommission: '\u4f63\u91d1',
    colPnl: '\u76c8\u4e8f',
    colWhy: '\u89e6\u53d1\u89c4\u5219',
    gatesTitle: '\u8be5\u51b3\u7b56\u65f6\u7684\u5165\u573a\u6805\u95e8',
    gatesNote: '\u4ec5\u663e\u793a\u6805\u95e8\u540d\u79f0\u4e0e\u901a\u8fc7\u72b6\u6001\u3002\u5177\u4f53\u6570\u503c\u9608\u503c\u5728\u5f00\u6e90\u4ee3\u7801\u4e2d\uff0c\u6bcf\u7b14\u5b8c\u6574\u6570\u503c\u63d0\u4ea4\u5408\u89c4\u987e\u95ee\u590d\u6838\uff0c\u4e0d\u5728\u6b64\u516c\u5f00\u3002',
    gateBadges: {
        regime: '\u5e02\u573a\u72b6\u6001\u8fc7\u6ee4',
        vix: '\u6ce2\u52a8\u7387\u4e0a\u9650',
        above_sma100: '\u957f\u671f\u8d8b\u52bf',
        rsi_14: '\u8d85\u5356\u4fe1\u53f7',
        gap_down_pct: '\u5165\u573a\u8df3\u7a7a',
        ml_confidence: '\u7f6e\u4fe1\u5ea6\u4e0b\u9650',
        put_demand: '\u5356\u6c83\u9700\u6c42',
    },
    detailDisclaimer: '\u56de\u6d4b\u4e3a\u5047\u8bbe\u6027\u4e1a\u7ee9\uff0c\u5b58\u5728\u8bf8\u591a\u56fa\u6709\u5c40\u9650\u3002\u8fc7\u5f80\u8868\u73b0\u4e0d\u4e00\u5b9a\u9884\u793a\u672a\u6765\u7ed3\u679c\u3002\u6240\u793a\u671f\u6743\u4ef7\u683c\u4e3a\u6a21\u578b\u503c\uff0c\u975e\u771f\u5b9e\u62a5\u4ef7\u3002',
    tooltipDisclaimer: '\u6a21\u578b\u5b9a\u4ef7\uff0c\u975e\u771f\u5b9e\u62a5\u4ef7\u3002\u5047\u8bbe\u6027\u4e1a\u7ee9\uff1b\u8fc7\u5f80\u8868\u73b0\u4e0d\u4e00\u5b9a\u9884\u793a\u672a\u6765\u7ed3\u679c\u3002',
    backToVerify: '\u8fd4\u56de\u65b9\u6cd5\u8bba',
    backToHome: '\u8fd4\u56de\u9996\u9875',
    kindLeaps: 'LEAPS \u770b\u6da8',
    kindShort: '\u8986\u76d6\u5356\u51fa',
    pass: '\u901a\u8fc7',
    fail: '\u672a\u901a\u8fc7',
    filterAll: '\u5168\u90e8\u6210\u4ea4',
    filterLeaps: '\u4ec5 LEAPS',
    filterShorts: '\u4ec5\u8986\u76d6\u5356\u51fa',
    showing: '\u7b14\u6210\u4ea4',
    rowExpanded: '\u5df2\u5c55\u5f00',
    seoSummary: '\u672c\u9875\u516c\u5e03 TradeMind QQQ LEAPS \u56de\u6d4b\u7684\u5168\u90e8 806 \u7b14\u6210\u4ea4\u8bb0\u5f55\uff082021 \u5e74 1 \u6708 4 \u65e5\u81f3 2026 \u5e74 8 \u6708 14 \u65e5\uff09\uff0c\u6bcf\u7b14\u6210\u4ea4\u6807\u6ce8\u5728\u53ef\u4ea4\u4e92\u7684 QQQ \u771f\u5b9e\u4ef7\u683c\u4e0e\u6a21\u578b\u51c0\u503c\u66f2\u7ebf\u56fe\u4e0a\u3002\u6bcf\u7b14\u8bb0\u5f55\u5217\u51fa\u65f6\u95f4\u3001\u6807\u7684\u3001\u884c\u6743\u4ef7\u3001\u5230\u671f\u65e5\u3001\u6570\u91cf\u3001\u6a21\u578b\u4ef7\u683c\u3001\u9690\u6ce2\u3001delta\u3001\u6ed1\u70b9\u3001\u4f63\u91d1\u3001\u76c8\u4e8f\u3001\u89e6\u53d1\u89c4\u5219\u53ca\u4e03\u4e2a\u5165\u573a\u6805\u95e8\u7684\u901a\u8fc7\u60c5\u51b5\u3002\u56de\u6d4b\u4e3a\u5047\u8bbe\u6027\u4e1a\u7ee9\uff1b\u8fc7\u5f80\u8868\u73b0\u4e0d\u4e00\u5b9a\u9884\u793a\u672a\u6765\u7ed3\u679c\u3002',
};

export const LEDGER_COPY: Record<LedgerLang, LedgerCopy> = { en: EN, es: ES, zh: ZH };
