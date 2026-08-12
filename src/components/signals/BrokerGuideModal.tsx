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
    const src = `/api/broker-guide?broker=${encodeURIComponent(broker)}&symbol=${encodeURIComponent(symbol)}&action=${action}&quantity=${quantity}`;
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

                <div className="p-4">
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
