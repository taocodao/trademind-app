import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  CheckCircle,
  Brain,
  Target,
  Activity,
  Calendar,
  DollarSign,
  Layers,
  AlertTriangle,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

// ── Signal payload from signal_publisher/qqq_leaps.py ───────────────────────
export interface QQQLEAPSSignal {
  id: number | string;
  symbol: string;               // "QQQ"
  strategy: string;             // "QQQ_LEAPS"
  action: string;               // "ENTER" | "EXIT" | "HOLD"
  direction: string;            // "LONG" | "CLOSE" | "HOLD"
  regime: string;               // "BULL_STRONG" | "BULL_MODERATE" | "CHOPPY" | "BEAR"
  confidence: number;
  rationale?: string;
  // Option specifics
  strike?: number;
  expiry?: string;              // "YYYY-MM-DD"
  entry_px?: number;            // price per contract (100× = notional)
  exit_px?: number;
  contracts?: number;
  delta?: number;
  spot?: number;
  exit_reason?: string;
  cost?: number;
  capital_required?: number;
  // Meta
  timestamp?: string;
  createdAt?: string;
  created_at?: string;
  expires_at?: string;
  expiresAt?: string;
  userExecution?: {
    status: string;
    orderId: string | null;
    executedAt: string | null;
  };
  legs?: any[];
}

export function isQQQLEAPSSignal(signal: any): signal is QQQLEAPSSignal {
  return (
    (signal.strategy || "").toUpperCase() === "QQQ_LEAPS" ||
    (signal.action === "ENTER" && signal.symbol === "QQQ" && signal.strike != null)
  );
}

interface Props {
  signal: QQQLEAPSSignal;
  onExecute: (signal: QQQLEAPSSignal) => void;
  executingId: string | null;
  isExecuted?: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getRegimeColor(regime: string) {
  const r = regime.toUpperCase();
  if (r.includes("BULL_STRONG"))
    return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  if (r.includes("BULL"))
    return "text-green-400 bg-green-400/10 border-green-400/20";
  if (r.includes("BEAR"))
    return "text-red-400 bg-red-400/10 border-red-400/20";
  if (r.includes("CHOPPY"))
    return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
  return "text-slate-400 bg-slate-400/10 border-slate-400/20";
}

function getActionConfig(action: string) {
  switch (action.toUpperCase()) {
    case "ENTER":
      return {
        label: "BUY TO OPEN",
        sublabel: "Enter LEAPS position",
        icon: TrendingUp,
        badgeClass: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
        btnClass: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30",
        accentColor: "emerald",
      };
    case "EXIT":
      return {
        label: "SELL TO CLOSE",
        sublabel: "Exit LEAPS position",
        icon: TrendingDown,
        badgeClass: "text-red-400 bg-red-400/10 border-red-400/20",
        btnClass: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30",
        accentColor: "red",
      };
    case "HOLD":
    default:
      return {
        label: "HOLD",
        sublabel: "No action required",
        icon: Minus,
        badgeClass: "text-slate-400 bg-slate-400/10 border-slate-400/20",
        btnClass: "bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 border border-slate-500/30 cursor-default",
        accentColor: "slate",
      };
  }
}

function formatExpiry(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function dteFromExpiry(dateStr?: string): number | null {
  if (!dateStr) return null;
  try {
    const exp = new Date(dateStr + "T12:00:00Z");
    const now = new Date();
    return Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function QQQLEAPSSignalCard({
  signal,
  onExecute,
  executingId,
  isExecuted,
}: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const isExecuting = executingId === String(signal.id);
  const action = signal.action?.toUpperCase() || "HOLD";
  const isEnter = action === "ENTER";
  const isExit = action === "EXIT";
  const isHold = action === "HOLD";
  const actionCfg = getActionConfig(action);
  const ActionIcon = actionCfg.icon;

  const regime = signal.regime || "UNKNOWN";
  const confidence = signal.confidence || 0;

  // Timestamp
  const signalTimestamp = signal.createdAt || signal.created_at;
  const formattedTimestamp = signalTimestamp
    ? new Date(signalTimestamp).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  // Options display values
  const strike = signal.strike ?? 0;
  const contracts = signal.contracts ?? 0;
  const entryPx = signal.entry_px ?? 0;
  const exitPx = signal.exit_px ?? 0;
  const delta = signal.delta ?? 0;
  const spot = signal.spot ?? 0;
  const dte = dteFromExpiry(signal.expiry);
  const notionalCost = entryPx * 100 * contracts;

  // Regime label cleanup (BULL_STRONG → BULL STRONG)
  const regimeLabel = regime.replace(/_/g, " ");

  return (
    <div className="bg-black/40 border border-[#333] rounded-xl overflow-hidden hover:border-[#444] transition-all group">
      <div className="p-4">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            {/* Strategy icon */}
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 relative">
              <Layers className="w-6 h-6 text-amber-400" />
              {/* Action overlay badge */}
              <div className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center border border-black ${
                isEnter ? "bg-emerald-500" : isExit ? "bg-red-500" : "bg-slate-600"
              }`}>
                {isEnter ? <ArrowUpRight className="w-3 h-3 text-white" /> :
                 isExit  ? <ArrowDownRight className="w-3 h-3 text-white" /> :
                           <Minus className="w-3 h-3 text-white" />}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg text-white tracking-tight">QQQ LEAPS</h3>

                {/* Action badge */}
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${actionCfg.badgeClass}`}>
                  {action}
                </div>

                {/* Regime badge */}
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRegimeColor(regime)}`}>
                  {regimeLabel}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm mt-0.5">
                <span className={confidence >= 0.65 ? "text-emerald-400" : "text-yellow-400"}>
                  {isEnter ? "ML Entry Signal" : isExit ? "Exit Trigger" : "No Action"}
                </span>
                {formattedTimestamp && (
                  <span className="text-xs text-white/70 border-l border-white/20 pl-2">
                    {formattedTimestamp}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ML Confidence */}
          <div className="text-right">
            <div className="text-2xl font-bold bg-gradient-to-br from-amber-400 to-orange-500 bg-clip-text text-transparent">
              {(confidence * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-white/80 font-medium">ML Score</div>
          </div>
        </div>

        {/* ── Option Details Grid ─────────────────────────────────────────── */}
        {(isEnter || isExit) && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {/* Strike */}
            <div className="bg-[#111] p-3 rounded-lg border border-white/5 text-center">
              <div className="text-[10px] text-white/60 mb-1 flex items-center justify-center gap-1">
                <Target className="w-3 h-3" /> Strike
              </div>
              <div className="font-mono text-sm font-bold text-amber-400">
                ${strike.toFixed(0)}
              </div>
              <div className="text-[10px] text-white/50 mt-0.5">Call</div>
            </div>

            {/* Expiry / DTE */}
            <div className="bg-[#111] p-3 rounded-lg border border-white/5 text-center">
              <div className="text-[10px] text-white/60 mb-1 flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3" /> Expiry
              </div>
              <div className="font-mono text-sm font-bold text-white/90">
                {formatExpiry(signal.expiry)}
              </div>
              {dte != null && (
                <div className="text-[10px] text-white/50 mt-0.5">{dte}d DTE</div>
              )}
            </div>

            {/* Delta */}
            <div className="bg-[#111] p-3 rounded-lg border border-white/5 text-center">
              <div className="text-[10px] text-white/60 mb-1 flex items-center justify-center gap-1">
                <Activity className="w-3 h-3" /> Delta
              </div>
              <div className={`font-mono text-sm font-bold ${delta >= 0.70 ? "text-blue-400" : delta >= 0.50 ? "text-green-400" : "text-yellow-400"}`}>
                {delta.toFixed(2)}
              </div>
              <div className="text-[10px] text-white/50 mt-0.5">
                {delta >= 0.75 ? "Deep ITM" : delta >= 0.55 ? "ITM" : "Near ITM"}
              </div>
            </div>

            {/* Contracts */}
            <div className="bg-[#111] p-3 rounded-lg border border-white/5 text-center">
              <div className="text-[10px] text-white/60 mb-1 flex items-center justify-center gap-1">
                <Layers className="w-3 h-3" /> Contracts
              </div>
              <div className="font-mono text-sm font-bold text-white/90">
                {contracts}
              </div>
              <div className="text-[10px] text-white/50 mt-0.5">
                {contracts * 100} shares
              </div>
            </div>

            {/* Entry / Exit Price */}
            <div className="bg-[#111] p-3 rounded-lg border border-white/5 text-center">
              <div className="text-[10px] text-white/60 mb-1 flex items-center justify-center gap-1">
                <DollarSign className="w-3 h-3" /> {isExit ? "Exit Px" : "Entry Px"}
              </div>
              <div className="font-mono text-sm font-bold text-white/90">
                ${(isExit ? exitPx : entryPx).toFixed(2)}
              </div>
              <div className="text-[10px] text-white/50 mt-0.5">per contract</div>
            </div>

            {/* Notional */}
            <div className="bg-[#111] p-3 rounded-lg border border-white/5 text-center">
              <div className="text-[10px] text-white/60 mb-1 flex items-center justify-center gap-1">
                <DollarSign className="w-3 h-3" /> Notional
              </div>
              <div className={`font-mono text-sm font-bold ${isExit ? "text-red-400" : "text-emerald-400"}`}>
                {isExit
                  ? `$${(exitPx * 100 * contracts).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  : `$${notionalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              </div>
              <div className="text-[10px] text-white/50 mt-0.5">total</div>
            </div>
          </div>
        )}

        {/* ── HOLD state banner ──────────────────────────────────────────── */}
        {isHold && (
          <div className="mb-4 p-3 rounded-lg bg-slate-500/5 border border-slate-500/20 flex items-center gap-3">
            <Minus className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-300">No Action Required</p>
              <p className="text-xs text-white/50 mt-0.5">
                Current regime ({regimeLabel}) does not trigger an entry or exit signal.
              </p>
            </div>
          </div>
        )}

        {/* ── Order Summary Box ───────────────────────────────────────────── */}
        {(isEnter || isExit) && (
          <div className={`mb-4 p-3 rounded-lg border relative overflow-hidden ${
            isEnter
              ? "bg-emerald-900/10 border-emerald-500/20"
              : "bg-red-900/10 border-red-500/20"
          }`}>
            <div className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${isEnter ? "text-emerald-400" : "text-red-400"}`}>
              <ActionIcon className="w-3.5 h-3.5" />
              {isEnter ? "Entry Order Summary" : "Exit Order Summary"}
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-white/60">Instrument</span>
                <span className="text-white/90 font-bold">
                  QQQ {signal.expiry?.replace(/-/g, "")} C{strike.toFixed(0)} (LEAPS Call)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Action</span>
                <span className={`font-bold ${isEnter ? "text-emerald-400" : "text-red-400"}`}>
                  {isEnter ? "BUY TO OPEN" : "SELL TO CLOSE"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Qty</span>
                <span className="text-white/90">{contracts} contract{contracts !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Limit Price (est.)</span>
                <span className="text-white/90">${(isExit ? exitPx : entryPx).toFixed(2)} (ask)</span>
              </div>
              {spot > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/60">QQQ Spot</span>
                  <span className="text-white/90">${spot.toFixed(2)}</span>
                </div>
              )}
              {isExit && signal.exit_reason && (
                <div className="flex justify-between">
                  <span className="text-white/60">Reason</span>
                  <span className="text-red-400">{signal.exit_reason.replace(/_/g, " ")}</span>
                </div>
              )}
            </div>

            <div className={`mt-2 pt-2 border-t flex justify-between items-center ${isEnter ? "border-emerald-500/10" : "border-red-500/10"}`}>
              <span className="text-[10px] text-white/50">Estimated total</span>
              <span className={`font-mono font-bold text-sm ${isEnter ? "text-emerald-400" : "text-red-400"}`}>
                {isEnter
                  ? `$${notionalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} debit`
                  : `$${(exitPx * 100 * contracts).toLocaleString(undefined, { maximumFractionDigits: 0 })} credit`}
              </span>
            </div>
          </div>
        )}

        {/* ── Execute / Executed Button ───────────────────────────────────── */}
        <div className="flex gap-2">
          {isExecuted ? (
            <div className="flex-1 py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 cursor-default">
              <CheckCircle className="w-4 h-4" />
              <span>Executed</span>
            </div>
          ) : isHold ? (
            <div className="flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 bg-slate-500/5 border border-slate-500/20 text-slate-400 cursor-default">
              <Minus className="w-4 h-4" />
              <span className="font-semibold text-sm">No Trade — HOLD</span>
            </div>
          ) : (
            <button
              onClick={() => onExecute(signal)}
              disabled={isExecuting}
              className={`flex-1 py-3 px-4 rounded-lg font-bold flex flex-col items-center justify-center transition-all ${actionCfg.btnClass} ${isExecuting ? "opacity-80 cursor-wait" : ""}`}
            >
              {isExecuting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="flex items-center gap-1.5">
                    {isEnter ? <Zap className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {isEnter ? "LOG ENTRY" : "LOG EXIT"}
                  </span>
                  <div className="text-[10px] font-normal opacity-80 mt-0.5">
                    {isEnter ? "Virtual · records LEAPS position" : "Virtual · closes LEAPS position"}
                  </div>
                </>
              )}
            </button>
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-12 flex items-center justify-center rounded-lg bg-[#222] border border-white/10 hover:bg-[#333] transition-colors"
          >
            <ChevronDown
              className={`w-5 h-5 text-white/90 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* ── Expanded Detail Section ─────────────────────────────────────── */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 text-sm text-white/70 space-y-2">
            <div className="flex justify-between items-center p-2 bg-black/30 rounded border border-white/5">
              <span className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-400" /> ML Confidence
              </span>
              <span className="font-mono text-amber-400">{(confidence * 100).toFixed(1)}%</span>
            </div>

            <div className="flex justify-between items-center p-2 bg-black/30 rounded border border-white/5">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" /> Regime
              </span>
              <span className="font-mono">{regimeLabel}</span>
            </div>

            {spot > 0 && (
              <div className="flex justify-between items-center p-2 bg-black/30 rounded border border-white/5">
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-400" /> QQQ Spot
                </span>
                <span className="font-mono">${spot.toFixed(2)}</span>
              </div>
            )}

            {delta > 0 && (
              <div className="flex justify-between items-center p-2 bg-black/30 rounded border border-white/5">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" /> Delta
                </span>
                <span className="font-mono">{delta.toFixed(3)}</span>
              </div>
            )}

            {signal.rationale && (
              <p className="p-2 text-xs italic opacity-100 leading-relaxed">
                &quot;{signal.rationale}&quot;
              </p>
            )}

            {/* Manual broker instructions */}
            {(isEnter || isExit) && (
              <div className="p-2 bg-amber-500/5 border border-amber-500/20 rounded text-[10px] text-amber-400/80 leading-relaxed">
                <span className="font-bold">📋 Manual Order: </span>
                {isEnter
                  ? `In your broker: BUY TO OPEN ${contracts} contract${contracts !== 1 ? "s" : ""} QQQ Call, Strike $${strike.toFixed(0)}, Expiry ${formatExpiry(signal.expiry)}, ~0.70+ delta ITM, Limit ≈ $${entryPx.toFixed(2)}/contract`
                  : `In your broker: SELL TO CLOSE ${contracts} contract${contracts !== 1 ? "s" : ""} QQQ Call, Strike $${strike.toFixed(0)}, Expiry ${formatExpiry(signal.expiry)}, Limit ≈ $${exitPx.toFixed(2)}/contract`}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
