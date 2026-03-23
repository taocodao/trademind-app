'use client';

import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderLeg {
  action: string;        // BUY_TO_OPEN, SELL_TO_OPEN, BUY, SELL, etc.
  symbol: string;
  qty: number;
  instrument_type: string;
}

interface AccountSnapshot {
  cash: number;
  nlv: number;
  buyingPower: number;
  openZebras: number;
  openCsps: number;
  openCcs: number;
  openSqqqShares: number;
}

interface IVOrder {
  id: string;
  tradeDate: string;
  strategyMode: string;   // A, B, C, D2, D3
  signalType: string;     // OPEN_ZEBRA, OPEN_CSP, OPEN_CCS, OPEN_SQQQ, HOLD, NO_ACTION ...
  accountSnapshot: AccountSnapshot;
  symbol?: string;
  optionType?: string;
  contracts: number;
  capitalRequired: number;
  navPct: number;
  orderLegs?: OrderLeg[];
  limitPrice?: number;
  longStrike?: number;
  shortStrike?: number;
  expiryDate?: string;
  status: string;         // PENDING, PLACED, FILLED, SKIPPED, ERROR
  orderId?: string;
  fillPrice?: number;
  skipReason?: string;
}

interface StrategyOrderCardProps {
  order: IVOrder;
  refreshToken?: string;   // User's TastyTrade refresh token (for order placement)
  accountNumber?: string;
  onOrderPlaced?: (orderId: string) => void;
  onOrderSkipped?: () => void;
}


// ── Mode Metadata ─────────────────────────────────────────────────────────────

const MODE_META: Record<string, { label: string; color: string; bg: string }> = {
  A:  { label: 'Mode A — CSP',           color: '#22c55e', bg: 'rgba(34,197,94,0.10)' },
  B:  { label: 'Mode B — ZEBRA',         color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
  C:  { label: 'Mode C — Bear Spread',   color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  D2: { label: 'Mode D2 — Bear Crash',   color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  D3: { label: 'Mode D3 — Recovery',     color: '#a855f7', bg: 'rgba(168,85,247,0.10)' },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Pending',   color: '#f59e0b' },
  CONFIRMED: { label: 'Confirmed', color: '#3b82f6' },
  PLACED:    { label: 'Placed',    color: '#6366f1' },
  FILLED:    { label: 'Filled',    color: '#22c55e' },
  SKIPPED:   { label: 'Skipped',   color: '#6b7280' },
  ERROR:     { label: 'Error',     color: '#ef4444' },
};

function formatAction(action: string): string {
  const map: Record<string, string> = {
    BUY_TO_OPEN:   'BTO',
    SELL_TO_OPEN:  'STO',
    BUY_TO_CLOSE:  'BTC',
    SELL_TO_CLOSE: 'STC',
    BUY:           'BUY',
    SELL:          'SELL',
  };
  return map[action] ?? action;
}

function formatSymbol(sym: string): string {
  // "QQQM  260606C00480000" → "QQQM Jun06 480C"
  const m = sym.trim().match(/^([A-Z]+)\s+(\d{2})(\d{2})(\d{2})([CP])(\d+)$/);
  if (!m) return sym.trim();
  const [, ticker, yy, mm, dd, type, strikeRaw] = m;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const strike = (parseInt(strikeRaw) / 1000).toFixed(0);
  return `${ticker} ${months[parseInt(mm)-1]}${dd} $${strike}${type}`;
}


// ── Main Component ─────────────────────────────────────────────────────────────

export default function StrategyOrderCard({
  order,
  refreshToken,
  accountNumber,
  onOrderPlaced,
  onOrderSkipped,
}: StrategyOrderCardProps) {
  const [loading, setLoading] = useState<'place' | 'skip' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState(order.status);

  const mode = MODE_META[order.strategyMode] ?? { label: order.strategyMode, color: '#9ca3af', bg: 'rgba(156,163,175,0.10)' };
  const statusMeta = STATUS_META[localStatus] ?? { label: localStatus, color: '#9ca3af' };
  const isActionable = localStatus === 'PENDING' && !!order.orderLegs?.length;
  const isHold = ['NO_ACTION', 'HOLD'].includes(order.signalType);

  // ── Place Order ──────────────────────────────────────────────────────────────
  async function handlePlace() {
    if (!refreshToken) {
      setError('TastyTrade token required — connect your account in Settings.');
      return;
    }
    setLoading('place');
    setError(null);
    try {
      const res = await fetch(`/api/iv-orders/me/${order.id}/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refresh_token: refreshToken,
          account_number: accountNumber ?? null,
          dry_run: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Unknown error');
      setLocalStatus('PLACED');
      onOrderPlaced?.(data.order_id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  // ── Skip Order ───────────────────────────────────────────────────────────────
  async function handleSkip() {
    setLoading('skip');
    setError(null);
    try {
      const res = await fetch(`/api/iv-orders/me/${order.id}/skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User skipped via dashboard' }),
      });
      if (!res.ok) throw new Error('Skip failed');
      setLocalStatus('SKIPPED');
      onOrderSkipped?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{
      background: 'rgba(15,20,35,0.85)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: '20px 24px',
      marginBottom: 16,
      fontFamily: 'Inter, system-ui, sans-serif',
      backdropFilter: 'blur(12px)',
    }}>
      {/* ── Header Row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        {/* Mode Badge */}
        <span style={{
          background: mode.bg,
          color: mode.color,
          border: `1px solid ${mode.color}40`,
          borderRadius: 8,
          padding: '4px 12px',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}>
          {mode.label}
        </span>

        {/* Status + Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#6b7280', fontSize: 12 }}>{order.tradeDate}</span>
          <span style={{
            color: statusMeta.color,
            background: `${statusMeta.color}18`,
            border: `1px solid ${statusMeta.color}40`,
            borderRadius: 6,
            padding: '2px 10px',
            fontSize: 12,
            fontWeight: 600,
          }}>
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* ── Account Snapshot ── */}
      <div style={{
        display: 'flex', gap: 24, flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 10, padding: '10px 16px', marginBottom: 16,
        fontSize: 13, color: '#9ca3af',
      }}>
        <span>💰 Cash: <b style={{ color: '#e5e7eb' }}>${(order.accountSnapshot?.cash ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</b></span>
        <span>📊 NLV: <b style={{ color: '#e5e7eb' }}>${(order.accountSnapshot?.nlv ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</b></span>
        {(order.accountSnapshot?.openZebras ?? 0) > 0 &&
          <span>🦓 ZEBRAs: <b style={{ color: '#3b82f6' }}>{order.accountSnapshot.openZebras}/2</b></span>}
        {(order.accountSnapshot?.openCsps ?? 0) > 0 &&
          <span>📉 CSPs: <b style={{ color: '#22c55e' }}>{order.accountSnapshot.openCsps}</b></span>}
        {(order.accountSnapshot?.openSqqqShares ?? 0) > 0 &&
          <span>🐻 SQQQ: <b style={{ color: '#ef4444' }}>{order.accountSnapshot.openSqqqShares} sh</b></span>}
      </div>

      {/* ── HOLD / NO_ACTION state ── */}
      {isHold ? (
        <div style={{
          background: 'rgba(107,114,128,0.10)',
          border: '1px dashed rgba(107,114,128,0.3)',
          borderRadius: 10, padding: '14px 18px',
          color: '#6b7280', fontSize: 14, textAlign: 'center',
        }}>
          <span style={{ fontSize: 20, marginRight: 8 }}>⏸</span>
          {order.skipReason ?? 'No action required today — strategy is in HOLD'}
        </div>
      ) : (
        <>
          {/* ── Order Details ── */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '14px 18px', marginBottom: 14,
          }}>
            {/* Trade summary line */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                {order.symbol} {order.optionType}
                {order.longStrike && order.shortStrike
                  ? ` · ${order.longStrike}/${order.shortStrike}`
                  : order.shortStrike ? ` · ${order.shortStrike}` : ''}
                {order.expiryDate ? ` · exp ${order.expiryDate}` : ''}
              </span>
              <span style={{ color: '#9ca3af', fontSize: 13 }}>
                {order.contracts} contract{order.contracts !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Legs */}
            {order.orderLegs?.map((leg, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '5px 0',
                borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                fontSize: 13, color: '#d1d5db',
              }}>
                <span style={{
                  background: leg.action.startsWith('BUY') ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: leg.action.startsWith('BUY') ? '#4ade80' : '#f87171',
                  borderRadius: 4, padding: '1px 7px', fontWeight: 700, fontSize: 11,
                  minWidth: 36, textAlign: 'center',
                }}>
                  {formatAction(leg.action)}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#93c5fd' }}>
                  {formatSymbol(leg.symbol)}
                </span>
                <span style={{ marginLeft: 'auto', color: '#9ca3af' }}>×{leg.qty}</span>
              </div>
            ))}

            {/* Limit Price + Capital */}
            <div style={{ display: 'flex', gap: 24, marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13, color: '#9ca3af' }}>
                Limit: <b style={{ color: '#fbbf24' }}>${(order.limitPrice ?? 0).toFixed(2)}</b>
              </span>
              <span style={{ fontSize: 13, color: '#9ca3af' }}>
                Capital: <b style={{ color: '#e5e7eb' }}>${(order.capitalRequired ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</b>
                <span style={{ color: '#6b7280', marginLeft: 4 }}>({order.navPct?.toFixed(1)}% NAV)</span>
              </span>
              {order.fillPrice && (
                <span style={{ fontSize: 13, color: '#9ca3af' }}>
                  Fill: <b style={{ color: '#4ade80' }}>${order.fillPrice.toFixed(2)}</b>
                </span>
              )}
            </div>
          </div>

          {/* ── Action Buttons ── */}
          {isActionable && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handlePlace}
                disabled={!!loading}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  background: loading === 'place'
                    ? 'rgba(99,102,241,0.5)'
                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: loading ? 'wait' : 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'opacity 0.2s',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading === 'place' ? '⏳ Placing…' : '⚡ Place Order'}
              </button>

              <button
                onClick={handleSkip}
                disabled={!!loading}
                style={{
                  padding: '11px 22px',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#9ca3af',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: loading ? 'wait' : 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                Skip
              </button>
            </div>
          )}

          {/* TT order ID once placed */}
          {['PLACED', 'FILLED'].includes(localStatus) && order.orderId && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
              TastyTrade order: <code style={{ color: '#93c5fd' }}>{order.orderId}</code>
            </div>
          )}
        </>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div style={{
          marginTop: 10, padding: '10px 14px',
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8, color: '#f87171', fontSize: 13,
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
