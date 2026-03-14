import React from 'react';
import { Users, ShieldCheck } from 'lucide-react';

export function FamilySection() {
    return (
        <section className="w-full max-w-5xl mx-auto py-12 px-6 relative z-10">
            <div className="glass-card rounded-3xl p-8 md:p-12 overflow-hidden relative border border-[#10B981]/20 bg-gradient-to-br from-[#0A0A0F] to-[#0A0A0F]/90">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#10B981]/20 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 relative z-10">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 bg-[#10B981]/10 text-tm-green px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                            <Users className="w-4 h-4" /> The Family Bundle
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Teach Your Child How Professional Investing Actually Works.</h2>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            Stop letting social media teach them about gambling on meme stocks. With the TradeMind@bot Family Bundle, link a Teen brokerage account to your master platform. They watch the AI analyze IV-crush natively, learning defined-risk compounding safely under your oversight.
                        </p>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-white">$39<span className="text-base font-normal text-tm-muted">/mo per user</span></span>
                                <span className="text-xs text-tm-muted mt-1">(Minimum 2 users. Includes full Builder tier access)</span>
                            </div>
                            <button className="sm:ml-auto px-6 py-3 bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/30 text-tm-green rounded-xl font-bold transition-all flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5" /> Link Family Accounts
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
