import os

file_path = "src/app/demo/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make ONBOARDING_STEPS and AI_FEATURES dynamic
content = content.replace(
    "const ONBOARDING_STEPS = [",
    "const getOnboardingSteps = (t: any) => ["
).replace(
    "{ num: 1, icon: \"📧\", title: \"Add Email for Signal Alerts\",       desc: \"Go to Setup → enable email alerts so you get notified every time a new trade signal is generated.\", tab: \"setup\" },",
    "{ num: 1, icon: \"📧\", title: t(\"Demo.onboarding.step1\"), desc: t(\"Demo.onboarding.step1Desc\"), tab: \"setup\" },"
).replace(
    "{ num: 2, icon: \"⚡\", title: \"Configure Auto-Approve\",            desc: \"In Setup, toggle Auto-Approve ON to let TurboCore execute trades automatically — or leave it OFF to manually review each signal first.\", tab: \"setup\" },",
    "{ num: 2, icon: \"⚡\", title: t(\"Demo.onboarding.step2\"), desc: t(\"Demo.onboarding.step2Desc\"), tab: \"setup\" },"
).replace(
    "{ num: 3, icon: \"🏦\", title: \"Connect Tastytrade (Optional)\",     desc: \"Link your Tastytrade account for real one-click execution. Skip this step to trade in Virtual Mode — everything still works, just paper-traded.\", tab: \"setup\" },",
    "{ num: 3, icon: \"🏦\", title: t(\"Demo.onboarding.step3\"), desc: t(\"Demo.onboarding.step3Desc\"), tab: \"setup\" },"
).replace(
    "{ num: 4, icon: \"📊\", title: \"Signals Arrive at 3:00 PM ET\",      desc: \"Every trading day at 3:00 PM ET, the AI engine evaluates market conditions and generates a rebalance signal for TurboCore and TurboCore Pro.\", tab: \"signals\" },",
    "{ num: 4, icon: \"📊\", title: t(\"Demo.onboarding.step4\"), desc: t(\"Demo.onboarding.step4Desc\"), tab: \"signals\" },"
)

content = content.replace(
    "const AI_FEATURES = [",
    "const getAiFeatures = (t: any) => ["
).replace(
    "{ key: \"screenshot\", title: \"Screenshot Analysis\",  icon: <FileSearch className=\"h-6 w-6 text-indigo-400\" />,  price: 5, active: true,  desc: \"Upload screenshots of trades or charts for instant AI analysis.\" },",
    "{ key: \"screenshot\", title: t(\"Demo.ai.features.screenshotTitle\"), icon: <FileSearch className=\"h-6 w-6 text-indigo-400\" />, price: 5, active: true, desc: t(\"Demo.ai.features.screenshotDesc\") },"
).replace(
    "{ key: \"deepdive\",   title: \"Deep Dive\",           icon: <LineChart className=\"h-6 w-6 text-green-400\" />,    price: 5, active: false, desc: \"In-depth ticker analysis with live news catalysts and options risk profiling.\" },",
    "{ key: \"deepdive\", title: t(\"Demo.ai.features.deepdiveTitle\"), icon: <LineChart className=\"h-6 w-6 text-green-400\" />, price: 5, active: false, desc: t(\"Demo.ai.features.deepdiveDesc\") },"
).replace(
    "{ key: \"briefing\",   title: \"Morning Briefing\",    icon: <Coffee className=\"h-6 w-6 text-amber-400\" />,       price: 5, active: true,  desc: \"Daily morning market briefing tailored to the active TurboCore regime.\" },",
    "{ key: \"briefing\", title: t(\"Demo.ai.features.briefingTitle\"), icon: <Coffee className=\"h-6 w-6 text-amber-400\" />, price: 5, active: true, desc: t(\"Demo.ai.features.briefingDesc\") },"
).replace(
    "{ key: \"strategy\",   title: \"Strategy Builder\",    icon: <Target className=\"h-6 w-6 text-rose-400\" />,        price: 5, active: false, desc: \"Build realistic multi-leg options strategies optimized for your thesis.\" },",
    "{ key: \"strategy\", title: t(\"Demo.ai.features.strategyTitle\"), icon: <Target className=\"h-6 w-6 text-rose-400\" />, price: 5, active: false, desc: t(\"Demo.ai.features.strategyDesc\") },"
).replace(
    "{ key: \"debrief\",    title: \"Trade Debrief\",       icon: <Briefcase className=\"h-6 w-6 text-purple-400\" />,   price: 5, active: false, desc: \"Weekly performance review and educational insights on your closed trades.\" },",
    "{ key: \"debrief\", title: t(\"Demo.ai.features.debriefTitle\"), icon: <Briefcase className=\"h-6 w-6 text-purple-400\" />, price: 5, active: false, desc: t(\"Demo.ai.features.debriefDesc\") },"
)

# Add useTranslation
if "import { useTranslation } from \"react-i18next\";" not in content:
    content = content.replace("import { useState, useEffect } from \"react\";", "import { useState, useEffect } from \"react\";\nimport { useTranslation } from \"react-i18next\";")

# OnboardingFlow Component
content = content.replace(
    "function OnboardingFlow({ onTabChange }: { onTabChange: (tab: string) => void }) {",
    "function OnboardingFlow({ onTabChange }: { onTabChange: (tab: string) => void }) {\n    const { t } = useTranslation();\n    const steps = getOnboardingSteps(t);"
).replace(
    "ONBOARDING_STEPS.map",
    "steps.map"
).replace(
    "<h3 className=\"font-bold text-sm\">Getting Started — 4 Steps</h3>",
    "<h3 className=\"font-bold text-sm\">{t(\"Demo.onboarding.title\")}</h3>"
).replace(
    ">QUICK SETUP<",
    ">{t(\"Demo.onboarding.quickSetup\")}<"
).replace(
    "Step {step.num}: {step.title}",
    "{step.title}"
)

# SignalCard
content = content.replace(
    "function SignalCard({ signal, onApprove, onSkip }: { signal: typeof TURBOCORE_PRO_SIGNAL; onApprove: () => void; onSkip: () => void }) {",
    "function SignalCard({ signal, onApprove, onSkip }: { signal: typeof TURBOCORE_PRO_SIGNAL; onApprove: () => void; onSkip: () => void }) {\n    const { t } = useTranslation();"
).replace(
    ">Target Rebalance ·",
    ">{t(\"Demo.signalCard.targetRebalance\")} ·"
).replace(
    ">ML Score<",
    ">{t(\"Demo.signalCard.mlScore\")}<"
).replace(
    "Virtual Balance\n                </div>",
    "{t(\"Demo.signalCard.virtualBalance\")}\n                </div>"
).replace(
    ">Virtual Order Preview<",
    ">{t(\"Demo.signalCard.preview\")}<"
).replace(
    ">⚡ MANUAL ORDER INSTRUCTIONS — enter these in your broker<",
    ">{t(\"Demo.signalCard.manualInstructions\")}<"
).replace(
    ">⚡ Connect Tastytrade for live pricing & one-click execution<",
    ">{t(\"Demo.signalCard.connectBanner\")}<"
).replace(
    "> Skip<",
    "> {t(\"Demo.signalCard.skipBtn\")}<"
).replace(
    "> Execute Trade<",
    "> {t(\"Demo.signalCard.executeBtn\")}<"
)

# DashboardTab
content = content.replace(
    "function DashboardTab({ onToast, onTabChange }: { onToast: (m: string) => void; onTabChange: (tab: string) => void }) {",
    "function DashboardTab({ onToast, onTabChange }: { onToast: (m: string) => void; onTabChange: (tab: string) => void }) {\n    const { t } = useTranslation();"
).replace(
    "title=\"Your Command Center\"",
    "title={t(\"Demo.dashboard.cmdCenter\")}"
).replace(
    "<p>This is where your active signals appear and where you can approve or execute trades. Every trading day at <strong className=\"text-white\">3:00 PM ET</strong>, TurboCore's AI engine evaluates volatility conditions and generates a rebalancing signal for your portfolio.</p>",
    "<p>{t(\"Demo.dashboard.cmdCenterP1\")}<strong className=\"text-white\">{t(\"Demo.dashboard.cmdCenterTime\")}</strong>{t(\"Demo.dashboard.cmdCenterP2\")}</p>"
).replace(
    "<p className=\"mt-1\">Use the <strong className=\"text-white\">Core / Pro</strong> tabs to switch between TurboCore (equity-only) and TurboCore Pro (equity + options overlays). Toggle <strong className=\"text-white\">Auto-Approve</strong> in Setup to let trades execute automatically, or leave it off to review each signal here first.</p>",
    "<p className=\"mt-1\">{t(\"Demo.dashboard.cmdCenterP3\")}<strong className=\"text-white\">{t(\"Demo.dashboard.cmdCenterCorePro\")}</strong>{t(\"Demo.dashboard.cmdCenterP4\")}<strong className=\"text-white\">{t(\"Demo.dashboard.cmdCenterAutoApprove\")}</strong>{t(\"Demo.dashboard.cmdCenterP5\")}</p>"
).replace(
    "● Active Subscription",
    "● {t(\"Demo.dashboard.activeSub\")}"
).replace(
    ">Setup Guide<",
    ">{t(\"Demo.dashboard.setupGuide\")}<"
).replace(
    ">Auto-Approve Trades<",
    ">{t(\"Demo.dashboard.autoApproveTitle\")}<"
).replace(
    ">Manually approve each signal before execution<",
    ">{t(\"Demo.dashboard.autoApproveDesc\")}<"
).replace(
    ">⊙ Core<",
    ">{t(\"Demo.dashboard.tabCore\")}<"
).replace(
    ">⚡ Pro<",
    ">{t(\"Demo.dashboard.tabPro\")}<"
).replace(
    "TurboCore {activeStrat === \"pro\" ? \"Pro \" : \"\"}Signals",
    "{activeStrat === \"pro\" ? t(\"Demo.dashboard.signalsTitlePro\") : t(\"Demo.dashboard.signalsTitle\")}"
).replace(
    ">1 Active Target Change<",
    ">{t(\"Demo.dashboard.activeTarget\")}<"
).replace(
    ">Computing IV-Switching overlay...<",
    ">{t(\"Demo.dashboard.computing\")}<"
).replace(
    ">Signal will update in a few seconds<",
    ">{t(\"Demo.dashboard.signalUpdate\")}<"
).replace(
    "onToast(\"🎯 Demo mode — no real trades executed\")",
    "onToast(\"🎯 \" + t(\"Demo.signalCard.toastDemo\"))"
).replace(
    "onToast(\"↩️ Signal skipped (demo)\")",
    "onToast(\"↩️ \" + t(\"Demo.signalCard.toastSkip\"))"
)

# AITab
content = content.replace(
    "function AITab({ onToast }: { onToast: (m: string) => void }) {",
    "function AITab({ onToast }: { onToast: (m: string) => void }) {\n    const { t } = useTranslation();\n    const aiFeatures = getAiFeatures(t);"
).replace(
    "AI_FEATURES.map",
    "aiFeatures.map"
).replace(
    "title=\"AI Copilot — Your Personal Market Analyst\"",
    "title={t(\"Demo.ai.title\")}"
).replace(
    "<p>The AI Copilot gives you deeper insight into every trade signal and market condition. Use it to ask <strong className=\"text-white\">\"Why is TurboCore SIDEWAYS today?\"</strong>, request a deep dive on any ticker, or get a morning briefing tailored to the current regime.</p>",
    "<p>{t(\"Demo.ai.descP1\")}<strong className=\"text-white\">{t(\"Demo.ai.descQuote\")}</strong>{t(\"Demo.ai.descP2\")}</p>"
).replace(
    "<p className=\"mt-1\">Each subscription tier includes <strong className=\"text-white\">2 free AI feature picks</strong>. Additional features like Deep Dive, Strategy Builder, and Trade Debrief are available as $5/mo add-ons — activate only what you need.</p>",
    "<p className=\"mt-1\">{t(\"Demo.ai.descP3\")}<strong className=\"text-white\">{t(\"Demo.ai.descFreePicks\")}</strong>{t(\"Demo.ai.descP4\")}</p>"
).replace(
    ">AI Copilot<",
    ">{t(\"Demo.ai.headerTitle\")}<"
).replace(
    ">Your personal market analyst powered by Perplexity Pro real-time engine.<",
    ">{t(\"Demo.ai.headerDesc\")}<"
).replace(
    ">Subscription Tier:<",
    ">{t(\"Demo.ai.subTier\")}<"
).replace(
    ">2 / 2 free picks used<",
    ">{t(\"Demo.ai.freeUsed\")}<"
).replace(
    ">Additional features are $5/mo each.<",
    ">{t(\"Demo.ai.additionalCost\")}<"
).replace(
    ">Available Features",
    ">{t(\"Demo.ai.availFeatures\")}"
).replace(
    ">ACTIVE<",
    ">{t(\"Demo.ai.active\")}<"
).replace(
    ">Add · $5/mo<",
    ">{t(\"Demo.ai.addBtn\")}<"
).replace(
    "onToast(\"💡 Demo mode — subscribe at trademind.bot to activate\")",
    "onToast(\"💡 \" + t(\"Demo.ai.toastDemoSub\"))"
).replace(
    ">AI Chat Preview",
    ">{t(\"Demo.ai.chatPreview\")}"
).replace(
    ">Why is TurboCore showing SIDEWAYS regime today?<",
    ">{t(\"Demo.ai.chatQ\")}<"
).replace(
    ">The ML model detected compressed IV across QQQ options (VIX at 16.2) combined with declining volume confirming a consolidation phase. In SIDEWAYS regime, the portfolio shifts toward LEAPS for leveraged upside participation while maintaining SGOV as a liquidity buffer. The 50.2% confidence reflects genuine uncertainty — the model is near its decision boundary, suggesting a potential regime change within 3–5 sessions.<",
    ">{t(\"Demo.ai.chatA\")}<"
).replace(
    "placeholder=\"Ask about your portfolio...\"",
    "placeholder={t(\"Demo.ai.chatPlaceholder\")}"
).replace(
    "onToast(\"💡 Log in to chat with the real AI Copilot\")",
    "onToast(\"💡 \" + t(\"Demo.ai.toastLogin\"))"
)

# SignalsTab
content = content.replace(
    "function SignalsTab({ onToast }: { onToast: (m: string) => void }) {",
    "function SignalsTab({ onToast }: { onToast: (m: string) => void }) {\n    const { t } = useTranslation();"
).replace(
    "title=\"How Signals Work\"",
    "title={t(\"Demo.signals.howWorks\")}"
).replace(
    "<p>Signals are generated every trading day at <strong className=\"text-white\">3:00 PM ET</strong>. The AI engine reads IV (Implied Volatility), momentum, and macro conditions to determine whether the market is in a <strong className=\"text-white\">BULL, BEAR, or SIDEWAYS</strong> regime — then calculates the optimal portfolio allocation for each regime.</p>",
    "<p>{t(\"Demo.signals.worksP1\")}<strong className=\"text-white\">{t(\"Demo.signals.worksTime\")}</strong>{t(\"Demo.signals.worksP2\")}<strong className=\"text-white\">{t(\"Demo.signals.worksRegimes\")}</strong>{t(\"Demo.signals.worksP3\")}</p>"
).replace(
    ">🏦 With Tastytrade Connected<",
    ">🏦 {t(\"Demo.signals.tastyConnected\")}<"
).replace(
    "<p>Click <strong className=\"text-white\">Execute Trade</strong> (or Auto-Approve) → orders go live in your Tastytrade account instantly. Positions appear in the Positions tab in real-time.</p>",
    "<p>{t(\"Demo.signals.tastyDesc1\")}<strong className=\"text-white\">{t(\"Demo.signals.tastyExecBtn\")}</strong>{t(\"Demo.signals.tastyDesc2\")}</p>"
).replace(
    ">💻 Virtual Mode (No Broker)<",
    ">💻 {t(\"Demo.signals.virtMode\")}<"
).replace(
    ">Execute the trade manually using the order instructions shown, or skip it. The virtual ledger tracks your simulated portfolio based on the prices at signal time.<",
    ">{t(\"Demo.signals.virtDesc\")}<"
).replace(
    ">Trade Signals<",
    ">{t(\"Demo.signals.title\")}<"
).replace(
    ">1 pending<",
    ">{t(\"Demo.signals.pending\")}<"
).replace(
    ">Connected<",
    ">{t(\"Demo.signals.connected\")}<"
)

# PositionsTab
content = content.replace(
    "function PositionsTab({ onToast }: { onToast: (m: string) => void }) {",
    "function PositionsTab({ onToast }: { onToast: (m: string) => void }) {\n    const { t } = useTranslation();"
).replace(
    "title=\"Your Portfolio — Real or Virtual\"",
    "title={t(\"Demo.positions.title\")}"
).replace(
    "<p>This table shows all your open positions. If you connected Tastytrade, this reflects your <strong className=\"text-white\">real live account</strong> — positions are pulled directly from your broker after each execution.</p>",
    "<p>{t(\"Demo.positions.p1\")}<strong className=\"text-white\">{t(\"Demo.positions.p1b\")}</strong>{t(\"Demo.positions.p1c\")}</p>"
).replace(
    "<p className=\"mt-1\">If you're in <strong className=\"text-white\">Virtual Mode</strong>, this is your simulated ledger. You can <strong className=\"text-white\">Deposit</strong> or <strong className=\"text-white\">Withdraw</strong> virtual cash at any time, and manually add or remove positions. TurboCore automatically adjusts future signal sizes to match your current virtual balance — so the strategy always stays proportional to your capital.</p>",
    "<p className=\"mt-1\">{t(\"Demo.positions.p2\")}<strong className=\"text-white\">{t(\"Demo.positions.p2b\")}</strong>{t(\"Demo.positions.p2c\")}<strong className=\"text-white\">{t(\"Demo.positions.p2d\")}</strong>{t(\"Demo.positions.p2e\")}<strong className=\"text-white\">{t(\"Demo.positions.p2f\")}</strong>{t(\"Demo.positions.p2g\")}</p>"
).replace(
    "<p className=\"mt-1\">TurboCore Pro users also see their <strong className=\"text-white\">options spreads</strong> (ZEBRA, Bear Call Spread, CSP, LEAPS) tracked separately below the equity table.</p>",
    "<p className=\"mt-1\">{t(\"Demo.positions.p3\")}<strong className=\"text-white\">{t(\"Demo.positions.p3b\")}</strong>{t(\"Demo.positions.p3c\")}</p>"
).replace(
    "Positions\n                        <span",
    "{t(\"Demo.positions.header\")}\n                        <span"
).replace(
    ">VIRTUAL<",
    ">{t(\"Demo.positions.virtual\")}<"
).replace(
    ">{positions.length} equity · 2 spreads<",
    ">{t(\"Demo.positions.equitySpreads\", { eqCount: positions.length, spCount: 2 })}<"
).replace(
    ">Account Overview<",
    ">{t(\"Demo.positions.overview\")}<"
).replace(
    ">DEPOSIT<",
    ">{t(\"Demo.positions.deposit\")}<"
).replace(
    ">WITHDRAW<",
    ">{t(\"Demo.positions.withdraw\")}<"
).replace(
    "label: \"Total Value\"",
    "label: t(\"Demo.positions.totalValue\")"
).replace(
    "label: \"Cash\"",
    "label: t(\"Demo.positions.cash\")"
).replace(
    "label: \"Positions Value\"",
    "label: t(\"Demo.positions.posValue\")"
).replace(
    "label: \"Realized P&L\"",
    "label: t(\"Demo.positions.realizedPnl\")"
).replace(
    ">Equity Holdings<",
    ">{t(\"Demo.positions.equityHoldings\")}<"
).replace(
    "[\"Symbol\", \"Price\", \"Cost/sh\", \"Market Value\", \"Unrealized G/L\"]",
    "[t(\"Demo.positions.colSymbol\"), t(\"Demo.positions.colPrice\"), t(\"Demo.positions.colCost\"), t(\"Demo.positions.colMv\"), t(\"Demo.positions.colUgl\")]"
).replace(
    "Options Spreads · TurboCore Pro",
    "{t(\"Demo.positions.optionsSpreads\")}"
).replace(
    ">Long Spread<",
    ">{t(\"Demo.positions.longSpread\")}<"
).replace(
    ">Bear Call Spread<",
    ">{t(\"Demo.positions.bearCall\")}<"
).replace(
    ">LEGS<",
    ">{t(\"Demo.positions.legs\")}<"
).replace(
    ">1 contract ·",
    ">1 {t(\"Demo.positions.contract\")} ·"
).replace(
    ">2 contracts ·",
    ">2 {t(\"Demo.positions.contracts\")} ·"
).replace(
    "Exp ",
    "{t(\"Demo.positions.exp\")} "
).replace(
    "onToast(\"💡 Demo mode — amounts are virtual\")",
    "onToast(\"💡 \" + t(\"Demo.positions.toastDemoVirt\"))"
)

# ActivityTab
content = content.replace(
    "function ActivityTab() {",
    "function ActivityTab() {\n    const { t } = useTranslation();"
).replace(
    "title=\"Full Trade Lifecycle Log\"",
    "title={t(\"Demo.activity.title\")}"
).replace(
    "<p>Every signal, execution, deposit, and adjustment is recorded here with a precise timestamp. This is your complete audit trail — use it to verify that signals were acted on correctly and to review historical allocation changes.</p>",
    "<p>{t(\"Demo.activity.p1\")}</p>"
).replace(
    "<p className=\"mt-1\">Each event shows a <strong className=\"text-white\">timeline</strong>: when the signal was received → when it was approved or skipped → when the virtual or live trade was executed. Filter by strategy (TurboCore vs TurboCore Pro) or search by symbol to find specific events quickly.</p>",
    "<p className=\"mt-1\">{t(\"Demo.activity.p2\")}<strong className=\"text-white\">{t(\"Demo.activity.p2b\")}</strong>{t(\"Demo.activity.p2c\")}</p>"
).replace(
    ">Activity Log<",
    ">{t(\"Demo.activity.header\")}<"
).replace(
    ">Track all trade lifecycle events<",
    ">{t(\"Demo.activity.headerSub\")}<"
).replace(
    "{s === \"all\" ? \"All\" : s === \"turbocore\" ? \"TurboCore\" : \"TurboCore Pro\"}",
    "{s === \"all\" ? t(\"Demo.activity.filterAll\") : s === \"turbocore\" ? t(\"Demo.activity.filterTc\") : t(\"Demo.activity.filterPro\")}"
).replace(
    "placeholder=\"Filter by symbol, strategy or status...\"",
    "placeholder={t(\"Demo.activity.search\")}"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("page.tsx updated.")
