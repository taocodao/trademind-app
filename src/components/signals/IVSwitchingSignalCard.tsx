"use client";
import React, { useState } from "react";
import {
  TrendingUp, AlertTriangle, Shield, Zap, CheckCircle,
  Target, DollarSign, ArrowRight, Clipboard, ClipboardCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { TurboCoreSignal } from "./TurboCoreSignalCard";

// ── Mode metadata ───────────────────────────────────────────────────────────
const MODE_META: Record<string, { label: string; color: string; description: string; icon: React.ReactNode }> = {
  OPEN_CSP: {
    label: "Mode A · Cash-Secured Put",
    color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    description: "Sell a TQQQ put (~12 delta, 30 DTE) — collect premium with 89%+ win rate.",
    icon: <Shield size={14} />,
  },
  OPEN_ZEBRA: {
    label: "Mode B · ZEBRA Spread",
    color: "text-green-400 bg-green-400/10 border-green-400/20",
    description: "2× 70-delta / 1× 50-delta QQQM call spread (75 DTE) — captures bull trend.",
    icon: <TrendingUp size={14} />,
  },
  OPEN_ZEBRA_D3: {
    label: "Mode D3 · Crash Recovery ZEBRA",
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    description: "Aggressive ZEBRA re-entry after crash — VIX normalizing, QQQ recovering.",
    icon: <TrendingUp size={14} />,
  },
  OPEN_CCS: {
    label: "Mode C · Bear Call Spread",
    color: "text-red-400 bg-red-400/10 border-red-400/20",
    description: "Sell QQQ call credit spread (45 DTE) — earns premium in bearish regimes.",
    icon: <AlertTriangle size={14} />,
  },
  OPEN_SQQQ: {
    label: "Mode D2 · Crash Hedge",
    color: "text-red-500 bg-red-500/10 border-red-500/20",
    description: "Buy SQQQ shares as crash hedge — extreme VIX backwardation detected.",
    icon: <AlertTriangle size={14} />,
  },
  CLOSE_POSITIONS: {
    label: "Exit · Close Position",
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    description: "Exit condition triggered (Profit Target, Stop-Loss, or Expiry). Close position now.",
    icon: <Target size={14} />,
  },
  NO_ACTION: {
    label: "Hold · No New Position",
    color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
    description: "Strategy conditions not met — no order required today.",
    icon: <Zap size={14} />,
  },
};

// ── OCC symbol decoder ──────────────────────────────────────────────────────
// Input:  "QQQ   260515C00622121"
// Output: "QQQ  May 15 '26  $622 Call"
function parseOCC(raw: string): { display: string; underlying: string; expiry: string; strike: string; type: string } | null {
  const s = raw.replace(/\s+/g, " ").trim();
  const m = s.match(/^([A-Z]+)\s+(\d{6})([CP])(\d{8})$/);
  if (!m) return null;
  const [, und, yymmdd, cp, strikeRaw] = m;
  const year  = "20" + yymmdd.slice(0, 2);
  const month = parseInt(yymmdd.slice(2, 4), 10) - 1;
  const day   = yymmdd.slice(4, 6);
  const expDate = new Date(parseInt(year), month, parseInt(day));
  const expStr = expDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
  const strike = (parseInt(strikeRaw, 10) / 1000).toFixed(0);
  const optType = cp === "C" ? "Call" : "Put";
  return { display: `${und} · ${expStr} · $${strike} ${optType}`, underlying: und, expiry: expStr, strike, type: optType };
}

interface Props {
  signal: TurboCoreSignal & { iv_switching_order_id?: string };
  onExecute: (signal: TurboCoreSignal) => void;
  executingId: string | null;
  accountData: any;
  isExecuted?: boolean;
}

export function IVSwitchingSignalCard({ signal, onExecute, executingId, accountData, isExecuted }: Props) {
  const { t } = useTranslation();
  const [executing, setExecuting] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [done, setDone]           = useState(false);
  const [copied, setCopied]       = useState<string | null>(null);

  const isLinked   = !!accountData?.accountNumber;
  const action     = signal.action || "NO_ACTION";
  const meta       = MODE_META[action] || MODE_META.NO_ACTION;
  const legs: any[] = signal.legs || [];
  const isNoAction = action === "NO_ACTION";

  // ── Leg classification ───────────────────────────────────────────────────
  // Equity legs have leg_type='equity' OR target_pct > 0 (and NOT an options action)
  const isOptionsAction = (a: string) =>
    ["BUY_TO_OPEN","SELL_TO_OPEN","BUY_TO_CLOSE","SELL_TO_CLOSE"].includes(a);

  const equityLegs  = legs.filter(l =>
    l.leg_type === "equity" || (l.target_pct > 0 && !isOptionsAction(l.action || ""))
  );
  const optionsLegs = legs.filter(l =>
    l.leg_type === "options" || isOptionsAction(l.action || "")
  );

  // ── Self-contained approve-options handler ───────────────────────────────
  const handleSubmit = async () => {
    if (executing || done) return;
    setExecuting(true);
    setError(null);
    try {
      const resp = await fetch(`/api/signals/${signal.id}/approve-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setDone(true);
      // Surface options rejection if equity filled but options failed
      if (data.optionsError) {
        setError(`⚠️ Equity filled. Options rejected: ${data.optionsError}`);
      }
    } catch (e: any) {
      setError(e.message || "Submission failed");
    } finally {
      setExecuting(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const formatActionLabel = (a: string) => {
    switch (a) {
      case "BUY_TO_OPEN":   return { label: "BUY TO OPEN",   color: "text-green-400 bg-green-400/10" };
      case "SELL_TO_OPEN":  return { label: "SELL TO OPEN",  color: "text-amber-400 bg-amber-400/10" };
      case "BUY_TO_CLOSE":  return { label: "BUY TO CLOSE",  color: "text-blue-400 bg-blue-400/10" };
      case "SELL_TO_CLOSE": return { label: "SELL TO CLOSE", color: "text-purple-400 bg-purple-400/10" };
      default: return { label: a, color: "text-zinc-400 bg-zinc-400/10" };
    }
  };

  const isExec = isExecuted || done;

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(15,15,25,0.98) 0%, rgba(20,20,35,0.95) 100%)",
      border: "1px solid rgba(139,92,246,0.25)",
      borderRadius: "16px", padding: "20px", marginBottom: "16px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{
              background: "linear-gradient(90deg, #a855f7, #7c3aed)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              fontWeight: 700, fontSize: "18px"
            }}>TurboCore Pro</span>
            <span className={meta.color} style={{
              fontSize: "11px", fontWeight: 600, padding: "2px 8px",
              borderRadius: "6px", border: "1px solid", display: "inline-flex", alignItems: "center", gap: "4px"
            }}>
              {meta.icon}&nbsp;{meta.label}
            </span>
          </div>
          <div style={{ color: "#9ca3af", fontSize: "13px" }}>
            IV-Switching Composite Strategy · {new Date(signal.timestamp || signal.createdAt || Date.now()).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#a855f7", fontWeight: 700, fontSize: "22px" }}>
            {Math.round(signal.confidence * 100)}%
          </div>
          <div style={{ color: "#6b7280", fontSize: "11px" }}>Confidence</div>
        </div>
      </div>

      {/* Mode description */}
      <div style={{
        background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)",
        borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#9ca3af",
      }}>
        {meta.description}
      </div>

      {/* ── Equity Allocation ─────────────────────────────────────────────── */}
      {equityLegs.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Equity Allocation
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
            {equityLegs.map((leg: any, i: number) => {
              const sym = (leg.symbol || "").replace(/_/g, "").trim();
              const pct = leg.target_pct != null ? Math.round(leg.target_pct * 100) : null;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "rgba(139,92,246,0.06)", borderRadius: "8px", padding: "8px 12px",
                  border: "1px solid rgba(139,92,246,0.12)",
                }}>
                  <span style={{ color: "#e5e7eb", fontWeight: 600, fontSize: "13px" }}>{sym}</span>
                  {pct !== null && (
                    <span style={{ color: "#a855f7", fontWeight: 700, fontSize: "14px" }}>{pct}%</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Options Overlay ───────────────────────────────────────────────── */}
      {optionsLegs.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Options Overlay
          </div>
          {optionsLegs.map((leg: any, i: number) => {
            const af   = formatActionLabel(leg.action || "");
            const rawSym = (leg.symbol || "").trim();
            const parsed = parseOCC(rawSym);
            const copyKey = `${signal.id}-opt-${i}`;
            return (
              <div key={i} style={{
                background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "10px 14px",
                marginBottom: "6px", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "5px" }} className={af.color}>
                      {af.label}
                    </span>
                    {/* Human-readable: "QQQ · May 15 '26 · $622 Call" */}
                    <span style={{ color: "#e5e7eb", fontWeight: 600, fontSize: "13px" }}>
                      {parsed ? parsed.display : rawSym}
                    </span>
                    {leg.qty && leg.qty > 0 && (
                      <span style={{ color: "#6b7280", fontSize: "12px" }}>×{leg.qty}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleCopy(rawSym, copyKey)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px" }}
                    title="Copy OCC symbol"
                  >
                    {copied === copyKey ? <ClipboardCheck size={14} color="#a855f7" /> : <Clipboard size={14} />}
                  </button>
                </div>
                {/* Small sub-line with raw OCC for advanced users */}
                <div style={{ color: "#4b5563", fontSize: "10px", fontFamily: "monospace", marginTop: "4px", marginLeft: "2px" }}>
                  {rawSym}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rationale sub-line */}
      {signal.rationale && (
        <div style={{
          background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "8px 14px",
          fontSize: "12px", color: "#6b7280", marginBottom: "14px", lineHeight: "1.6",
        }}>
          {signal.rationale}
        </div>
      )}

      {/* Capital required */}
      {signal.capital_required && signal.capital_required > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", color: "#9ca3af", fontSize: "13px" }}>
          <DollarSign size={14} color="#a855f7" />
          Capital required: <strong style={{ color: "#e5e7eb" }}>${signal.capital_required.toLocaleString()}</strong>
          {signal.cost ? <>&nbsp;· Limit <strong style={{ color: "#e5e7eb" }}>${Number(signal.cost).toFixed(2)}</strong></> : null}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ color: "#f87171", fontSize: "12px", marginBottom: "10px", padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: "8px" }}>
          ⚠ {error}
        </div>
      )}

      {/* Submit / Executed */}
      {isExec ? (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px", justifyContent: "center",
          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: "10px", padding: "14px", color: "#22c55e", fontWeight: 600,
        }}>
          <CheckCircle size={18} /> Executed
        </div>
      ) : isNoAction ? (
        <div style={{
          textAlign: "center", color: "#6b7280", fontSize: "13px",
          padding: "12px", borderRadius: "10px",
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          No action required today — strategy is in HOLD
        </div>
      ) : (
        <>
          <button
            onClick={handleSubmit}
            disabled={executing}
            style={{
              width: "100%", padding: "14px",
              background: executing ? "rgba(139,92,246,0.3)" : "linear-gradient(90deg, #7c3aed, #a855f7)",
              border: "none", borderRadius: "10px", color: "white",
              fontWeight: 700, fontSize: "15px", cursor: executing ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "opacity 0.2s",
            }}
          >
            {executing ? (
              <><span style={{ animation: "spin 1s linear infinite" }}>⟳</span> Submitting…</>
            ) : (
              <><Target size={16} /> {isLinked ? "Execute All Orders" : "Track Virtually"} <ArrowRight size={16} /></>
            )}
          </button>
          {!isLinked && (
            <div style={{ textAlign: "center", color: "#6b7280", fontSize: "12px", marginTop: "8px" }}>
              ⚡ Connect Tastytrade for live execution · Virtual tracking active
            </div>
          )}
        </>
      )}
    </div>
  );
}
