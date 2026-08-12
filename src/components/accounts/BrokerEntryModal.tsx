"use client";

import { useState } from "react";
import { X, Copy, Check, ExternalLink, Bookmark } from "lucide-react";
import { BROKERS, isOptionOrder, type BrokerOrder } from "@/lib/brokers";

interface Props {
    order: BrokerOrder;
    accountName?: string;
    onClose: () => void;
}

function CopyBtn({ text, tag, copied, onCopy }: { text: string; tag: string; copied: string | null; onCopy: (t: string, g: string) => void }) {
    return (
        <button
            onClick={() => onCopy(text, tag)}
            className="p-1 rounded hover:bg-black/10 text-neutral-400 hover:text-neutral-700 transition shrink-0"
            title={`Copy ${tag}`}
        >
            {copied === tag ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
    );
}

// A rendered field that looks like the broker's input/select box.
function FieldBox({ label, value, copied, onCopy, hint, wide }: {
    label: string; value: string; copied: string | null; onCopy: (t: string, g: string) => void; hint?: string; wide?: boolean;
}) {
    return (
        <div className={wide ? "col-span-2" : ""}>
            <p className="text-[9px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">{label}</p>
            <div className="flex items-center justify-between gap-2 bg-white border border-neutral-300 rounded px-3 py-2 shadow-sm">
                <span className="font-mono text-sm text-neutral-900 truncate">{value}</span>
                <div className="flex items-center gap-1.5">
                    {hint && <span className="text-[9px] text-neutral-400">{hint}</span>}
                    <CopyBtn text={value} tag={label} copied={copied} onCopy={onCopy} />
                </div>
            </div>
        </div>
    );
}

/**
 * "Enter at Broker" — renders the order as a visual replica of the selected
 * broker's trade ticket so the user can type exactly what's shown on screen.
 * Broker-agnostic via the BROKERS registry; Fidelity's Stocks/ETFs ticket is
 * modeled first (digital.fidelity.com/ftgw/digital/trade-equity).
 */
export function BrokerEntryModal({ order, accountName, onClose }: Props) {
    const [brokerKey, setBrokerKey] = useState(BROKERS[0].key);
    const [copied, setCopied] = useState<string | null>(null);
    const broker = BROKERS.find((b) => b.key === brokerKey) ?? BROKERS[0];
    const fields = broker.buildFields(order);
    const script = broker.autofill(order);

    const copy = async (text: string, tag: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(tag);
            setTimeout(() => setCopied(null), 1500);
        } catch { /* clipboard unavailable */ }
    };

    const isBuy = order.action === "buy";
    const isOption = isOptionOrder(order);
    // Map registry fields by label so we can lay them out like the real ticket.
    const f = (label: string) => fields.find((x) => x.label.toLowerCase() === label.toLowerCase());
    const sym = f("Symbol"), act = f("Action"), qty = f("Quantity"), otype = f("Order type"), tif = f("Time in force");
    const exp = f("Expiration"), strike = f("Strike"), cp = f("Call/Put"), ref = f("Reference price");
    const opt = order.option;
    const summary = isOption && opt
        ? `${act?.value ?? (isBuy ? "Buy" : "Sell")} ${order.quantity} ${order.symbol.toUpperCase()} ${exp?.value ?? ""} $${opt.strike} ${opt.right === "call" ? "C" : "P"}`
        : `${isBuy ? "Buy" : "Sell"} ${order.quantity} ${order.symbol.toUpperCase()}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
            <div
                className="bg-[#f3f1ec] border border-black/10 rounded-lg w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Ticket header (Fidelity green) ── */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-black/10 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <span className="text-[#5a8a29] font-extrabold italic text-lg leading-none">Fidelity</span>
                        <span className="text-[11px] text-neutral-500 font-medium">Trade · {isOption ? "Options" : broker.tradeType}</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-black/5 text-neutral-500 hover:text-neutral-800 transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5">
                    {/* order summary strip */}
                    <div className={`mb-4 px-3.5 py-2.5 rounded-lg border text-sm font-bold flex items-center justify-between ${isBuy ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700" : "bg-red-500/10 border-red-500/30 text-red-700"}`}>
                        <span>{summary}</span>
                        {accountName && <span className="text-[11px] font-semibold text-neutral-500">{accountName}</span>}
                    </div>

                    {/* broker picker (dark chip row — our UI, not the broker's) */}
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Broker:</span>
                        {BROKERS.map((b) => (
                            <button
                                key={b.key}
                                onClick={() => setBrokerKey(b.key)}
                                className={`px-3 py-1 rounded-full text-[11px] font-bold border transition ${brokerKey === b.key ? "bg-neutral-900 border-neutral-900 text-white" : "bg-white border-neutral-300 text-neutral-500 hover:text-neutral-900"}`}
                            >
                                {b.name}
                            </button>
                        ))}
                    </div>

                    {/* ── Fidelity ticket replica ── */}
                    <div className="bg-white border border-black/10 rounded-lg p-4 space-y-3">
                        {/* Account row (informational) */}
                        <div className="flex items-center justify-between text-[11px] text-neutral-500">
                            <span className="uppercase font-semibold tracking-wide">Account</span>
                            <span className="italic text-neutral-400">select your account</span>
                        </div>

                        {/* Symbol */}
                        {sym && (
                            <div>
                                <FieldBox label="Symbol" value={sym.value} copied={copied} onCopy={copy} />
                                <p className="text-[10px] text-neutral-400 mt-1">Type <span className="font-mono font-bold text-neutral-700">{sym.value}</span> then select it from the dropdown.</p>
                            </div>
                        )}

                        {/* Option contract fields (options ticket only) */}
                        {isOption && (
                            <div className="grid grid-cols-3 gap-2">
                                {exp && (
                                    <div>
                                        <p className="text-[9px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">Expiration</p>
                                        <div className="flex items-center justify-between bg-white border border-neutral-300 rounded px-2.5 py-2 shadow-sm">
                                            <span className="font-mono text-xs text-neutral-900">{exp.value}</span>
                                            <CopyBtn text={exp.value} tag="Expiration" copied={copied} onCopy={copy} />
                                        </div>
                                    </div>
                                )}
                                {strike && (
                                    <div>
                                        <p className="text-[9px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">Strike</p>
                                        <div className="flex items-center justify-between bg-white border border-neutral-300 rounded px-2.5 py-2 shadow-sm">
                                            <span className="font-mono text-sm text-neutral-900">{strike.value}</span>
                                            <CopyBtn text={strike.value} tag="Strike" copied={copied} onCopy={copy} />
                                        </div>
                                    </div>
                                )}
                                {cp && (
                                    <div>
                                        <p className="text-[9px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">Call/Put</p>
                                        <div className="flex items-center justify-between bg-white border border-neutral-300 rounded px-2.5 py-2 shadow-sm">
                                            <span className="font-mono text-sm font-bold text-neutral-900">{cp.value}</span>
                                            <CopyBtn text={cp.value} tag="Call/Put" copied={copied} onCopy={copy} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action / Quantity / Order type row */}
                        <div className="grid grid-cols-3 gap-2">
                            {act && (
                                <div>
                                    <p className="text-[9px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">Action</p>
                                    <div className="flex items-center justify-between bg-white border border-neutral-300 rounded px-2.5 py-2 shadow-sm">
                                        <span className={`font-mono text-sm font-bold ${isBuy ? "text-emerald-700" : "text-red-700"}`}>{act.value}</span>
                                        <CopyBtn text={act.value} tag="Action" copied={copied} onCopy={copy} />
                                    </div>
                                </div>
                            )}
                            {qty && (
                                <div>
                                    <p className="text-[9px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">Quantity</p>
                                    <div className="flex items-center justify-between bg-white border border-neutral-300 rounded px-2.5 py-2 shadow-sm">
                                        <span className="font-mono text-sm text-neutral-900">{qty.value}</span>
                                        <span className="text-[9px] text-neutral-400">{isOption ? "Contracts" : "Shares"}</span>
                                    </div>
                                </div>
                            )}
                            {otype && (
                                <div>
                                    <p className="text-[9px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">Order type</p>
                                    <div className="flex items-center justify-between bg-white border border-neutral-300 rounded px-2.5 py-2 shadow-sm">
                                        <span className="font-mono text-sm text-neutral-900">{otype.value}</span>
                                        <CopyBtn text={otype.value} tag="Order type" copied={copied} onCopy={copy} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Time in force (+ reference price for options) */}
                        <div className="flex gap-2">
                            {tif && (
                                <div className="flex-1">
                                    <p className="text-[9px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">Time in force</p>
                                    <div className="flex items-center justify-between bg-white border border-neutral-300 rounded px-3 py-2 shadow-sm">
                                        <span className="font-mono text-sm text-neutral-900">{tif.value}</span>
                                        <CopyBtn text={tif.value} tag="Time in force" copied={copied} onCopy={copy} />
                                    </div>
                                </div>
                            )}
                            {isOption && ref && (
                                <div className="flex-1">
                                    <p className="text-[9px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">Ref. price</p>
                                    <div className="flex items-center justify-between bg-neutral-50 border border-dashed border-neutral-300 rounded px-3 py-2">
                                        <span className="font-mono text-sm text-neutral-500">{ref.value}</span>
                                        <span className="text-[8px] text-neutral-400">info</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Preview button */}
                        <div className="pt-2">
                            <div className="w-full text-center bg-[#4c7a1f] text-white text-sm font-bold rounded-full py-2.5 select-none">Preview order</div>
                            <p className="text-[10px] text-neutral-400 text-center mt-1.5">Review on Fidelity, then press Preview order yourself.</p>
                        </div>
                    </div>

                    {/* Actions row */}
                    <div className="mt-4 space-y-3">
                        <a
                            href={broker.tradeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-bold hover:bg-neutral-800 transition"
                        >
                            <ExternalLink className="w-4 h-4" /> Open Fidelity ticket
                        </a>

                        {/* autofill script */}
                        <div className="bg-[#111] rounded-lg p-3">
                            <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1.5">
                                <Bookmark className="w-3 h-3" /> Autofill script (optional)
                            </p>
                            <p className="text-[10px] text-neutral-500 mb-2 leading-relaxed">
                                On the Fidelity page, paste this into the browser console (or save as a bookmark) to prefill the form. It never submits.
                            </p>
                            <div className="relative">
                                <pre className="bg-black/50 border border-white/10 rounded p-2 text-[9px] font-mono text-neutral-500 overflow-x-auto whitespace-pre-wrap break-all max-h-20">{script}</pre>
                                <button
                                    onClick={() => copy(script, "script")}
                                    className="absolute top-1.5 right-1.5 p-1 rounded bg-white/10 hover:bg-white/20 text-neutral-300 transition"
                                    title="Copy autofill script"
                                >
                                    {copied === "script" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                            </div>
                        </div>

                        <p className="text-[9px] text-neutral-400 leading-relaxed text-center">
                            TradeMind never connects to or submits orders to your brokerage — this only helps you enter the order yourself.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
