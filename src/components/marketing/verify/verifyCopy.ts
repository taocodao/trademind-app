/* verifyCopy - all /verify copy in EN / ES / ZH. Numbers must match the
   artifacts in /public/verify and the landing RecordSection exactly. No em
   dashes, en dashes, or double hyphens anywhere in user-visible strings.
   Placeholder REPO_URL in runHref is replaced by the public GitHub repo URL
   when the harness repo ships. */

export type VerifyLang = 'en' | 'es' | 'zh';

export interface VerifyCopy {
    heroEyebrow: string;
    heroTitle: string;
    heroSub: string;
    recordTitle: string;
    recordCols: string[];
    recordRows: { name: string; total: string; cagr: string; sharpe: string; maxdd: string; calmar: string; final: string }[];
    recordNote: string;
    metricDrillTitle: string;
    drillLabels: { formula: string; inputs: string; check: string };
    metricDrills: { key: string; name: string; formula: string; inputs: string; check: string }[];
    ledgerLinkTitle: string;
    ledgerLinkDesc: string;
    calendarTitle: string;
    calendar: { y: string; r: string }[];
    calendarNote: string;
    disclaimers: string[];
    methodTitle: string;
    methodIntro: string;
    methodSteps: { h: string; p: string }[];
    gatesTitle: string;
    gatesIntro: string;
    gatesRows: string[];
    gatesCounts: string;
    limitsTitle: string;
    limitsIntro: string;
    limits: { h: string; p: string }[];
    limitsClose: string;
    auditTitle: string;
    auditIntro: string;
    auditCols: string[];
    auditRows: { check: string; result: string; verdict: string; verdictKind: 'pass' | 'warn' }[];
    auditNote: string;
    illusTitle: string;
    illusLead: string;
    illusRows: { y: string; v: string }[];
    illusVolLabel: string;
    illusVol: string;
    illusIraLabel: string;
    illusIra: string;
    illusFine: string;
    homeLink: string;
    backHomeBtn: string;
    ctaLedger: string;
    kitTitle: string;
    kitIntro: string;
    kitCards: { title: string; desc: string; href: string }[];
    repoTitle: string;
    repoSteps: string[];
    repoNote: string;
    lineageTitle: string;
    lineageIntro: string;
    lineageLabels: { commit: string; tag: string; data: string; sums: string };
    lineageNote: string;
}

const EN: VerifyCopy = {
    heroEyebrow: 'Transparency',
    heroTitle: 'Don\u2019t take our word for it. Audit it.',
    heroSub:
        'Everything behind the QQQ LEAPS record quoted on our landing page: the exact method, every trade, every assumption, and every limitation. We publish what most backtests hide, because a number you cannot check is a number you should not trust.',
    recordTitle: 'The record, in full',
    recordCols: ['Total return', 'CAGR', 'Sharpe', 'Max DD', 'Calmar', 'Final value'],
    recordRows: [
        { name: 'QQQ LEAPS (backtest)', total: '+464.2%', cagr: '36.3%', sharpe: '1.48', maxdd: '-17.8%', calmar: '2.04', final: '$169,249' },
        { name: 'QQQ buy & hold', total: '+136.4%', cagr: '16.6%', sharpe: '0.80', maxdd: '-35.6%', calmar: '0.47', final: '$70,927' },
    ],
    recordNote:
        'January 4, 2021 to August 14, 2026, 5.6 continuous years, starting from $30,000. Worst drawdown period: September 5 to October 26, 2023. QQQ buy & hold is measured on the same dates from the same data feed.',
    metricDrillTitle: 'Audit trail for each headline number',
    drillLabels: { formula: 'Formula', inputs: 'Inputs', check: 'Check' },
    metricDrills: [
        {
            key: 'total',
            name: 'Total return: +464.2%',
            formula: '(Final NAV - Starting NAV) / Starting NAV = (169,249 - 30,000) / 30,000 = 4.6416.',
            inputs: 'Computed on the 1,410 daily NAV marks in trademind-v4-equity-curve.csv, which includes option mark-to-model, slippage, and commissions on every fill.',
            check: 'Reproduce: sum the P&L column of the public ledger, add residual option marks, divide by 30,000. The public harness run.py prints the same figure.',
        },
        {
            key: 'cagr',
            name: 'CAGR: 36.3%',
            formula: '(Final NAV / Starting NAV) ^ (365.25 / days) - 1, with 2,049 calendar days from 2021-01-04 to 2026-08-14.',
            inputs: 'Same NAV series as total return. The window is fixed and identical for every visitor.',
            check: 'Reproduce: (169,249 / 30,000) ^ (365.25 / 2049) - 1 = 0.363. Printed by run.py in the public harness.',
        },
        {
            key: 'sharpe',
            name: 'Sharpe ratio: 1.475',
            formula: 'Mean of daily excess returns over the 10-year Treasury proxy, divided by their standard deviation, annualized with sqrt(252).',
            inputs: 'Daily returns from the equity curve CSV; risk-free proxy from the ^IRX series listed in the run configuration file.',
            check: 'Reproduce: metrics_v4_canonical.json in the repo contains the identical value from the same inputs.',
        },
        {
            key: 'maxdd',
            name: 'Max drawdown: -17.8%',
            formula: 'Largest peak-to-trough decline of the daily NAV series: min over t of (NAV(t) / running-max NAV - 1).',
            inputs: 'The model-priced daily equity curve. The 15-month real-quote validation tape measured -30.4% over its window; the difference is stated next to this table.',
            check: 'Reproduce: compute running max of nav in trademind-v4-equity-curve.csv and take the minimum drawdown. Printed by run.py.',
        },
        {
            key: 'calmar',
            name: 'Calmar ratio: 2.04',
            formula: 'CAGR divided by the absolute max drawdown: 0.363 / 0.178 = 2.04.',
            inputs: 'Derived from the two figures above; no separate data.',
            check: 'Reproduce: divide the two values as shown.',
        },
    ],
    ledgerLinkTitle: 'See every trade, on the chart, in the ledger',
    ledgerLinkDesc: 'Open the interactive ledger: all 806 fills marked on the QQQ chart, each expandable to pricing inputs, costs, and entry-gate status.',
    calendarTitle: 'Calendar year returns',
    calendar: [
        { y: '2021', r: '+76.0%' },
        { y: '2022', r: '-9.5%' },
        { y: '2023', r: '+66.1%' },
        { y: '2024', r: '+44.2%' },
        { y: '2025', r: '+5.1%' },
        { y: '2026', r: '+48.3%' },
    ],
    calendarNote: '2026 is a partial year through August 14. 2022 was a losing year; 2025 was nearly flat. The record is not smooth, and the table above is not an average of good years.',
    disclaimers: [
        'HYPOTHETICAL PERFORMANCE RESULTS HAVE MANY INHERENT LIMITATIONS, SOME OF WHICH ARE DESCRIBED BELOW. NO REPRESENTATION IS BEING MADE THAT ANY ACCOUNT WILL OR IS LIKELY TO ACHIEVE PROFITS OR LOSSES SIMILAR TO THOSE SHOWN. IN FACT, THERE ARE FREQUENTLY SHARP DIFFERENCES BETWEEN HYPOTHETICAL PERFORMANCE RESULTS AND THE ACTUAL RESULTS SUBSEQUENTLY ACHIEVED BY ANY PARTICULAR TRADING PROGRAM.',
        'ONE OF THE LIMITATIONS OF HYPOTHETICAL PERFORMANCE RESULTS IS THAT THEY ARE GENERALLY PREPARED WITH THE BENEFIT OF HINDSIGHT. IN ADDITION, HYPOTHETICAL TRADING DOES NOT INVOLVE FINANCIAL RISK, AND NO HYPOTHETICAL TRADING RECORD CAN COMPLETELY ACCOUNT FOR THE IMPACT OF FINANCIAL RISK IN ACTUAL TRADING. FOR EXAMPLE, THE ABILITY TO WITHSTAND LOSSES OR TO ADHERE TO A PARTICULAR TRADING PROGRAM IN SPITE OF TRADING LOSSES ARE MATERIAL POINTS WHICH CAN ALSO ADVERSELY AFFECT ACTUAL TRADING RESULTS. THERE ARE NUMEROUS OTHER FACTORS RELATED TO THE MARKETS IN GENERAL OR TO THE IMPLEMENTATION OF ANY SPECIFIC TRADING PROGRAM WHICH CANNOT BE FULLY ACCOUNTED FOR IN THE PREPARATION OF HYPOTHETICAL PERFORMANCE RESULTS AND ALL OF WHICH CAN ADVERSELY AFFECT ACTUAL TRADING RESULTS.',
        'Past performance is not necessarily indicative of future results. This is a backtest: no actual account produced these results. The next drawdown could be deeper than -17.8%. TradeMind publishes signals for you to review and enter at your own broker; it never connects to or submits orders to your brokerage.',
    ],
    methodTitle: 'The exact method, step by step',
    methodIntro:
        'No black box. If a step below is vague, that is a bug in this page, not a secret in the model. Tell us and we will fix it.',
    methodSteps: [
        {
            h: 'The data',
            p: 'Hourly and daily QQQ bars, daily VIX, VIX3M, and the 13-week T-bill rate as the risk-free rate, January 2021 through August 2026. The engine evaluates once per hour and acts in a single window per trading day at 3:00 PM ET. The equity curve is marked at each daily close.',
        },
        {
            h: 'The core position',
            p: 'When entry conditions line up, the engine buys a deep in-the-money QQQ LEAPS call: delta near 0.80 to 0.85 with 12 to 24 months of time, depending on regime. Position size is capped at one third of account value, with at most 3 open positions, 5 contracts, and a 5% cash reserve. The LEAPS is the engine. Everything else is plumbing.',
        },
        {
            h: 'The income overlay',
            p: 'Against each LEAPS, the engine sells 32-day calls near delta 0.15 to 0.28, collecting premium. It takes profits at 10 to 20%, cuts losers at twice the credit received, and rolls or closes managed positions at 21 days to expiry or delta 0.40. In this window: 392 short calls sold, 85.2% profitable.',
        },
        {
            h: 'The pricing model, stated plainly',
            p: 'There is no historical options data anywhere in this run. Every option is priced with Black-Scholes, using VIX scaled by regime-dependent multipliers as the volatility input and the 13-week T-bill rate as the risk-free rate. Fills and daily marks are theoretical values, not market prints. What that means in practice is the next section.',
        },
        {
            h: 'The costs, included on every fill',
            p: 'One dollar commission per contract, plus slippage on every entry and exit: 0.35% of the option premium in calm markets, rising to 2% when VIX is above 35. Costs are modeled as a function of VIX and are therefore highest exactly when spreads actually widen.',
        },
        {
            h: 'The validator',
            p: 'The QQQ LEAPS gate was not tuned on this window and then reported on it. We ran combinatorial cross-validation across 21 recombined sub-windows of the same period: QQQ LEAPS beat the unfiltered engine on return and Sharpe in 18 of 21 paths. The live execution stack imports this same configuration and these same gates.',
        },
    ],
    gatesTitle: 'When the model refuses to trade',
    gatesIntro:
        'Selling calls into the wrong tape is how covered-call overlays die. The engine skips the overlay whenever any of these fire:',
    gatesRows: [
        'Strong trend: regime is strong bull and ADX reads 16 or higher. Skipped 788 times.',
        'Thin premium: implied volatility is below 0.7 times realized volatility. You would be selling insurance for less than the historical cost of claims. Skipped 149 times.',
        'Strong trend with thin premium (the QQQ LEAPS rule): ADX above 25 while implied volatility is below realized. Skipped 95 times.',
    ],
    gatesCounts: 'Total: 1,032 days the model looked at the overlay and declined it. Saying no is most of the job.',
    limitsTitle: 'What this record cannot tell you',
    limitsIntro:
        'We would rather lose a sale to an informed skeptic than win one from a misled believer. These are the limitations, stated as confidently as the results:',
    limits: [
        {
            h: 'Black-Scholes is not a market',
            p: 'Real option prices carry skew, term structure, and microstructure that a formula does not. Our IV-from-VIX scaling captures the level of volatility reasonably well, but individual fills can deviate from what your broker would have quoted, in either direction. This is the single biggest limitation of this record.',
        },
        {
            h: 'Slippage is modeled, not measured',
            p: 'The VIX-scaled slippage schedule is an estimate. Real fills at real brokers will differ, especially on the multi-leg rolls. We chose conservative values, but conservative is not the same as correct.',
        },
        {
            h: 'Hourly granularity hides the bad fifteen minutes',
            p: 'Decisions happen on hourly bars in one daily window. Prices moved inside those hours in ways the backtest never sees. Intraday spikes can be better or worse than the bar implies.',
        },
        {
            h: 'One strong bull market',
            p: 'Five and a half years, mostly rising, including the 2022 bear. The window contains one deep QQQ correction, not three. A strategy that shines here can sag in a decade of chop.',
        },
        {
            h: 'Survivorship of design',
            p: 'We tried variants before settling on QQQ LEAPS, and you are reading about the one that worked. The cross-validation above mitigates this; it does not eliminate it. Treat the number as evidence, not destiny.',
        },
    ],
    limitsClose:
        'If you want to see what this strategy looks like priced by the real options market instead of a formula, our 15-month real-quote simulation showed a -30.4% maximum drawdown over its window. We publish that number too.',
    auditTitle: 'Check us the way you would check anyone',
    auditIntro:
        'Here are the red flags auditors look for in a backtest, applied to this record before you have to ask:',
    auditCols: ['The red flag', 'This record', 'Verdict'],
    auditRows: [
        { check: 'Sharpe above 3 usually means overfitting', result: '1.48', verdict: 'Passes', verdictKind: 'pass' },
        { check: 'Win rate above 90% usually means curve-fitting', result: '85.2% on short calls, 90.9% on 11 LEAPS entries', verdict: 'Passes, watch the small LEAPS sample', verdictKind: 'pass' },
        { check: 'Zero losing months means the data is wrong', result: '17 losing months out of 67, including a -9.5% year in 2022', verdict: 'Passes', verdictKind: 'pass' },
        { check: 'Drawdown that never exceeds 10% is cosmetic', result: '-17.8% peak to trough over 7 weeks in late 2023', verdict: 'Passes', verdictKind: 'pass' },
        { check: 'Returns immune to parameters are real; returns balanced on one setting are not', result: 'One entry threshold set at 0.43 instead of 0.45 adds a single trade and moves CAGR from 35.3% to 36.3%', verdict: 'Disclosed, not hidden', verdictKind: 'warn' },
    ],
    auditNote:
        'The last row is the one to sit with. Two adjacent settings of one gate differ by 1.1 points of CAGR because of a single 2026 entry. We publish both numbers and the ledger entry for that trade. Judge accordingly.',
    illusTitle: 'What this would mean for a $10,000 retirement account*',
    illusLead: 'No new claims in this box. It is the same backtested CAGR from the table above, compounded forward so the arithmetic is visible.',
    illusRows: [
        { y: 'Year 0', v: '$10,000' },
        { y: 'Year 5', v: '~$46,600' },
        { y: 'Year 10', v: '~$216,900' },
        { y: 'Year 15', v: '~$1,007,126' },
    ],
    illusVolLabel: 'The path was not smooth',
    illusVol: 'The same record includes 2022 at -9.5% and a nearly flat 2025 at +5.1%. Compounding at this rate is an average across those years, not a straight line.',
    illusIraLabel: 'Which accounts can run this',
    illusIra: 'Buying long-dated calls and selling covered calls against them are permitted in most IRAs and Roth IRAs, subject to broker approval. Standard employer 401(k) plans generally do not support options trading.',
    illusFine: '*Hypothetical illustration based on backtested results, not a projection or promise. The rate used is 36% per year, the backtested CAGR rounded down. Backtested performance has many inherent limitations and is not necessarily indicative of future results. A 36% rate sustained for 15 years would exceed nearly all verified long-horizon public track records. Shown for arithmetic illustration only.',
    homeLink: 'New here? Start with the two-minute story on the homepage \u2192',
    backHomeBtn: '\u2190 Back to the homepage',
    ctaLedger: 'Browse all 806 fills in the ledger \u2192',
    kitTitle: 'The proof kit',
    kitIntro: 'Download everything. Check our arithmetic in a spreadsheet, or rerun the whole engine yourself:',
    kitCards: [
        { title: 'Full trade ledger', desc: 'Every one of the 806 fills: timestamp, strike, expiry, price, IV, delta, slippage, commission, P&L, and the rule that triggered it.', href: '/verify/trademind-v4-ledger.csv' },
        { title: 'Daily equity curve', desc: '1,410 daily marks of net account value with spot price and regime label, January 2021 through August 2026.', href: '/verify/trademind-v4-equity-curve.csv' },
        { title: 'Run configuration', desc: 'Every parameter the engine ran with, in one file you can diff against your own run.', href: '/verify/trademind-v4-config.json' },
        { title: 'Metrics summary', desc: 'The headline numbers exactly as the engine computed them, before marketing rounded anything.', href: '/verify/trademind-v4-metrics.json' },
        { title: 'Run the engine yourself', desc: 'The complete harness on GitHub. Clone it, run it, get these numbers, then change the assumptions and get yours.', href: 'https://github.com/taocodao/trademind-v4-harness' },
    ],
    repoTitle: 'Reproduce this record in three commands',
    repoSteps: [
        'git clone https://github.com/taocodao/trademind-v4-harness && cd trademind-v4-harness',
        'pip install -r requirements.txt',
        'python run.py, then compare your output/ directory against the files above',
    ],
    repoNote:
        'One piece stays private: the confidence model behind the entry gate. The repo ships its precomputed walk-forward output as data, so every trade in the ledger still reproduces exactly, while the model internals remain ours. Everything else, the regime classifier, the pricing, the gates, the exits, the costs, is right there for you to read, run, and break.',
    lineageTitle: 'Code and data lineage',
    lineageIntro: 'The exact code and data behind every number on this page, pinned so you can verify we have not moved the goalposts.',
    lineageLabels: {
        commit: 'Harness commit',
        tag: 'Release tag',
        data: 'Input data',
        sums: 'Artifact checksums (SHA-256)',
    },
    lineageNote: 'If any downloaded file hashes differently from what is listed here, assume it has been altered and tell us. The same checksums are committed to the public repo.',
};

const ES: VerifyCopy = {
    heroEyebrow: 'Transparencia',
    heroTitle: 'No te f\u00edes de nuestra palabra. Aud\u00edtalo.',
    heroSub:
        'Todo lo que hay detr\u00e1s del registro QQQ LEAPS citado en nuestra p\u00e1gina principal: el m\u00e9todo exacto, cada operaci\u00f3n, cada supuesto y cada limitaci\u00f3n. Publicamos lo que la mayor\u00eda de los backtests esconden, porque un n\u00famero que no puedes comprobar es un n\u00famero en el que no deber\u00edas confiar.',
    recordTitle: 'El registro, completo',
    recordCols: ['Retorno total', 'CAGR', 'Sharpe', 'Max DD', 'Calmar', 'Valor final'],
    recordRows: [
        { name: 'QQQ LEAPS (backtest)', total: '+464.2%', cagr: '36.3%', sharpe: '1.48', maxdd: '-17.8%', calmar: '2.04', final: '$169,249' },
        { name: 'QQQ comprar y mantener', total: '+136.4%', cagr: '16.6%', sharpe: '0.80', maxdd: '-35.6%', calmar: '0.47', final: '$70,927' },
    ],
    recordNote:
        'Del 4 de enero de 2021 al 14 de agosto de 2026, 5.6 a\u00f1os continuos, comenzando con $30,000. Peor per\u00edodo de drawdown: del 5 de septiembre al 26 de octubre de 2023. QQQ comprar y mantener se mide en las mismas fechas con la misma fuente de datos.',
    metricDrillTitle: 'Rastro de auditoria de cada cifra principal',
    drillLabels: { formula: 'Formula', inputs: 'Insumos', check: 'Comprobacion' },
    metricDrills: [
        {
            key: 'total',
            name: 'Retorno total: +464.2%',
            formula: '(NAV final - NAV inicial) / NAV inicial = (169,249 - 30,000) / 30,000 = 4.6416.',
            inputs: 'Calculado sobre las 1,410 marcas diarias de NAV en trademind-v4-equity-curve.csv, que incluye valuacion de opciones por modelo, deslizamiento y comisiones en cada ejecucion.',
            check: 'Reproducir: suma la columna P&L del libro publico, agrega las marcas residuales de opciones, divide entre 30,000. El run.py publico imprime la misma cifra.',
        },
        {
            key: 'cagr',
            name: 'CAGR: 36.3%',
            formula: '(NAV final / NAV inicial) ^ (365.25 / dias) - 1, con 2,049 dias calendario del 2021-01-04 al 2026-08-14.',
            inputs: 'La misma serie de NAV que el retorno total. La ventana es fija e identica para cada visitante.',
            check: 'Reproducir: (169,249 / 30,000) ^ (365.25 / 2049) - 1 = 0.363. Lo imprime run.py en el codigo abierto.',
        },
        {
            key: 'sharpe',
            name: 'Ratio Sharpe: 1.475',
            formula: 'Media de retornos diarios en exceso sobre el proxy del Treasury a 10 anos, dividida por su desviacion estandar, anualizada con sqrt(252).',
            inputs: 'Retornos diarios de la curva de capital; proxy libre de riesgo de la serie ^IRX listada en el archivo de configuracion.',
            check: 'Reproducir: metrics_v4_canonical.json en el repositorio contiene el valor identico con los mismos insumos.',
        },
        {
            key: 'maxdd',
            name: 'Caida maxima: -17.8%',
            formula: 'Mayor descenso pico-valle de la serie diaria de NAV: minimo sobre t de (NAV(t) / maximo acumulado - 1).',
            inputs: 'La curva de capital diaria con precios de modelo. La validacion de 15 meses con cotizaciones reales midio -30.4% en su ventana; la diferencia se declara junto a esta tabla.',
            check: 'Reproducir: calcula el maximo acumulado de nav en trademind-v4-equity-curve.csv y toma el drawdown minimo. Lo imprime run.py.',
        },
        {
            key: 'calmar',
            name: 'Ratio Calmar: 2.04',
            formula: 'CAGR dividido entre el valor absoluto de la caida maxima: 0.363 / 0.178 = 2.04.',
            inputs: 'Derivado de las dos cifras anteriores; sin datos adicionales.',
            check: 'Reproducir: divide los dos valores como se muestra.',
        },
    ],
    ledgerLinkTitle: 'Ve cada operacion, en el grafico, en el libro',
    ledgerLinkDesc: 'Abre el libro interactivo: las 806 ejecuciones marcadas sobre el grafico de QQQ, cada una expandible con datos de precios, costos y estado de los filtros de entrada.',
    calendarTitle: 'Retornos por a\u00f1o calendario',
    calendar: [
        { y: '2021', r: '+76.0%' },
        { y: '2022', r: '-9.5%' },
        { y: '2023', r: '+66.1%' },
        { y: '2024', r: '+44.2%' },
        { y: '2025', r: '+5.1%' },
        { y: '2026', r: '+48.3%' },
    ],
    calendarNote: '2026 es un a\u00f1o parcial hasta el 14 de agosto. 2022 fue un a\u00f1o con p\u00e9rdidas; 2025 fue casi plano. El registro no es suave, y la tabla de arriba no es un promedio de buenos a\u00f1os.',
    disclaimers: [
        'LOS RESULTADOS HIPOT\u00c9TICOS DE RENDIMIENTO TIENEN MUCHAS LIMITACIONES INHERENTES, ALGUNAS DE LAS CUALES SE DESCRIBEN A CONTINUACI\u00d3N. NO SE HACE NINGUNA DECLARACI\u00d3N DE QUE ALGUNA CUENTA VAYA A LOGRAR, O SEA PROBABLE QUE LOGRE, GANANCIAS O P\u00c9RDIDAS SIMILARES A LAS MOSTRADAS. DE HECHO, CON FRECUENCIA EXISTEN DIFERENCIAS MARCADAS ENTRE LOS RESULTADOS HIPOT\u00c9TICOS Y LOS RESULTADOS REALES OBTENIDOS POSTERIORMENTE POR CUALQUIER PROGRAMA DE TRADING EN PARTICULAR.',
        'UNA DE LAS LIMITACIONES DE LOS RESULTADOS HIPOT\u00c9TICOS ES QUE GENERALMENTE SE PREPARAN CON EL BENEFICIO DE LA RETROSPECTIVA. ADEM\u00c1S, EL TRADING HIPOT\u00c9TICO NO IMPLICA RIESGO FINANCIERO, Y NING\u00daN REGISTRO HIPOT\u00c9TICO PUEDE CONTABILIZAR POR COMPLETO EL IMPACTO DEL RIESGO FINANCIERO EN EL TRADING REAL. POR EJEMPLO, LA CAPACIDAD DE SOPORTAR P\u00c9RDIDAS O DE ADHERIRSE A UN PROGRAMA DE TRADING A PESAR DE LAS P\u00c9RDIDAS SON PUNTOS MATERIALES QUE TAMBI\u00c9N PUEDEN AFECTAR ADVERSAMENTE LOS RESULTADOS REALES. EXISTEN NUMEROSOS OTROS FACTORES RELACIONADOS CON LOS MERCADOS EN GENERAL O CON LA IMPLEMENTACI\u00d3N DE CUALQUIER PROGRAMA ESPEC\u00cdFICO QUE NO PUEDEN CONTABILIZARSE POR COMPLETO EN LA PREPARACI\u00d3N DE RESULTADOS HIPOT\u00c9TICOS Y TODOS ELLOS PUEDEN AFECTAR ADVERSAMENTE LOS RESULTADOS REALES.',
        'El rendimiento pasado no es necesariamente indicativo de resultados futuros. Esto es un backtest: ninguna cuenta real produjo estos resultados. El pr\u00f3ximo drawdown podr\u00eda ser m\u00e1s profundo que -17.8%. TradeMind publica se\u00f1ales para que las revises y las ingreses en tu propio br\u00f3ker; nunca se conecta a tu cuenta de corretaje ni env\u00eda \u00f3rdenes a ella.',
    ],
    methodTitle: 'El m\u00e9todo exacto, paso a paso',
    methodIntro:
        'Sin caja negra. Si alg\u00fan paso resulta vago, es un error de esta p\u00e1gina, no un secreto del modelo. Av\u00edsanos y lo corregiremos.',
    methodSteps: [
        {
            h: 'Los datos',
            p: 'Barras horarias y diarias de QQQ, VIX diario, VIX3M y la tasa de las letras del Tesoro a 13 semanas como tasa libre de riesgo, de enero de 2021 a agosto de 2026. El motor eval\u00faa una vez por hora y act\u00faa en una \u00fanica ventana por d\u00eda h\u00e1bil a las 3:00 PM ET. La curva de capital se marca al cierre de cada d\u00eda.',
        },
        {
            h: 'La posici\u00f3n central',
            p: 'Cuando las condiciones de entrada se alinean, el motor compra una call LEAPS de QQQ muy dentro del dinero: delta cercano a 0.80 a 0.85 con 12 a 24 meses de plazo, seg\u00fan el r\u00e9gimen. El tama\u00f1o se limita a un tercio del valor de la cuenta, con un m\u00e1ximo de 3 posiciones abiertas, 5 contratos y una reserva de efectivo del 5%. El LEAPS es el motor. Todo lo dem\u00e1s es fontaner\u00eda.',
        },
        {
            h: 'La capa de ingresos',
            p: 'Contra cada LEAPS, el motor vende calls a 32 d\u00edas cerca de delta 0.15 a 0.28, cobrando prima. Toma ganancias al 10 a 20%, corta p\u00e9rdidas al doble del cr\u00e9dito recibido, y rota o cierra posiciones gestionadas a 21 d\u00edas del vencimiento o a delta 0.40. En esta ventana: 392 calls cortas vendidas, 85.2% rentables.',
        },
        {
            h: 'El modelo de precios, dicho claramente',
            p: 'No hay datos hist\u00f3ricos de opciones en ninguna parte de esta ejecuci\u00f3n. Cada opci\u00f3n se valora con Black-Scholes, usando el VIX escalado por multiplicadores seg\u00fan el r\u00e9gimen como volatilidad y la tasa a 13 semanas como tasa libre de riesgo. Las ejecuciones y las marcas diarias son valores te\u00f3ricos, no precios de mercado. Lo que esto significa en la pr\u00e1ctica es la siguiente secci\u00f3n.',
        },
        {
            h: 'Los costos, incluidos en cada ejecuci\u00f3n',
            p: 'Un d\u00f3lar de comisi\u00f3n por contrato, m\u00e1s deslizamiento en cada entrada y salida: 0.35% de la prima en mercados tranquilos, hasta 2% cuando el VIX supera 35. Los costos se modelan en funci\u00f3n del VIX y por tanto son mayores justo cuando los spreads realmente se ampl\u00edan.',
        },
        {
            h: 'El validador',
            p: 'La regla QQQ LEAPS no se ajust\u00f3 sobre esta ventana para luego reportarla sobre ella. Ejecutamos validaci\u00f3n cruzada combinatoria sobre 21 subventanas recombinadas del mismo per\u00edodo: QQQ LEAPS super\u00f3 al motor sin filtro en retorno y Sharpe en 18 de 21 trayectorias. La infraestructura de ejecuci\u00f3n en vivo importa esta misma configuraci\u00f3n y estas mismas reglas.',
        },
    ],
    gatesTitle: 'Cu\u00e1ndo el modelo se niega a operar',
    gatesIntro:
        'Vender calls en el mercado equivocado es c\u00f3mo mueren las estrategias de covered call. El motor omite la capa de ingresos siempre que se dispare alguna de estas condiciones:',
    gatesRows: [
        'Tendencia fuerte: el r\u00e9gimen es alcista fuerte y el ADX marca 16 o m\u00e1s. Omitido 788 veces.',
        'Prima escasa: la volatilidad impl\u00edcita est\u00e1 por debajo de 0.7 veces la volatilidad realizada. Estar\u00edas vendiendo seguros por menos del costo hist\u00f3rico de los siniestros. Omitido 149 veces.',
        'Tendencia fuerte con prima escasa (la regla QQQ LEAPS): ADX por encima de 25 mientras la volatilidad impl\u00edcita est\u00e1 por debajo de la realizada. Omitido 95 veces.',
    ],
    gatesCounts: 'Total: 1,032 d\u00edas en que el modelo evalu\u00f3 la capa de ingresos y la rechaz\u00f3. Decir que no es la mayor parte del trabajo.',
    limitsTitle: 'Lo que este registro no puede decirte',
    limitsIntro:
        'Preferimos perder una venta ante un esc\u00e9ptico informado que ganarla de un creyente enga\u00f1ado. Estas son las limitaciones, dichas con la misma confianza que los resultados:',
    limits: [
        {
            h: 'Black-Scholes no es un mercado',
            p: 'Los precios reales de las opciones cargan sesgo, estructura temporal y microestructura que una f\u00f3rmula no tiene. Nuestro escalado de VI desde el VIX captura razonablemente bien el nivel de volatilidad, pero cada ejecuci\u00f3n puede desviarse de lo que tu br\u00f3ker habr\u00eda cotizado, en cualquier direcci\u00f3n. Esta es la mayor limitaci\u00f3n de este registro.',
        },
        {
            h: 'El deslizamiento es modelado, no medido',
            p: 'La tabla de deslizamiento escalada por VIX es una estimaci\u00f3n. Las ejecuciones reales en br\u00f3kers reales diferir\u00e1n, especialmente en las rotaciones de varias patas. Elegimos valores conservadores, pero conservador no es lo mismo que correcto.',
        },
        {
            h: 'La granularidad horaria esconde los quince minutos malos',
            p: 'Las decisiones ocurren sobre barras horarias en una ventana diaria. Los precios se movieron dentro de esas horas de formas que el backtest nunca ve. Los picos intrad\u00eda pueden ser mejores o peores de lo que implica la barra.',
        },
        {
            h: 'Un solo mercado alcista fuerte',
            p: 'Cinco a\u00f1os y medio, mayormente al alza, incluyendo el mercado bajista de 2022. La ventana contiene una correcci\u00f3n profunda de QQQ, no tres. Una estrategia que brilla aqu\u00ed puede flaquear en una d\u00e9cada lateral.',
        },
        {
            h: 'Supervivencia del dise\u00f1o',
            p: 'Probamos variantes antes de quedarnos con QQQ LEAPS, y est\u00e1s leyendo sobre la que funcion\u00f3. La validaci\u00f3n cruzada de arriba mitiga esto; no lo elimina. Trata el n\u00famero como evidencia, no como destino.',
        },
    ],
    limitsClose:
        'Si quieres ver c\u00f3mo luce esta estrategia valorada por el mercado real de opciones en lugar de una f\u00f3rmula, nuestra simulaci\u00f3n de 15 meses con cotizaciones reales mostr\u00f3 un drawdown m\u00e1ximo de -30.4% en su ventana. Tambi\u00e9n publicamos ese n\u00famero.',
    auditTitle: 'Rev\u00edsanos como revisar\u00edas a cualquiera',
    auditIntro:
        'Estas son las se\u00f1ales de alerta que los auditores buscan en un backtest, aplicadas a este registro antes de que tengas que preguntar:',
    auditCols: ['La se\u00f1al de alerta', 'Este registro', 'Veredicto'],
    auditRows: [
        { check: 'Un Sharpe por encima de 3 suele significar sobreajuste', result: '1.48', verdict: 'Pasa', verdictKind: 'pass' },
        { check: 'Una tasa de aciertos sobre 90% suele significar ajuste a la curva', result: '85.2% en calls cortas, 90.9% en 11 entradas LEAPS', verdict: 'Pasa, vigila la muestra peque\u00f1a de LEAPS', verdictKind: 'pass' },
        { check: 'Cero meses perdedores significa que los datos est\u00e1n mal', result: '17 meses perdedores de 67, incluido un a\u00f1o de -9.5% en 2022', verdict: 'Pasa', verdictKind: 'pass' },
        { check: 'Un drawdown que nunca supera 10% es cosm\u00e9tico', result: '-17.8% de pico a valle en 7 semanas a finales de 2023', verdict: 'Pasa', verdictKind: 'pass' },
        { check: 'Los retornos inmunes a los par\u00e1metros son reales; los equilibrados sobre un solo ajuste, no', result: 'Un umbral de entrada en 0.43 en vez de 0.45 a\u00f1ade una sola operaci\u00f3n y mueve el CAGR de 35.3% a 36.3%', verdict: 'Revelado, no escondido', verdictKind: 'warn' },
    ],
    auditNote:
        'La \u00faltima fila es la que merece reflexi\u00f3n. Dos ajustes adyacentes de una misma regla difieren en 1.1 puntos de CAGR por una sola entrada de 2026. Publicamos ambos n\u00fameros y la entrada del libro mayor de esa operaci\u00f3n. Juzga en consecuencia.',
    illusTitle: 'Lo que esto significar\u00eda para una cuenta de retiro de $10,000*',
    illusLead: 'No hay afirmaciones nuevas en este cuadro. Es el mismo CAGR del backtest de la tabla de arriba, capitalizado hacia adelante para que la aritm\u00e9tica sea visible.',
    illusRows: [
        { y: 'A\u00f1o 0', v: '$10,000' },
        { y: 'A\u00f1o 5', v: '~$46,600' },
        { y: 'A\u00f1o 10', v: '~$216,900' },
        { y: 'A\u00f1o 15', v: '~$1,007,126' },
    ],
    illusVolLabel: 'El camino no fue suave',
    illusVol: 'El mismo registro incluye 2022 con -9.5% y un 2025 casi plano con +5.1%. Capitalizar a esta tasa es un promedio a trav\u00e9s de esos a\u00f1os, no una l\u00ednea recta.',
    illusIraLabel: 'Qu\u00e9 cuentas pueden usarlo',
    illusIra: 'Comprar calls de largo plazo y vender calls cubiertas contra ellos est\u00e1 permitido en la mayor\u00eda de las IRA y Roth IRA, sujeto a la aprobaci\u00f3n del br\u00f3ker. Los planes 401(k) de empleador est\u00e1ndar generalmente no permiten opciones.',
    illusFine: '*Ilustraci\u00f3n hipot\u00e9tica basada en resultados de backtest, no una proyecci\u00f3n ni una promesa. La tasa usada es 36% anual, el CAGR del backtest redondeado hacia abajo. El rendimiento de backtest tiene muchas limitaciones inherentes y no es necesariamente indicativo de resultados futuros. Una tasa del 36% sostenida 15 a\u00f1os superar\u00eda casi todos los registros p\u00fablicos verificados de largo plazo. Se muestra solo como ilustraci\u00f3n aritm\u00e9tica.',
    homeLink: '\u00bfNuevo aqu\u00ed? Empieza con la historia de dos minutos en la p\u00e1gina principal \u2192',
    backHomeBtn: '\u2190 Volver a la p\u00e1gina principal',
    ctaLedger: 'Explora las 806 operaciones en el libro mayor \u2192',
    kitTitle: 'El kit de pruebas',
    kitIntro: 'Descarga todo. Revisa nuestra aritm\u00e9tica en una hoja de c\u00e1lculo, o vuelve a ejecutar el motor completo t\u00fa mismo:',
    kitCards: [
        { title: 'Libro mayor de operaciones', desc: 'Cada una de las 806 ejecuciones: fecha, strike, vencimiento, precio, VI, delta, deslizamiento, comisi\u00f3n, P&L y la regla que la activ\u00f3.', href: '/verify/trademind-v4-ledger.csv' },
        { title: 'Curva de capital diaria', desc: '1,410 marcas diarias del valor neto de la cuenta con precio spot y etiqueta de r\u00e9gimen, de enero de 2021 a agosto de 2026.', href: '/verify/trademind-v4-equity-curve.csv' },
        { title: 'Configuraci\u00f3n de la ejecuci\u00f3n', desc: 'Cada par\u00e1metro con el que corri\u00f3 el motor, en un archivo que puedes comparar con tu propia ejecuci\u00f3n.', href: '/verify/trademind-v4-config.json' },
        { title: 'Resumen de m\u00e9tricas', desc: 'Los n\u00fameros principales exactamente como los calcul\u00f3 el motor, antes de que marketing redondeara nada.', href: '/verify/trademind-v4-metrics.json' },
        { title: 'Ejecuta el motor t\u00fa mismo', desc: 'El harness completo en GitHub. Cl\u00f3nalo, ejec\u00fatalo, obt\u00e9n estos n\u00fameros, luego cambia los supuestos y obt\u00e9n los tuyos.', href: 'https://github.com/taocodao/trademind-v4-harness' },
    ],
    repoTitle: 'Reproduce este registro en tres comandos',
    repoSteps: [
        'git clone https://github.com/taocodao/trademind-v4-harness && cd trademind-v4-harness',
        'pip install -r requirements.txt',
        'python run.py, luego compara tu directorio output/ con los archivos de arriba',
    ],
    repoNote:
        'Una pieza permanece privada: el modelo de confianza detr\u00e1s de la regla de entrada. El repositorio incluye su salida walk-forward precomputada como datos, as\u00ed que cada operaci\u00f3n del libro mayor se reproduce exactamente, mientras los internos del modelo siguen siendo nuestros. Todo lo dem\u00e1s, el clasificador de r\u00e9gimen, la valoraci\u00f3n, las reglas, las salidas, los costos, est\u00e1 ah\u00ed para que lo leas, lo ejecutes y lo rompas.',
    lineageTitle: 'Linaje de codigo y datos',
    lineageIntro: 'El codigo y los datos exactos detras de cada cifra de esta pagina, fijados para que puedas comprobar que no movimos los postes.',
    lineageLabels: {
        commit: 'Commit del harness',
        tag: 'Etiqueta de version',
        data: 'Datos de entrada',
        sums: 'Sumas de verificacion (SHA-256)',
    },
    lineageNote: 'Si alguno de los archivos descargados produce un hash distinto al listado aqui, asume que fue alterado y avisanos. Las mismas sumas estan publicadas en el repositorio abierto.',
};

const ZH: VerifyCopy = {
    heroEyebrow: '\u900f\u660e\u5ea6',
    heroTitle: '\u522b\u542c\u6211\u4eec\u7684\u4e00\u9762\u4e4b\u8bcd\uff0c\u4eb2\u81ea\u5ba1\u8ba1\u3002',
    heroSub:
        '\u4e3b\u9875\u5f15\u7528\u7684 QQQ LEAPS \u4e1a\u7ee9\u8bb0\u5f55\u80cc\u540e\u7684\u4e00\u5207\uff1a\u7cbe\u786e\u7684\u65b9\u6cd5\u3001\u6bcf\u4e00\u7b14\u4ea4\u6613\u3001\u6bcf\u4e00\u4e2a\u5047\u8bbe\u3001\u6bcf\u4e00\u4e2a\u5c40\u9650\u6027\u3002\u6211\u4eec\u516c\u5f00\u7edd\u5927\u591a\u6570\u56de\u6d4b\u9690\u85cf\u7684\u4e1c\u897f\uff0c\u56e0\u4e3a\u4e00\u4e2a\u4f60\u65e0\u6cd5\u6838\u67e5\u7684\u6570\u5b57\uff0c\u5c31\u662f\u4e00\u4e2a\u4f60\u4e0d\u8be5\u76f8\u4fe1\u7684\u6570\u5b57\u3002',
    recordTitle: '\u5b8c\u6574\u7684\u4e1a\u7ee9\u8bb0\u5f55',
    recordCols: ['\u603b\u56de\u62a5', 'CAGR', 'Sharpe', '\u6700\u5927\u56de\u64a4', 'Calmar', '\u6700\u7ec8\u4ef7\u503c'],
    recordRows: [
        { name: 'QQQ LEAPS\uff08\u56de\u6d4b\uff09', total: '+464.2%', cagr: '36.3%', sharpe: '1.48', maxdd: '-17.8%', calmar: '2.04', final: '$169,249' },
        { name: 'QQQ \u4e70\u5165\u6301\u6709', total: '+136.4%', cagr: '16.6%', sharpe: '0.80', maxdd: '-35.6%', calmar: '0.47', final: '$70,927' },
    ],
    recordNote:
        '2021\u5e741\u67084\u65e5\u81f32026\u5e748\u670814\u65e5\uff0c\u8fde\u7eed5.6\u5e74\uff0c\u521d\u59cb\u8d44\u91d1 $30,000\u3002\u6700\u6df1\u56de\u64a4\u533a\u95f4\uff1a2023\u5e749\u67085\u65e5\u81f310\u670826\u65e5\u3002QQQ \u4e70\u5165\u6301\u6709\u4f7f\u7528\u76f8\u540c\u65e5\u671f\u548c\u76f8\u540c\u6570\u636e\u6e90\u6d4b\u91cf\u3002',
    metricDrillTitle: '\u6bcf\u4e2a\u6838\u5fc3\u6570\u5b57\u7684\u5ba1\u8ba1\u8ffd\u8e2a',
    drillLabels: { formula: '\u516c\u5f0f', inputs: '\u8f93\u5165', check: '\u6838\u9a8c' },
    metricDrills: [
        {
            key: 'total',
            name: '\u603b\u56de\u62a5\uff1a+464.2%',
            formula: '(\u6700\u7ec8 NAV - \u521d\u59cb NAV) / \u521d\u59cb NAV = (169,249 - 30,000) / 30,000 = 4.6416\u3002',
            inputs: '\u57fa\u4e8e trademind-v4-equity-curve.csv \u4e2d 1,410 \u4e2a\u65e5\u5ea6 NAV \u8bb0\u5f55\u8ba1\u7b97\uff0c\u5305\u542b\u6bcf\u7b14\u6210\u4ea4\u7684\u671f\u6743\u6a21\u578b\u4f30\u503c\u3001\u6ed1\u70b9\u4e0e\u4f63\u91d1\u3002',
            check: '\u590d\u73b0\u65b9\u6cd5\uff1a\u5bf9\u516c\u5f00\u8d26\u672c\u7684 P&L \u5217\u6c42\u548c\uff0c\u52a0\u4e0a\u5269\u4f59\u671f\u6743\u4f30\u503c\uff0c\u518d\u9664\u4ee5 30,000\u3002\u5f00\u6e90\u4ee3\u7801\u4e2d\u7684 run.py \u4f1a\u8f93\u51fa\u76f8\u540c\u7ed3\u679c\u3002',
        },
        {
            key: 'cagr',
            name: 'CAGR\uff1a36.3%',
            formula: '(\u6700\u7ec8 NAV / \u521d\u59cb NAV) ^ (365.25 / \u5929\u6570) - 1\uff0c\u7a97\u53e3\u4e3a 2021-01-04 \u81f3 2026-08-14\uff0c\u5171 2,049 \u4e2a\u65e5\u5386\u65e5\u3002',
            inputs: '\u4e0e\u603b\u56de\u62a5\u76f8\u540c\u7684 NAV \u5e8f\u5217\u3002\u7a97\u53e3\u56fa\u5b9a\uff0c\u5bf9\u6240\u6709\u8bbf\u95ee\u8005\u5b8c\u5168\u4e00\u81f4\u3002',
            check: '\u590d\u73b0\u65b9\u6cd5\uff1a(169,249 / 30,000) ^ (365.25 / 2049) - 1 = 0.363\u3002\u5f00\u6e90\u4ee3\u7801\u4e2d\u7684 run.py \u4f1a\u8f93\u51fa\u8be5\u503c\u3002',
        },
        {
            key: 'sharpe',
            name: '\u590f\u666e\u6bd4\u7387\uff1a1.475',
            formula: '\u65e5\u5ea6\u8d85\u989d\u6536\u76ca\uff08\u76f8\u5bf9 10 \u5e74\u671f\u56fd\u503a\u4ee3\u7406\uff09\u7684\u5747\u503c\u9664\u4ee5\u5176\u6807\u51c6\u5dee\uff0c\u518d\u4e58\u4ee5 sqrt(252) \u5e74\u5316\u3002',
            inputs: '\u65e5\u5ea6\u6536\u76ca\u6765\u81ea\u51c0\u503c\u66f2\u7ebf\uff1b\u65e0\u98ce\u9669\u4ee3\u7406\u4e3a\u914d\u7f6e\u6587\u4ef6\u4e2d\u5217\u51fa\u7684 ^IRX \u5e8f\u5217\u3002',
            check: '\u590d\u73b0\u65b9\u6cd5\uff1a\u4ed3\u5e93\u4e2d\u7684 metrics_v4_canonical.json \u4ee5\u76f8\u540c\u8f93\u5165\u5f97\u51fa\u76f8\u540c\u6570\u503c\u3002',
        },
        {
            key: 'maxdd',
            name: '\u6700\u5927\u56de\u64a4\uff1a-17.8%',
            formula: '\u65e5\u5ea6 NAV \u5e8f\u5217\u7684\u6700\u5927\u5cf0\u8c37\u8dcc\u5e45\uff1a\u5bf9\u6bcf\u4e2a t \u8ba1\u7b97 NAV(t) / \u5386\u53f2\u6700\u9ad8 NAV - 1\uff0c\u53d6\u6700\u5c0f\u503c\u3002',
            inputs: '\u6a21\u578b\u5b9a\u4ef7\u7684\u65e5\u5ea6\u51c0\u503c\u66f2\u7ebf\u3002\u771f\u5b9e\u62a5\u4ef7\u9a8c\u8bc1\u7a97\u53e3\uff0815 \u4e2a\u6708\uff09\u6d4b\u5f97 -30.4%\uff0c\u5dee\u5f02\u5df2\u5728\u672c\u8868\u683c\u65c1\u8bf4\u660e\u3002',
            check: '\u590d\u73b0\u65b9\u6cd5\uff1a\u5bf9 trademind-v4-equity-curve.csv \u4e2d\u7684 nav \u6c42\u7d2f\u8ba1\u6700\u5927\u503c\uff0c\u518d\u53d6\u6700\u5c0f\u56de\u64a4\u3002run.py \u4f1a\u8f93\u51fa\u8be5\u503c\u3002',
        },
        {
            key: 'calmar',
            name: 'Calmar \u6bd4\u7387\uff1a2.04',
            formula: 'CAGR \u9664\u4ee5\u6700\u5927\u56de\u64a4\u7edd\u5bf9\u503c\uff1a0.363 / 0.178 = 2.04\u3002',
            inputs: '\u7531\u4e0a\u8ff0\u4e24\u4e2a\u6570\u503c\u6d3e\u751f\uff0c\u65e0\u989d\u5916\u6570\u636e\u3002',
            check: '\u590d\u73b0\u65b9\u6cd5\uff1a\u6309\u4e0a\u5f0f\u76f4\u63a5\u76f8\u9664\u3002',
        },
    ],
    ledgerLinkTitle: '\u6bcf\u4e00\u7b14\u4ea4\u6613\uff0c\u90fd\u5728\u56fe\u4e0a\uff0c\u90fd\u5728\u8d26\u91cc',
    ledgerLinkDesc: '\u6253\u5f00\u4ea4\u4e92\u5f0f\u8d26\u672c\uff1a806 \u7b14\u6210\u4ea4\u6807\u6ce8\u5728 QQQ \u56fe\u4e0a\uff0c\u6bcf\u7b14\u53ef\u5c55\u5f00\u67e5\u770b\u5b9a\u4ef7\u8f93\u5165\u3001\u6210\u672c\u4e0e\u5165\u573a\u6805\u95e8\u72b6\u6001\u3002',
    calendarTitle: '\u6309\u65e5\u5386\u5e74\u5ea6\u7684\u56de\u62a5',
    calendar: [
        { y: '2021', r: '+76.0%' },
        { y: '2022', r: '-9.5%' },
        { y: '2023', r: '+66.1%' },
        { y: '2024', r: '+44.2%' },
        { y: '2025', r: '+5.1%' },
        { y: '2026', r: '+48.3%' },
    ],
    calendarNote: '2026 \u4e3a\u90e8\u5206\u5e74\u5ea6\uff08\u622a\u81f38\u670814\u65e5\uff09\u30022022 \u5e74\u4e3a\u4e8f\u635f\u5e74\u5ea6\uff1b2025 \u5e74\u51e0\u4e4e\u6301\u5e73\u3002\u8fd9\u4efd\u8bb0\u5f55\u5e76\u4e0d\u5e73\u6ed1\uff0c\u4e0a\u8868\u4e5f\u4e0d\u662f\u597d\u5e74\u4efd\u7684\u5e73\u5747\u503c\u3002',
    disclaimers: [
        '\u5047\u8bbe\u6027\u4e1a\u7ee9\u8868\u73b0\u5b58\u5728\u8bb8\u591a\u56fa\u6709\u5c40\u9650\u6027\uff0c\u90e8\u5206\u5982\u4e0b\u6240\u8ff0\u3002\u6211\u4eec\u4e0d\u4f5c\u51fa\u4efb\u4f55\u58f0\u660e\uff0c\u8868\u793a\u4efb\u4f55\u8d26\u6237\u5c06\u4f1a\u6216\u53ef\u80fd\u83b7\u5f97\u4e0e\u6240\u793a\u7c7b\u4f3c\u7684\u76c8\u4e8f\u3002\u4e8b\u5b9e\u4e0a\uff0c\u5047\u8bbe\u6027\u4e1a\u7ee9\u4e0e\u4efb\u4f55\u7279\u5b9a\u4ea4\u6613\u7a0b\u5e8f\u968f\u540e\u5b9e\u9645\u5b9e\u73b0\u7684\u7ed3\u679c\u4e4b\u95f4\u7ecf\u5e38\u5b58\u5728\u663e\u8457\u5dee\u5f02\u3002',
        '\u5047\u8bbe\u6027\u4e1a\u7ee9\u7684\u5c40\u9650\u4e4b\u4e00\u5728\u4e8e\u5176\u901a\u5e38\u662f\u4e8b\u540e\u7f16\u5236\u7684\u3002\u6b64\u5916\uff0c\u5047\u8bbe\u6027\u4ea4\u6613\u4e0d\u6d89\u53ca\u8d22\u52a1\u98ce\u9669\uff0c\u4efb\u4f55\u5047\u8bbe\u6027\u4ea4\u6613\u8bb0\u5f55\u90fd\u65e0\u6cd5\u5b8c\u5168\u4f53\u73b0\u5b9e\u9645\u4ea4\u6613\u4e2d\u8d22\u52a1\u98ce\u9669\u7684\u5f71\u54cd\u3002\u4f8b\u5982\uff0c\u627f\u53d7\u4e8f\u635f\u7684\u80fd\u529b\uff0c\u6216\u5728\u4e8f\u635f\u65f6\u4ecd\u575a\u6301\u6267\u884c\u4ea4\u6613\u7a0b\u5e8f\u7684\u80fd\u529b\uff0c\u90fd\u662f\u53ef\u80fd\u5bf9\u5b9e\u9645\u4ea4\u6613\u7ed3\u679c\u4ea7\u751f\u4e0d\u5229\u5f71\u54cd\u7684\u91cd\u8981\u56e0\u7d20\u3002\u8fd8\u6709\u8bb8\u591a\u4e0e\u5e02\u573a\u6574\u4f53\u6216\u4e0e\u4efb\u4f55\u7279\u5b9a\u4ea4\u6613\u7a0b\u5e8f\u5b9e\u65bd\u76f8\u5173\u7684\u5176\u4ed6\u56e0\u7d20\uff0c\u5728\u7f16\u5236\u5047\u8bbe\u6027\u4e1a\u7ee9\u65f6\u65e0\u6cd5\u88ab\u5b8c\u5168\u8003\u8651\uff0c\u8fd9\u4e9b\u56e0\u7d20\u90fd\u53ef\u80fd\u5bf9\u5b9e\u9645\u4ea4\u6613\u7ed3\u679c\u4ea7\u751f\u4e0d\u5229\u5f71\u54cd\u3002',
        '\u8fc7\u5f80\u4e1a\u7ee9\u4e0d\u4e00\u5b9a\u9884\u793a\u672a\u6765\u7ed3\u679c\u3002\u8fd9\u662f\u56de\u6d4b\uff1a\u6ca1\u6709\u4efb\u4f55\u771f\u5b9e\u8d26\u6237\u4ea7\u751f\u8fc7\u8fd9\u4e9b\u7ed3\u679c\u3002\u4e0b\u4e00\u6b21\u56de\u64a4\u53ef\u80fd\u6bd4 -17.8% \u66f4\u6df1\u3002TradeMind \u53d1\u5e03\u4fe1\u53f7\u4f9b\u60a8\u5ba1\u9605\u5e76\u5728\u60a8\u81ea\u5df1\u7684\u5238\u5546\u5904\u4e0b\u5355\uff1b\u6211\u4eec\u4ece\u4e0d\u8fde\u63a5\u60a8\u7684\u5238\u5546\u8d26\u6237\uff0c\u4e5f\u4ece\u4e0d\u5411\u5176\u63d0\u4ea4\u8ba2\u5355\u3002',
    ],
    methodTitle: '\u7cbe\u786e\u7684\u65b9\u6cd5\uff0c\u9010\u6b65\u8bf4\u660e',
    methodIntro:
        '\u6ca1\u6709\u9ed1\u7bb1\u3002\u5982\u679c\u4e0b\u9762\u67d0\u4e2a\u6b65\u9aa4\u8bf4\u5f97\u6a21\u7cca\uff0c\u90a3\u662f\u8fd9\u4e2a\u9875\u9762\u7684\u95ee\u9898\uff0c\u4e0d\u662f\u6a21\u578b\u7684\u79d8\u5bc6\u3002\u544a\u8bc9\u6211\u4eec\uff0c\u6211\u4eec\u4f1a\u4fee\u590d\u3002',
    methodSteps: [
        {
            h: '\u6570\u636e',
            p: 'QQQ \u5c0f\u65f6\u7ea7\u548c\u65e5\u7ea7 K \u7ebf\u3001\u65e5\u7ea7 VIX\u3001VIX3M\uff0c\u4ee5\u53ca13\u5468\u56fd\u5e93\u5238\u5229\u7387\u4f5c\u4e3a\u65e0\u98ce\u9669\u5229\u7387\uff0c\u65f6\u95f4\u8de8\u5ea6\u4e3a2021\u5e741\u6708\u81f32026\u5e748\u6708\u3002\u5f15\u64ce\u6bcf\u5c0f\u65f6\u8bc4\u4f30\u4e00\u6b21\uff0c\u6bcf\u4e2a\u4ea4\u6613\u65e5\u4ec5\u5728\u7f8e\u4e1c\u65f6\u95f4\u4e0b\u53483:00 \u7684\u5355\u4e00\u7a97\u53e3\u5185\u884c\u52a8\u3002\u6743\u76ca\u66f2\u7ebf\u6309\u6bcf\u65e5\u6536\u76d8\u4ef7\u8ba1\u4ef7\u3002',
        },
        {
            h: '\u6838\u5fc3\u4ed3\u4f4d',
            p: '\u5f53\u5165\u573a\u6761\u4ef6\u9f50\u5907\u65f6\uff0c\u5f15\u64ce\u4e70\u5165\u6df1\u5ea6\u5b9e\u503c\u7684 QQQ LEAPS \u770b\u6da8\u671f\u6743\uff1a\u6839\u636e\u5e02\u573a\u72b6\u6001\uff0cdelta \u7ea6 0.80 \u81f3 0.85\uff0c\u5230\u671f\u65f6\u95f4 12 \u81f3 24 \u4e2a\u6708\u3002\u4ed3\u4f4d\u4e0a\u9650\u4e3a\u8d26\u6237\u4ef7\u503c\u7684\u4e09\u5206\u4e4b\u4e00\uff0c\u6700\u591a 3 \u4e2a\u5f00\u653e\u4ed3\u4f4d\u30015 \u5f20\u5408\u7ea6\uff0c\u5e76\u4fdd\u7559 5% \u73b0\u91d1\u50a8\u5907\u3002LEAPS \u662f\u5f15\u64ce\uff0c\u5176\u4ed6\u4e00\u5207\u90fd\u662f\u914d\u5957\u8bbe\u65bd\u3002',
        },
        {
            h: '\u6536\u76ca\u589e\u5f3a\u5c42',
            p: '\u9488\u5bf9\u6bcf\u4e2a LEAPS\uff0c\u5f15\u64ce\u5356\u51fa 32 \u5929\u5230\u671f\u3001delta \u7ea6 0.15 \u81f3 0.28 \u7684\u770b\u6da8\u671f\u6743\u4ee5\u6536\u53d6\u6743\u5229\u91d1\u3002\u5728 10% \u81f3 20% \u5904\u6b62\u76c8\uff0c\u4e8f\u635f\u8fbe\u5230\u6240\u6536\u6743\u5229\u91d1\u4e24\u500d\u65f6\u6b62\u635f\uff0c\u5e76\u5728\u5230\u671f\u524d 21 \u5929\u6216 delta \u8fbe 0.40 \u65f6\u5c1a\u4ed3\u6216\u5e73\u4ed3\u3002\u672c\u7a97\u53e3\u5185\uff1a\u5171\u5356\u51fa 392 \u5f20\u7a7a\u5934\u770b\u6da8\u671f\u6743\uff0c85.2% \u76c8\u5229\u3002',
        },
        {
            h: '\u5b9a\u4ef7\u6a21\u578b\uff0c\u76f4\u8a00\u4e0d\u8bef',
            p: '\u672c\u6b21\u56de\u6d4b\u4e2d\u6ca1\u6709\u4f7f\u7528\u4efb\u4f55\u5386\u53f2\u671f\u6743\u62a5\u4ef7\u6570\u636e\u3002\u6bcf\u4e2a\u671f\u6743\u90fd\u7528 Black-Scholes \u6a21\u578b\u5b9a\u4ef7\uff1a\u6ce2\u52a8\u7387\u8f93\u5165\u4e3a VIX \u4e58\u4ee5\u72b6\u6001\u76f8\u5173\u7684\u7cfb\u6570\uff0c\u65e0\u98ce\u9669\u5229\u7387\u4e3a13\u5468\u56fd\u5e93\u5238\u5229\u7387\u3002\u6240\u6709\u6210\u4ea4\u4ef7\u548c\u6bcf\u65e5\u8ba1\u4ef7\u90fd\u662f\u7406\u8bba\u503c\uff0c\u4e0d\u662f\u5e02\u573a\u5b9e\u9645\u62a5\u4ef7\u3002\u8fd9\u5728\u5b9e\u8df5\u4e2d\u610f\u5473\u7740\u4ec0\u4e48\uff0c\u8bf7\u770b\u4e0b\u4e00\u8282\u3002',
        },
        {
            h: '\u6210\u672c\uff0c\u8ba1\u5165\u6bcf\u4e00\u7b14\u6210\u4ea4',
            p: '\u6bcf\u5f20\u5408\u7ea6 1 \u7f8e\u5143\u4f63\u91d1\uff0c\u52a0\u4e0a\u6bcf\u7b14\u8fdb\u51fa\u573a\u7684\u6ed1\u70b9\uff1a\u5e73\u9759\u5e02\u573a\u4e3a\u671f\u6743\u6743\u5229\u91d1\u7684 0.35%\uff0c\u5f53 VIX \u8d85\u8fc7 35 \u65f6\u5347\u81f3 2%\u3002\u6210\u672c\u4ee5 VIX \u4e3a\u51fd\u6570\u5efa\u6a21\uff0c\u56e0\u6b64\u6b63\u597d\u5728\u4e70\u5356\u4ef7\u5dee\u5b9e\u9645\u6269\u5927\u65f6\u6700\u9ad8\u3002',
        },
        {
            h: '\u9a8c\u8bc1\u5668',
            p: 'QQQ LEAPS \u89c4\u5219\u5e76\u975e\u5148\u5728\u8fd9\u4e2a\u7a97\u53e3\u4e0a\u8c03\u4f18\u3001\u518d\u5728\u540c\u4e00\u7a97\u53e3\u4e0a\u62a5\u544a\u3002\u6211\u4eec\u5bf9\u540c\u4e00\u65f6\u671f\u7684 21 \u6761\u91cd\u7ec4\u5b50\u7a97\u53e3\u505a\u4e86\u7ec4\u5408\u4ea4\u53c9\u9a8c\u8bc1\uff1a\u5728 21 \u6761\u8def\u5f84\u4e2d\u7684 18 \u6761\u4e0a\uff0cQQQ LEAPS \u7684\u56de\u62a5\u548c Sharpe \u5747\u4f18\u4e8e\u65e0\u8fc7\u6ee4\u7684\u5f15\u64ce\u3002\u5b9e\u76d8\u6267\u884c\u7cfb\u7edf\u5bfc\u5165\u7684\u6b63\u662f\u8fd9\u4efd\u914d\u7f6e\u548c\u8fd9\u4e9b\u89c4\u5219\u3002',
        },
    ],
    gatesTitle: '\u6a21\u578b\u4ec0\u4e48\u65f6\u5019\u62d2\u7edd\u4ea4\u6613',
    gatesIntro:
        '\u5728\u9519\u8bef\u7684\u884c\u60c5\u91cc\u5356\u671f\u6743\uff0c\u6b63\u662f\u8986\u76d6\u5356\u7b56\u7565\u5931\u8d25\u7684\u539f\u56e0\u3002\u53ea\u8981\u89e6\u53d1\u4ee5\u4e0b\u4efb\u4e00\u6761\u4ef6\uff0c\u5f15\u64ce\u5c31\u4f1a\u8df3\u8fc7\u6536\u76ca\u589e\u5f3a\u5c42\uff1a',
    gatesRows: [
        '\u5f3a\u8d8b\u52bf\uff1a\u72b6\u6001\u4e3a\u5f3a\u725b\u4e14 ADX \u8bfb\u6570\u4e3a 16 \u6216\u66f4\u9ad8\u3002\u8df3\u8fc7 788 \u6b21\u3002',
        '\u6743\u5229\u91d1\u8fc7\u8584\uff1a\u9690\u542b\u6ce2\u52a8\u7387\u4f4e\u4e8e\u5b9e\u73b0\u6ce2\u52a8\u7387\u7684 0.7 \u500d\u3002\u8fd9\u76f8\u5f53\u4e8e\u4ee5\u4f4e\u4e8e\u5386\u53f2\u8d54\u4ed8\u6210\u672c\u7684\u4ef7\u683c\u5356\u4fdd\u9669\u3002\u8df3\u8fc7 149 \u6b21\u3002',
        '\u5f3a\u8d8b\u52bf\u52a0\u6743\u5229\u91d1\u8fc7\u8584\uff08QQQ LEAPS \u89c4\u5219\uff09\uff1aADX \u8d85\u8fc7 25 \u4e14\u9690\u542b\u6ce2\u52a8\u7387\u4f4e\u4e8e\u5b9e\u73b0\u6ce2\u52a8\u7387\u3002\u8df3\u8fc7 95 \u6b21\u3002',
    ],
    gatesCounts: '\u5408\u8ba1\uff1a\u6a21\u578b\u5728 1,032 \u4e2a\u4ea4\u6613\u65e5\u8bc4\u4f30\u4e86\u6536\u76ca\u589e\u5f3a\u5c42\u5e76\u62d2\u7edd\u4e86\u5b83\u3002\u5b66\u4f1a\u8bf4\u4e0d\uff0c\u624d\u662f\u8fd9\u4efd\u5de5\u4f5c\u7684\u4e3b\u4f53\u3002',
    limitsTitle: '\u8fd9\u4efd\u8bb0\u5f55\u65e0\u6cd5\u544a\u8bc9\u4f60\u7684\u4e8b',
    limitsIntro:
        '\u6211\u4eec\u5b81\u613f\u628a\u751f\u610f\u8f93\u7ed9\u4e00\u4f4d\u77e5\u60c5\u7684\u6000\u7591\u8005\uff0c\u4e5f\u4e0d\u613f\u4ece\u4e00\u4f4d\u88ab\u8bef\u5bfc\u7684\u76f8\u4fe1\u8005\u90a3\u91cc\u8d62\u5f97\u751f\u610f\u3002\u4ee5\u4e0b\u662f\u5c40\u9650\u6027\uff0c\u4e0e\u7ed3\u679c\u540c\u6837\u5766\u7387\u5730\u5448\u73b0\uff1a',
    limits: [
        {
            h: 'Black-Scholes \u4e0d\u662f\u5e02\u573a',
            p: '\u771f\u5b9e\u671f\u6743\u4ef7\u683c\u5e26\u6709\u504f\u5ea6\u3001\u671f\u9650\u7ed3\u6784\u548c\u5fae\u89c2\u7ed3\u6784\uff0c\u8fd9\u4e9b\u662f\u516c\u5f0f\u6240\u6ca1\u6709\u7684\u3002\u6211\u4eec\u7528 VIX \u7f29\u653e\u9690\u542b\u6ce2\u52a8\u7387\u7684\u505a\u6cd5\u80fd\u8f83\u597d\u5730\u6293\u4f4f\u6ce2\u52a8\u7387\u6c34\u5e73\uff0c\u4f46\u4e2a\u522b\u6210\u4ea4\u4ef7\u53ef\u80fd\u4e0e\u5238\u5546\u5b9e\u9645\u62a5\u4ef7\u5b58\u5728\u504f\u5dee\uff0c\u65b9\u5411\u4e0d\u5b9a\u3002\u8fd9\u662f\u8fd9\u4efd\u8bb0\u5f55\u6700\u5927\u7684\u5c40\u9650\u6027\u3002',
        },
        {
            h: '\u6ed1\u70b9\u662f\u4f30\u8ba1\u7684\uff0c\u4e0d\u662f\u5b9e\u6d4b\u7684',
            p: '\u6309 VIX \u7f29\u653e\u7684\u6ed1\u70b9\u8868\u662f\u4e00\u4e2a\u4f30\u8ba1\u503c\u3002\u771f\u5b9e\u5238\u5546\u7684\u771f\u5b9e\u6210\u4ea4\u4f1a\u6709\u6240\u4e0d\u540c\uff0c\u5c24\u5176\u662f\u591a\u817f\u5c1a\u4ed3\u3002\u6211\u4eec\u9009\u62e9\u4e86\u4fdd\u5b88\u7684\u53c2\u6570\uff0c\u4f46\u4fdd\u5b88\u4e0d\u7b49\u4e8e\u51c6\u786e\u3002',
        },
        {
            h: '\u5c0f\u65f6\u7ea7\u7cbe\u5ea6\u770b\u4e0d\u5230\u90a3\u6700\u5dee\u7684\u5341\u4e94\u5206\u949f',
            p: '\u51b3\u7b56\u53d1\u751f\u5728\u5c0f\u65f6 K \u7ebf\u4e0a\u7684\u5355\u4e00\u65e5\u5185\u7a97\u53e3\u3002\u4ef7\u683c\u5728\u8fd9\u4e9b\u5c0f\u65f6\u5185\u90e8\u7684\u6ce2\u52a8\uff0c\u56de\u6d4b\u770b\u4e0d\u5230\u3002\u76d8\u4e2d\u5c16\u5cf0\u53ef\u80fd\u6bd4 K \u7ebf\u6240\u793a\u66f4\u597d\u6216\u66f4\u5dee\u3002',
        },
        {
            h: '\u53ea\u7ecf\u5386\u8fc7\u4e00\u8f6e\u5f3a\u725b\u5e02',
            p: '\u4e94\u5e74\u534a\uff0c\u5927\u90e8\u5206\u65f6\u95f4\u4e0a\u6da8\uff0c\u5176\u4e2d\u5305\u62ec2022\u5e74\u718a\u5e02\u3002\u8fd9\u4e2a\u7a97\u53e3\u53ea\u5305\u542b\u4e00\u6b21 QQQ \u6df1\u5ea6\u56de\u8c03\uff0c\u4e0d\u662f\u4e09\u6b21\u3002\u5728\u8fd9\u91cc\u8868\u73b0\u4f18\u5f02\u7684\u7b56\u7565\uff0c\u53ef\u80fd\u5728\u5341\u5e74\u7684\u9707\u8361\u5e02\u4e2d\u8868\u73b0\u5e73\u5e73\u3002',
        },
        {
            h: '\u8bbe\u8ba1\u5e78\u5b58\u8005\u504f\u5dee',
            p: '\u5728\u5b9a\u5c40 QQQ LEAPS \u4e4b\u524d\uff0c\u6211\u4eec\u8bd5\u8fc7\u591a\u4e2a\u53d8\u4f53\uff0c\u800c\u4f60\u73b0\u5728\u8bfb\u5230\u7684\u662f\u884c\u5f97\u901a\u7684\u90a3\u4e00\u4e2a\u3002\u4e0a\u9762\u7684\u4ea4\u53c9\u9a8c\u8bc1\u51cf\u8f7b\u4e86\u8fd9\u4e2a\u95ee\u9898\uff0c\u4f46\u6ca1\u6709\u6d88\u9664\u5b83\u3002\u8bf7\u628a\u8fd9\u4e2a\u6570\u5b57\u5f53\u4f5c\u8bc1\u636e\uff0c\u800c\u4e0d\u662f\u547d\u8fd0\u3002',
        },
    ],
    limitsClose:
        '\u5982\u679c\u4f60\u60f3\u770b\u770b\u8fd9\u4e2a\u7b56\u7565\u7528\u771f\u5b9e\u671f\u6743\u5e02\u573a\u62a5\u4ef7\u800c\u4e0d\u662f\u516c\u5f0f\u5b9a\u4ef7\u65f6\u7684\u6837\u5b50\uff1a\u6211\u4eec\u57fa\u4e8e\u771f\u5b9e\u62a5\u4ef7\u768415\u4e2a\u6708\u6a21\u62df\u663e\u793a\uff0c\u5176\u7a97\u53e3\u5185\u6700\u5927\u56de\u64a4\u4e3a -30.4%\u3002\u8fd9\u4e2a\u6570\u5b57\u6211\u4eec\u4e5f\u516c\u5f00\u3002',
    auditTitle: '\u8bf7\u7528\u5ba1\u67e5\u4efb\u4f55\u4eba\u7684\u6807\u51c6\u6765\u5ba1\u67e5\u6211\u4eec',
    auditIntro:
        '\u4ee5\u4e0b\u662f\u5ba1\u8ba1\u5e08\u5728\u56de\u6d4b\u4e2d\u5bfb\u627e\u7684\u8b66\u793a\u4fe1\u53f7\uff0c\u6211\u4eec\u5148\u4e8e\u4f60\u63d0\u95ee\uff0c\u5c06\u5176\u5e94\u7528\u4e8e\u8fd9\u4efd\u8bb0\u5f55\uff1a',
    auditCols: ['\u8b66\u793a\u4fe1\u53f7', '\u672c\u8bb0\u5f55', '\u7ed3\u8bba'],
    auditRows: [
        { check: 'Sharpe \u8d85\u8fc7 3 \u901a\u5e38\u610f\u5473\u7740\u8fc7\u62df\u5408', result: '1.48', verdict: '\u901a\u8fc7', verdictKind: 'pass' },
        { check: '\u80dc\u7387\u8d85\u8fc7 90% \u901a\u5e38\u610f\u5473\u7740\u66f2\u7ebf\u62df\u5408', result: '\u7a7a\u5934\u770b\u6da8 85.2%\uff0c11 \u7b14 LEAPS \u8fdb\u573a 90.9%', verdict: '\u901a\u8fc7\uff0c\u4f46\u6ce8\u610f LEAPS \u6837\u672c\u91cf\u5c0f', verdictKind: 'pass' },
        { check: '\u96f6\u4e8f\u635f\u6708\u4efd\u610f\u5473\u7740\u6570\u636e\u6709\u95ee\u9898', result: '67 \u4e2a\u6708\u4e2d\u6709 17 \u4e2a\u4e8f\u635f\u6708\uff0c\u5305\u62ec2022\u5e74\u5168\u5e74 -9.5%', verdict: '\u901a\u8fc7', verdictKind: 'pass' },
        { check: '\u4ece\u4e0d\u8d85\u8fc7 10% \u7684\u56de\u64a4\u53ea\u662f\u7c89\u9970', result: '2023\u5e74\u672b 7 \u5468\u5185\u4ece\u9ad8\u70b9\u5230\u4f4e\u70b9 -17.8%', verdict: '\u901a\u8fc7', verdictKind: 'pass' },
        { check: '\u5bf9\u53c2\u6570\u514d\u75ab\u7684\u56de\u62a5\u624d\u771f\u5b9e\uff1b\u60ac\u4e8e\u5355\u4e00\u8bbe\u5b9a\u4e0a\u7684\u56de\u62a5\u4e0d\u53ef\u9760', result: '\u4ec5\u5c06\u4e00\u4e2a\u8fdb\u573a\u9608\u503c\u4ece 0.43 \u6539\u4e3a 0.45\uff0c\u5c31\u51cf\u5c11\u4e00\u7b14\u4ea4\u6613\uff0cCAGR \u4ece 36.3% \u53d8\u4e3a 35.3%', verdict: '\u5df2\u62ab\u9732\uff0c\u672a\u9690\u85cf', verdictKind: 'warn' },
    ],
    auditNote:
        '\u6700\u540e\u4e00\u884c\u503c\u5f97\u7ec6\u60f3\u3002\u540c\u4e00\u4e2a\u9608\u503c\u7684\u4e24\u4e2a\u76f8\u90bb\u8bbe\u5b9a\uff0c\u4ec5\u56e02026\u5e74\u7684\u4e00\u7b14\u8fdb\u573a\u5c31\u76f8\u5dee 1.1 \u4e2a\u767e\u5206\u70b9\u7684 CAGR\u3002\u6211\u4eec\u540c\u65f6\u516c\u5e03\u4e24\u4e2a\u6570\u5b57\uff0c\u4ee5\u53ca\u8be5\u7b14\u4ea4\u6613\u7684\u8d26\u672c\u8bb0\u5f55\u3002\u8bf7\u636e\u6b64\u5224\u65ad\u3002',
    illusTitle: '\u5bf9\u4e8e\u4e00\u4e2a 1 \u4e07\u7f8e\u5143\u7684\u9000\u4f11\u8d26\u6237,\u8fd9\u610f\u5473\u7740\u4ec0\u4e48*',
    illusLead: '\u8fd9\u4e2a\u6846\u91cc\u6ca1\u6709\u65b0\u7684\u8bba\u65ad\u3002\u5b83\u53ea\u662f\u628a\u4e0a\u65b9\u8868\u683c\u4e2d\u540c\u4e00\u4e2a\u56de\u6d4b CAGR \u5411\u524d\u590d\u5229,\u8ba9\u7b97\u672f\u6e05\u6670\u53ef\u89c1\u3002',
    illusRows: [
        { y: '\u7b2c 0 \u5e74', v: '$10,000' },
        { y: '\u7b2c 5 \u5e74', v: '~$46,600' },
        { y: '\u7b2c 10 \u5e74', v: '~$216,900' },
        { y: '\u7b2c 15 \u5e74', v: '~$1,007,126' },
    ],
    illusVolLabel: '\u8fc7\u7a0b\u5e76\u4e0d\u5e73\u5766',
    illusVol: '\u540c\u4e00\u4efd\u8bb0\u5f55\u4e2d,2022 \u5e74\u4e3a -9.5%,2025 \u5e74\u51e0\u4e4e\u6301\u5e73,\u4e3a +5.1%\u3002\u4ee5\u8be5\u6536\u76ca\u7387\u590d\u5229,\u662f\u8fd9\u4e9b\u5e74\u4efd\u7684\u5e73\u5747\u7ed3\u679c,\u800c\u4e0d\u662f\u4e00\u6761\u76f4\u7ebf\u3002',
    illusIraLabel: '\u54ea\u4e9b\u8d26\u6237\u53ef\u4ee5\u4f7f\u7528',
    illusIra: '\u5728\u5927\u591a\u6570 IRA \u548c Roth IRA \u4e2d,\u4e70\u5165\u957f\u671f\u770b\u6da8\u671f\u6743\u5e76\u5907\u5151\u5356\u51fa\u770b\u6da8\u671f\u6743\u662f\u5141\u8bb8\u7684,\u5177\u4f53\u4ee5\u5238\u5546\u6279\u51c6\u4e3a\u51c6\u3002\u6807\u51c6\u7684\u96c7\u4e3b 401(k) \u8ba1\u5212\u4e00\u822c\u4e0d\u652f\u6301\u671f\u6743\u4ea4\u6613\u3002',
    illusFine: '*\u57fa\u4e8e\u56de\u6d4b\u7ed3\u679c\u7684\u5047\u8bbe\u6027\u793a\u4f8b,\u5e76\u975e\u9884\u6d4b\u6216\u627f\u8bfa\u3002\u6240\u7528\u6536\u76ca\u7387\u4e3a\u6bcf\u5e74 36%,\u5373\u56de\u6d4b CAGR \u5411\u4e0b\u53d6\u6574\u3002\u56de\u6d4b\u8868\u73b0\u5b58\u5728\u8bf8\u591a\u56fa\u6709\u5c40\u9650,\u5e76\u4e0d\u9884\u793a\u672a\u6765\u7ed3\u679c\u300236% \u7684\u6536\u76ca\u7387\u6301\u7eed 15 \u5e74,\u5c06\u8d85\u8fc7\u51e0\u4e4e\u6240\u6709\u7ecf\u6838\u5b9e\u7684\u957f\u671f\u516c\u5f00\u4e1a\u7ee9\u8bb0\u5f55\u3002\u6b64\u5904\u4ec5\u4f5c\u7b97\u672f\u793a\u4f8b\u3002',
    homeLink: '\u7b2c\u4e00\u6b21\u6765?\u5148\u53bb\u9996\u9875\u770b\u4e24\u5206\u949f\u7684\u6545\u4e8b \u2192',
    backHomeBtn: '\u2190 \u8fd4\u56de\u9996\u9875',
    ctaLedger: '\u6d4f\u89c8\u8d26\u672c\u4e2d\u5168\u90e8 806 \u7b14\u4ea4\u6613 \u2192',
    kitTitle: '\u9a8c\u8bc1\u5de5\u5177\u5305',
    kitIntro: '\u5168\u90e8\u4e0b\u8f7d\u3002\u5728\u7535\u5b50\u8868\u683c\u91cc\u6838\u5bf9\u6211\u4eec\u7684\u7b97\u672f\uff0c\u6216\u8005\u4eb2\u81ea\u91cd\u65b0\u8fd0\u884c\u6574\u4e2a\u5f15\u64ce\uff1a',
    kitCards: [
        { title: '\u5b8c\u6574\u4ea4\u6613\u8d26\u672c', desc: '\u5168\u90e8 806 \u7b14\u6210\u4ea4\uff1a\u65f6\u95f4\u6233\u3001\u884c\u6743\u4ef7\u3001\u5230\u671f\u65e5\u3001\u4ef7\u683c\u3001\u9690\u542b\u6ce2\u52a8\u7387\u3001delta\u3001\u6ed1\u70b9\u3001\u4f63\u91d1\u3001\u76c8\u4e8f\uff0c\u4ee5\u53ca\u89e6\u53d1\u5b83\u7684\u89c4\u5219\u3002', href: '/verify/trademind-v4-ledger.csv' },
        { title: '\u6bcf\u65e5\u6743\u76ca\u66f2\u7ebf', desc: '2021\u5e741\u6708\u81f32026\u5e748\u6708\uff0c\u5171 1,410 \u4e2a\u6bcf\u65e5\u8d26\u6237\u51c0\u503c\u8ba1\u4ef7\u70b9\uff0c\u9644\u5e26\u73b0\u8d27\u4ef7\u683c\u548c\u72b6\u6001\u6807\u7b7e\u3002', href: '/verify/trademind-v4-equity-curve.csv' },
        { title: '\u8fd0\u884c\u914d\u7f6e', desc: '\u5f15\u64ce\u8fd0\u884c\u65f6\u7684\u5168\u90e8\u53c2\u6570\uff0c\u96c6\u4e2d\u5728\u4e00\u4e2a\u6587\u4ef6\u91cc\uff0c\u53ef\u4e0e\u4f60\u81ea\u5df1\u7684\u8fd0\u884c\u7ed3\u679c\u9010\u9879\u5bf9\u6bd4\u3002', href: '/verify/trademind-v4-config.json' },
        { title: '\u6307\u6807\u6458\u8981', desc: '\u5f15\u64ce\u8ba1\u7b97\u51fa\u7684\u539f\u59cb\u6838\u5fc3\u6570\u5b57\uff0c\u672a\u7ecf\u4efb\u4f55\u8425\u9500\u4fee\u9970\u3002', href: '/verify/trademind-v4-metrics.json' },
        { title: '\u4eb2\u81ea\u8fd0\u884c\u5f15\u64ce', desc: 'GitHub \u4e0a\u7684\u5b8c\u6574\u6d4b\u8bd5\u6846\u67b6\u3002\u514b\u9686\u3001\u8fd0\u884c\u3001\u5f97\u5230\u8fd9\u4e9b\u6570\u5b57\uff0c\u7136\u540e\u4fee\u6539\u5047\u8bbe\uff0c\u5f97\u5230\u4f60\u81ea\u5df1\u7684\u7ed3\u679c\u3002', href: 'https://github.com/taocodao/trademind-v4-harness' },
    ],
    repoTitle: '\u4e09\u6761\u547d\u4ee4\u590d\u73b0\u8fd9\u4efd\u8bb0\u5f55',
    repoSteps: [
        'git clone https://github.com/taocodao/trademind-v4-harness && cd trademind-v4-harness',
        'pip install -r requirements.txt',
        'python run.py\uff0c\u7136\u540e\u5c06\u4f60\u7684 output/ \u76ee\u5f55\u4e0e\u4e0a\u8ff0\u6587\u4ef6\u5bf9\u6bd4',
    ],
    repoNote:
        '\u53ea\u6709\u4e00\u4e2a\u90e8\u4ef6\u4fdd\u6301\u79c1\u6709\uff1a\u8fdb\u573a\u89c4\u5219\u80cc\u540e\u7684\u7f6e\u4fe1\u5ea6\u6a21\u578b\u3002\u4ed3\u5e93\u4ee5\u6570\u636e\u5f62\u5f0f\u9644\u5e26\u5176\u9884\u8ba1\u7b97\u7684 walk-forward \u8f93\u51fa\uff0c\u56e0\u6b64\u8d26\u672c\u4e2d\u7684\u6bcf\u4e00\u7b14\u4ea4\u6613\u4ecd\u53ef\u7cbe\u786e\u590d\u73b0\uff0c\u800c\u6a21\u578b\u5185\u90e8\u7ec6\u8282\u4ecd\u5c5e\u4e8e\u6211\u4eec\u3002\u5176\u4f59\u4e00\u5207\uff0c\u72b6\u6001\u5206\u7c7b\u5668\u3001\u5b9a\u4ef7\u3001\u89c4\u5219\u3001\u51fa\u573a\u3001\u6210\u672c\uff0c\u90fd\u6446\u5728\u90a3\u91cc\uff0c\u4f9b\u4f60\u9605\u8bfb\u3001\u8fd0\u884c\u548c\u6311\u5254\u3002',
    lineageTitle: '\u4ee3\u7801\u4e0e\u6570\u636e\u6e90\u6e05',
    lineageIntro: '\u672c\u9875\u6bcf\u4e2a\u6570\u5b57\u80cc\u540e\u7684\u786e\u5207\u4ee3\u7801\u4e0e\u6570\u636e\uff0c\u5df2\u56fa\u5b9a\u7248\u672c\u4ee5\u4f9b\u6838\u5bf9\uff0c\u786e\u4fdd\u6211\u4eec\u6ca1\u6709\u4e8b\u540e\u52a8\u8fc7\u624b\u811a\u3002',
    lineageLabels: {
        commit: '\u5f15\u64ce\u4ee3\u7801\u63d0\u4ea4',
        tag: '\u7248\u672c\u6807\u7b7e',
        data: '\u8f93\u5165\u6570\u636e',
        sums: '\u6587\u4ef6\u6821\u9a8c\u548c\uff08SHA-256\uff09',
    },
    lineageNote: '\u5982\u679c\u4efb\u4f55\u4e0b\u8f7d\u6587\u4ef6\u7684\u6821\u9a8c\u548c\u4e0e\u6b64\u5904\u4e0d\u4e00\u81f4\uff0c\u8bf7\u89c6\u4e3a\u6587\u4ef6\u88ab\u7be1\u6539\u5e76\u544a\u77e5\u6211\u4eec\u3002\u76f8\u540c\u6821\u9a8c\u548c\u540c\u65f6\u63d0\u4ea4\u81f3\u5f00\u6e90\u4ed3\u5e93\u3002',
};

export const VERIFY_COPY: Record<VerifyLang, VerifyCopy> = { en: EN, es: ES, zh: ZH };
