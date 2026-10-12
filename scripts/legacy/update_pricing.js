const fs = require('fs');
const path = require('path');

const langs = {
    'en': {
        "title": "Transparent Pricing.",
        "subtitle": "Zero AUM Fees.",
        "description": "We are a software platform, not a hedge fund. We don't take a percentage of your wealth. Keep 100% of your compounding gains.",
        "popular": "Most Popular",
        "billed": "All tiers include a 14-day free trial — credit card required, cancel anytime online.",
        "monthly_tab": "Monthly",
        "annual_tab": "Annually",
        "save_badge": "SAVE",
        "trial_notice": "ALL TIERS INCLUDE A 14-DAY FREE TRIAL",
        "trial_notice_sub": "All plans include a 14-day free trial — credit card required, cancel anytime online.",
        "loading": "Redirecting...",
        "disclaimer": "Past performance does not guarantee future results. TurboCore Pro requires an options-approved brokerage account. All signals are educational and do not constitute personalized financial advice.",
        "turbocore": {
            "name": "TurboCore",
            "tagline": "AI-powered daily signals. Works with any brokerage.",
            "description": "Follow daily AI signals to build wealth with Nasdaq-100 ETFs. No options account needed — use any brokerage, or connect Tastytrade for one-click auto-execution.",
            "btn": "Start Compounding",
            "period": "/mo",
            "billed_monthly": "Billed monthly",
            "billed_annually": "Billed $249 annually",
            "save_text": "Save 28% — 3.5 months free",
            "save_short": "Save 28%",
            "features": [
                "Daily AI regime signal — BULL / SIDEWAYS / BEAR",
                "ML confidence score (0–100) with every signal",
                "Virtual portfolio — AI allocates assets to your balance",
                "Works with any brokerage — follow signals manually",
                "Tastytrade API — submit orders with one tap or auto-approve",
                "TQQQ + QQQ + SGOV strategy — no options access required",
                "27.8% historical CAGR — 2× QQQ's return over 7 years",
                "Standard dashboard & position tracker"
            ]
        },
        "turbocore_pro": {
            "name": "TurboCore Pro",
            "tagline": "LEAPS-powered alpha. 3× QQQ returns, positive in 2022.",
            "description": "The full institutional-grade engine. Deploys QQQ LEAPS options in bull markets for amplified gains while moving 100% to T-bills in bear markets — all on autopilot. Requires options-approved brokerage account.",
            "btn": "Go Pro",
            "period": "/mo",
            "billed_monthly": "Billed monthly",
            "billed_annually": "Billed $399 annually",
            "save_text": "Save 32% — 4 months free",
            "save_short": "Save 32%",
            "features": [
                "Everything in TurboCore, plus:",
                "QQQ LEAPS options strategy — 3–4× leverage without daily ETF decay",
                "39.3% historical CAGR — 3× QQQ's return over 7 years",
                "+21.4% gain in 2022 — the year QQQ crashed −33%",
                "Dynamic VIX-adjusted position sizing",
                "Multi-layer AI regime engine (HMM + XGBoost + Neural Net)",
                "Early signal access — signals delivered before market open",
                "Tastytrade API — auto-submit LEAPS orders with your approval",
                "⚠ Requires options-approved brokerage account (Level 2+)"
            ]
        },
        "both_bundle": {
            "name": "Full Strategy Bundle",
            "tagline": "Every signal. Every strategy. One unstoppable system.",
            "description": "Run both TurboCore and TurboCore Pro simultaneously. The AI dynamically allocates between ETF momentum and LEAPS leverage based on market conditions — the most complete compounding engine we offer.",
            "btn": "Get Everything",
            "period": "/mo",
            "billed_monthly": "Billed monthly",
            "billed_annually": "Billed $549 annually",
            "save_text": "Save 33% — 4 months free",
            "save_short": "Save 33%",
            "features": [
                "TurboCore + TurboCore Pro — both models running in parallel",
                "Virtual portfolio with unified asset allocation across both strategies",
                "TurboBounce Mean-Reversion Alpha layer",
                "Custom portfolio allocation tooling — set your own risk level",
                "Tastytrade API — full auto-execution for both ETF + LEAPS signals",
                "Position dashboard — live P&L across all strategy layers",
                "Priority support"
            ]
        }
    },
    'es': {
        "title": "Precios Transparentes.",
        "subtitle": "Sin Comisiones por AUM.",
        "description": "Somos una plataforma de software, no un fondo de cobertura. No tomamos un porcentaje de tu riqueza. Quédate con el 100% de tus ganancias compuestas.",
        "popular": "Más Popular",
        "billed": "Todos los niveles incluyen una prueba gratuita de 14 días — tarjeta requerida, cancela cuando quieras.",
        "monthly_tab": "Mensual",
        "annual_tab": "Anual",
        "save_badge": "AHORRA",
        "trial_notice": "TODOS LOS NIVELES INCLUYEN UNA PRUEBA GRATUITA DE 14 DÍAS",
        "trial_notice_sub": "Todos los planes incluyen una prueba de 14 días — tarjeta requerida, cancela en cualquier momento.",
        "loading": "Redirigiendo...",
        "disclaimer": "El rendimiento pasado no garantiza resultados futuros. TurboCore Pro requiere una cuenta con aprobación de opciones. Todas las señales son educativas y no constituyen asesoramiento financiero personalizado.",
        "turbocore": {
            "name": "TurboCore",
            "tagline": "Señales diarias de IA. Funciona con cualquier corredor.",
            "description": "Sigue señales diarias de IA para construir riqueza con ETFs del Nasdaq-100. No necesitas cuenta de opciones — usa cualquier corredor o conecta Tastytrade para ejecución automática con un toque.",
            "btn": "Empezar a Componer",
            "period": "/mes",
            "billed_monthly": "Facturado mensualmente",
            "billed_annually": "Facturado $249 anualmente",
            "save_text": "Ahorra 28% — 3.5 meses gratis",
            "save_short": "Ahorra 28%",
            "features": [
                "Señal de régimen de IA diaria — ALCISTA / LATERAL / BAJISTA",
                "Puntuación de confianza ML (0–100) con cada señal",
                "Portafolio virtual — la IA distribuye los activos según tu saldo",
                "Funciona con cualquier corredor — sigue las señales manualmente",
                "API Tastytrade — envía órdenes con un toque o en automático",
                "Estrategia TQQQ + QQQ + SGOV — no requiere acceso a opciones",
                "27.8% CAGR histórico — 2× el retorno del QQQ en 7 años",
                "Panel estándar y seguimiento de posiciones"
            ]
        },
        "turbocore_pro": {
            "name": "TurboCore Pro",
            "tagline": "Alpha con LEAPS. 3× el retorno del QQQ, positivo en 2022.",
            "description": "El motor institucional completo. Despliega opciones QQQ LEAPS en mercados alcistas para ganancias amplificadas, y mueve el 100% a T-bills en mercados bajistas — todo en piloto automático. Requiere cuenta con aprobación de opciones.",
            "btn": "Obtener Pro",
            "period": "/mes",
            "billed_monthly": "Facturado mensualmente",
            "billed_annually": "Facturado $399 anualmente",
            "save_text": "Ahorra 32% — 4 meses gratis",
            "save_short": "Ahorra 32%",
            "features": [
                "Todo lo de TurboCore, más:",
                "Estrategia LEAPS QQQ — apalancamiento 3–4× sin decay de ETF diario",
                "39.3% CAGR histórico — 3× el retorno del QQQ en 7 años",
                "+21.4% de ganancia en 2022 — el año que QQQ cayó −33%",
                "Tamaño de posición ajustado dinámicamente por VIX",
                "Motor de régimen IA multicapa (HMM + XGBoost + Red Neuronal)",
                "Acceso temprano a señales — entregadas antes de la apertura del mercado",
                "API Tastytrade — envío automático de órdenes LEAPS con tu aprobación",
                "⚠ Requiere cuenta con aprobación de opciones (Nivel 2+)"
            ]
        },
        "both_bundle": {
            "name": "Bundle Completo",
            "tagline": "Cada señal. Cada estrategia. Un sistema imparable.",
            "description": "Ejecuta TurboCore y TurboCore Pro simultáneamente. La IA asigna dinámicamente entre momentum ETF y apalancamiento LEAPS según las condiciones del mercado.",
            "btn": "Obtener Todo",
            "period": "/mes",
            "billed_monthly": "Facturado mensualmente",
            "billed_annually": "Facturado $549 anualmente",
            "save_text": "Ahorra 33% — 4 meses gratis",
            "save_short": "Ahorra 33%",
            "features": [
                "TurboCore + TurboCore Pro — ambos modelos en paralelo",
                "Portafolio virtual con asignación unificada entre ambas estrategias",
                "Capa Alpha de Reversión Media TurboBounce",
                "Herramientas de asignación personalizadas — define tu propio nivel de riesgo",
                "API Tastytrade — auto-ejecución para señales ETF + LEAPS",
                "Panel de posiciones — P&L en vivo en todas las capas de estrategia",
                "Soporte prioritario"
            ]
        }
    },
    'zh': {
        "title": "透明定价。",
        "subtitle": "零资产管理费。",
        "description": "我们是一家软件平台，不是对冲基金。我们不抽取您的利润分成，您保留100%的复利收益。",
        "popular": "最受欢迎",
        "billed": "所有层级均含 14 天免费试用 — 需绑定信用卡，随时可取消。",
        "monthly_tab": "按月",
        "annual_tab": "按年",
        "save_badge": "立省",
        "trial_notice": "所有层级均包含 14 天免费试用",
        "trial_notice_sub": "所有计划均含 14 天免费试用 — 需绑定信用卡，随时可取消。",
        "loading": "正在跳转...",
        "disclaimer": "历史业绩不保证未来收益。TurboCore Pro 需要已获批期权的经纪账户。所有信号仅供教育参考，不构成个性化投资建议。",
        "turbocore": {
            "name": "TurboCore",
            "tagline": "AI 每日信号，支持任意券商。",
            "description": "每天跟随 AI 信号，通过纳斯达克 100 ETF 积累财富。无需期权账户 — 可使用任意券商手动跟单，或连接 Tastytrade 一键自动执行。",
            "btn": "开始复利",
            "period": "/月",
            "billed_monthly": "按月计费",
            "billed_annually": "按年计费 $249",
            "save_text": "省 28% — 免费 3.5 个月",
            "save_short": "省 28%",
            "features": [
                "每日 AI 市场状态信号 — 牛市 / 震荡 / 熊市",
                "每条信号附带 ML 信心分数（0–100）",
                "虚拟投资组合 — AI 根据您的账户自动分配资产",
                "兼容任意券商 — 可手动跟单",
                "Tastytrade API — 一键提交订单或全自动执行",
                "TQQQ + QQQ + SGOV 策略 — 无需期权账户",
                "历史年化回报 27.8% — 7 年内是 QQQ 收益的 2 倍",
                "标准仪表盘与持仓跟踪"
            ]
        },
        "turbocore_pro": {
            "name": "TurboCore Pro",
            "tagline": "LEAPS 期权 Alpha，2022 年正收益，QQQ 3 倍回报。",
            "description": "完整的机构级策略引擎。牛市中买入 QQQ LEAPS 期权放大收益，熊市中 100% 切换国债 — 全程自动运行。需要已获批期权的经纪账户。",
            "btn": "升级专业版",
            "period": "/月",
            "billed_monthly": "按月计费",
            "billed_annually": "按年计费 $399",
            "save_text": "省 32% — 免费 4 个月",
            "save_short": "省 32%",
            "features": [
                "包含 TurboCore 所有功能，额外加：",
                "QQQ LEAPS 期权策略 — 3–4× 杠杆，无 ETF 每日损耗",
                "历史年化回报 39.3% — 7 年 QQQ 的 3 倍",
                "2022 年涨幅 +21.4% — 同期 QQQ 暴跌 −33%",
                "动态 VIX 仓位管理",
                "多层 AI 市场状态引擎（HMM + XGBoost + 神经网络）",
                "早盘前抢先收到信号",
                "Tastytrade API — 自动提交 LEAPS 订单并等待您审批",
                "⚠ 需要已获批期权账户（Level 2+）"
            ]
        },
        "both_bundle": {
            "name": "完整策略套餐",
            "tagline": "每一条信号，每一种策略，一套无敌系统。",
            "description": "同时运行 TurboCore 和 TurboCore Pro。AI 根据市场状况在 ETF 动量与 LEAPS 杠杆之间动态分配资金 — 我们提供的最完整的复利引擎。",
            "btn": "获取全部",
            "period": "/月",
            "billed_monthly": "按月计费",
            "billed_annually": "按年计费 $549",
            "save_text": "省 33% — 免费 4 个月",
            "save_short": "省 33%",
            "features": [
                "TurboCore + TurboCore Pro — 两套模型并行运行",
                "虚拟投资组合，双策略统一资产配置",
                "TurboBounce 均值回归 Alpha 层",
                "自定义投资组合配置工具 — 设定您自己的风险等级",
                "Tastytrade API — ETF + LEAPS 信号全自动执行",
                "持仓仪表盘 — 实时跨策略盈亏总览",
                "优先客户支持"
            ]
        }
    }
};

const baseDir = path.join(process.cwd(), 'public', 'locales');
Object.entries(langs).forEach(([lang, data]) => {
    const p = path.join(baseDir, lang, 'translation.json');
    if (fs.existsSync(p)) {
        let d = JSON.parse(fs.readFileSync(p, 'utf8'));
        d.pricing = data;
        fs.writeFileSync(p, JSON.stringify(d, null, 4), 'utf8');
        console.log('✅ Updated ' + p);
    } else {
        console.warn('⚠ Not found: ' + p);
    }
});
