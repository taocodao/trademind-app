'use client';

import { Mail, MessageCircleQuestion, ExternalLink } from 'lucide-react';

export function SupportContact() {
    return (
        <section className="glass-card p-4 border border-blue-500/20">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <MessageCircleQuestion className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm">Support & Help</h3>
                    <p className="text-xs text-tm-muted mt-0.5">Have a question or need assistance?</p>
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-sm text-zinc-300">
                    Our team is here to help. Reach out via email and we'll get back to you within 24 hours.
                </p>

                <a
                    href="mailto:support@trademind.bot?subject=TradeMind Support Request"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
                >
                    <Mail className="w-4 h-4" />
                    Email support@trademind.bot
                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </a>

                <p className="text-xs text-tm-muted text-center">
                    Or use the <span className="text-tm-purple font-medium">AI Support Chat</span> (bottom-right corner) for instant answers.
                </p>
            </div>
        </section>
    );
}
