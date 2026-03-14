import React from 'react';
import { useTranslation } from 'react-i18next';

export function LegalFooter() {
    const { t } = useTranslation();
    return (
        <footer className="w-full bg-[#05050A] py-12 px-6 border-t border-white/10 mt-10 z-20 relative">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start mb-12 border-b border-white/10 pb-8 gap-8">
                    <div>
                        <h3 className="text-2xl font-black tracking-tighter text-white mb-2">TradeMind<span className="text-tm-purple">@bot</span></h3>
                        <p className="text-tm-muted text-sm">{t('footer.tagline')}</p>
                    </div>
                    <div className="flex gap-16 md:gap-24 text-sm text-left">
                        <div className="flex flex-col gap-2">
                            <span className="text-white font-bold mb-1">{t('footer.company')}</span>
                            <a href="#about" className="text-tm-muted hover:text-white transition-colors">{t('footer.about')}</a>
                            <a href="#education" className="text-tm-muted hover:text-white transition-colors">{t('footer.education')}</a>
                            <a href="#pricing" className="text-tm-muted hover:text-white transition-colors">{t('footer.pricing')}</a>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-white font-bold mb-1">{t('footer.legal')}</span>
                            <a href="/terms" className="text-tm-muted hover:text-white transition-colors">{t('footer.terms')}</a>
                            <a href="/privacy" className="text-tm-muted hover:text-white transition-colors">{t('footer.privacy')}</a>
                            <a href="/risk-disclosure" className="text-tm-muted hover:text-white transition-colors">{t('footer.risk')}</a>
                        </div>
                    </div>
                </div>

                <div className="text-[10px] md:text-xs text-tm-muted/70 leading-relaxed font-mono space-y-6">
                    <p>
                        {t('footer.disclaimer')}
                    </p>
                    <p>
                        {t('footer.cftc')}
                    </p>
                    <p>
                        {t('footer.brokerage')}
                    </p>
                    <p className="text-center pt-6">
                        &copy; {new Date().getFullYear()} {t('footer.rights')}
                    </p>
                </div>
            </div>
        </footer>
    );
}
