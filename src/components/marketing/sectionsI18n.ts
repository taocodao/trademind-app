/* ─────────────────────────────────────────────────────────────────────────────
   sectionsI18n — EN/ES/ZH copy for the static homepage sections that wrap the
   narrated deck: the co-pilot hero, "The Model, Not the Hype", and
   "Patience Is the Strategy". Language follows the global react-i18next
   language, same source the deck uses.

   Copy discipline: no em dashes (U+2014), no en dashes (U+2013), and no
   double hyphens. See the build guard in scripts/check-dashes.mjs.
   ─────────────────────────────────────────────────────────────────────────── */

export type SectionLang = 'en' | 'es' | 'zh';

export interface SectionsCopy {
    hero: {
        slogan: string;
        eyebrow: string;
        h1a: string; h1b: string;
        sub: string;
        plans: string;
        ctaPrimary: string; ctaSecondary: string; ctaLedger: string; ledgerLink: string; simTag: string; simLink: string;
        cards: { numeral: string; numSegs: ({ v: number; dec?: number } | { t: string })[]; label: string; body: string; link?: string }[];
        stats: { big: string; label: string; clarifier: string }[];
        play: string; calcCta: string; micro: string;
        hint: string; hintSilent: string;
    };
    model: {
        kicker: string; title: string;
        cards: { t: string; p: string }[];
    };
    patience: {
        kicker: string; title: string; p1: string; p2: string; cap: string;
        // Below the enlarged timeline: a single line that reconciles the three
        // date windows a numerate visitor sees on the same page.
        window: string;
        // Legend and annotation strings for the enlarged timeline.
        legendEntry: string;
        legendWait: string;
        yAxis: string;
        xAxis: string;
        longest: string;
    };
    // "Institutional-style discipline" band, compact form inside the hero
    // flow. Prestige framing without the "hedge fund" phrase (which is a
    // legal-marketing trap for a public page), and without the "24/7"
    // language (US equities and options do not trade around the clock; a
    // careful reader will catch it).
    discipline: {
        kicker: string; title: string; p: string; close: string;
    };
    // "The record, in full" backtest table. The caption is load-bearing:
    // it is the substantiation that makes showing the table defensible, and
    // the Max DD column must keep equal visual weight with CAGR.
    record: {
        kicker: string; title: string;
        cols: { total: string; cagr: string; sharpe: string; maxdd: string; calmar: string };
        tips: { total: string; cagr: string; sharpe: string; maxdd: string; calmar: string };
        v4Name: string; qqqName: string;
        v4: { total: string; cagr: string; sharpe: string; maxdd: string; calmar: string };
        qqq: { total: string; cagr: string; sharpe: string; maxdd: string; calmar: string };
        footnote: string; callout: string; verifyIntro: string; verifyLink: string; caption: string;
    };
    // QQQ Basic out-of-sample record block, shown under the QQQ LEAPS table.
    basicRecord: {
        simIntro: string; simLink: string;
        kicker: string; title: string; p: string; tipTotal: string;
        cols: { total: string; cagr: string; sharpe: string; maxdd: string; calmar: string };
        basicName: string; qqqName: string;
        basic: { total: string; cagr: string; sharpe: string; maxdd: string; calmar: string };
        qqq: { total: string; cagr: string; sharpe: string; maxdd: string; calmar: string };
        footnote: string; callout: string; verifyIntro: string; verifyLink: string; caption: string;
    };
    // "Built around your life" band. Explicitly disclaims income promises
    // while delivering the freedom framing the owner asked for.
    life: {
        kicker: string; title: string; p: string; close: string;
    };
    retire: {
        kicker: string; title: string; p: string; mech: string; defensive: string; ctaVerify: string; ctaLedger: string;
    };
    rateCalc: {
        kicker: string; title: string; sub: string;
        lblAmount: string; lblRate: string; lblYears: string;
        chipDefensive: string; chipLeaps: string;
        outLabel: string; disc: string; ctaVerify: string;
    };
}

const EN_SECTIONS: SectionsCopy = {
    hero: {
        slogan: 'TradeMind helps you reach your financial milestones',
        eyebrow: 'The money is already yours',
        h1a: 'Your account is on autopilot',
        h1b: 'It is time for a co-pilot to fly it higher',
        sub: 'For decades the simple answer has beaten the expert one: about 9 in 10 professionally managed US large-cap funds trailed the S&P 500 over 15 years (S&P SPIVA, year-end 2025). QQQ holds the Nasdaq-100, the heart of high tech. Our QQQ LEAPS strategy owns a long-dated QQQ call option, which multiplies QQQ\'s moves, and sells covered calls against it to earn premium during temporary pullbacks. In a two year simulation it returned more than 4 times what QQQ buy and hold did, with a largest drop more than one third shallower. Covered calls also cap some upside, and a simulation is not live trading. TradeMind never touches your account: you place every order yourself.',
        plans: 'Prefer no options? QQQ Defensive holds only ETFs, needs no options permission, and is built to keep the worst fall shallow.',
        ctaLedger: 'Browse every trade \u2192',
        ctaPrimary: 'Begin the story',
        ctaSecondary: 'Read the record',
        ledgerLink: 'Open the ledger \u2192',
        simTag: 'Simulation',
        simLink: 'QQQ LEAPS, simulated over the past 2 years: +229.48% vs +49.46% for QQQ buy and hold.|Largest drop -14.6% vs -22.9%. Not live trading. \u2192',
        cards: [
            {
                numeral: '55.1%',
                numSegs: [{ v: 55.1, dec: 1 }, { t: '%' }],
                label: 'Backtested annual return, Jan 2021 to Aug 2026',
                body: 'At that rate, $10,000 compounds to roughly $1M in 10.5 years. Priced with a math model, not live quotes: a 15-month real-quote test drew down -30.4% versus the model\'s -14.5%. No rate is guaranteed to persist. See how the outcome shifts when the rate does \u2192',
                link: 'calculator',
            },
            {
                numeral: '2 legs',
                numSegs: [{ v: 2 }, { t: ' legs' }],
                label: 'Own the long side, rent out the short side',
                body: 'Buy a long-term QQQ call option, 12 to 24 months out, as your core position. Then sell 32-day calls against it to collect premium. QQQ is one basket of 100 companies: no single-stock blowups, tight pricing, easy exits.',
            },
            {
                numeral: '1 of 7',
                numSegs: [{ v: 1 }, { t: ' of ' }, { v: 7 }],
                label: 'Gates a trade must clear; one is a confidence score',
                body: 'The confidence model is trained on past windows, never the one it\'s judging. It doesn\'t predict where QQQ goes: it scores whether today resembles conditions where this setup worked before. It can veto a trade. It can\'t start one.',
            },
            {
                numeral: '18 of 21',
                numSegs: [{ v: 18 }, { t: ' of ' }, { v: 21 }],
                label: 'Cross-validation paths where the strategy held up',
                body: 'Tested across 21 recombined sub-windows, so the result isn\'t one lucky path. Risk limits: one third of account per position, three positions max, 5% cash reserve, losers cut at twice the credit received.',
            },
        ],
        stats: [
            {
                big: 'Every session',
                label: 'Watched on a fixed schedule',
                clarifier: 'Hourly evaluation, one signal window each trading day, logged whether it acts or not. You see the days nothing happened too.',
            },
            {
                big: 'Zero',
                label: 'Emotional inputs in the decision',
                clarifier: 'The model has no P&L anxiety and no need to be right. It cannot revenge-trade a loss or hold a loser hoping it comes back.',
            },
            {
                big: '5',
                label: 'Conditions that must agree before any trade',
                clarifier: 'Momentum, trend, volatility, regime, and a model confidence score. If one disagrees, nothing happens.',
            },
        ],
        play: '▶ Begin the story',
        calcCta: 'See how the co-pilot would have flown your balance →',
        micro: 'This is a long term commitment, measured in years and not weeks. We think it is worth the patience.',
        hint: 'A track record, read aloud. 11 slides, audio synced, about 8 minutes, with a full transcript on the last slide.',
        hintSilent: 'No sound? Same 11 slides, same numbers, as an 8 minute read instead.',
    },
    model: {
        kicker: 'The model, not the hype',
        title: 'Every signal has a reason. Every reason is logged.',
        cards: [
            {
                t: 'Five gates, one agreement',
                p: 'Five independent conditions must all agree: momentum, trend, volatility, regime, and a machine learning confidence score. Not one signal. Five, in agreement.',
            },
            {
                t: 'A confidence score, not a hunch',
                p: 'The model is trained on years of historical market data and outputs a confidence score, not a guess. You see the exact number next to every trade in the ledger, like the 0.89 ML confidence on the September 2 entry.',
            },
            {
                t: 'The losses are in the ledger too',
                p: 'The overlay chapter admits where selling premium gave back its gains. The drawdown chapter shows the worst drop in full: a 30.4 percent decline that took six weeks to bottom in the 15 month tape verified window, and a milder 14.5 percent low in the 5 year model backtest. Both are in the ledger. Showing you when the model was wrong is the only way you can trust it when it is right.',
            },
        ],
    },
    patience: {
        kicker: 'Patience is the strategy',
        title: 'Most of the return happens while nothing happens.',
        p1: 'A co-pilot does not grab the controls every time there is turbulence. It waits for the moment the instruments agree, then acts decisively.',
        p2: 'In five and a half years the model found eleven entries worth taking, about two a year. It has sat in cash for weeks at a stretch, with zero setups clearing the gates. That is not a malfunction. That is the discipline.',
        cap: 'Eleven entries in five and a half years. Every one of them is in the ledger below.',
        window: 'This chart covers the 2021 to 2026 model backtest window, 1,570 fills across LEAPS entries, short calls, and weekly SMH put spreads. The 55.1 percent in the calculator below is the model-priced backtest over the same window.',
        legendEntry: 'Entry taken',
        legendWait: 'Waiting in cash, no setup cleared the gates',
        yAxis: 'Holding length (months)',
        xAxis: 'Entry dates, 2021 to 2026',
        longest: 'Longest stretch in cash: 22 months',
    },
    discipline: {
        kicker: 'Institutional-style discipline, without the institution',
        title: 'The edge is not prediction. It is doing the same thing on the worst day as on the best one.',
        p: 'Position size is capped by rule. The cash reserve scales with volatility. Exposure steps down automatically after losses. None of that depends on anyone\'s discipline holding up on a bad morning. The limits are in the code, and the code does not have a bad morning.',
        close: 'Eleven entries in five and a half years. Most weeks, the honest answer is that nothing needs doing.',
    },
    record: {
        kicker: 'The record, in full',
        title: 'Five and a half years, measured against simply holding QQQ',
        cols: { total: 'Total return', cagr: 'CAGR', sharpe: 'Sharpe', maxdd: 'Max DD', calmar: 'Calmar' },
        tips: {
            total: 'Cumulative growth across the entire 5.6-year window, before any taxes. It is the most flattering way to state a result, which is why it sits next to four risk measures rather than alone.',
            cagr: 'Compound annual growth rate: the single yearly rate that would produce the same end result over the whole period. It smooths a bumpy path into one number, which is exactly why the drawdown column matters too.',
            sharpe: 'Return per unit of volatility. Higher means the same return arrived with a smoother ride. Below 1.0 is generally considered modest; above 1.0 is considered strong. It says nothing about the size of the worst single loss.',
            maxdd: 'Maximum drawdown: the deepest peak-to-trough fall, measured at the worst possible entry point. This is the number that decides whether a strategy is survivable in practice, because it is the moment most people quit.',
            calmar: 'Annual return divided by maximum drawdown. It asks a blunt question: how much return did you earn for each unit of the worst pain? Higher is better, and it punishes strategies that produce good averages through deep holes.',
        },
        v4Name: 'QQQ LEAPS (backtest)',
        qqqName: 'QQQ buy & hold',
        v4: { total: '+1,070.7%', cagr: '55.1%', sharpe: '1.83', maxdd: '-14.5%', calmar: '3.79' },
        qqq: { total: '+136.4%', cagr: '16.6%', sharpe: '0.79', maxdd: '-35.6%', calmar: '0.47' },
        footnote: 'Worst drawdown period: TradeMind, Oct 2023. QQQ buy & hold, Nov 2021 through Dec 2022.',
        callout: 'Our deepest hole took two months to dig. Buy-and-hold\'s took fourteen.',
        verifyIntro: 'Every trade, every price, every assumption behind this table is published: the full ledger, the daily equity curve, and the complete methodology with its limitations, in the open.',
        verifyLink: 'Audit the record yourself →',
        caption: '2021 to 2026 continuous window, 5.6 years, model-priced. Hypothetical backtested performance: not achieved by any actual account, not live trading, and not a prediction. The next drawdown could be deeper. Every entry, exit, and loss in this record is in the ledger below.',
    },
    basicRecord: {
        simIntro: 'Live trading began on Oct 14, 2026. To show how the same strategies would have behaved before that, a separate page runs the prior two years as a simulation, with every trade and position listed. It is hypothetical, not real trading, and kept apart from the live record.',
        simLink: 'Open the two-year simulation \u2192',
        kicker: 'QQQ Defensive',
        title: 'The ETF plan: no options permission, a shallower worst fall',
        p: 'QQQ Defensive holds only ETFs (QQQ, QLD, TQQQ and a cash-like fund, SGOV), so it works in any brokerage account and needs no options trading permission. It is built to keep the worst fall shallow, which makes it a steadier place to start for newer subscribers who are comfortable giving up some upside in strong years.',
        tipTotal: 'Cumulative growth across the 5.2-year window, before any taxes. It is the most flattering way to state a result, which is why it sits next to four risk measures rather than alone.',
        cols: { total: 'Total return', cagr: 'CAGR', sharpe: 'Sharpe', maxdd: 'Max DD', calmar: 'Calmar' },
        basicName: 'QQQ Defensive (backtest)',
        qqqName: 'QQQ buy & hold',
        basic: { total: '+93.9%', cagr: '13.7%', sharpe: '1.05', maxdd: '-15.0%', calmar: '0.91' },
        qqq: { total: '+119.7%', cagr: '16.5%', sharpe: '0.79', maxdd: '-36.8%', calmar: '0.45' },
        footnote: 'Both rows cover the same dates, May 7, 2021 to June 30, 2026 (5.2 years). Worst drawdown period: QQQ Defensive, July 2024 to June 2025. QQQ buy & hold, November 2021 to October 2022.',
        callout: 'QQQ Defensive earned less than QQQ in this window, with a worst fall of less than half the size. It trailed in strong years such as 2023, 2024 and 2025, and lost 3.4% in 2022 when QQQ lost 33.0%.',
        verifyIntro: 'The method, year by year results, limitations and the downloadable data for this table are published, including the costs charged on every trade.',
        verifyLink: 'See the QQQ Defensive record in full →',
        caption: 'Out-of-sample walk-forward backtest on real hourly ETF prices, May 2021 to June 2026, default risk level, after modeled trading costs (no commission, bid-ask spread charged). Hypothetical backtested performance: not achieved by any actual account, not live trading, and not a prediction. Past performance is not necessarily indicative of future results. The next drawdown could be deeper than -15.0%.',
    },
    life: {
        kicker: 'Built around your life, not the other way around',
        title: 'Market exposure that does not become a second job.',
        p: 'You get one email when the model acts, with the order already sized and the reasoning attached. You place it at your own broker, in your own time, and go back to your life. No screens to watch, no positions to babysit, no reason to check your phone at ten on a Tuesday.',
        close: 'We are not promising an income. We are removing the need to sit in front of a screen to have a systematic strategy running.',
    },
    retire: {
        kicker: 'The money is already yours',
        title: 'On autopilot or chasing headlines. Neither is a process.',
        p: 'The gap is not savings. It is activation. That retirement balance is yours, it is growing, and it sits inside the one account type built for exactly this kind of patient, long-horizon strategy.',
        mech: 'Buying long-dated calls and selling covered calls against them are permitted in most IRAs and Roth IRAs, subject to your broker\'s approval. Standard employer 401(k) plans usually do not offer options at all. TradeMind works with the IRA you already have, or one you can open in a day.',
        defensive: 'No options permission in your IRA, or just starting out? QQQ Defensive trades only ETFs (QQQ, QLD, TQQQ and a cash-like fund), so it works in any brokerage account, including an IRA or Roth IRA, with no options approval.',
        ctaVerify: 'See the full audited record \u2192',
        ctaLedger: 'Browse every trade \u2192',
    },
    rateCalc: {
        kicker: 'Run the arithmetic yourself',
        title: 'What does a different rate do to the same $10,000?',
        sub: "Move the rate, or pick a strategy. Each button is that strategy's backtested, model-priced CAGR rounded down, and each covers a different window. The default is the QQQ LEAPS button.",
        chipDefensive: 'Defensive 13%',
        chipLeaps: 'LEAPS 55%',
        lblAmount: 'Starting amount',
        lblRate: 'Annual rate (%)',
        lblYears: 'Years',
        outLabel: 'Ending balance',
        ctaVerify: 'See the full audited record \u2192',
        disc: 'Compounding math for a rate you choose. QQQ LEAPS 55%: our backtested, model-priced result over one 5.6-year window (Jan 2021 to Aug 2026) that included a near-flat 2022 and a -14.5% drawdown in late 2023. QQQ Defensive 13%: our out-of-sample backtest on real hourly ETF prices (May 2021 to June 2026, 5.2 years, trading costs charged) with a -15.0% worst fall. Sustained 55% CAGR over 15 years would far exceed almost any verified long-horizon public track record. No rate is guaranteed to persist.',
    },
};

const ES_SECTIONS: SectionsCopy = {
    hero: {
        slogan: 'TradeMind te ayuda a alcanzar tus metas financieras',
        eyebrow: 'El dinero ya es tuyo',
        h1a: 'Tu cuenta va en piloto automático',
        h1b: 'Es hora de un copiloto que la vuele más alto',
        sub: 'Durante décadas la respuesta simple ha superado a la del experto: cerca de 9 de cada 10 fondos de gran capitalización de EE. UU. gestionados por profesionales quedaron por debajo del S&P 500 en 15 años (S&P SPIVA, cierre de 2025). QQQ contiene el Nasdaq-100, el corazón de la alta tecnología. Nuestra estrategia QQQ LEAPS mantiene una opción call de QQQ a largo plazo, que multiplica los movimientos de QQQ, y vende calls cubiertas contra ella para cobrar prima durante las caídas temporales. En una simulación de dos años rindió más de 4 veces lo que QQQ comprado y mantenido, con una caída máxima más de un tercio menos profunda. Las calls cubiertas también limitan parte del alza, y una simulación no es operación real. TradeMind nunca toca tu cuenta: tú colocas cada orden.',
        plans: '¿Prefieres no usar opciones? QQQ Defensive solo mantiene ETFs, no requiere permiso de opciones y está pensado para mantener la peor caída poco profunda.',
        ctaPrimary: 'Comienza la historia',
        ctaSecondary: 'Lee el expediente',
        ctaLedger: 'Explora cada operación \u2192',
        ledgerLink: 'Abre el libro mayor \u2192',
        simTag: 'Simulación',
        simLink: 'QQQ LEAPS, simulado en los últimos 2 años: +229,48% vs +49,46% de QQQ comprar y mantener.|Mayor caída -14,6% vs -22,9%. No es trading en vivo. \u2192',
        cards: [
            {
                numeral: '55.1%',
                numSegs: [{ v: 55.1, dec: 1 }, { t: '%' }],
                label: 'Retorno anual de backtest, enero 2021 a agosto 2026',
                body: 'A esa tasa, $10,000 se capitalizan en aproximadamente $1M en 10.5 años. Con precio de un modelo matemático, no cotizaciones reales: una prueba de 15 meses con precios reales bajó -30.4% frente al -14.5% del modelo. Ninguna tasa está garantizada a persistir. Mira cómo cambia el resultado cuando cambia la tasa \u2192',
                link: 'calculator',
            },
            {
                numeral: '2 tramos',
                numSegs: [{ v: 2 }, { t: ' tramos' }],
                label: 'Posesión la parte larga, alquiler la parte corta',
                body: 'Compra una opción call de QQQ a largo plazo, de 12 a 24 meses, como posición central. Luego vende calls de 32 días contra ella para cobrar prima. QQQ es una canasta de 100 empresas: sin riesgo de una sola acción, precios ajustados y salidas fáciles.',
            },
            {
                numeral: '1 de 7',
                numSegs: [{ v: 1 }, { t: ' de ' }, { v: 7 }],
                label: 'Puertas que un trade debe cruzar; una es un puntaje de confianza',
                body: 'El modelo de confianza se entrena en ventanas pasadas, nunca en la que está juzgando. No predice a dónde va QQQ: puntúa si hoy se parece a las condiciones donde este setup funcionó antes. Puede vetar un trade. No puede iniciarlo.',
            },
            {
                numeral: '18 de 21',
                numSegs: [{ v: 18 }, { t: ' de ' }, { v: 21 }],
                label: 'Rutas de validación cruzada donde la estrategia se mantuvo',
                body: 'Probado en 21 sub-ventanas recombinadas, así que el resultado no es un solo camino afortunado. Límites de riesgo: un tercio de la cuenta por posición, tres posiciones máximo, 5% de reserva en efectivo, perdedores cerrados al doble del crédito recibido.',
            },
        ],
        stats: [
            {
                big: 'Cada sesión',
                label: 'Vigilado en un horario fijo',
                clarifier: 'Evaluación por hora, una ventana de señal cada día de trading, registrada actúe o no. También ves los días en que no pasó nada.',
            },
            {
                big: 'Cero',
                label: 'Factores emocionales en la decisión',
                clarifier: 'El modelo no tiene ansiedad de P&L ni necesidad de tener razón. No puede vengarse de una pérdida ni aferrarse a una posición perdedora esperando que vuelva.',
            },
            {
                big: '5',
                label: 'Condiciones que deben coincidir antes de cualquier operación',
                clarifier: 'Momentum, tendencia, volatilidad, régimen y una puntuación de confianza del modelo. Si una discrepa, no pasa nada.',
            },
        ],
        play: '▶ Comenzar la historia',
        calcCta: 'Mira cómo el copiloto habría volado tu saldo →',
        micro: 'Este es un compromiso de largo plazo, medido en años y no en semanas. Creemos que la paciencia lo vale.',
        hint: 'Un historial, leído en voz alta. 11 diapositivas, sincronizado con audio, unos 8 minutos, con la transcripción completa en la última diapositiva.',
        hintSilent: '¿Sin sonido? Las mismas 11 diapositivas, los mismos números, como lectura de 8 minutos.',
    },
    model: {
        kicker: 'El modelo, no el humo',
        title: 'Cada señal tiene una razón. Cada razón queda registrada.',
        cards: [
            {
                t: 'Cinco filtros, un solo acuerdo',
                p: 'Cinco condiciones independientes deben coincidir: momentum, tendencia, volatilidad, régimen y una puntuación de confianza de machine learning. No una señal. Cinco, de acuerdo.',
            },
            {
                t: 'Una puntuación de confianza, no una corazonada',
                p: 'El modelo se entrena con años de datos históricos y emite una puntuación de confianza, no una suposición. Ves ese número exacto junto a cada operación del registro, como el 0,89 de confianza ML de la entrada del 2 de septiembre.',
            },
            {
                t: 'Las pérdidas también están en el registro',
                p: 'El capítulo del overlay admite dónde la venta de prima devolvió sus ganancias. El capítulo del drawdown muestra la peor caída por completo: una baja de 30,4 por ciento que tardó seis semanas en tocar fondo en la ventana de 15 meses verificada con la cinta, y una caída más suave de 14,5 por ciento en el backtest del modelo de 5 años. Ambas están en el registro. Mostrarte cuándo el modelo se equivocó es la única forma de que confíes cuando acierta.',
            },
        ],
    },
    patience: {
        kicker: 'La paciencia es la estrategia',
        title: 'La mayor parte del rendimiento ocurre mientras no pasa nada.',
        p1: 'Un copiloto no agarra los controles cada vez que hay turbulencia. Espera el momento en que los instrumentos coinciden, y entonces actúa con decisión.',
        p2: 'En cinco años y medio, el modelo encontró once entradas que valían la pena, unas dos al año. Ha pasado semanas enteras en efectivo, sin una sola entrada que cruzara los filtros. No es un mal funcionamiento. Es la disciplina.',
        cap: 'Once entradas en cinco años y medio. Cada una está en el registro de abajo.',
        window: 'Esta gráfica cubre la ventana de backtest del modelo de 2021 a 2026, 1,570 ejecuciones entre entradas LEAPS, calls cortas y put spreads semanales de SMH. El 55,1 por ciento de la calculadora de abajo es el backtest con precios de modelo sobre la misma ventana.',
        legendEntry: 'Entrada tomada',
        legendWait: 'Esperando en efectivo, ningún setup cruzó los filtros',
        yAxis: 'Duración de la posición (meses)',
        xAxis: 'Fechas de entrada, 2021 a 2026',
        longest: 'Racha más larga en efectivo: 22 meses',
    },
    discipline: {
        kicker: 'Disciplina de estilo institucional, sin la institución',
        title: 'La ventaja no es predecir. Es hacer lo mismo en el peor día que en el mejor.',
        p: 'El tamaño de la posición está topado por regla. La reserva de efectivo escala con la volatilidad. La exposición baja automáticamente después de pérdidas. Nada de eso depende de que la disciplina de alguien aguante una mala mañana. Los límites están en el código, y el código no tiene malas mañanas.',
        close: 'Once entradas en cinco años y medio. La mayoría de las semanas, la respuesta honesta es que no hay nada que hacer.',
    },
    record: {
        kicker: 'El historial, completo',
        title: 'Cinco años y medio, medidos contra simplemente mantener QQQ',
        cols: { total: 'Rendimiento total', cagr: 'CAGR', sharpe: 'Sharpe', maxdd: 'Max DD', calmar: 'Calmar' },
        tips: {
            total: 'Crecimiento acumulado durante toda la ventana de 5,6 años, antes de impuestos. Es la forma más favorecedora de presentar un resultado, y por eso aparece junto a cuatro medidas de riesgo en lugar de sola.',
            cagr: 'Tasa de crecimiento anual compuesta: la única tasa anual que produciría el mismo resultado final durante todo el período. Suaviza un camino irregular en un solo número, y exactamente por eso la columna de drawdown también importa.',
            sharpe: 'Rendimiento por unidad de volatilidad. Más alto significa que el mismo rendimiento llegó con un recorrido más suave. Por debajo de 1,0 se considera modesto; por encima de 1,0 se considera fuerte. No dice nada sobre el tamaño de la peor pérdida individual.',
            maxdd: 'Drawdown máximo: la caída más profunda de pico a valle, medida desde el peor punto de entrada posible. Es el número que decide si una estrategia es sobrevivible en la práctica, porque es el momento en que la mayoría abandona.',
            calmar: 'Rendimiento anual dividido por el drawdown máximo. Hace una pregunta directa: cuánto rendimiento ganaste por cada unidad del peor dolor. Más alto es mejor, y castiga las estrategias que logran buenos promedios a través de hoyos profundos.',
        },
        v4Name: 'QQQ LEAPS (backtest)',
        qqqName: 'QQQ buy & hold',
        v4: { total: '+1,070.7%', cagr: '55.1%', sharpe: '1.83', maxdd: '-14.5%', calmar: '3.79' },
        qqq: { total: '+136.4%', cagr: '16.6%', sharpe: '0.79', maxdd: '-35.6%', calmar: '0.47' },
        footnote: 'Peor período de drawdown: TradeMind, oct 2023. QQQ buy & hold, nov 2021 a dic 2022.',
        callout: 'Nuestro hoyo más profundo tardó dos meses en cavarse. El de buy and hold tardó catorce.',
        verifyIntro: 'Cada operación, cada precio y cada supuesto detrás de esta tabla está publicado: el libro mayor completo, la curva de capital diaria y la metodología completa con sus limitaciones, a la vista.',
        verifyLink: 'Audita el registro tú mismo →',
        caption: 'Ventana continua 2021 a 2026, 5,6 años, con precios de modelo. Rendimiento hipotético de backtest: no logrado por ninguna cuenta real, no es trading en vivo y no es una predicción. El próximo drawdown podría ser más profundo. Cada entrada, salida y pérdida de este historial está en el registro de abajo.',
    },
    basicRecord: {
        simIntro: 'El trading en vivo comenzó el 14 de octubre de 2026. Para mostrar cómo habrían actuado antes las mismas estrategias, una página aparte (en inglés) simula los dos años anteriores, con cada operación y posición. Es hipotética, no es trading real y está separada del registro en vivo.',
        simLink: 'Abrir la simulación de dos años \u2192',
        kicker: 'QQQ Defensive',
        title: 'El plan con ETFs: sin permiso de opciones y una peor caída menor',
        p: 'QQQ Defensive solo mantiene ETFs (QQQ, QLD, TQQQ y un fondo similar al efectivo, SGOV), por lo que funciona en cualquier cuenta de bróker y no requiere permiso para operar opciones. Está diseñado para mantener poco profunda la peor caída, lo que lo convierte en un punto de partida más estable para suscriptores nuevos que aceptan renunciar a parte del alza en los años fuertes.',
        tipTotal: 'Crecimiento acumulado durante la ventana de 5,2 años, antes de impuestos. Es la forma más favorecedora de presentar un resultado, y por eso aparece junto a cuatro medidas de riesgo en lugar de sola.',
        cols: { total: 'Rendimiento total', cagr: 'CAGR', sharpe: 'Sharpe', maxdd: 'Max DD', calmar: 'Calmar' },
        basicName: 'QQQ Defensive (backtest)',
        qqqName: 'QQQ buy & hold',
        basic: { total: '+93.9%', cagr: '13.7%', sharpe: '1.05', maxdd: '-15.0%', calmar: '0.91' },
        qqq: { total: '+119.7%', cagr: '16.5%', sharpe: '0.79', maxdd: '-36.8%', calmar: '0.45' },
        footnote: 'Ambas filas cubren las mismas fechas, del 7 de mayo de 2021 al 30 de junio de 2026 (5,2 años). Peor período de drawdown: QQQ Defensive, julio de 2024 a junio de 2025. QQQ buy & hold, noviembre de 2021 a octubre de 2022.',
        callout: 'QQQ Defensive ganó menos que QQQ en esta ventana, con una peor caída de menos de la mitad de tamaño. Se quedó atrás en años fuertes como 2023, 2024 y 2025, y perdió 3,4% en 2022 cuando QQQ perdió 33,0%.',
        verifyIntro: 'El método, los resultados año por año, las limitaciones y los datos descargables de esta tabla están publicados, incluidos los costos cobrados en cada operación.',
        verifyLink: 'Ver el historial completo de QQQ Defensive →',
        caption: 'Backtest walk-forward fuera de muestra con precios horarios reales de ETFs, de mayo de 2021 a junio de 2026, nivel de riesgo predeterminado, después de costos de trading modelados (sin comisión, con el spread comprador-vendedor). Rendimiento hipotético de backtest: no logrado por ninguna cuenta real, no es trading en vivo y no es una predicción. El rendimiento pasado no es necesariamente indicativo de resultados futuros. El próximo drawdown podría ser más profundo que -15,0%.',
    },
    life: {
        kicker: 'Construido en torno a tu vida, no al revés',
        title: 'Exposición al mercado que no se vuelve un segundo trabajo.',
        p: 'Recibes un correo cuando el modelo actúa, con la orden ya dimensionada y el razonamiento adjunto. La colocas en tu propio bróker, en tu propio tiempo, y vuelves a tu vida. Sin pantallas que vigilar, sin posiciones que cuidar, sin motivo para revisar el teléfono un martes a las diez.',
        close: 'No estamos prometiendo un ingreso. Estamos quitando la necesidad de estar sentado frente a una pantalla para tener una estrategia sistemática funcionando.',
    },
    retire: {
        kicker: 'El dinero ya es tuyo',
        title: 'En piloto automático o persiguiendo titulares. Ninguno es un proceso.',
        p: 'La brecha no es el ahorro. Es la activación. Ese saldo de retiro es tuyo, está creciendo, y vive dentro del único tipo de cuenta pensado exactamente para este tipo de estrategia paciente y de largo plazo.',
        mech: 'Comprar calls de largo plazo y vender calls cubiertas contra ellos está permitido en la mayoría de las IRA y Roth IRA, sujeto a la aprobación de tu bróker. Los planes 401(k) de empleador estándar normalmente no ofrecen opciones en absoluto. TradeMind funciona con la IRA que ya tienes, o con una que puedes abrir en un día.',
        defensive: '¿Sin permiso de opciones en tu IRA, o recién empezando? QQQ Defensive opera solo ETFs (QQQ, QLD, TQQQ y un fondo similar al efectivo), así que funciona en cualquier cuenta de bróker, incluida una IRA o Roth IRA, sin aprobación de opciones.',
        ctaVerify: 'Ver el registro auditado completo \u2192',
        ctaLedger: 'Explora cada operación \u2192',
    },
    rateCalc: {
        kicker: 'Haz la aritmética tú mismo',
        title: '¿Qué hace una tasa distinta con los mismos $10,000?',
        sub: 'Mueve la tasa o elige una estrategia. Cada botón es el CAGR de backtest con precio de modelo de esa estrategia, redondeado hacia abajo, y cada uno cubre una ventana distinta. El valor por defecto es el botón de QQQ LEAPS.',
        chipDefensive: 'Defensive 13%',
        chipLeaps: 'LEAPS 55%',
        lblAmount: 'Monto inicial',
        lblRate: 'Tasa anual (%)',
        lblYears: 'Años',
        outLabel: 'Saldo final',
        ctaVerify: 'Ver el registro auditado completo \u2192',
        disc: 'Aritmética de capitalización para una tasa que eliges tú. QQQ LEAPS 55%: nuestro resultado de backtest con precio de modelo en una ventana de 5.6 años (enero 2021 a agosto 2026) que incluyó un 2022 casi plano y un drawdown de -14.5% a finales de 2023. QQQ Defensive 13%: nuestro backtest fuera de muestra con precios horarios reales de ETFs (mayo 2021 a junio 2026, 5.2 años, con costos de trading) y una peor caída de -15.0%. Un CAGR sostenido del 55% durante 15 años superaría con mucho casi cualquier registro público verificado de largo plazo. Ninguna tasa está garantizada a persistir.',
    },
};

const ZH_SECTIONS: SectionsCopy = {
    hero: {
        slogan: 'TradeMind 帮你更快达成财务里程碑',
        eyebrow: '这笔钱本来就是你的',
        h1a: '你的账户在自动驾驶',
        h1b: '是时候让副驾驶带你飞得更高',
        sub: '几十年来,简单的答案一直胜过专家的答案:在 15 年里,约 9 成由专业人士管理的美国大盘基金跑输了标普 500(标普 SPIVA,2025 年底)。QQQ 持有纳斯达克 100,是高科技的核心。我们的 QQQ LEAPS 策略持有一份长期 QQQ 看涨期权,放大 QQQ 的涨跌,同时对它卖出备兑看涨期权,在短暂回调期间赚取权利金。在两年的模拟中,它的收益是 QQQ 买入持有的 4 倍以上,最大回撤浅了三分之一以上。备兑看涨期权也会限制部分上涨空间,而模拟不等于实盘交易。TradeMind 从不触碰你的账户:每一笔订单都由你自己下。',
        plans: '不想用期权?QQQ Defensive 只持有 ETF,不需要期权权限,旨在让最差跌幅保持较浅。',
        ctaPrimary: '开始了解',
        ctaSecondary: '查看记录',
        ctaLedger: '浏览每一笔交易 \u2192',
        ledgerLink: '打开账本 \u2192',
        simTag: '模拟',
        simLink: 'QQQ LEAPS 过去两年模拟：收益 +229.48%，QQQ 买入持有 +49.46%。|最大回撤 -14.6%，QQQ 为 -22.9%。非实盘交易。 \u2192',
        cards: [
            {
                numeral: '55.1%',
                numSegs: [{ v: 55.1, dec: 1 }, { t: '%' }],
                label: '回测年化收益,2021年1月至2026年8月',
                body: '按此利率,$10,000 约在 10.5 年复利增长至约 $1M。该数字由数学模型定价,而非实时报价:在真实报价的 15 个月测试中回撤为 -30.4%,而模型为 -14.5%。任何利率都不保证持续。看看利率变化时结果会改变多少 \u2192',
                link: 'calculator',
            },
            {
                numeral: '2 条腿',
                numSegs: [{ v: 2 }, { t: ' 条腿' }],
                label: '持有长仓,出租短仓',
                body: '买入长期 QQQ 看涨期权,12 至 24 个月到期,作为核心仓位。然后对其卖出 32 天看涨期权收取权利金。QQQ 一篮子 100 家公司:无单一股票爆雷,定价紧、退出易。',
            },
            {
                numeral: '1 / 7',
                numSegs: [{ v: 1 }, { t: ' / ' }, { v: 7 }],
                label: '交易必须通过的门;其中一个是信心分数',
                body: '信心模型只用过去的窗口训练,从不用它正在评判的窗口。它不预测 QQQ 的走势:它只为今天是否与该策略过去奏效的条件相似进行评分。它可以否决一笔交易,但不能发起交易。',
            },
            {
                numeral: '18 / 21',
                numSegs: [{ v: 18 }, { t: ' / ' }, { v: 21 }],
                label: '策略在交叉验证路径中保持稳定',
                body: '在 21 个重组子窗口中测试,因此结果不是一条幸运路径。风险限制:每个头寸为账户的三分之一,最多三个仓位,5% 现金储备,亏损仓在收到权利金两倍时止损。',
            },
        ],
        stats: [
            {
                big: '每个时段',
                label: '按固定时刻表盯盘',
                clarifier: '每小时评估一次,每个交易日一个信号窗口,不论是否出手都会记录。你也能看到什么都没发生的日子。',
            },
            {
                big: '零',
                label: '决策中的情绪输入',
                clarifier: '模型没有盈亏焦虑,也不需要被证明是对的。它不会因为亏损而报复性交易,也不会死抱亏损仓位盼它回来。',
            },
            {
                big: '5',
                label: '任何交易之前必须同时满足的条件',
                clarifier: '动量、趋势、波动率、市场状态,以及模型置信度评分。任何一项不成立,就不出手。',
            },
        ],
        play: '▶ 开始聆听',
        calcCta: '看看副驾驶会如何驾驭你的余额 →',
        micro: '这是一份长期承诺,以年计而不是以周计。我们认为这份耐心值得。',
        hint: '一份交易记录,读给你听。11 页,语音同步,约 8 分钟,完整文字稿在最后一页。',
        hintSilent: '没有声音?同样的 11 页、同样的数字,改为 8 分钟读完。',
    },
    model: {
        kicker: '看模型,不看噱头',
        title: '每个信号都有理由,每个理由都有记录。',
        cards: [
            {
                t: '五道闸门,一致才行动',
                p: '五个独立条件必须全部一致:动量、趋势、波动率、市场状态,以及机器学习置信度评分。不是一个信号,而是五个达成一致。',
            },
            {
                t: '是置信度评分,不是感觉',
                p: '模型用多年历史数据训练,输出的是置信度评分,而不是猜测。账本里每笔交易旁边都能看到这个数字,比如 9 月 2 日那次入场的 ML 置信度 0.89。',
            },
            {
                t: '亏损同样记在账本里',
                p: '叠加策略那一章坦然写出卖权利金在哪些行情里吐回了收益。回撤那一章完整展示最坏一幕:在 15 个月行情核验窗口里一次 30.4% 的下跌,花了六周才见底;在 5 年模型回测里则是更温和的 14.5% 低点。两个都在账本里。让你看到模型错的时候,你才能信任它对的时候。',
            },
        ],
    },
    patience: {
        kicker: '耐心即策略',
        title: '大部分收益,都发生在什么都没发生的时候。',
        p1: '副驾驶不会一遇到颠簸就抢操纵杆。它等待所有仪表一致的瞬间,然后果断行动。',
        p2: '五年半里,模型只找到十一次值得出手的入场,大约每年两次。它曾一连数周空仓等待,没有任何一次入场通过全部闸门。这不是故障,而是纪律。',
        cap: '五年半,十一次入场。每一次都记录在下面的账本中。',
        window: '此图覆盖 2021 到 2026 的模型回测窗口,共 1,570 笔成交,包括 LEAPS 入场、短期看涨期权和每周 SMH 看跌价差。下方计算器里的 55.1%,是同一窗口上的模型定价回测。',
        legendEntry: '实际入场',
        legendWait: '空仓等待,无任何 setup 通过闸门',
        yAxis: '持仓时长(月)',
        xAxis: '入场日期,2021 到 2026',
        longest: '最长空仓时段:22 个月',
    },
    discipline: {
        kicker: '机构式的纪律,而不必身在机构',
        title: '优势不在于预测,而在于最坏的一天和最好的一天做同一件事。',
        p: '仓位由规则封顶。现金储备随波动率放大。亏损之后敞口自动下调。这些都不依赖某个人在某个糟糕的早晨还能否保持自律。上限写在代码里,而代码没有糟糕的早晨。',
        close: '五年半,十一次入场。大多数周,诚实的答案是什么都不需要做。',
    },
    record: {
        kicker: '完整记录',
        title: '五年半,与简单持有 QQQ 对比',
        cols: { total: '总回报', cagr: 'CAGR', sharpe: 'Sharpe', maxdd: '最大回撤', calmar: 'Calmar' },
        tips: {
            total: '整个 5.6 年窗口的累计增长,税前。这是对结果最有利的表述方式,所以它旁边并列着四项风险指标,而不是单独出现。',
            cagr: '复合年增长率:在整个期间能产生相同最终结果的单一年化利率。它把颠簸的路径抹平成一个数字,正因如此,回撤那一列同样重要。',
            sharpe: '每单位波动率换来的回报。数值越高,说明同样的回报过程更平稳。低于 1.0 一般算普通,高于 1.0 算强。它不说明单笔最大亏损有多大。',
            maxdd: '最大回撤:从最不利的入场点衡量,峰值到谷底最深的一次下跌。这个数字决定一个策略在实践中能否活下来,因为它就是大多数人放弃的时刻。',
            calmar: '年回报除以最大回撤。它直接问一个问题:每承受一份最痛的亏损,你赚到多少回报。越高越好,它会惩罚那些靠深坑换来好平均值的策略。',
        },
        v4Name: 'QQQ LEAPS (backtest)',
        qqqName: 'QQQ 买入并持有',
        v4: { total: '+1,070.7%', cagr: '55.1%', sharpe: '1.83', maxdd: '-14.5%', calmar: '3.79' },
        qqq: { total: '+136.4%', cagr: '16.6%', sharpe: '0.79', maxdd: '-35.6%', calmar: '0.47' },
        footnote: '最差回撤区间:TradeMind,2023 年 10 月。QQQ 买入并持有,2021 年 11 月到 2022 年 12 月。',
        callout: '我们最深的坑,两个月挖成。买入并持有的那个,花了十四个月。',
        verifyIntro: '这张表背后的每一笔交易、每一个价格、每一个假设都已公开:完整的账本、每日净值曲线,以及包含全部局限性的完整方法论。',
        verifyLink: '亲自审计这份记录 →',
        caption: '2021 到 2026 连续窗口,5.6 年,模型定价。假设性回测表现:没有任何真实账户实现过,不是实盘交易,也不是预测。下一次回撤可能更深。此记录中的每一次入场、出场和亏损,都记录在下方的账本里。',
    },
    basicRecord: {
        simIntro: '实盘交易自 2026 年 10 月 14 日开始。为了展示同样的策略此前的表现，另有一个页面（英文）把此前两年作为模拟运行，列出每一笔交易和持仓。它仅为假设，并非真实交易，与实盘记录分开。',
        simLink: '打开两年模拟 \u2192',
        kicker: 'QQQ Defensive',
        title: 'ETF 方案:无需期权权限,最差跌幅更浅',
        p: 'QQQ Defensive 只持有 ETF(QQQ、QLD、TQQQ 和类现金基金 SGOV),因此在任何券商账户里都能使用,不需要期权交易权限。它的设计目标是让最差跌幅保持较浅,适合愿意在强势年份放弃部分涨幅、希望起步更平稳的新订阅者。',
        tipTotal: '整个 5.2 年窗口的累计增长,税前。这是对结果最有利的表述方式,所以它旁边并列着四项风险指标,而不是单独出现。',
        cols: { total: '总回报', cagr: 'CAGR', sharpe: 'Sharpe', maxdd: '最大回撤', calmar: 'Calmar' },
        basicName: 'QQQ Defensive(回测)',
        qqqName: 'QQQ 买入并持有',
        basic: { total: '+93.9%', cagr: '13.7%', sharpe: '1.05', maxdd: '-15.0%', calmar: '0.91' },
        qqq: { total: '+119.7%', cagr: '16.5%', sharpe: '0.79', maxdd: '-36.8%', calmar: '0.45' },
        footnote: '两行使用相同日期,2021 年 5 月 7 日到 2026 年 6 月 30 日(5.2 年)。最差回撤区间:QQQ Defensive,2024 年 7 月到 2025 年 6 月。QQQ 买入并持有,2021 年 11 月到 2022 年 10 月。',
        callout: '在这个窗口里,QQQ Defensive 的收益低于 QQQ,但最差跌幅不到后者的一半。它在 2023、2024 和 2025 这样的强势年份落后,在 2022 年 QQQ 下跌 33.0% 时只亏 3.4%。',
        verifyIntro: '这张表背后的方法、逐年结果、局限性和可下载数据都已公开,包括每笔交易计入的成本。',
        verifyLink: '查看 QQQ Defensive 的完整记录 →',
        caption: '基于真实小时级 ETF 价格的样本外滚动回测,2021 年 5 月到 2026 年 6 月,默认风险等级,已扣除模拟交易成本(无佣金,计入买卖价差)。假设性回测表现:没有任何真实账户实现过,不是实盘交易,也不是预测。过往表现不一定代表未来结果。下一次回撤可能比 -15.0% 更深。',
    },
    life: {
        kicker: '围绕你的生活,而不是相反',
        title: '让市场敞口不变成第二份工作。',
        p: '模型出手时你会收到一封邮件,里面已经算好仓位、附上理由。你在自己的券商里、按自己的时间下单,然后回到自己的生活。不用盯屏,不用照看仓位,也没有理由在周二上午十点掏手机看。',
        close: '我们不是在承诺收入。我们只是让你不必坐在屏幕前,也能有一个系统化策略在跑。',
    },
    retire: {
        kicker: '这笔钱本来就是你的',
        title: '自动驾驶,或追逐头条。两者都不是流程。',
        p: '缺口不在储蓄,而在激活。那笔退休账户余额是你的,还在增长,而它所在的账户类型,恰恰最适合这种耐心的长期策略。',
        mech: '在大多数 IRA 和 Roth IRA 中,买入长期看涨期权并备兑卖出看涨期权是允许的,具体以券商批准为准。标准的雇主 401(k) 计划通常完全不提供期权交易。TradeMind 适用于你已有的 IRA,或者当天就能开好的新 IRA。',
        defensive: 'IRA 里没有期权权限,或者刚刚起步?QQQ Defensive 只交易 ETF(QQQ、QLD、TQQQ 和一只类现金基金),因此在任何券商账户里都能使用,包括 IRA 或 Roth IRA,无需期权审批。',
        ctaVerify: '查看完整审计记录 \u2192',
        ctaLedger: '浏览每一笔交易 \u2192',
    },
    rateCalc: {
        kicker: '自己动手算一算',
        title: '换一个利率,同样的 1 万美元会怎样?',
        sub: '移动利率,或选择一个策略。每个按钮是该策略回测、模型定价的年化收益(向下取整),各自覆盖不同的窗口。默认值是 QQQ LEAPS 按钮。',
        chipDefensive: 'Defensive 13%',
        chipLeaps: 'LEAPS 55%',
        lblAmount: '初始金额',
        lblRate: '年利率 (%)',
        lblYears: '年数',
        outLabel: '最终余额',
        ctaVerify: '查看完整审计记录 \u2192',
        disc: '这是你选择的利率下的复利算术。QQQ LEAPS 55%:我们回测的模型定价结果,覆盖一个 5.6 年窗口(2021 年 1 月到 2026 年 8 月),其中包含近乎持平的 2022 年和 2023 年末 -14.5% 的回撤。QQQ Defensive 13%:基于真实小时级 ETF 价格的样本外回测(2021 年 5 月到 2026 年 6 月,5.2 年,已计入交易成本),最差跌幅 -15.0%。若 55% 的年化收益持续 15 年,将远超几乎所有经过验证的长期公开业绩记录。没有任何利率保证会持续。',
    },
};

export const SECTIONS_I18N: Record<SectionLang, SectionsCopy> = {
    en: EN_SECTIONS,
    es: ES_SECTIONS,
    zh: ZH_SECTIONS,
};
