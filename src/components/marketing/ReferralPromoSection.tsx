import React from 'react';
import Link from 'next/link';
import { Gift, ArrowRight } from 'lucide-react';

export function ReferralPromoSection() {
    return (
        <section className="w-full max-w-5xl mx-auto py-12 px-6 relative z-10 text-center">
            <div className="bg-gradient-to-r from-tm-purple/10 to-tm-blue/10 border border-white/10 rounded-2xl p-10 flex flex-col items-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-tm-purple/20 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-tm-blue/20 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="w-16 h-16 bg-tm-purple/20 rounded-full flex items-center justify-center mb-6 border border-tm-purple/30 z-10">
                    <Gift className="w-8 h-8 text-tm-purple" />
                </div>

                <h2 className="text-3xl font-bold text-white mb-3 z-10">Give $15, Get $15</h2>
                <p className="text-tm-muted max-w-lg mx-auto mb-8 z-10">
                    Know someone tired of staring at charts? Invite them to TurboBounce. They get $15 off their first month, and you receive a $15 account credit when they sign up.
                </p>

                <Link href="/refer" className="inline-flex items-center gap-2 bg-white text-[#0A0A0F] hover:bg-gray-200 px-8 py-3 rounded-full font-bold transition-all z-10 shadow-lg shadow-white/10 hover:shadow-white/20">
                    Activate Referral Code <ArrowRight className="w-5 h-5" />
                </Link>
            </div>
        </section>
    );
}
