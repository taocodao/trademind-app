'use client';

/* RateSensitivityCalc — v3 hero plan §7.5. A sensitivity tool, not a wish
   machine: the visitor moves the annual rate and watches the same $10,000
   end somewhere very different. Defaults mirror the Card 1 arithmetic
   ($10,000 at 36% for 15 years), presets show the honest collapse at lower
   rates. Disclosure renders adjacent, always visible, per plan. No URL
   prefill: inputs are user-driven only. */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { SECTIONS_I18N, SectionLang } from './sectionsI18n';

const PRESETS = [8, 15, 25, 36];

function fmt(n: number): string {
    return '$' + Math.round(n).toLocaleString('en-US');
}

export function RateSensitivityCalc() {
    const { i18n } = useTranslation();
    const base = (i18n.language || 'en').split('-')[0];
    const lang: SectionLang = base === 'es' ? 'es' : base === 'zh' ? 'zh' : 'en';
    const c = SECTIONS_I18N[lang].rateCalc;

    const [amount, setAmount] = useState(10000);
    const [rate, setRate] = useState(36);
    const [years, setYears] = useState(15);

    const result = useMemo(
        () => amount * Math.pow(1 + rate / 100, years),
        [amount, rate, years]
    );

    return (
        <section id="rate-calc" className="tm-story tm-ratecalc">
            <div className="tm-band-inner">
                <div className="tm-eyebrow">{c.kicker}</div>
                <h2 className="tm-h2">{c.title}</h2>
                <p className="tm-band-lede">{c.sub}</p>

                <div className="tm-rc-grid">
                    <div className="tm-rc-controls">
                        <label className="tm-rc-field">
                            <span className="tm-rc-label">{c.lblAmount}</span>
                            <input
                                type="number"
                                min={100}
                                step={100}
                                value={amount}
                                onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                            />
                        </label>
                        <label className="tm-rc-field">
                            <span className="tm-rc-label">{c.lblRate}</span>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={rate}
                                onChange={(e) => setRate(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                            />
                        </label>
                        <label className="tm-rc-field">
                            <span className="tm-rc-label">{c.lblYears}</span>
                            <input
                                type="number"
                                min={1}
                                max={40}
                                step={1}
                                value={years}
                                onChange={(e) => setYears(Math.min(40, Math.max(1, Number(e.target.value) || 1)))}
                            />
                        </label>
                        <div className="tm-rc-presets">
                            {PRESETS.map((p) => (
                                <button
                                    key={p}
                                    className={`tm-rc-preset ${rate === p ? 'tm-rc-preset-on' : ''}`}
                                    onClick={() => setRate(p)}
                                >
                                    {p}%
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="tm-rc-out" aria-live="polite">
                        <div className="tm-rc-out-label">{c.outLabel}</div>
                        <div className="tm-rc-out-value">{fmt(result)}</div>
                    </div>
                </div>

                <p className="tm-rc-disc">{c.disc}</p>
                <p className="tm-rc-disc-link">
                    <Link href="/verify" className="tm-retire-link">{c.ctaVerify}</Link>
                </p>
            </div>
        </section>
    );
}
