'use client';

import { usePrivy } from '@privy-io/react-auth';
import { Mail, Phone, Chrome, Twitter, Github, Wallet, LogIn } from 'lucide-react';

// Maps Privy linked-account types to human-readable labels + icons
const METHOD_MAP: Record<string, { label: string; Icon: React.FC<{ className?: string }> }> = {
    google_oauth:   { label: 'Google',        Icon: ({ className }) => <Chrome className={className} /> },
    twitter_oauth:  { label: 'X (Twitter)',   Icon: ({ className }) => <Twitter className={className} /> },
    github_oauth:   { label: 'GitHub',        Icon: ({ className }) => <Github className={className} /> },
    discord_oauth:  { label: 'Discord',       Icon: ({ className }) => <LogIn className={className} /> },
    tiktok_oauth:   { label: 'TikTok',        Icon: ({ className }) => <LogIn className={className} /> },
    email:          { label: 'Email',         Icon: ({ className }) => <Mail className={className} /> },
    phone:          { label: 'Phone / SMS',   Icon: ({ className }) => <Phone className={className} /> },
    wallet:         { label: 'Wallet',        Icon: ({ className }) => <Wallet className={className} /> },
};

export function LoginMethodSection() {
    const { user } = usePrivy();

    if (!user) return null;

    const accounts = user.linkedAccounts ?? [];

    // Build display rows from linked accounts
    const methods = accounts.map(acct => {
        const type = acct.type as string;
        const meta = METHOD_MAP[type] ?? { label: type, Icon: ({ className }: any) => <LogIn className={className} /> };

        // Surface the identifier for the method
        let identifier = '';
        if ('address' in acct && acct.address)              identifier = truncateAddress(String(acct.address));
        else if ('email' in acct && acct.email)              identifier = String(acct.email);
        else if ('phoneNumber' in acct && acct.phoneNumber)  identifier = String(acct.phoneNumber);
        else if ('username' in acct && acct.username)        identifier = `@${acct.username}`;
        else if ('name' in acct && acct.name)                identifier = String(acct.name);

        return { type, meta, identifier };
    });

    // Also surface user DID (Privy ID)
    const privyId = user.id ? user.id.replace('did:privy:', '') : null;

    return (
        <section className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-tm-purple/10 flex items-center justify-center">
                    <LogIn className="w-4 h-4 text-tm-purple" />
                </div>
                <h3 className="font-semibold text-white text-sm">Login Method</h3>
            </div>

            {methods.length === 0 && (
                <p className="text-xs text-tm-muted">No linked accounts found.</p>
            )}

            <div className="divide-y divide-white/[0.06]">
                {methods.map(({ type, meta, identifier }) => (
                    <div key={type} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-tm-surface flex items-center justify-center shrink-0">
                                <meta.Icon className="w-3.5 h-3.5 text-tm-purple" />
                            </div>
                            <span className="text-sm text-white font-medium">{meta.label}</span>
                        </div>
                        {identifier && (
                            <span className="text-xs text-tm-muted font-mono truncate max-w-[180px]">{identifier}</span>
                        )}
                    </div>
                ))}
            </div>

            {privyId && (
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[10px] text-tm-muted uppercase tracking-wider font-semibold">User ID</span>
                    <span className="text-[10px] text-tm-muted font-mono truncate max-w-[200px]">{privyId}</span>
                </div>
            )}
        </section>
    );
}

function truncateAddress(addr: string): string {
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
