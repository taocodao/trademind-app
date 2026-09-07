'use client';

/* /verify - the public transparency surface. Publishes the exact method,
   the full ledger, the daily equity curve, the run configuration, and the
   known limitations behind the V4 backtest record quoted on the landing
   page. Standalone i18n via the header's i18next instance (browser
   detection + the shared EN/ES/ZH switcher), the same mechanism the legal
   pages use. The record numbers in this copy must stay in lockstep with
   the artifacts in /public/verify and with the landing RecordSection.

   COMPLIANCE: the disclaimer block must remain inside the record section,
   immediately after the performance figures (NFA-style adjacency), and the
   record table must never appear on this page without it. Do not shrink,
   de-emphasize, or relocate it in a later design pass. */

import { useTranslation } from 'react-i18next';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { LegalFooter } from '@/components/marketing/LegalFooter';
import { VERIFY_COPY, VerifyLang } from '@/components/marketing/verify/verifyCopy';
import './verify.css';

export default function VerifyPage() {
    const { i18n } = useTranslation();
    const base = (i18n.language || 'en').split('-')[0];
    const lang: VerifyLang = base === 'es' ? 'es' : base === 'zh' ? 'zh' : 'en';
    const c = VERIFY_COPY[lang];

    return (
        <main className="min-h-screen flex flex-col bg-[#0A0A0F] overflow-x-hidden pt-16">
            <MarketingHeader />
            <div className="vf-wrap">
                {/* 1. Hero */}
                <header className="vf-hero">
                    <div className="vf-eyebrow">{c.heroEyebrow}</div>
                    <h1 className="vf-h1">{c.heroTitle}</h1>
                    <p className="vf-sub">{c.heroSub}</p>
                </header>

                {/* 2. The record */}
                <section className="vf-section">
                    <h2 className="vf-h2">{c.recordTitle}</h2>
                    <div className="vf-table-scroll">
                        <table className="vf-table">
                            <thead>
                                <tr>
                                    <th scope="col" className="vf-namecol"></th>
                                    {c.recordCols.map((col) => (
                                        <th scope="col" key={col}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {c.recordRows.map((row, i) => (
                                    <tr key={row.name} className={i === 0 ? 'vf-row-v4' : 'vf-row-qqq'}>
                                        <th scope="row">{row.name}</th>
                                        <td>{row.total}</td>
                                        <td>{row.cagr}</td>
                                        <td>{row.sharpe}</td>
                                        <td>{row.maxdd}</td>
                                        <td>{row.calmar}</td>
                                        <td>{row.final}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="vf-note">{c.recordNote}</p>

                    <h3 className="vf-h3">{c.calendarTitle}</h3>
                    <div className="vf-chips">
                        {c.calendar.map((y) => (
                            <div className="vf-chip" key={y.y}>
                                <span className="vf-chip-y">{y.y}</span>
                                <span className={`vf-chip-r ${y.r.startsWith('-') ? 'vf-neg' : 'vf-pos'}`}>{y.r}</span>
                            </div>
                        ))}
                    </div>
                    <p className="vf-note">{c.calendarNote}</p>

                    <div className="vf-disclaimer">
                        {c.disclaimers.map((d, i) => (
                            <p key={i}>{d}</p>
                        ))}
                    </div>
                </section>

                {/* 3. The exact method */}
                <section className="vf-section">
                    <h2 className="vf-h2">{c.methodTitle}</h2>
                    <p className="vf-p">{c.methodIntro}</p>
                    {c.methodSteps.map((s, i) => (
                        <div className="vf-step" key={i}>
                            <div className="vf-step-n">{i + 1}</div>
                            <div>
                                <h3 className="vf-step-h">{s.h}</h3>
                                <p className="vf-p">{s.p}</p>
                            </div>
                        </div>
                    ))}
                    <div className="vf-gates">
                        <h3 className="vf-h3">{c.gatesTitle}</h3>
                        <p className="vf-p">{c.gatesIntro}</p>
                        <ul className="vf-list">
                            {c.gatesRows.map((g, i) => (
                                <li key={i}>{g}</li>
                            ))}
                        </ul>
                        <p className="vf-p vf-strong">{c.gatesCounts}</p>
                    </div>
                </section>

                {/* 4. Limitations */}
                <section className="vf-section">
                    <h2 className="vf-h2">{c.limitsTitle}</h2>
                    <p className="vf-p">{c.limitsIntro}</p>
                    {c.limits.map((l, i) => (
                        <div className="vf-limit" key={i}>
                            <h3 className="vf-step-h">{l.h}</h3>
                            <p className="vf-p">{l.p}</p>
                        </div>
                    ))}
                    <p className="vf-p vf-strong">{c.limitsClose}</p>
                </section>

                {/* 5. Red-flag audit */}
                <section className="vf-section">
                    <h2 className="vf-h2">{c.auditTitle}</h2>
                    <p className="vf-p">{c.auditIntro}</p>
                    <div className="vf-table-scroll">
                        <table className="vf-table vf-audit">
                            <thead>
                                <tr>
                                    <th scope="col">{c.auditCols[0]}</th>
                                    <th scope="col">{c.auditCols[1]}</th>
                                    <th scope="col">{c.auditCols[2]}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {c.auditRows.map((r, i) => (
                                    <tr key={i}>
                                        <td>{r.check}</td>
                                        <td>{r.result}</td>
                                        <td>
                                            <span className={`vf-verdict vf-verdict-${r.verdictKind}`}>{r.verdict}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="vf-note">{c.auditNote}</p>
                </section>

                {/* 6. Proof kit */}
                <section className="vf-section">
                    <h2 className="vf-h2">{c.kitTitle}</h2>
                    <p className="vf-p">{c.kitIntro}</p>
                    <div className="vf-cards">
                        {c.kitCards.map((k) => {
                            const external = k.href.startsWith('http');
                            return (
                                <a
                                    className="vf-card"
                                    key={k.href}
                                    href={k.href}
                                    {...(external
                                        ? { target: '_blank', rel: 'noopener noreferrer' }
                                        : { download: true })}
                                >
                                    <div className="vf-card-t">{k.title}</div>
                                    <div className="vf-card-d">{k.desc}</div>
                                </a>
                            );
                        })}
                    </div>
                    <div className="vf-repo">
                        <h3 className="vf-h3">{c.repoTitle}</h3>
                        <ol className="vf-steps-list">
                            {c.repoSteps.map((s, i) => (
                                <li key={i}>{s}</li>
                            ))}
                        </ol>
                        <p className="vf-note">{c.repoNote}</p>
                    </div>
                </section>
            </div>
            <LegalFooter />
        </main>
    );
}
