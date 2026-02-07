'use client';

import { Info, TrendingUp, Shield, AlertTriangle, Target, Check, X, Clock } from 'lucide-react';
import { useState } from 'react';

export function RiskAnalysisReport() {
    const [activeTab, setActiveTab] = useState<'theta' | 'calendar'>('theta');

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-tm-purple" />
                    <h3 className="font-bold">📊 Risk & Return Analysis</h3>
                </div>
                <p className="text-xs text-tm-muted">
                    Based on historical backtests (500+ trades)
                </p>
            </div>

            {/* Strategy Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('theta')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'theta'
                            ? 'bg-tm-purple text-white'
                            : 'bg-tm-surface text-tm-muted'
                        }`}
                >
                    💜 Theta Sprint
                </button>
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'calendar'
                            ? 'bg-tm-green text-white'
                            : 'bg-tm-surface text-tm-muted'
                        }`}
                >
                    💚 Calendar
                </button>
            </div>

            {activeTab === 'theta' ? (
                <>
                    {/* Theta Sprint Performance */}
                    <div className="glass-card p-4">
                        <h4 className="text-sm font-semibold mb-3">Performance (300 trades)</h4>

                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                            <div className="grid grid-cols-4 gap-2 text-xs">
                                <div>
                                    <p className="text-tm-muted">Win Rate</p>
                                    <p className="font-mono font-bold text-green-400">97.8%</p>
                                </div>
                                <div>
                                    <p className="text-tm-muted">Avg Profit</p>
                                    <p className="font-mono font-bold">$5,600</p>
                                </div>
                                <div>
                                    <p className="text-tm-muted">ROI</p>
                                    <p className="font-mono font-bold">61%</p>
                                </div>
                                <div>
                                    <p className="text-tm-muted">Max DD</p>
                                    <p className="font-mono font-bold">-16.8%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Time-Based Exit Strategy */}
                    <div className="glass-card p-4">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-400" />
                            Exit Strategy
                        </h4>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between p-2 bg-tm-surface/50 rounded">
                                <span className="text-tm-muted">Week 1</span>
                                <span className="font-mono font-bold">50% profit</span>
                            </div>
                            <div className="flex justify-between p-2 bg-tm-surface/50 rounded">
                                <span className="text-tm-muted">Week 2</span>
                                <span className="font-mono font-bold">60% profit</span>
                            </div>
                            <div className="flex justify-between p-2 bg-tm-surface/50 rounded">
                                <span className="text-tm-muted">Week 3</span>
                                <span className="font-mono font-bold">75% profit</span>
                            </div>
                            <div className="flex justify-between p-2 bg-green-500/20 rounded">
                                <span className="text-tm-muted">Week 4+</span>
                                <span className="font-mono font-bold text-green-400">90% profit</span>
                            </div>
                        </div>
                    </div>

                    {/* Trailing Defensive vs Trailing Stop */}
                    <div className="glass-card p-4 border border-yellow-500/30">
                        <h4 className="text-sm font-semibold mb-3">Backtest Finding</h4>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            {/* Trailing Defensive - GOOD */}
                            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                                <div className="flex items-center gap-1 mb-2">
                                    <Check className="w-3 h-3 text-green-400" />
                                    <span className="font-bold text-green-400">Trailing Defensive</span>
                                </div>
                                <p className="text-tm-muted mb-1">3-day breach confirmation</p>
                                <p className="font-mono text-green-400">+14% ROI</p>
                            </div>

                            {/* Trailing P&L Stop - BAD */}
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                <div className="flex items-center gap-1 mb-2">
                                    <X className="w-3 h-3 text-red-400" />
                                    <span className="font-bold text-red-400">Trailing P&L Stop</span>
                                </div>
                                <p className="text-tm-muted mb-1">Exit on profit retracement</p>
                                <p className="font-mono text-red-400">-24.5% P&L</p>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Calendar Spread Performance */}
                    <div className="glass-card p-4">
                        <h4 className="text-sm font-semibold mb-3">Performance (500 trades)</h4>

                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                            <div className="grid grid-cols-4 gap-2 text-xs">
                                <div>
                                    <p className="text-tm-muted">Win Rate</p>
                                    <p className="font-mono font-bold text-green-400">66.3%</p>
                                </div>
                                <div>
                                    <p className="text-tm-muted">Return</p>
                                    <p className="font-mono font-bold">+7.3%</p>
                                </div>
                                <div>
                                    <p className="text-tm-muted">Sharpe</p>
                                    <p className="font-mono font-bold">15.35</p>
                                </div>
                                <div>
                                    <p className="text-tm-muted">Max DD</p>
                                    <p className="font-mono font-bold">-1.1%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Exit Strategy */}
                    <div className="glass-card p-4">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4 text-green-400" />
                            Exit Strategy (Fixed Targets)
                        </h4>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between p-2 bg-green-500/20 rounded">
                                <span className="text-tm-muted">Profit Target</span>
                                <span className="font-mono font-bold text-green-400">+35%</span>
                            </div>
                            <div className="flex justify-between p-2 bg-red-500/20 rounded">
                                <span className="text-tm-muted">Stop Loss</span>
                                <span className="font-mono font-bold text-red-400">-40%</span>
                            </div>
                            <div className="flex justify-between p-2 bg-yellow-500/20 rounded">
                                <span className="text-tm-muted">Earnings</span>
                                <span className="font-mono font-bold text-yellow-400">Exit 7 days before</span>
                            </div>
                        </div>
                    </div>

                    {/* Trailing Stop Backtest Result */}
                    <div className="glass-card p-4 border border-blue-500/30">
                        <h4 className="text-sm font-semibold mb-3">Backtest Finding</h4>

                        <div className="bg-blue-500/10 rounded-lg p-3 text-xs">
                            <p className="text-blue-300 font-bold mb-2">
                                Trailing stops have MINIMAL impact on Calendar Spreads
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-tm-muted">Fixed Targets</p>
                                    <p className="font-mono">Sharpe: <span className="text-green-400 font-bold">2.61</span></p>
                                </div>
                                <div>
                                    <p className="text-tm-muted">With Trailing</p>
                                    <p className="font-mono">Sharpe: <span className="text-yellow-400">2.27-2.50</span></p>
                                </div>
                            </div>
                            <p className="text-tm-muted mt-2">
                                ✅ Fixed targets are simpler and perform slightly better
                            </p>
                        </div>
                    </div>
                </>
            )}

            {/* Summary */}
            <div className="glass-card p-4 border border-tm-purple/30">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-tm-purple" />
                    Key Takeaways
                </h4>

                <ul className="space-y-2 text-xs">
                    <li className="flex items-start gap-2">
                        <span className="text-green-400">✓</span>
                        <span><strong>Theta:</strong> Time-based + 3-day defensive exits</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-green-400">✓</span>
                        <span><strong>Calendar:</strong> Fixed +35%/-40% targets</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-red-400">✗</span>
                        <span><strong>Both:</strong> No trailing P&L stops (hurts returns)</span>
                    </li>
                </ul>
            </div>

            {/* Disclaimer */}
            <div className="text-xs text-tm-muted text-center bg-tm-surface/30 rounded p-3">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Historical backtest results. Past performance ≠ future results.
            </div>
        </div>
    );
}
