"use client";

import { useState, useEffect } from "react";
import { User, Check, Loader2, AlertCircle } from "lucide-react";

export function DisplayNameSettings() {
    const [displayName, setDisplayName] = useState<string>('');
    const [originalName, setOriginalName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchDisplayName();
    }, []);

    const fetchDisplayName = async () => {
        try {
            const response = await fetch('/api/settings/display-name');
            if (response.ok) {
                const data = await response.json();
                setDisplayName(data.displayName || '');
                setOriginalName(data.displayName || '');
            }
        } catch (err) {
            console.error('Failed to fetch display name:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setError(null);
        setSaving(true);
        try {
            const response = await fetch('/api/settings/display-name', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayName })
            });

            if (response.ok) {
                setSaved(true);
                setOriginalName(displayName);
                setTimeout(() => setSaved(false), 2000);
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to save');
            }
        } catch (err) {
            setError('Failed to save display name');
        } finally {
            setSaving(false);
        }
    };

    const hasChanged = displayName !== originalName;

    if (loading) {
        return (
            <div className="glass-card p-6 animate-pulse">
                <div className="h-6 bg-tm-surface rounded w-1/3 mb-4" />
                <div className="h-12 bg-tm-surface rounded" />
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-tm-purple/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-tm-purple" />
                </div>
                <div>
                    <h3 className="font-semibold">Display Name</h3>
                    <p className="text-sm text-tm-muted">Shown on leaderboard</p>
                </div>
            </div>

            {/* Input */}
            <div className="space-y-3">
                <div className="relative">
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter display name (3-20 characters)"
                        maxLength={20}
                        className="w-full bg-tm-surface rounded-xl px-4 py-3
                                   focus:outline-none focus:ring-2 focus:ring-tm-purple/50"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-tm-muted">
                        {displayName.length}/20
                    </span>
                </div>

                <p className="text-xs text-tm-muted">
                    Alphanumeric and underscores only. Leave blank to use a generated name on the leaderboard.
                </p>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 text-tm-red text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={!hasChanged || saving}
                    className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2
                        ${hasChanged
                            ? 'bg-tm-purple hover:bg-tm-purple/80'
                            : 'bg-tm-surface text-tm-muted cursor-not-allowed'
                        }`}
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                        </>
                    ) : saved ? (
                        <>
                            <Check className="w-4 h-4" />
                            Saved!
                        </>
                    ) : (
                        'Save Display Name'
                    )}
                </button>
            </div>
        </div>
    );
}
