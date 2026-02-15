'use client';

import { useState } from 'react';
import { useSettings } from '../providers/SettingsProvider';
import { Eye, EyeOff, Save, Key, User } from 'lucide-react';

export function TastytradeCredentials() {
    const { settings, updateTastytradeSettings } = useSettings();
    const [refreshToken, setRefreshToken] = useState(settings.tastytrade.refreshToken || '');
    const [accountNumber, setAccountNumber] = useState(settings.tastytrade.accounts?.[0]?.['account-number'] || '');
    const [pixels, setPixels] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        updateTastytradeSettings({
            refreshToken,
            accounts: [{ 'account-number': accountNumber }]
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <section className="glass-card p-5 border border-purple-500/20">
            <h3 className="flex items-center gap-2 font-bold text-lg mb-4">
                <Key className="w-5 h-5 text-tm-purple" />
                Tastytrade Credentials
            </h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs text-tm-muted mb-1.5 font-medium">Refresh Token</label>
                    <div className="relative">
                        <input
                            type={pixels ? 'text' : 'password'}
                            value={refreshToken}
                            onChange={(e) => setRefreshToken(e.target.value)}
                            placeholder="Enter your refresh token..."
                            className="w-full bg-tm-surface border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-tm-purple transition-colors font-mono"
                        />
                        <button
                            type="button"
                            onClick={() => setPixels(!pixels)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-tm-muted hover:text-white"
                        >
                            {pixels ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-[10px] text-tm-muted mt-1">
                        Needed for executing trades on your behalf. Stored locally.
                    </p>
                </div>

                <div>
                    <label className="block text-xs text-tm-muted mb-1.5 font-medium flex items-center gap-1">
                        <User className="w-3 h-3" /> Account Number
                    </label>
                    <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="5WX..."
                        className="w-full bg-tm-surface border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-tm-purple transition-colors font-mono"
                    />
                </div>

                <button
                    onClick={handleSave}
                    className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${saved
                            ? 'bg-tm-green text-white'
                            : 'bg-tm-surface hover:bg-white/5 text-tm-purple border border-tm-purple/20 hover:border-tm-purple/50'
                        }`}
                >
                    {saved ? (
                        <>Saved Successfully</>
                    ) : (
                        <>
                            <Save className="w-4 h-4" /> Save Credentials
                        </>
                    )}
                </button>
            </div>
        </section>
    );
}
