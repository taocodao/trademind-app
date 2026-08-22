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
        statsSrc: string;
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
    // "Institutional-style discipline" band. Prestige framing without the
    // "hedge fund" phrase (which is a legal-marketing trap for a public page),
    // and without the "24/7" language (US equities and options do not trade
    // around the clock; a careful reader will catch it).
    discipline: {
        kicker: string; title: string; p: string;
        cards: { t: string; p: string }[];
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
        h1a: 'Your retirement account is on autopilot.',
        h1b: 'It is time for a co-pilot.',
        sub: 'TradeMind never touches your account. It hands you the instruments. Every signal comes from a quant model with its reasoning attached, not a hunch. You still fly the plane. We just make sure you can see the whole runway.',
        stats: [
            {
                big: '71%',
                label: 'of near retirees say they are behind on saving',
                clarifier: 'Feeling behind is the norm, not the exception.',
            },
            {
                big: '1/3',
                label: 'what the typical saver actually holds, versus the average',
                clarifier: 'Averages are lifted by a few very large accounts. Across every age group, the median 401(k) is barely a third of the average.',
            },
            {
                big: '5',
                label: 'conditions that must agree before any trade',
                clarifier: 'Momentum, trend, volatility, regime, and a model confidence score. If one disagrees, nothing happens.',
            },
        ],
        statsSrc: 'Sources: MarketWatch retirement survey (Dec 2022); Vanguard, How America Saves (2026).',
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
        kicker: 'What a co-pilot actually does',
        title: 'Institutional style discipline, without the institution.',
        p: 'The model watches the market every session, on a fixed schedule, with no opinion about what it wants to happen. It does not get bored in a flat market or scared in a falling one. Five conditions have to agree before anything happens, position size is capped by rule, and the cash floor scales with volatility. That is the whole edge: not prediction, just a process that does the same thing on the worst day as on the best one.',
        cards: [
            { t: 'Watches every session', p: 'Hourly evaluation, one signal window per day, logged whether it acts or not. Weekends and holidays are in the record too, so you see the days nothing happened.' },
            { t: 'No opinion, no ego', p: 'The model has no P&L anxiety and no need to be right. It cannot revenge trade a loss or hold a loser hoping it comes back.' },
            { t: 'Risk capped by rule, not by nerve', p: 'A hard ceiling on gross exposure, a volatility scaled cash reserve, and an automatic step down after losses. The limits are in the code, not in someone\'s discipline that day.' },
        ],
    },
    life: {
        kicker: 'Built around your life, not the other way around',
        title: 'Market exposure that does not become a second job.',
        p: 'Eleven entries in five and a half years. Most weeks, the honest answer is that nothing needs doing. You get one email when the model acts, with the order already sized and the reasoning attached. You place it at your own broker, in your own time, and go back to your life. No screens to watch, no positions to babysit, no reason to check your phone at 10 a.m. on a Tuesday.',
        close: 'We are not promising an income. We are removing the need to sit in front of a screen to have a systematic strategy running.',
    },
};

const ES_SECTIONS: SectionsCopy = {
    hero: {
        eyebrow: 'Para la cuenta de retiro que ya tienes',
        h1a: 'Tu cuenta de retiro va en piloto automático.',
        h1b: 'Es hora de un copiloto.',
        sub: 'TradeMind nunca toca tu cuenta. Te entrega los instrumentos. Cada señal proviene de un modelo cuantitativo con su razonamiento adjunto, no de una corazonada. Tú sigues pilotando el avión. Nosotros solo nos aseguramos de que veas toda la pista.',
        stats: [
            {
                big: '71%',
                label: 'de quienes se acercan al retiro dicen ir atrasados en ahorro',
                clarifier: 'Sentirse atrasado es la norma, no la excepción.',
            },
            {
                big: '1/3',
                label: 'lo que el ahorrador típico realmente tiene, frente al promedio',
                clarifier: 'Los promedios se inflan por unas pocas cuentas muy grandes. En cada grupo de edad, la mediana del 401(k) apenas alcanza un tercio del promedio.',
            },
            {
                big: '5',
                label: 'condiciones que deben coincidir antes de cualquier operación',
                clarifier: 'Momentum, tendencia, volatilidad, régimen y una puntuación de confianza del modelo. Si una discrepa, no pasa nada.',
            },
        ],
        statsSrc: 'Fuentes: encuesta de retiro de MarketWatch (dic 2022); Vanguard, How America Saves (2026).',
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
        kicker: 'Qué hace de verdad un copiloto',
        title: 'Disciplina de estilo institucional, sin la institución.',
        p: 'El modelo mira el mercado en cada sesión, en un horario fijo, sin opinión sobre lo que quiere que pase. No se aburre en un mercado plano ni se asusta en uno que cae. Cinco condiciones tienen que estar de acuerdo antes de que ocurra algo, el tamaño de la posición está topado por regla, y el piso de efectivo escala con la volatilidad. Ese es todo el edge: no es predicción, es un proceso que hace lo mismo en el peor día que en el mejor.',
        cards: [
            { t: 'Mira cada sesión', p: 'Evaluación por hora, una ventana de señal al día, registrada actúe o no. Fines de semana y feriados también están en el registro, así ves los días en los que no pasó nada.' },
            { t: 'Sin opinión, sin ego', p: 'El modelo no tiene ansiedad de P&L ni necesidad de tener razón. No puede vengarse de una pérdida ni aferrarse a una posición perdedora esperando que vuelva.' },
            { t: 'Riesgo topado por regla, no por nervio', p: 'Un techo duro a la exposición bruta, una reserva de efectivo que escala con la volatilidad, y una reducción automática tras pérdidas. Los límites están en el código, no en la disciplina de alguien ese día.' },
        ],
    },
    life: {
        kicker: 'Construido en torno a tu vida, no al revés',
        title: 'Exposición al mercado que no se vuelve un segundo trabajo.',
        p: 'Once entradas en cinco años y medio. La mayoría de las semanas, la respuesta honesta es que no hay nada que hacer. Recibes un correo cuando el modelo actúa, con la orden ya dimensionada y el razonamiento adjunto. La colocas en tu propio bróker, en tu propio tiempo, y vuelves a tu vida. Sin pantallas que vigilar, sin posiciones que cuidar, sin motivo para revisar el teléfono un martes a las 10 de la mañana.',
        close: 'No estamos prometiendo un ingreso. Estamos quitando la necesidad de estar sentado frente a una pantalla para tener una estrategia sistemática funcionando.',
    },
};

const ZH_SECTIONS: SectionsCopy = {
    hero: {
        eyebrow: '为你已有的退休账户而建',
        h1a: '你的退休账户在自动驾驶。',
        h1b: '是时候配一位副驾驶了。',
        sub: 'TradeMind 从不触碰你的账户,而是把仪表交到你手中。每个信号都来自量化模型,并附上它的判断依据,而不是凭感觉。飞机仍由你驾驶,我们只是让你看清整条跑道。',
        stats: [
            {
                big: '71%',
                label: '临近退休者表示自己储蓄落后',
                clarifier: '觉得落后是常态,而不是例外。',
            },
            {
                big: '1/3',
                label: '中位储户实际拥有的金额,相对于平均值',
                clarifier: '平均值被少数额度很大的账户拉高。在每个年龄段,401(k) 的中位数都仅为平均值的三分之一左右。',
            },
            {
                big: '5',
                label: '任何交易之前必须同时满足的条件',
                clarifier: '动量、趋势、波动率、市场状态,以及模型置信度评分。任何一项不成立,就不出手。',
            },
        ],
        statsSrc: '来源:MarketWatch 退休调查(2022年12月);Vanguard《How America Saves》(2026)。',
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
        kicker: '副驾驶到底在做什么',
        title: '机构式的纪律,而不必身在机构。',
        p: '模型每个交易时段都盯着市场,按固定时刻表运行,对结果没有任何偏好。它不会在横盘里犯困,也不会在下跌里害怕。五个条件必须同时满足才会有动作,仓位由规则封顶,现金底线随波动率放大。这就是全部的优势:不是预测,而是一个流程,最坏的一天和最好的一天做同一件事。',
        cards: [
            { t: '每个时段都在看', p: '每小时评估一次,每天一个信号窗口,不论是否出手都会记录。周末和假日也都在记录里,你能看到什么都没发生的日子。' },
            { t: '没有情绪,没有面子', p: '模型没有盈亏焦虑,也不需要被证明是对的。它不会因为亏了就报复交易,也不会死抱亏损盼它回来。' },
            { t: '风险由规则封顶,而不是由勇气封顶', p: '总敞口有硬顶,现金储备随波动率放大,亏损后自动降档。上限在代码里,不在某个人当天的自制力里。' },
        ],
    },
    life: {
        kicker: '围绕你的生活,而不是相反',
        title: '让市场敞口不变成第二份工作。',
        p: '五年半里 11 次入场。大多数周,诚实的答案是什么都不用做。模型出手时你会收到一封邮件,里面已经算好仓位、附上理由。你在自己的券商里、按自己的时间下单,然后回到自己的生活。不用盯屏,不用照看仓位,也没有理由在周二早上十点掏手机看。',
        close: '我们不是在承诺收入。我们只是让你不必坐在屏幕前,也能有一个系统化策略在跑。',
    },
};

export const SECTIONS_I18N: Record<SectionLang, SectionsCopy> = {
    en: EN_SECTIONS,
    es: ES_SECTIONS,
    zh: ZH_SECTIONS,
};
