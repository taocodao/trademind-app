"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import {
    buildUniversalOrderInstruction,
    type UniversalOrderInput,
} from "@/lib/universal-order";

interface Props {
    order: UniversalOrderInput;
    accountName?: string;
    onClose: () => void;
}

/**
 * Shows a broker-neutral order instruction that the customer can enter at any
 * brokerage. This component never links to, selects, or fills a brokerage.
 */
export function OrderInstructionModal({ order, accountName, onClose }: Props) {
    const [copied, setCopied] = useState(false);
    const instruction = buildUniversalOrderInstruction({
        ...order,
        accountName: accountName || order.accountName,
    });

    const copyInstruction = async () => {
        try {
            await navigator.clipboard.writeText(instruction.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
            role="presentation"
            onClick={onClose}
        >
            <section
                className="bg-[#111] border border-white/10 rounded-xl w-full max-w-lg shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="order-instruction-title"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
                    <div>
                        <h2 id="order-instruction-title" className="text-base font-bold text-white">Order instruction</h2>
                        <p className="text-xs text-tm-muted mt-1">Enter this order at your brokerage.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close order instruction"
                        className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg text-tm-muted hover:bg-white/10 hover:text-white transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </header>

                <div className="p-5">
                    <pre className="whitespace-pre-wrap break-words rounded-lg bg-black/40 border border-white/10 p-4 text-sm leading-6 font-mono text-white">
                        {instruction.text}
                    </pre>
                    <button
                        type="button"
                        onClick={copyInstruction}
                        className="mt-4 min-h-11 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-tm-purple px-4 py-2.5 text-sm font-bold text-white hover:bg-tm-purple/90 transition"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copied" : "Copy instruction"}
                    </button>
                    <p className="mt-3 text-center text-xs leading-relaxed text-tm-muted">
                        TradeMind never connects to or submits orders to your brokerage.
                    </p>
                </div>
            </section>
        </div>
    );
}
