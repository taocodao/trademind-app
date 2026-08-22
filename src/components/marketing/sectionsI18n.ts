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
        eyebrow: string;
        h1a: string; h1b: string;
        sub: string;
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
        footnote: string; callout: string; caption: string;
    };
    // "Built around your life" band. Explicitly disclaims income promises
    // while delivering the freedom framing the owner asked for.
    life: {
        kicker: string; title: string; p: string; close: string;
    };
}

const EN_SECTIONS: SectionsCopy = {
    hero: {
        eyebrow: 'For the retirement account you already have',
        h1a: 'Your account is on autopilot',
        h1b: 'It is time for a co-pilot to fly it higher',
        sub: 'TradeMind never touches your account. It hands you the instruments. Every signal comes from a quant model with its reasoning attached, not a hunch. You still fly the plane. We just make sure you can see the whole runway, every session, with no opinion about what it wants to happen.',
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
                p: 'The overlay chapter admits where selling premium gave back its gains. The drawdown chapter shows the worst drop in full: a 30.4 percent decline that took six weeks to bottom in the 15 month tape verified window, and a milder 17.8 percent low in the 5 year model backtest. Both are in the ledger. Showing you when the model was wrong is the only way you can trust it when it is right.',
            },
        ],
    },
    patience: {
        kicker: 'Patience is the strategy',
        title: 'Most of the return happens while nothing happens.',
        p1: 'A co-pilot does not grab the controls every time there is turbulence. It waits for the moment the instruments agree, then acts decisively.',
        p2: 'In five and a half years the model found eleven entries worth taking, about two a year. It has sat in cash for weeks at a stretch, with zero setups clearing the gates. That is not a malfunction. That is the discipline.',
        cap: 'Eleven entries in five and a half years. Every one of them is in the ledger below.',
        window: 'This chart covers the 2021 to 2026 tape verified window, 11 real entries. The 30 percent figure in the calculator below comes from the longer 2019 to 2026 model backtest. Different window, different engine, both labeled wherever they appear.',
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
        v4Name: 'TradeMind V4',
        qqqName: 'QQQ buy & hold',
        v4: { total: '+464.2%', cagr: '36.3%', sharpe: '1.475', maxdd: '-17.8%', calmar: '2.04' },
        qqq: { total: '+136.4%', cagr: '16.6%', sharpe: '0.795', maxdd: '-35.6%', calmar: '0.47' },
        footnote: 'Worst drawdown period: TradeMind, Sep to Oct 2023. QQQ buy & hold, Nov 2021 through Dec 2022.',
        callout: 'Our deepest hole took two months to dig. Buy-and-hold\'s took fourteen.',
        caption: '2021 to 2026 continuous window, 5.6 years, model-priced. Hypothetical backtested performance: not achieved by any actual account, not live trading, and not a prediction. The next drawdown could be deeper. Every entry, exit, and loss in this record is in the ledger below.',
    },
    life: {
        kicker: 'Built around your life, not the other way around',
        title: 'Market exposure that does not become a second job.',
        p: 'You get one email when the model acts, with the order already sized and the reasoning attached. You place it at your own broker, in your own time, and go back to your life. No screens to watch, no positions to babysit, no reason to check your phone at ten on a Tuesday.',
        close: 'We are not promising an income. We are removing the need to sit in front of a screen to have a systematic strategy running.',
    },
};

const ES_SECTIONS: SectionsCopy = {
    hero: {
        eyebrow: 'Para la cuenta de retiro que ya tienes',
        h1a: 'Tu cuenta va en piloto automático',
        h1b: 'Es hora de un copiloto que la vuele más alto',
        sub: 'TradeMind nunca toca tu cuenta. Te entrega los instrumentos. Cada señal proviene de un modelo cuantitativo con su razonamiento adjunto, no de una corazonada. Tú sigues pilotando el avión. Nosotros solo nos aseguramos de que veas toda la pista, en cada sesión, sin opinión sobre lo que quiere que pase.',
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
                p: 'El capítulo del overlay admite dónde la venta de prima devolvió sus ganancias. El capítulo del drawdown muestra la peor caída por completo: una baja de 30,4 por ciento que tardó seis semanas en tocar fondo en la ventana de 15 meses verificada con la cinta, y una caída más suave de 17,8 por ciento en el backtest del modelo de 5 años. Ambas están en el registro. Mostrarte cuándo el modelo se equivocó es la única forma de que confíes cuando acierta.',
            },
        ],
    },
    patience: {
        kicker: 'La paciencia es la estrategia',
        title: 'La mayor parte del rendimiento ocurre mientras no pasa nada.',
        p1: 'Un copiloto no agarra los controles cada vez que hay turbulencia. Espera el momento en que los instrumentos coinciden, y entonces actúa con decisión.',
        p2: 'En cinco años y medio, el modelo encontró once entradas que valían la pena, unas dos al año. Ha pasado semanas enteras en efectivo, sin una sola entrada que cruzara los filtros. No es un mal funcionamiento. Es la disciplina.',
        cap: 'Once entradas en cinco años y medio. Cada una está en el registro de abajo.',
        window: 'Esta gráfica cubre la ventana verificada con la cinta de 2021 a 2026, 11 entradas reales. La cifra de 30 por ciento en la calculadora de abajo viene del backtest de modelo más largo, de 2019 a 2026. Ventanas y motores distintos, cada uno etiquetado donde aparece.',
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
        v4Name: 'TradeMind V4',
        qqqName: 'QQQ buy & hold',
        v4: { total: '+464.2%', cagr: '36.3%', sharpe: '1.475', maxdd: '-17.8%', calmar: '2.04' },
        qqq: { total: '+136.4%', cagr: '16.6%', sharpe: '0.795', maxdd: '-35.6%', calmar: '0.47' },
        footnote: 'Peor período de drawdown: TradeMind, sep a oct 2023. QQQ buy & hold, nov 2021 a dic 2022.',
        callout: 'Nuestro hoyo más profundo tardó dos meses en cavarse. El de buy and hold tardó catorce.',
        caption: 'Ventana continua 2021 a 2026, 5,6 años, con precios de modelo. Rendimiento hipotético de backtest: no logrado por ninguna cuenta real, no es trading en vivo y no es una predicción. El próximo drawdown podría ser más profundo. Cada entrada, salida y pérdida de este historial está en el registro de abajo.',
    },
    life: {
        kicker: 'Construido en torno a tu vida, no al revés',
        title: 'Exposición al mercado que no se vuelve un segundo trabajo.',
        p: 'Recibes un correo cuando el modelo actúa, con la orden ya dimensionada y el razonamiento adjunto. La colocas en tu propio bróker, en tu propio tiempo, y vuelves a tu vida. Sin pantallas que vigilar, sin posiciones que cuidar, sin motivo para revisar el teléfono un martes a las diez.',
        close: 'No estamos prometiendo un ingreso. Estamos quitando la necesidad de estar sentado frente a una pantalla para tener una estrategia sistemática funcionando.',
    },
};

const ZH_SECTIONS: SectionsCopy = {
    hero: {
        eyebrow: '为你已有的退休账户而建',
        h1a: '你的账户在自动驾驶',
        h1b: '是时候让副驾驶带你飞得更高',
        sub: 'TradeMind 从不触碰你的账户,而是把仪表交到你手中。每个信号都来自量化模型,并附上它的判断依据,而不是凭感觉。飞机仍由你驾驶,我们只是让你看清整条跑道,每个交易时段如此,对结果不带任何偏好。',
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
                p: '叠加策略那一章坦然写出卖权利金在哪些行情里吐回了收益。回撤那一章完整展示最坏一幕:在 15 个月行情核验窗口里一次 30.4% 的下跌,花了六周才见底;在 5 年模型回测里则是更温和的 17.8% 低点。两个都在账本里。让你看到模型错的时候,你才能信任它对的时候。',
            },
        ],
    },
    patience: {
        kicker: '耐心即策略',
        title: '大部分收益,都发生在什么都没发生的时候。',
        p1: '副驾驶不会一遇到颠簸就抢操纵杆。它等待所有仪表一致的瞬间,然后果断行动。',
        p2: '五年半里,模型只找到十一次值得出手的入场,大约每年两次。它曾一连数周空仓等待,没有任何一次入场通过全部闸门。这不是故障,而是纪律。',
        cap: '五年半,十一次入场。每一次都记录在下面的账本中。',
        window: '此图覆盖 2021 到 2026 的行情核验窗口,共 11 次真实入场。下方计算器里的 30% 收益率,来自更长的 2019 到 2026 模型回测。窗口不同,引擎不同,各自标注在出现的位置。',
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
        v4Name: 'TradeMind V4',
        qqqName: 'QQQ 买入并持有',
        v4: { total: '+464.2%', cagr: '36.3%', sharpe: '1.475', maxdd: '-17.8%', calmar: '2.04' },
        qqq: { total: '+136.4%', cagr: '16.6%', sharpe: '0.795', maxdd: '-35.6%', calmar: '0.47' },
        footnote: '最差回撤区间:TradeMind,2023 年 9 月到 10 月。QQQ 买入并持有,2021 年 11 月到 2022 年 12 月。',
        callout: '我们最深的坑,两个月挖成。买入并持有的那个,花了十四个月。',
        caption: '2021 到 2026 连续窗口,5.6 年,模型定价。假设性回测表现:没有任何真实账户实现过,不是实盘交易,也不是预测。下一次回撤可能更深。此记录中的每一次入场、出场和亏损,都记录在下方的账本里。',
    },
    life: {
        kicker: '围绕你的生活,而不是相反',
        title: '让市场敞口不变成第二份工作。',
        p: '模型出手时你会收到一封邮件,里面已经算好仓位、附上理由。你在自己的券商里、按自己的时间下单,然后回到自己的生活。不用盯屏,不用照看仓位,也没有理由在周二上午十点掏手机看。',
        close: '我们不是在承诺收入。我们只是让你不必坐在屏幕前,也能有一个系统化策略在跑。',
    },
};

export const SECTIONS_I18N: Record<SectionLang, SectionsCopy> = {
    en: EN_SECTIONS,
    es: ES_SECTIONS,
    zh: ZH_SECTIONS,
};
