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
}

const EN_SECTIONS: SectionsCopy = {
    hero: {
        eyebrow: 'For the retirement account you already have',
        h1a: 'Your retirement account is on autopilot.',
        h1b: 'It is time for a co-pilot.',
        sub: 'TradeMind never touches your account. It hands you the instruments. Every signal comes from a quant model trained on years of market data, not a hunch. You still fly the plane. We make sure you can see the whole runway.',
        stats: [
            {
                big: '71%',
                label: 'of near retirees say they are behind on saving',
                clarifier: 'Feeling behind is the norm, not the exception.',
            },
            {
                big: '4x',
                label: 'gap between the average 401(k) and the typical one',
                clarifier: 'Averages are lifted by a few large accounts. The median saver holds far less.',
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
                p: 'The overlay chapter admits where selling premium gave back its gains, and the drawdown chapter shows the worst drop, negative 17.8 percent, in full. Showing you when the model was wrong is the only way you can trust it when it is right.',
            },
        ],
    },
    patience: {
        kicker: 'Patience is the strategy',
        title: 'Most of the return happens while nothing happens.',
        p1: 'A co-pilot does not grab the controls every time there is turbulence. It waits for the moment the instruments agree, then acts decisively.',
        p2: 'In five and a half years the model found eleven entries worth taking, about two a year. It has sat in cash for weeks at a stretch, with zero setups clearing the gates. That is not a malfunction. That is the discipline.',
        cap: 'Eleven entries in five and a half years. Every one of them is in the ledger below.',
        window: 'This timeline covers the 2021 to 2026 model window. The 15 month cycle in the chapters below is the tape verified subset, priced from real exchange quotes.',
        legendEntry: 'Entry taken',
        legendWait: 'Waiting in cash, no setup cleared the gates',
        yAxis: 'Holding length (months)',
        xAxis: 'Entry dates, 2021 to 2026',
        longest: 'Longest stretch in cash: 22 months',
    },
};

const ES_SECTIONS: SectionsCopy = {
    hero: {
        eyebrow: 'Para la cuenta de retiro que ya tienes',
        h1a: 'Tu cuenta de retiro va en piloto automático.',
        h1b: 'Es hora de un copiloto.',
        sub: 'TradeMind nunca toca tu cuenta. Te entrega los instrumentos. Cada señal proviene de un modelo cuantitativo entrenado con años de datos de mercado, no de una corazonada. Tú sigues pilotando el avión. Nosotros nos aseguramos de que veas toda la pista.',
        stats: [
            {
                big: '71%',
                label: 'de quienes se acercan al retiro dicen ir atrasados en ahorro',
                clarifier: 'Sentirse atrasado es la norma, no la excepción.',
            },
            {
                big: '4x',
                label: 'brecha entre el 401(k) promedio y el típico',
                clarifier: 'Los promedios se inflan por unas pocas cuentas grandes. El ahorrador mediano tiene mucho menos.',
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
                p: 'El capítulo del overlay admite dónde la venta de prima devolvió sus ganancias, y el capítulo del drawdown muestra la peor caída, negativo 17,8 por ciento, por completo. Mostrarte cuándo el modelo se equivocó es la única forma de que confíes cuando acierta.',
            },
        ],
    },
    patience: {
        kicker: 'La paciencia es la estrategia',
        title: 'La mayor parte del rendimiento ocurre mientras no pasa nada.',
        p1: 'Un copiloto no agarra los controles cada vez que hay turbulencia. Espera el momento en que los instrumentos coinciden, y entonces actúa con decisión.',
        p2: 'En cinco años y medio, el modelo encontró once entradas que valían la pena, unas dos al año. Ha pasado semanas enteras en efectivo, sin una sola entrada que cruzara los filtros. No es un mal funcionamiento. Es la disciplina.',
        cap: 'Once entradas en cinco años y medio. Cada una está en el registro de abajo.',
        window: 'Este cronograma cubre la ventana de modelo 2021 a 2026. El ciclo de 15 meses de los capítulos de abajo es el subconjunto verificado con la cinta, valorado con cotizaciones reales de bolsa.',
        legendEntry: 'Entrada tomada',
        legendWait: 'Esperando en efectivo, ningún setup cruzó los filtros',
        yAxis: 'Duración de la posición (meses)',
        xAxis: 'Fechas de entrada, 2021 a 2026',
        longest: 'Racha más larga en efectivo: 22 meses',
    },
};

const ZH_SECTIONS: SectionsCopy = {
    hero: {
        eyebrow: '为你已有的退休账户而建',
        h1a: '你的退休账户在自动驾驶。',
        h1b: '是时候配一位副驾驶了。',
        sub: 'TradeMind 从不触碰你的账户,而是把仪表交到你手中。每个信号都来自用多年市场数据训练的量化模型,而不是凭感觉。飞机仍由你驾驶,我们只是让你看清整条跑道。',
        stats: [
            {
                big: '71%',
                label: '临近退休者表示自己储蓄落后',
                clarifier: '觉得落后是常态,而不是例外。',
            },
            {
                big: '4x',
                label: '401(k) 平均值与中位数之间的差距',
                clarifier: '平均值被少数大额账户拉高。中位储户手里的钱要少得多。',
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
                p: '叠加策略那一章坦然写出卖权利金在哪些行情里吐回了收益;回撤那一章把最大回撤 负 17.8 % 完整展示。让你看到模型错的时候,你才能信任它对的时候。',
            },
        ],
    },
    patience: {
        kicker: '耐心即策略',
        title: '大部分收益,都发生在什么都没发生的时候。',
        p1: '副驾驶不会一遇到颠簸就抢操纵杆。它等待所有仪表一致的瞬间,然后果断行动。',
        p2: '五年半里,模型只找到十一次值得出手的入场,大约每年两次。它曾一连数周空仓等待,没有任何一次入场通过全部闸门。这不是故障,而是纪律。',
        cap: '五年半,十一次入场。每一次都记录在下面的账本中。',
        window: '此时间线覆盖 2021 到 2026 的模型窗口。下方章节里的 15 个月周期,是用真实交易所报价核验的行情子集。',
        legendEntry: '实际入场',
        legendWait: '空仓等待,无任何 setup 通过闸门',
        yAxis: '持仓时长(月)',
        xAxis: '入场日期,2021 到 2026',
        longest: '最长空仓时段:22 个月',
    },
};

export const SECTIONS_I18N: Record<SectionLang, SectionsCopy> = {
    en: EN_SECTIONS,
    es: ES_SECTIONS,
    zh: ZH_SECTIONS,
};
