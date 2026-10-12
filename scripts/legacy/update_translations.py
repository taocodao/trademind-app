import json
from pathlib import Path

langs = {
    'en': {
        "title": "Transparent Pricing.",
        "subtitle": "Zero AUM Fees.",
        "description": "We are a software platform, not a hedge fund. We don't take a percentage of your wealth. Keep 100% of your compounding gains.",
        "popular": "Most Popular",
        "billed": "Billed annually or monthly. Cancel anytime online.",
        "monthly_tab": "Monthly",
        "annual_tab": "Annually",
        "save_badge": "SAVE",
        "trial_notice": "ALL TIERS INCLUDE A 14-DAY FREE TRIAL",
        "trial_notice_sub": "All plans include a 14-day free trial. Cancel anytime.",
        "loading": "Redirecting...",
        "turbocore": {
            "name": "TurboCore",
            "description": "ML-powered foundation for steady compounding.",
            "btn": "Start Compounding",
            "billed_monthly": "Billed monthly",
            "billed_annually": "Billed $249 annually",
            "save_text": "Save 28% (3.5 months free)",
            "save_short": "Save 28%",
            "features": [
                "TQQQ Core Model Access",
                "SMA200 Capital Preservation Gate",
                "Automated Tastytrade Execution",
                "Standard UI Experience"
            ]
        },
        "turbocore_pro": {
            "name": "TurboCore Pro",
            "description": "Advanced capabilities with 39.3% historical CAGR.",
            "btn": "Go Pro",
            "billed_monthly": "Billed monthly",
            "billed_annually": "Billed $399 annually",
            "save_text": "Save 32% (4 months free)",
            "save_short": "Save 32%",
            "features": [
                "Enhanced ML Regime Detection",
                "Dynamic VIX-Adjusted Positioning",
                "Early Signal Access",
                "Priority Slack Support"
            ]
        },
        "both_bundle": {
            "name": "Both Bundle",
            "description": "Get the ultimate edge with the full multi-strategy engine.",
            "btn": "Get Everything",
            "billed_monthly": "Billed monthly",
            "billed_annually": "Billed $549 annually",
            "save_text": "Save 33% (4 months free)",
            "save_short": "Save 33%",
            "features": [
                "TurboCore & TurboCore Pro Models",
                "TurboBounce Mean-Reversion Alpha",
                "Custom Portfolio Allocation Tooling",
                "Direct Founder Office Hours"
            ]
        }
    },
    'es': {
        "title": "Precios Transparentes.",
        "subtitle": "Sin Comisiones por AUM.",
        "description": "Somos una plataforma de software, no un fondo de cobertura. No tomamos un porcentaje de tu riqueza. Quédate con el 100% de tus ganancias compuestas.",
        "popular": "Más Popular",
        "billed": "Facturado anualmente o mensualmente. Cancela en cualquier momento en línea.",
        "monthly_tab": "Mensual",
        "annual_tab": "Anual",
        "save_badge": "AHORRA",
        "trial_notice": "TODOS LOS NIVELES INCLUYEN UNA PRUEBA GRATUITA DE 14 DÍAS",
        "trial_notice_sub": "Todos los planes incluyen una prueba gratuita de 14 días. Cancela en cualquier momento.",
        "loading": "Redirigiendo...",
        "turbocore": {
            "name": "TurboCore",
            "description": "Base impulsada por ML para un compounding constante.",
            "btn": "Empezar a Componer",
            "billed_monthly": "Facturado mensualmente",
            "billed_annually": "Facturado $249 anualmente",
            "save_text": "Ahorra 28% (3.5 meses gratis)",
            "save_short": "Ahorra 28%",
            "features": [
                "Acceso al Modelo TQQQ Core",
                "Puerta de Preservación SMA200",
                "Ejecución Automatizada Tastytrade",
                "Experiencia de Interfaz Estándar"
            ]
        },
        "turbocore_pro": {
            "name": "TurboCore Pro",
            "description": "Capacidades avanzadas con un 39.3% de CAGR histórico.",
            "btn": "Obtener Pro",
            "billed_monthly": "Facturado mensualmente",
            "billed_annually": "Facturado $399 anualmente",
            "save_text": "Ahorra 32% (4 meses gratis)",
            "save_short": "Ahorra 32%",
            "features": [
                "Detección de Régimen ML Mejorada",
                "Posicionamiento Dinámico VIX",
                "Acceso Temprano a Señales",
                "Soporte Prioritario en Slack"
            ]
        },
        "both_bundle": {
            "name": "Both Bundle",
            "description": "Obtén la máxima ventaja con el motor multi-estrategia completo.",
            "btn": "Obtener Todo",
            "billed_monthly": "Facturado mensualmente",
            "billed_annually": "Facturado $549 anualmente",
            "save_text": "Ahorra 33% (4 meses gratis)",
            "save_short": "Ahorra 33%",
            "features": [
                "Modelos TurboCore y TurboCore Pro",
                "Alfa de Reversión Media TurboBounce",
                "Herramientas de Asignación Personalizadas",
                "Charlas Directas con el Fundador"
            ]
        }
    },
    'zh': {
        "title": "透明定价。",
        "subtitle": "零资产管理费。",
        "description": "我们是一家软件平台，不是对冲基金。我们不抽取您的利润分成，您保留100%的复利收益。",
        "popular": "最受欢迎",
        "billed": "按年或按月计费。可随时在线取消。",
        "monthly_tab": "按月",
        "annual_tab": "按年",
        "save_badge": "立省",
        "trial_notice": "所有层级均包含 14 天免费试用",
        "trial_notice_sub": "所有计划均包含 14 天免费试用。随时取消。",
        "loading": "正在跳转...",
        "turbocore": {
            "name": "TurboCore",
            "description": "以机器学习为基础实现稳定复利。",
            "btn": "开始复利",
            "billed_monthly": "按月计费",
            "billed_annually": "按年计费 $249",
            "save_text": "节省 28%（免 3.5 个月）",
            "save_short": "省 28%",
            "features": [
                "TQQQ 核心模型访问",
                "SMA200 资本保全防护",
                "Tastytrade 自动化执行",
                "标准用户界面体验"
            ]
        },
        "turbocore_pro": {
            "name": "TurboCore Pro",
            "description": "具有历史 39.3% 年复合增长率的高级版本。",
            "btn": "升级专业版",
            "billed_monthly": "按月计费",
            "billed_annually": "按年计费 $399",
            "save_text": "节省 32%（免 4 个月）",
            "save_short": "省 32%",
            "features": [
                "增强型 ML 市场状态检测",
                "动态 VIX 调整仓位",
                "信号抢先体验",
                "Priority Slack 优先支持"
            ]
        },
        "both_bundle": {
            "name": "Both Bundle",
            "description": "获取完整多策略引擎的终极优势。",
            "btn": "获取全部",
            "billed_monthly": "按月计费",
            "billed_annually": "按年计费 $549",
            "save_text": "节省 33%（免 4 个月）",
            "save_short": "省 33%",
            "features": [
                "TurboCore & TurboCore Pro 策略模型",
                "TurboBounce 均值回归 Alpha 策略",
                "自定义投资组合分配工具",
                "直接预约创始人 一对一"
            ]
        }
    }
}

base_dir = Path("public/locales")
for lang_code, pricing_data in langs.items():
    file_path = base_dir / lang_code / "translation.json"
    if file_path.exists():
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        data['pricing'] = pricing_data
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"Updated {file_path}")
