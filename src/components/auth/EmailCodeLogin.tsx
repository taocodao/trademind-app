'use client';

import { useEffect, useState } from 'react';
import { useLoginWithEmail, useLoginWithOAuth } from '@privy-io/react-auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Passcode sign in with plain instructions, built for first time users. Replaces the pop-up for email sign in:
 * type the email, press "Send my passcode", type the 6 digit passcode from the email, press "Sign in".
 * The same steps create an account for new users. There is no password.
 */
export default function EmailCodeLogin({
    initialEmail = '', lockEmail = false, onDone,
}: { initialEmail?: string; lockEmail?: boolean; onDone?: () => void }) {
    const { sendCode, loginWithCode, state } = useLoginWithEmail({ onComplete: () => onDone?.() });
    const { initOAuth } = useLoginWithOAuth();
    const [email, setEmail] = useState(initialEmail);
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sentTo, setSentTo] = useState<string | null>(null);

    useEffect(() => { if (initialEmail && !email) setEmail(initialEmail); }, [initialEmail, email]);

    const sending = state.status === 'sending-code';
    const submitting = state.status === 'submitting-code';
    const awaiting = sentTo !== null;
    const step = awaiting ? 2 : 1;

    const send = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const v = email.trim();
        if (!EMAIL_RE.test(v)) { setError('Enter a valid email address.'); return; }
        setError(null);
        try { await sendCode({ email: v }); setSentTo(v); setCode(''); }
        catch (err) { setError(err instanceof Error ? err.message : 'We could not send the passcode. Please try again.'); }
    };
    const verify = async (e: React.FormEvent) => {
        e.preventDefault();
        const c = code.replace(/\D/g, '');
        if (c.length < 6) { setError('Type the 6 digit passcode from the email.'); return; }
        setError(null);
        try { await loginWithCode({ code: c }); }
        catch { setError('That passcode did not work. Check the digits, or press "Send a new passcode".'); }
    };

    const input: React.CSSProperties = { width: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(0,0,0,0.45)', color: '#fff', padding: '13px 14px', fontSize: 16, boxSizing: 'border-box' };
    const primary: React.CSSProperties = { width: '100%', marginTop: 12, borderRadius: 10, padding: '13px 16px', fontWeight: 800, fontSize: 16, cursor: 'pointer', color: '#fff', border: 'none', background: '#7c3aed' };
    const ghost: React.CSSProperties = { background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', font: 'inherit', textDecoration: 'underline', padding: 0 };
    const stepStyle = (n: number): React.CSSProperties => ({ display: 'flex', gap: 10, alignItems: 'flex-start', opacity: n === step ? 1 : 0.55, margin: '0 0 8px' });
    const bubble = (n: number): React.CSSProperties => ({ flexShrink: 0, width: 22, height: 22, borderRadius: 999, background: n === step ? '#7c3aed' : 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' });

    return (
        <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: '#cbd5e1', marginBottom: 14 }}>
                <div style={stepStyle(1)}><span style={bubble(1)}>1</span><span>Type your email address and press <strong>Send my passcode</strong>.</span></div>
                <div style={stepStyle(2)}><span style={bubble(2)}>2</span><span>Open your inbox. A 6 digit passcode arrives within a minute. Check Spam or Promotions if you do not see it.</span></div>
                <div style={stepStyle(2)}><span style={bubble(2)}>3</span><span>Type the passcode here and press <strong>Sign in</strong>.</span></div>
            </div>

            {!awaiting ? (
                <form onSubmit={send}>
                    <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                        {lockEmail ? 'The email you paid with' : 'Your email address'}
                    </label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={lockEmail} autoFocus={!lockEmail}
                        placeholder="you@example.com" autoComplete="email" style={{ ...input, opacity: lockEmail ? 0.8 : 1 }} />
                    <button type="submit" disabled={sending} style={{ ...primary, opacity: sending ? 0.7 : 1 }}>{sending ? 'Sending your passcode' : 'Send my passcode'}</button>
                </form>
            ) : (
                <form onSubmit={verify}>
                    <p style={{ margin: '0 0 10px', fontSize: 14, color: '#a7f3d0', lineHeight: 1.5 }}>
                        Passcode sent to <strong>{sentTo}</strong>. It can take up to a minute.
                    </p>
                    <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>6 digit passcode</label>
                    <input inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} autoFocus
                        onChange={(e) => setCode(e.target.value)} placeholder="123456" style={{ ...input, letterSpacing: '0.3em', fontSize: 22, textAlign: 'center' }} />
                    <button type="submit" disabled={submitting} style={{ ...primary, opacity: submitting ? 0.7 : 1 }}>{submitting ? 'Signing you in' : 'Sign in'}</button>
                    <p style={{ margin: '12px 0 0', fontSize: 13, color: '#94a3b8' }}>
                        No email yet? <button type="button" style={ghost} onClick={() => void send()}>Send a new passcode</button>
                        {!lockEmail && <> or <button type="button" style={ghost} onClick={() => { setSentTo(null); setCode(''); setError(null); }}>use a different email</button></>}
                    </p>
                </form>
            )}
            {error && <p style={{ color: '#f87171', fontSize: 13.5, margin: '12px 0 0', lineHeight: 1.5 }}>{error}</p>}

            <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, lineHeight: 1.6, color: '#94a3b8' }}>
                <strong style={{ color: '#e2e8f0' }}>First time here?</strong> The same steps create your account. There is no password to remember: each time you sign in, we email you a fresh passcode.
                If you receive our newsletter, use the email address it arrives at.
                <div style={{ marginTop: 8 }}>
                    Prefer Google? <button type="button" style={ghost} onClick={() => void initOAuth({ provider: 'google' })}>Continue with Google</button>
                </div>
            </div>
        </div>
    );
}
