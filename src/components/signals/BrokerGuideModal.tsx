"use client";

import { X, ExternalLink } from "lucide-react";

interface Props {
    symbol: string;
    action: "buy" | "sell";
    quantity: number;
    broker?: string;
    onClose: () => void;
}

/**
 * Shows the annotated broker-ticket guide: a static screenshot of the broker's
 * trade ticket with numbered pointers over each field and the exact value to
 * type. Rendered on demand by /api/broker-guide.
 */
export function BrokerGuideModal({ symbol, action, quantity, broker = "fidelity", onClose }: Props) {
    const src = `/api/broker-guide?broker=${encodeURIComponent(broker)}&symbol=${encodeURIComponent(symbol)}&action=${action}&quantity=${quantity}&format=svg`;
    const isBuy = action === "buy";

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4" onClick={onClose}>
            <div
                className="bg-[#111] border border-white/10 rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 sticky top-0 bg-[#111] z-10">
                    <div>
                        <h3 className="text-base font-bold">Enter at Fidelity</h3>
                        <p className="text-[11px] text-tm-muted">
                            {isBuy ? "Buy" : "Sell"} {quantity} {symbol.toUpperCase()} — follow the numbered fields
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 text-tm-muted hover:text-white transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Step 1 — click Trade in the top nav (nav strip with the button circled) */}
                    <div>
                        <p className="text-xs text-white/90 font-semibold mb-1.5">
                            <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold mr-1.5 px-1 py-0.5">1</span>
                            Click <span className="font-bold">Trade</span> in Fidelity's top navigation
                        </p>
                        <img src="/broker-guides/fidelity-nav-trade.png" alt="Fidelity navigation bar with the Trade button highlighted" className="w-full rounded-md border border-white/10" />
                    </div>

                    {/* Step 2 — pick the ticket type */}
                    <p className="text-xs text-white/90 font-semibold leading-relaxed">
                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold mr-1.5 px-1 py-0.5">2</span>
                        In the popup that appears, open the <span className="font-bold">TRADE</span> dropdown and select <span className="font-bold">Options</span> for a LEAPS contract — leave it on <span className="font-bold">Stocks/ETFs</span> for a share order.
                    </p>

                    {/* Step 3 — the annotated ticket */}
                    <p className="text-xs text-white/90 font-semibold mb-1.5">
                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold mr-1.5 px-1 py-0.5">3</span>
                        Enter each numbered field, then press <span className="font-bold">Preview order</span> yourself
                    </p>
                    <img src={src} alt={`Fidelity order entry guide for ${symbol}`} className="w-full rounded-lg border border-white/10" />
                    <a
                        href="https://digital.fidelity.com/ftgw/digital/trade-equity"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-tm-purple/20 border border-tm-purple/40 text-white text-sm font-bold hover:bg-tm-purple/30 transition"
                    >
                        <ExternalLink className="w-4 h-4" /> Open Fidelity ticket
                    </a>
                    <p className="text-[10px] text-tm-muted/70 text-center mt-3 leading-relaxed">
                        TradeMind never connects to or submits orders to your brokerage — this only helps you enter the order yourself.
                    </p>
                </div>
            </div>
        </div>
    );
}
