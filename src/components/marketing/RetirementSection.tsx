'use client';

/* RetirementSection — the "cash-poor, retirement-rich" pain-point band.
   Sits directly beneath the hero, before the discipline band. Leads with
   the validated demographic fact (no return claim), then the IRA/Roth
   mechanism (401(k) explicitly excluded: most plans offer no options).
   The compounding line is a separated, asterisked illustration with its
   fine print inside the same band, not in a page footer. Holds the new
   slogan, plus the homepage half of the internal link mesh to /verify
   and /verify/ledger. */

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { SECTIONS_I18N, SectionLang } from './sectionsI18n';

export function RetirementSection() {
    const { i18n } = useTranslation();
    const base = (i18n.language || 'en').split('-')[0];
    const lang: SectionLang = base === 'es' ? 'es' : base === 'zh' ? 'zh' : 'en';
    const c = SECTIONS_I18N[lang].retire;

    return (
        <section className="tm-story tm-band tm-band-retire">
            <div className="tm-band-inner">
                <div className="tm-eyebrow">{c.kicker}</div>
                <h2 className="tm-h2">{c.title}</h2>
                <p className="tm-band-lede">{c.p}</p>
                <p className="tm-retire-mech">{c.mech}</p>
                <p className="tm-retire-illus">{c.illus}</p>
                <p className="tm-retire-fine">{c.fine}</p>
                <div className="tm-retire-slogan">{c.slogan}</div>
                <div className="tm-retire-links">
                    <Link href="/verify" className="tm-retire-link">
                        {c.ctaVerify}
                    </Link>
                    <Link href="/verify/ledger" className="tm-retire-link tm-retire-link-alt">
                        {c.ctaLedger}
                    </Link>
                </div>
            </div>
        </section>
    );
}
