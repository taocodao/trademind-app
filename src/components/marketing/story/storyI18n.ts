/* ─────────────────────────────────────────────────────────────────────────────
   storyI18n — per-language overlays for the story deck.

   Data (NAV, LEDGER, WINDOWS, FULL_WINDOW, beat indexes) stays in storyData.ts
   and is language-independent. This file overlays every user-facing string:
   narration scripts (rendered to audio per language), slide copy, chrome,
   map beat labels/tips + per-language narration timing, ledger vocabulary.

   Adding a language = add one entry to STORY_I18N + render its audio.
   ─────────────────────────────────────────────────────────────────────────── */

export type StoryLang = 'en' | 'es' | 'zh';

export interface StoryOverlay {
    chapters: Record<string, { kicker: string; title: string; text: string }>;
    ui: Record<string, string>;
    beats: { label: string; tip: string }[];          // order must match MAP_BEATS
    beatTimes?: number[];                             // narration timing for the map (defaults to English)
    windows: { label: string; regime: string }[];     // order must match WINDOWS
    fullWindow: { label: string; regime: string };
    ledger: { actions: Record<string, string>; reasons: Record<string, string> };
    ledgerHead: { date: string; leg: string; action: string; contract: string; qty: string; price: string; pnl: string; outcome: string };
    ledgerTag: Record<string, string>;
    tableHead: { window: string; dates: string; what: string; strategy: string; qqq: string; worstDip: string; fills: string };
    fallback: { hero: string; appendix: string; close: string };
    aria: { prev: string; next: string; playPause: string; mute: string; muted: string; sound: string; slide: string; transcript: string; replay: string; transcriptOpen: string };
}

/* ── Spanish ─────────────────────────────────────────────────────────────── */

const es: StoryOverlay = {
    chapters: {
        ch1: {
            kicker: 'Capítulo 1', title: 'Una operación real',
            text: 'Dos de septiembre de 2025. QQQ abre a la baja. La mayoría ve un día rojo. Nuestro sistema ve una lista de verificación. Cinco filtros de entrada: momentum, tendencia, volatilidad, régimen y confianza del modelo. Esa mañana, todos se pusieron en verde a la vez. Así que la estrategia hizo lo que fue diseñada para hacer: comprar una opción LEAPS muy dentro del dinero. El contrato QQQ con strike cuatrocientos sesenta y cinco, con vencimiento en septiembre de 2026. Ejecutada a ciento treinta y tres con cincuenta: el precio medio real, tomado de la cinta real de la bolsa. Esta operación forma parte del historial de cinco años y medio que estás a punto de escuchar, y pertenece a los últimos quince meses, la parte que verificamos tick por tick contra la cinta.',
        },
        compound: {
            kicker: 'Capítulo 2', title: 'Cómo se vio la paciencia',
            text: 'Antes de la mecánica, aquí está el punto. Diez mil dólares en esta estrategia se convirtieron en cincuenta y seis mil cuatrocientos, en cinco años y medio. El mismo dinero en QQQ se convirtió en veintitrés mil seiscientos. Eso es treinta y seis punto tres por ciento al año contra dieciséis punto seis: más del doble. ¿Y por qué existe esa brecha? Cuando llegó el mercado bajista de dos mil veintidós, simplemente mantener QQQ significó pasar casi veinticinco meses bajo el agua antes de volver al punto de partida. Esta estrategia se quedó en efectivo, y luego reingresó. Su peor hoyo de los cinco años, diecisiete punto ocho por ciento, se recuperó en diez semanas. Esto no es un sistema que tengas que vigilar. Es una inversión a largo plazo que actúa solo cuando sus reglas dicen actúa, y que por lo demás, espera. La decisión más valiosa de cinco años fue no hacer nada durante doce meses mientras el mercado caía.',
        },
        ch2: {
            kicker: 'Capítulo 3', title: 'El motor',
            text: 'Una opción LEAPS es una opción de largo plazo. Esta controla cien acciones de QQQ durante más de un año, por una fracción del precio de las acciones. Al estar muy dentro del dinero, se mueve casi dólar por dólar con el índice. Ese es el motor: exposición apalancada a QQQ, con un costo definido y sin margen. Pero el apalancamiento corta en ambos sentidos. Cuando QQQ cae, esta posición cae más rápido. Lo verás exactamente en un momento.',
        },
        ch3: {
            kicker: 'Capítulo 4', title: 'La cobertura',
            text: 'Mientras la LEAPS permanece abierta, la estrategia vende opciones de corto plazo contra ella, cosechando prima semana tras semana. En cinco años y medio, trescientas noventa y dos de estas operaciones. El ochenta y cinco por ciento ganó, sumando treinta y dos mil novecientos cuarenta y cinco dólares, netos. Pero el historial también nos enseñó cuándo no vender. En tendencias fuertes con prima escasa, la cobertura devolvía sus ganancias: vender seguros justo antes de la tormenta. Así que probamos una regla, en público: tendencia fuerte, prima escasa, no se vende. Superó nuestro estándar de evidencia en veintiún pruebas fuera de muestra, y hoy corre en vivo. Una nota honesta: en los últimos quince meses, la parte verificada con la cinta, la cobertura aún perdió mil ochocientos dólares netos. La tasa de aciertos no es lo mismo que ganar dinero. Cada una de esas pérdidas está en el registro.',
        },
        map: {
            kicker: 'Capítulo 5', title: 'El mapa',
            text: 'Aquí está todo el historial: cinco años y medio, contra el propio QQQ. La línea gris es el índice. La línea ámbar somos nosotros. Dos mil veintiuno abrió con siete semanas de espera. Los filtros nunca se pusieron en verde, así que la estrategia se quedó en efectivo mientras el mercado subía sin ella. Veinticinco de febrero: la primera entrada válida. El mercado alcista corrió todo el año, y el siete de diciembre las reglas aseguraron trece mil dólares de ganancia, semanas antes del techo del mercado. Luego llegó dos mil veintidós. El filtro de régimen dijo mercado bajista, y la estrategia pasó a efectivo durante un año completo, mientras QQQ caía treinta y cinco por ciento desde su máximo. Quedarse fuera se sentía como perderse la fiesta. Fue la decisión más valiosa de los cinco años. Abril de dos mil veintitrés: reingreso. Ese otoño trajo nuestro peor hoyo: diecisiete punto ocho por ciento, de pico a valle. El apalancamiento corta en ambos sentidos. Después, dos años de capitalización paciente. Y el ciclo final: la entrada de septiembre de dos mil veinticinco de la que oíste, la corrección de marzo de dos mil veintiséis, la renovación de junio que aseguró veintiséis mil dólares. La marca final: ciento sesenta y nueve mil doscientos cuarenta y nueve dólares, contra setenta mil novecientos por simplemente mantener QQQ. Cada momento que acabas de ver está en el registro.',
        },
        ch4: {
            kicker: 'Capítulo 6', title: 'El drawdown',
            text: 'Septiembre de dos mil veintitrés. La recuperación tiene cinco meses, y la posición está completamente abierta. Entonces la caída de otoño lleva el portafolio de sesenta y dos mil ciento tres dólares a cincuenta y un mil sesenta y siete. Diecisiete punto ocho por ciento, vivido día a día, durante siete semanas. Y esto es lo que no vamos a ocultar: el modelo que valora los primeros años suaviza las tormentas. En marzo de dos mil veintiséis, medido con la cinta real de la bolsa, la misma estrategia cayó treinta punto cuatro por ciento. Más profundo que cualquier cosa en los años del modelo. Ambos números permanecen en esta página, porque ambos son ciertos. El sistema siguió sus reglas, y el mercado se recuperó. Pero escucha esto con claridad: el rendimiento pasado, simulado o en vivo, no garantiza resultados futuros. El próximo drawdown podría ser más profundo. La recuperación nunca te es debida.',
        },
        ch5: {
            kicker: 'Capítulo 7', title: 'La comparación honesta',
            text: 'Ahora la parte que la mayoría de los servicios omite. En estos cinco años y medio, simplemente comprar y mantener QQQ rindió ciento treinta y seis por ciento, con un peor hoyo de treinta y cinco punto seis por ciento. Esta estrategia rindió cuatrocientos sesenta y cuatro por ciento, con un peor hoyo de diecisiete punto ocho. Retorno por unidad de turbulencia, el ratio de Sharpe: el índice, cero punto ocho. La estrategia, uno punto cuatro ocho. Ganamos en cada medida durante esta ventana, y esa es exactamente la razón para ser escéptico. Cinco años son un solo clima. Los años valorados por el modelo favorecen nuestra suavidad. El próximo mercado bajista no se parecerá al anterior. Estos números describen un pasado, no ningún futuro.',
        },
        ch6: {
            kicker: 'Capítulo 8', title: 'En vivo, ahora mismo',
            text: 'Desde el primero de agosto de dos mil veintiséis, esta estrategia corre en vivo en una cuenta paper de un bróker real, y desde hoy eso incluye el filtro de tendencia y prima del que acabas de oír. Cada decisión registrada a diario, en público. Estado actual: cien por ciento efectivo. Ninguna entrada válida en dos semanas. Eso no es una falla: la paciencia es la estrategia. Cuando actúa, lo ves al mismo tiempo que nosotros. Los resultados en vivo pueden ser mejores o peores que cualquier simulación.',
        },
        ch7: {
            kicker: 'Capítulo 9', title: 'Juzga tú mismo',
            text: 'Abajo: cada operación. Cada precio. Cada pérdida. Ochocientas seis ejecuciones, cada una etiquetada según cómo fue valorada. Juzga tú mismo. Esta página es material educativo, no asesoría de inversión ni una solicitud. Rendimiento simulado: los primeros años valorados por el modelo, los últimos quince meses verificados contra la cinta real de la bolsa. TradeMind nunca se conecta a tu bróker. Las señales solo te ayudan a ingresar la orden tú mismo.',
        },
    },
    ui: {
        // slide titles
        ch1title: '2 de septiembre de 2025',
        comptitle: 'Cómo se vio la paciencia', compFrom: '$10.000 en enero de 2021',
        compAria: 'Crecimiento de diez mil dólares, estrategia versus comprar y mantener QQQ, enero 2021 a agosto 2026',
        compCap: 'Ambos motores combinados; los últimos quince meses verificados con la cinta. ',
        compCapB: 'Las caídas son la matrícula de la capitalización: cuanto menor el hoyo, más rápido vuelves a tu máximo.',
        compZone: 'QQQ bajo el agua · ~25 meses', compHole: '−17,8% · de vuelta en el máximo en 10 semanas', ch2title: 'Un contrato, cien acciones',
        ch3title: 'Ganar seguido ≠ ganar', maptitle: 'Cinco años y medio, cada decisión',
        ch4title: 'Otoño de 2023, vivido día a día', ch5title: 'Nosotros vs. simplemente comprar QQQ',
        ch6title: 'El historial escribiéndose',
        // ch1
        ch1fig: 'ejecución a precio medio · cotización real $131.00 / $136.00 · primera entrada del ciclo final verificado con la cinta',
        contract: 'Contrato', positioning: 'Posicionamiento', entryChecklist: 'Filtros de entrada', fillSource: 'Fuente de ejecución',
        ch1pos: 'Muy dentro del dinero · ~1 año al vencimiento',
        ch1check: '5 filtros — momentum · tendencia · volatilidad · régimen · ML — todos en verde',
        ch1src: 'Cinta OPRA, precio medio, comisión incluida',
        // ch2
        ch2a: 'dólar por dólar con QQQ', ch2b: 'de tiempo para que la tesis madure', ch2c: 'del costo de comprar las acciones',
        ch2cap1: 'Apalancamiento con costo definido y sin préstamo de margen.',
        ch2cap2: 'Cuando QQQ cae, esto cae más rápido.',
        // ch3
        ch3a: 'operaciones de covered call · 5.6 años', ch3b: 'tasa de aciertos', ch3c: 'resultado neto de la cobertura',
        ch3p1: 'Los datos también nos enseñaron cuándo ', ch3p2: 'no', ch3p3: ' vender: tendencia fuerte + prima escasa = no se vende — una regla probada en público, adoptada tras 21 pruebas fuera de muestra. Y aún así: en la cinta real, la cobertura de los últimos 15 meses perdió $1,776 netos. ',
        ch3p4: 'Cada pérdida está en el registro.',
        // map
        mapCap1: 'Toca cualquier marcador para ver la ejecución real. ',
        mapCap2: 'Las pérdidas también están anotadas — son parte del historial.',
        mapLegendQ: 'Precio de QQQ', mapLegendS: 'Portafolio TradeMind',
        mapIdx: 'ambos indexados a 100 · ene 2021', replay: '↺ Repetir',
        mapAria: 'Precio de QQQ versus valor del portafolio de la estrategia, indexados a 100, enero 2021 a agosto 2026, con ocho puntos de decisión anotados',
        // ch4
        ch4a: '5 de septiembre de 2023 — el pico', ch4b: '26 de octubre — siete semanas después', ch4c: 'drawdown máximo · años valorados por el modelo',
        ch4cap1: 'El modelo que valora los primeros años suaviza las tormentas: en la cinta real, marzo de 2026 midió ',
        ch4cap2: '. Ambos números permanecen en esta página, porque ambos son ciertos. ',
        ch4cap3: 'El próximo drawdown podría ser más profundo — la recuperación nunca te es debida.',
        // ch5
        ch5a: 'estrategia · 5.6 años', ch5b: 'QQQ comprar y mantener', ch5c: 'nuestro peor hoyo', ch5d: 'el peor hoyo de QQQ',
        ch5cap1: 'Ratio de Sharpe: 1.48 contra 0.80. Ganamos en cada medida durante esta ventana — ',
        ch5cap2: 'y esa es exactamente la razón para ser escéptico. Cinco años son un solo clima; el próximo mercado bajista no se parecerá al último.',
        // ch6
        status: 'Estado', livePaper: 'Paper trading en vivo · IBKR', since: 'Desde', sinceVal: '1 de agosto de 2026', curPos: 'Posición actual',
        cash: '100% efectivo', dips: 'Caídas válidas hasta ahora', gate: 'Filtro de cobertura',
        gateVal: 'Regla tendencia × prima — en vivo desde el 17 ago 2026', logged: 'Decisiones registradas',
        loggedVal: 'Cada día de mercado, en público',
        ch6cap1: 'La paciencia es la estrategia. Cuando actúa, lo ves al mismo tiempo que nosotros. ',
        ch6cap2: 'Los resultados en vivo pueden ser mejores o peores que cualquier simulación.',
        // ch7
        ch7title: 'Las {n} ejecuciones. Nada oculto.',
        ch7pre1: 'Cada ejecución de este registro está ',
        ch7pre2: 'valorada por el modelo',
        ch7pre3: ' (Black-Scholes sobre volatilidad implícita del VIX, $1 por contrato; strikes modelados redondeados al dólar, vencimientos de plazo fijo por mes). Los últimos 15 meses se reejecutaron de forma independiente sobre la cinta real OPRA — ver el apéndice.',
        // appendix
        appKicker: 'Apéndice · Cómo se construye el historial',
        appTitle: 'Cómo hacemos backtesting — y cómo la estrategia gana sus cambios',
        m1t: 'Dos capas de valoración, ambas divulgadas',
        m1p: '2021 – mayo 2025: ejecuciones valoradas por el modelo — Black-Scholes sobre volatilidad implícita del VIX, comisiones de $1 por contrato, strikes modelados (redondeados) y vencimientos de plazo fijo. Junio 2025 – agosto 2026: reejecutado de forma independiente sobre la cinta NBBO real de OPRA vía Databento — ejecuciones a precio medio en contratos listados reales, vencimientos listados reales, $0.65 por contrato.',
        m2t: 'La verificación de fidelidad',
        m2p: 'Los mismos 15 meses finales, ambos motores. Modelo: +61.1%, peor caída −11.7%. Cinta real: +83.9%, peor caída −30.4%. El modelo subestima las tormentas — por eso cada número de drawdown en esta página dice qué motor lo midió.',
        m3t: 'Las ideas ganan su lugar',
        m3p: 'Las mejoras se prueban como experimentos walk-forward — entrenadas con datos pasados, juzgadas en 21 trayectorias fuera de muestra, y adoptadas solo si superan un estándar estricto. El filtro tendencia × prima de la cobertura lo superó (18 de 21) y entró en vivo el 17 de agosto de 2026. Las ideas que fallan se rechazan en público.',
        wTitle: 'La misma cinta, distintas ventanas',
        wSub: 'Ninguna estrategia gana todos los meses. Aquí está el historial completo dividido en sus regímenes — incluidas las ventanas donde comprar y mantener era el mejor asiento.',
        wCap1: 'Misma simulación, mismas reglas — solo segmentada. ',
        wCap2: 'El estiramiento de dos años es la ventana donde comprar y mantener nos ganó (+41.7% contra +38.7%). Permanece en la tabla.',
        // close
        closeKicker: 'La letra pequeña, a la vista', closeTitle: 'Metodología y divulgaciones',
        disc1: 'Metodología.',
        disc1p: ' Simulación del 4 de enero de 2021 al 14 de agosto de 2026. Las ejecuciones de 2021 a mayo 2025 están valoradas por el modelo: Black-Scholes sobre volatilidad implícita del VIX, comisiones de $1 por contrato, strikes modelados (redondeados al dólar más cercano) y vencimientos de plazo fijo — no contratos listados. Junio 2025 – 14 de agosto de 2026 se reejecutó de forma independiente sobre cotizaciones NBBO reales de OPRA (Databento): ejecuciones a precio medio en el contrato listado real en cada barra de decisión, vencimientos listados reales, $0.65 por contrato — ese segmento de 15 meses rindió +83.9% con un drawdown máximo de −30.4% (motor del modelo para la misma ventana: +61.1%, −11.7%). Capa en vivo: cuenta paper de IBKR, decisiones registradas a diario desde el 1 de agosto de 2026.',
        disc2: 'Rendimiento simulado. Los últimos quince meses son lo más cercano al trading en vivo que puede llegar un backtest — cotizaciones reales, ejecuciones a precio medio. El rendimiento pasado — simulado o en vivo — no garantiza resultados futuros.',
        disc2p: ' Las opciones implican un riesgo sustancial y no son adecuadas para todos los inversores; puedes perder toda tu inversión. Los resultados simulados tienen limitaciones inherentes: no hubo dinero real en riesgo, algunos resultados se benefician de la retrospectiva, y las simulaciones pueden sobre o subcompensar la liquidez y el impacto de mercado. TradeMind nunca se conecta a tu bróker ni envía órdenes — las señales solo te ayudan a ingresar la orden tú mismo. Esta página es material educativo, no asesoría de inversión ni una solicitud.',
        transcriptSummary: 'Transcripción completa de la narración',
        cta: 'Abre tu cuenta',
        winFull: 'Historial completo', winFullDates: 'ene 2021 → ago 2026',
        playLbl: '▶ Reproducir', pauseLbl: '❚❚ Pausa',
        ch4from: 'ene 2021', ch4to: 'ago 2026 · $169,249',
        ch4aria: 'Curva de capital de la estrategia, enero 2021 a agosto 2026',
    },
    beats: [
        { label: 'En efectivo — 7 semanas, 0 operaciones', tip: 'Ene–feb 2021 · ninguna entrada válida · portafolio plano en $30,000 mientras QQQ subía' },
        { label: 'Entrada 1 · 25 feb 2021', tip: 'Primera LEAPS abierta · valorada por el modelo a $91.87 · el mercado alcista corrió todo el año' },
        { label: 'Asegurar ganancias · +$13.3k', tip: '7 dic 2021 · las reglas aseguraron las ganancias — semanas antes del techo del mercado' },
        { label: 'El año bajista — en efectivo', tip: 'Abr 2022–abr 2023 · capturó la primera caída (−9.5%), luego plano 12 meses mientras QQQ caía −35.6% de pico a valle' },
        { label: 'Nuestro peor hoyo · −17.8%', tip: '5 sep – 26 oct 2023 · $62,103 → $51,067 · el apalancamiento cortó en ambos sentidos' },
        { label: 'El ciclo final · 2 sep 2025', tip: 'La entrada verificada con la cinta del Capítulo 1 · $465C ejecutada a $133.50 precio medio en la cinta real OPRA' },
        { label: 'La corrección de 2026', tip: 'Ene–mar 2026 · motor del modelo −10.0% · motor de cinta real −30.4% — publicamos ambos' },
        { label: 'Marca final · $169,249', tip: '14 ago 2026 · contra $70,907 por comprar y mantener · simulado, no una promesa' },
    ],
    beatTimes: [19.89, 24.16, 32.1, 49.37, 69.99, 82.89, 86.96, 95.1],
    windows: [
        { label: 'El mercado alcista de 2021', regime: 'Alcista · 3 entradas · +$13.3k asegurados en diciembre' },
        { label: 'El año bajista', regime: 'Bajista · capturó la primera caída, luego plano 12 meses · QQQ −35.6% de pico a valle' },
        { label: 'Recuperación, luego nuestro peor hoyo', regime: 'Reingreso · corrección de otoño −17.8%' },
        { label: 'El estiramiento de dos años', regime: 'Alcista · comprar y mantener era el mejor asiento aquí · espera de 5 meses en efectivo en 2025' },
        { label: 'El ciclo final — verificado con la cinta', regime: 'Entradas en caídas → corrección → renovación +$26.4k · cinta real OPRA' },
    ],
    fullWindow: { label: 'Historial completo — 5.6 años', regime: 'Todos los regímenes · alcista, bajista, corrección' },
    ledger: {
        actions: { 'BUY TO OPEN': 'COMPRA A APERTURA', 'SELL TO CLOSE': 'VENTA A CIERRE', 'SELL TO OPEN': 'VENTA A APERTURA', 'BUY TO CLOSE': 'COMPRA A CIERRE' },
        reasons: {
            'Overlay opened': 'Cobertura abierta',
            'Overlay closed — target': 'Cobertura cerrada — objetivo',
            'Overlay closed — risk': 'Cobertura cerrada — riesgo',
            'Entry checklist — all gates green': 'Filtros de entrada — todos en verde',
            'Position rolled': 'Posición renovada',
            'Overlay closed — LEAPS exit': 'Cobertura cerrada — salida LEAPS',
            'Final mark': 'Marca final',
            'Profit lock — rules banked gains': 'Asegurar ganancias — las reglas las concretaron',
        },
    },
    ledgerHead: { date: 'Fecha', leg: 'Pata', action: 'Acción', contract: 'Contrato', qty: 'Cant.', price: 'Precio', pnl: 'P&G', outcome: 'Motivo' },
    ledgerTag: { LEAPS: 'LEAPS', CC: 'CC' },
    tableHead: { window: 'Ventana', dates: 'Fechas', what: 'Qué fue', strategy: 'Estrategia', qqq: 'QQQ', worstDip: 'Peor caída', fills: 'Operaciones' },
    fallback: {
        hero: 'Pulsa reproducir para comenzar la historia.',
        appendix: 'Cómo se construye el historial — metodología y ventanas de régimen.',
        close: 'Metodología, divulgaciones y la transcripción completa.',
    },
    aria: {
        prev: 'Diapositiva anterior', next: 'Diapositiva siguiente', playPause: 'Reproducir o pausar la narración',
        mute: 'Silenciar la narración', muted: 'Silenciado', sound: 'Sonido activado', slide: 'Diapositiva',
        transcript: 'Transcripción de la narración', replay: 'Repetir la animación', transcriptOpen: 'transcript_open',
    },
};

/* ── Chinese (Simplified) ────────────────────────────────────────────────── */

const zh: StoryOverlay = {
    chapters: {
        ch1: {
            kicker: '第一章', title: '一笔真实的交易',
            text: '2025年9月2日。QQQ低开。大多数人看到的是一根阴线。我们的系统看到的是一张检查清单。五个入场关卡:动量、趋势、波动率、市场状态、模型置信度。那天早上,它们同时全部转绿。于是策略执行了它的使命:买入一张深度实值的LEAPS看涨期权。QQQ465行权价,2026年9月到期。成交价133.50美元——真实的中间价,来自真实的交易所行情。这笔交易属于你即将听到的五年半完整记录,并且属于最后十五个月——我们逐笔对照真实行情核验过的那一段。',
        },
        compound: {
            kicker: '第二章', title: '耐心的样子',
            text: '在讲机制之前,先说清楚这一切的意义。一万美元投入这个策略,五年半后变成五万六千四百美元。同样的钱放在QQQ里,变成两万三千六百美元。也就是每年百分之三十六点三,对比百分之十六点六,翻了一倍还多。而这个差距为什么存在?当二零二二年熊市到来时,只是持有QQQ,意味着在水下待上将近二十五个月,才能回到原点。这个策略则持币观望,然后重新入场。它五年里最深的坑,百分之十七点八,十周就修复了。这不是一个需要你盯盘的交易系统,而是一项长期投资:规则说行动时才行动,其余时间,它等待。五年里最有价值的一个决定,就是在市场下跌的那十二个月里,什么都不做。',
        },
        ch2: {
            kicker: '第三章', title: '引擎',
            text: 'LEAPS看涨期权是一种长期期权。这一张合约控制一百股QQQ,期限超过一年,而成本只是正股价格的一小部分。由于深度实值,它几乎与指数一比一同步波动。这就是引擎:以确定的成本、无需融资,获得对QQQ的杠杆敞口。但杠杆是双刃剑。当QQQ下跌时,这个仓位跌得更快。马上你就会看到。',
        },
        ch3: {
            kicker: '第四章', title: '增强层',
            text: '在持有LEAPS的同时,策略对其卖出短期看涨期权,一周一周地收割权利金。五年半里,这样的交易共392笔。85%盈利,净增32,945美元。但记录也教会了我们何时不卖。在强趋势、权利金微薄时,增强层会把收益吐回去——就像在暴风雨前卖出保险。于是我们公开测试了一条规则:强趋势、薄权利金,不卖。它在21次样本外测试中通过了我们的证据门槛,今天已在实盘运行。一个诚实的脚注:在最后十五个月——用真实行情核验的部分——增强层仍净亏损1,800美元。胜率高不等于赚钱。每一笔亏损都在账本里。',
        },
        map: {
            kicker: '第五章', title: '全景图',
            text: '这里是完整的记录——五年半,与QQQ本身对比。灰线是指数。琥珀色线是我们。2021年以七周的等待开局。关卡始终没有转绿,于是策略持有现金,眼看着市场独自上涨。2月25日:第一个合格的入场信号。牛市跑了整整一年,12月7日,规则锁定了1.3万美元利润——比市场见顶早了几周。然后2022年到来了。市场状态过滤器判定熊市,策略转入现金整整一年,而QQQ从高点下跌了35%。空仓观望感觉像错过行情。但这是五年里最有价值的决定。2023年4月:重新入场。那年秋天带来了我们最深的坑——从高点到低点17.8%。杠杆是双刃剑。之后是两年耐心的复利增长。最后是最后一个周期:你听过的2025年9月入场,2026年3月的回调,6月移仓锁定2.6万美元。最终数字:169,249美元——而简单持有QQQ是70,900美元。你刚才看到的每一个时刻都在账本里。',
        },
        ch4: {
            kicker: '第六章', title: '回撤',
            text: '2023年9月。复苏已有五个月,仓位完全打开。然后秋季回调把组合从62,103美元打到51,067美元。17.8%,七周时间,一天一天熬过来的。还有一点我们绝不隐瞒:给早年定价的模型会抚平风暴。2026年3月——用真实交易所行情测量——同一个策略回撤了30.4%。比模型年代的任何一次都深。两个数字都留在这页上,因为两个都是真的。系统遵守了规则,市场后来回升了。但请听清楚:过往表现——无论模拟还是实盘——不保证未来结果。下一次回撤可能更深。市场从不欠你一次复苏。',
        },
        ch5: {
            kicker: '第七章', title: '诚实的对比',
            text: '现在是大多数服务商会省略的部分。在这五年半里,简单买入并持有QQQ回报136%,最深的坑35.6%。本策略回报464%,最深的坑17.8%。单位波动承受的回报——夏普比率:指数0.8,策略1.48。在这个窗口里我们每项指标都赢了——而这正是你应该保持怀疑的原因。五年只是一种天气。模型定价的年份美化了我们的平滑度。下一轮熊市不会长得像上一轮。这些数字描述的是一段过去——而不是任何未来。',
        },
        ch6: {
            kicker: '第八章', title: '正在直播',
            text: '从2026年8月1日起,这个策略在真实券商的模拟账户上实盘运行——从今天起,还包括你刚才听到的趋势与权利金门槛。每个决策每天公开记录。当前状态:百分之百现金。两周内没有合格的入场。这不是故障——耐心就是策略。当它行动时,你和我们同时看到。实盘结果可能好于或差于任何模拟。',
        },
        ch7: {
            kicker: '第九章', title: '请你自行判断',
            text: '下面:每一笔交易。每一个价格。每一笔亏损。806笔成交,每笔都标注了定价方式。请你自行判断。本页面是教育材料,不是投资建议或要约。模拟业绩——早年由模型定价,最后十五个月用真实交易所行情核验。TradeMind从不连接你的券商。信号只是帮助你自己下单。',
        },
    },
    ui: {
        // slide titles
        ch1title: '2025年9月2日',
        comptitle: '耐心的样子', compFrom: '2021年1月的一万美元',
        compAria: '一万美元的增长曲线:策略对比买入并持有QQQ,2021年1月至2026年8月',
        compCap: '两套引擎合并计算;最后十五个月经真实行情核验。',
        compCapB: '回撤是复利的学费——坑越浅,回到新高越快。',
        compZone: 'QQQ 水下期 · 约25个月', compHole: '−17.8% · 十周重回高点', ch2title: '一张合约,一百股',
        ch3title: '常赢 ≠ 赚钱', maptitle: '五年半,每一个决定',
        ch4title: '2023年的秋天,一天一天地经历', ch5title: '我们 vs. 简单买入QQQ',
        ch6title: '正在书写的记录',
        // ch1
        ch1fig: '中间价成交 · 真实交易所报价 $131.00 / $136.00 · 最后一个经行情核验周期的首次入场',
        contract: '合约', positioning: '仓位性质', entryChecklist: '入场检查', fillSource: '成交来源',
        ch1pos: '深度实值 · 距到期约1年',
        ch1check: '5个关卡——动量 · 趋势 · 波动率 · 状态 · ML——全部转绿',
        ch1src: 'OPRA行情,中间价,含佣金',
        ch2a: '与QQQ几乎1:1联动', ch2b: '留给论点发酵的时间', ch2c: '约为直接买股成本的比例',
        ch2cap1: '杠杆敞口,成本确定,无融资借贷。',
        ch2cap2: 'QQQ下跌时,它跌得更快。',
        ch3a: '备兑看涨交易 · 5.6年', ch3b: '胜率', ch3c: '增强层净结果',
        ch3p1: '数据也教会了我们何时', ch3p2: '不', ch3p3: '卖:强趋势+薄权利金=不卖——一条公开测试、经21次样本外验证后采纳的规则。但即便如此:在真实行情上,最后15个月的增强层仍净亏损$1,776。',
        ch3p4: '每一笔亏损都在账本里。',
        mapCap1: '点击任意标记查看真实成交。',
        mapCap2: '亏损同样被标注——它们是记录的一部分。',
        mapLegendQ: 'QQQ价格', mapLegendS: 'TradeMind组合',
        mapIdx: '均以100为基点 · 2021年1月', replay: '↺ 重播',
        mapAria: 'QQQ价格与策略组合价值对比,以100为基点,2021年1月至2026年8月,含八个决策标注点',
        ch4a: '2023年9月5日——高点', ch4b: '10月26日——七周后', ch4c: '最大回撤 · 模型定价年份',
        ch4cap1: '给早年定价的模型会抚平风暴——在真实行情上,2026年3月测得 ',
        ch4cap2: '。两个数字都留在这页上,因为两个都是真的。',
        ch4cap3: '下一次回撤可能更深——市场从不欠你一次复苏。',
        ch5a: '策略 · 5.6年', ch5b: 'QQQ买入持有', ch5c: '我们最深的坑', ch5d: 'QQQ最深的坑',
        ch5cap1: '夏普比率:1.48 对 0.80。这个窗口里我们每项都赢了——',
        ch5cap2: '而这正是你应该怀疑的原因。五年只是一种天气;下一轮熊市不会长得像上一轮。',
        status: '状态', livePaper: '实盘模拟交易中 · IBKR', since: '开始于', sinceVal: '2026年8月1日', curPos: '当前仓位',
        cash: '100% 现金', dips: '迄今合格回调次数', gate: '增强层门槛',
        gateVal: '趋势×权利金规则——2026年8月17日起上线', logged: '决策记录',
        loggedVal: '每个交易日,公开记录',
        ch6cap1: '耐心就是策略。当它行动时,你和我们同时看到。',
        ch6cap2: '实盘结果可能好于或差于任何模拟。',
        ch7title: '全部{n}笔成交。无所隐瞒。',
        ch7pre1: '此账本中每笔成交均为',
        ch7pre2: '模型定价',
        ch7pre3: '(基于VIX隐含波动率的Black-Scholes模型,每合约$1佣金;行权价为模型值并四舍五入到整数,固定期限到期日按月份显示)。最后15个月已基于真实OPRA行情独立重跑——见附录。',
        appKicker: '附录 · 记录如何生成', appTitle: '我们如何回测——以及策略如何赢得每次修改',
        m1t: '两层定价,全部披露',
        m1p: '2021年–2025年5月:模型定价成交——基于VIX隐含波动率的Black-Scholes模型,每合约$1佣金,模型行权价(取整显示)与固定期限到期日。2025年6月–2026年8月:通过Databento在真实OPRA NBBO行情上独立重跑——按当时真实上市合约的中间价成交、真实到期日、每合约$0.65。',
        m2t: '保真度交叉检验',
        m2p: '同样最后15个月,两个引擎。模型定价:+61.1%,最深回撤−11.7%。真实行情:+83.9%,最深回撤−30.4%。模型低估了风暴——所以本页每个回撤数字都标明了是哪个引擎测的。',
        m3t: '想法要靠表现赢得位置',
        m3p: '改进以滚动前推实验的方式测试——用历史数据训练,在21条样本外路径上评判,只有跨过严格门槛才被采纳。增强层的趋势×权利金门槛通过了(21中18),并于2026年8月17日上线。失败的想法会被公开否决。',
        wTitle: '同一行情,不同窗口',
        wSub: '没有策略每月都赢。这里是完整记录按市场状态的切分——包括买入持有更占优的窗口。',
        wCap1: '同一模拟,同一规则——只是切片。',
        wCap2: '两年拉锯期是买入持有胜过我们的窗口(+41.7% 对 +38.7%)。它留在表里。',
        closeKicker: '小字条款,公开示人', closeTitle: '方法论与披露',
        disc1: '方法论。',
        disc1p: ' 模拟区间:2021年1月4日–2026年8月14日。2021年–2025年5月的成交为模型定价:基于VIX隐含波动率的Black-Scholes模型,每合约$1佣金,模型行权价(四舍五入到整数)与固定期限到期日——非真实上市合约。2025年6月–2026年8月14日基于真实OPRA NBBO报价(Databento)独立重跑:在每个决策时点按真实上市合约的中间价成交,真实到期日,每合约$0.65——该15个月区间回报+83.9%,最大回撤−30.4%(模型引擎同区间:+61.1%,−11.7%)。实盘层:IBKR模拟账户,自2026年8月1日起每日记录决策。',
        disc2: '模拟业绩。最后十五个月已尽可能接近实盘——真实报价、中间价成交。过往表现——无论模拟或实盘——不保证未来结果。',
        disc2p: ' 期权涉及重大风险,并不适合所有投资者;你可能损失全部投资。模拟结果存在固有局限:没有真实资金承担风险,部分结果得益于事后视角,且模拟可能高估或低估流动性与市场冲击。TradeMind从不连接你的券商或提交订单——信号只是帮助你自己下单。本页面为教育材料,非投资建议或要约。',
        transcriptSummary: '完整旁白文字稿',
        cta: '开设你的账户',
        winFull: '完整记录', winFullDates: '2021年1月 → 2026年8月',
        playLbl: '▶ 播放', pauseLbl: '❚❚ 暂停',
        ch4from: '2021年1月', ch4to: '2026年8月 · $169,249',
        ch4aria: '策略净值曲线,2021年1月至2026年8月',
    },
    beats: [
        { label: '空仓——7周,0笔交易', tip: '2021年1–2月 · 无合格入场 · 组合持平于$30,000,QQQ却在上涨' },
        { label: '首次入场 · 2021年2月25日', tip: '第一张LEAPS开仓 · 模型定价$91.87 · 牛市跑了整整一年' },
        { label: '利润锁定 · +$13.3k', tip: '2021年12月7日 · 规则锁定利润——比市场见顶早了几周' },
        { label: '熊市之年——全程空仓', tip: '2022年4月–2023年4月 · 吃到第一段下跌(−9.5%),随后12个月空仓,QQQ自高点下跌−35.6%' },
        { label: '最深的坑 · −17.8%', tip: '2023年9月5日–10月26日 · $62,103 → $51,067 · 杠杆双刃剑' },
        { label: '最后周期 · 2025年9月2日', tip: '第一章中经行情核验的入场 · $465C以中间价$133.50成交于真实OPRA行情' },
        { label: '2026年回调', tip: '2026年1–3月 · 模型引擎−10.0% · 真实行情引擎−30.4%——两者都公布' },
        { label: '最终数字 · $169,249', tip: '2026年8月14日 · 买入持有为$70,907 · 模拟业绩,并非承诺' },
    ],
    beatTimes: [16.92, 21.08, 27.43, 42.41, 62.15, 76.53, 78.59, 85.45],
    windows: [
        { label: '2021年牛市', regime: '牛市 · 3次入场 · 12月锁定利润+$13.3k' },
        { label: '熊市之年', regime: '熊市 · 吃到第一段下跌后空仓12个月 · QQQ自高点−35.6%' },
        { label: '复苏,然后最深的坑', regime: '重新入场 · 秋季回调−17.8%' },
        { label: '两年拉锯', regime: '牛市 · 此窗口买入持有更优 · 2025年空仓等待5个月' },
        { label: '最后周期——行情核验', regime: '回调入场 → 修正 → 移仓+$26.4k · 真实OPRA行情' },
    ],
    fullWindow: { label: '完整记录——5.6年', regime: '全部市场状态 · 牛市、熊市、回调' },
    ledger: {
        actions: { 'BUY TO OPEN': '买入开仓', 'SELL TO CLOSE': '卖出平仓', 'SELL TO OPEN': '卖出开仓', 'BUY TO CLOSE': '买入平仓' },
        reasons: {
            'Overlay opened': '增强层开仓',
            'Overlay closed — target': '增强层平仓——达标',
            'Overlay closed — risk': '增强层平仓——风控',
            'Entry checklist — all gates green': '入场检查——全部关卡转绿',
            'Position rolled': '仓位移仓',
            'Overlay closed — LEAPS exit': '增强层平仓——LEAPS退出',
            'Final mark': '最终估值',
            'Profit lock — rules banked gains': '利润锁定——规则落袋',
        },
    },
    ledgerHead: { date: '日期', leg: '类型', action: '操作', contract: '合约', qty: '数量', price: '价格', pnl: '盈亏', outcome: '原因' },
    ledgerTag: { LEAPS: 'LEAPS', CC: '备兑' },
    tableHead: { window: '窗口', dates: '日期', what: '市场状态', strategy: '策略', qqq: 'QQQ', worstDip: '最深回撤', fills: '成交数' },
    fallback: {
        hero: '按播放键开始。',
        appendix: '记录如何生成——方法论与市场状态窗口。',
        close: '方法论、披露与完整文字稿。',
    },
    aria: {
        prev: '上一页', next: '下一页', playPause: '播放或暂停旁白',
        mute: '静音旁白', muted: '已静音', sound: '声音开启', slide: '第',
        transcript: '旁白文字稿', replay: '重播动画', transcriptOpen: 'transcript_open',
    },
};

export const STORY_I18N: Record<StoryLang, StoryOverlay | undefined> = { en: undefined, es, zh };
