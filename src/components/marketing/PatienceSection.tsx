'use client';

/* PatienceSection — "Patience Is the Strategy". A timeline of the eleven real
   LEAPS entries across the 5.6-year record (dates from the ledger in
   storyData.ts): long flat stretches of waiting, punctuated by rare entries. */

import { useTranslation } from 'react-i18next';
import { SECTIONS_I18N, SectionLang } from './sectionsI18n';

/* LEAPS BUY TO OPEN dates, straight from LEDGER in story/storyData.ts */
const ENTRIES = [
    '2021-02-25', '2021-03-03', '2021-05-11',
    '2023-04-25', '2023-08-08', '2023-08-18',
    '2024-07-24',
    '2025-09-02', '2025-11-17', '2025-11-18',
    '2026-07-28',
];
const SPAN_START = '2021-01-04';   /* simulation start (methodology) */
const SPAN_END = '2026-08-14';     /* record end (methodology) */

export function PatienceSection() {
    const { i18n } = useTranslation();
    const base = (i18n.language || 'en').split('-')[0];
    const lang: SectionLang = base === 'es' ? 'es' : base === 'zh' ? 'zh' : 'en';
    const c = SECTIONS_I18N[lang].patience;

    const t0 = new Date(SPAN_START).getTime();
    const t1 = new Date(SPAN_END).getTime();
    const x = (d: string) => 40 + ((new Date(d).getTime() - t0) / (t1 - t0)) * 920;

    const years = [2021, 2022, 2023, 2024, 2025, 2026];

    return (
        <section className="tm-story tm-patience">
            <div className="tm-sec-inner">
                <div className="tm-kicker">{c.kicker}</div>
                <h2 className="tm-sec-title">{c.title}</h2>
                <p className="tm-sec-p">{c.p1}</p>
                <p className="tm-sec-p">{c.p2}</p>

                <svg className="tm-patience-timeline" viewBox="0 0 1000 150" role="img" aria-label={c.cap}>
                    {/* baseline */}
                    <line x1="40" y1="70" x2="960" y2="70" stroke="var(--s-line)" strokeWidth="2" />
                    {/* year ticks */}
                    {years.map(y => (
                        <g key={y}>
                            <line x1={x(`${y}-01-01`)} y1="64" x2={x(`${y}-01-01`)} y2="76" stroke="var(--s-line)" strokeWidth="2" />
                            <text x={x(`${y}-01-01`)} y="98" textAnchor="middle" className="tm-patience-year">{y}</text>
                        </g>
                    ))}
                    {/* entry markers */}
                    {ENTRIES.map(d => (
                        <g key={d}>
                            <line x1={x(d)} y1="70" x2={x(d)} y2="34" stroke="var(--s-amber)" strokeWidth="2" />
                            <circle cx={x(d)} cy="28" r="6" fill="var(--s-amber)" />
                        </g>
                    ))}
                </svg>
                <div className="tm-patience-cap">{c.cap}</div>
            </div>
        </section>
    );
}
