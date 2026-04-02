'use client';

import { Mail, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSettings } from '@/components/providers/SettingsProvider';

export function SignalEmailAlertsSettings() {
    const { ready, authenticated, user } = usePrivy();
    const [emailEnabled, setEmailEnabled] = useState<boolean>(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ready || !authenticated) return;
        fetch('/api/settings/tier')
            .then(res => res.json())
            .then(data => {
                setEmailEnabled(data.emailSignalAlerts !== false); // default true
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
        </div>
    );
}
