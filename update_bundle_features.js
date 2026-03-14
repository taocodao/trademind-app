const fs = require('fs');
const path = require('path');

const updates = {
    'en': {
        both_bundle: [
            "TurboCore + TurboCore Pro — both models running in parallel",
            "Virtual portfolio with unified asset allocation across both strategies",
            "Tastytrade API — full auto-execution for both ETF + LEAPS signals",
            "Position dashboard — live P&L across all strategy layers",
            "Discounted pricing — locked in at the lowest rate we offer",
            "Early access to every new feature before public release",
            "Priority support"
        ]
    },
    'es': {
        both_bundle: [
            "TurboCore + TurboCore Pro — ambos modelos en paralelo",
            "Portafolio virtual con asignación unificada entre ambas estrategias",
            "API Tastytrade — auto-ejecución para señales ETF + LEAPS",
            "Panel de posiciones — P&L en vivo en todas las capas de estrategia",
            "Precio con descuento — la tarifa más baja que ofrecemos, garantizada",
            "Acceso temprano a cada nueva función antes del lanzamiento público",
            "Soporte prioritario"
        ]
    },
    'zh': {
        both_bundle: [
            "TurboCore + TurboCore Pro — 两套模型并行运行",
            "虚拟投资组合，双策略统一资产配置",
            "Tastytrade API — ETF + LEAPS 信号全自动执行",
            "持仓仪表盘 — 实时跨策略盈亏总览",
            "折扣定价 — 锁定我们提供的最低价格",
            "每项新功能在公开发布前优先体验",
            "优先客户支持"
        ]
    }
};

const baseDir = path.join(process.cwd(), 'public', 'locales');
Object.entries(updates).forEach(([lang, data]) => {
    const p = path.join(baseDir, lang, 'translation.json');
    if (fs.existsSync(p)) {
        let d = JSON.parse(fs.readFileSync(p, 'utf8'));
        d.pricing.both_bundle.features = data.both_bundle;
        fs.writeFileSync(p, JSON.stringify(d, null, 4), 'utf8');
        console.log('✅ Updated both_bundle features in ' + lang);
    }
});
