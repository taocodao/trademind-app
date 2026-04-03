'use client';

import { Mail, Plus, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export function SignalEmailAlertsSettings() {
    const { ready, authenticated } = usePrivy();
    const [emailEnabled, setEmailEnabled] = useState<boolean>(false);
    const [emails, setEmails] = useState<string[]>(['']);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!ready || !authenticated) return;
        fetch('/api/settings/tier')
            .then(res => res.json())
            .then(data => {
                // Now defaults to false per user request
                setEmailEnabled(data.emailSignalAlerts === true); 
                if (data.email) {
                    const parsed = data.email.split(',').map((e: string) => e.trim()).filter(Boolean);
                    if (parsed.length > 0) setEmails(parsed);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [ready, authenticated]);

    const handleToggle = async (val: boolean) => {
        setEmailEnabled(val);
        try {
            await fetch('/api/settings/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email_signal_alerts: val }),
            });
        } catch (e) {
            console.error('Failed to update email alerts', e);
        }
    };

    const handleEmailSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const joinedEmails = emails.filter(e => e.trim() !== '').join(',');
            await fetch('/api/settings/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: joinedEmails }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            console.error('Failed to update email', e);
        } finally {
            setSaving(false);
        }
    };

    const addEmailField = () => setEmails([...emails, '']);
    
    const updateEmail = (index: number, val: string) => {
        const newEmails = [...emails];
        newEmails[index] = val;
        setEmails(newEmails);
    };

    const removeEmail = (index: number) => {
        if (emails.length === 1) {
            setEmails(['']); // Just clear it if it's the last one
            return;
        }
        const newEmails = [...emails];
        newEmails.splice(index, 1);
        setEmails(newEmails);
    };

    return (
        <div className="glass-card p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">Signal Email Alerts</h3>
                        <p className="text-xs text-tm-muted mt-0.5">
                            Receive an email when a new signal is generated
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => !loading && handleToggle(!emailEnabled)}
                    disabled={loading}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${loading ? 'bg-tm-surface opacity-50 cursor-not-allowed' :
                        emailEnabled ? 'bg-tm-purple' : 'bg-tm-surface'
                        }`}
                    aria-label="Toggle email alerts"
                >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${emailEnabled ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                </button>
            </div>

            {emailEnabled && (
                <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-3">
                    <div className="space-y-2">
                        {emails.map((email, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => updateEmail(idx, e.target.value)}
                                    placeholder="your@email.com"
                                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-tm-purple/50 transition-colors"
                                />
                                <button
                                    onClick={() => removeEmail(idx)}
                                    className="p-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-tm-muted hover:text-white transition-colors"
                                    title="Remove email"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                        <button
                            onClick={addEmailField}
                            className="flex items-center gap-1.5 text-xs text-tm-purple hover:text-tm-purple/80 transition-colors font-medium"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Email
                        </button>
                        <button
                            onClick={handleEmailSave}
                            disabled={saving || (emails.length === 1 && !emails[0])}
                            className="bg-tm-purple/20 hover:bg-tm-purple/30 text-tm-purple border border-tm-purple/50 rounded-xl px-6 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : saved ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : (
                                'Save'
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
