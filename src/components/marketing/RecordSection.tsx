'use client';

/* RecordSection — "The record, in full." The V4 model backtest measured
   against QQQ buy and hold, inside the hero flow between the discipline band
   and the life band. Every column header is a hover/tap target that explains
   the metric in plain language. The caption under the table is load-bearing
   substantiation: it labels the window, the model pricing, and the
   hypothetical nature of the record, and it must never be shrunk or removed
   in a later design pass. The Max DD column keeps equal visual weight with
   CAGR on purpose. */

import { useTranslation } from 'react-i18next';
import { SECTIONS_I18N, SectionLang } from './sectionsI18n';

export function RecordSection() {
    const { i18n } = useTranslation();
    const base = (i18n.language || 'en').split('-')[0];
    const lang: SectionLang = base === 'es' ? 'es' : base === 'zh' ? 'zh' : 'en';
    const c = SECTIONS_I18N[lang].record;

    const tip = (label: string, text: string, side?: 'l' | 'r') => (
        <button
            type="button"
            className={`tm-tip${side ? ` tm-tip-${side}` : ''}`}
            data-tip={text}
            aria-label={`${label}: ${text}`}
        >
            {label}
        </button>
    );

    return (
        <section className="tm-story tm-band tm-band-record">
            <div className="tm-band-inner">
                <div className="tm-eyebrow">{c.kicker}</div>
                <h2 className="tm-h2">{c.title}</h2>

                <div className="tm-record-wrap">
                    <table className="tm-record">
                        <thead>
                            <tr>
                                <th scope="col" className="tm-record-namecol"></th>
                                <th scope="col">{tip(c.cols.total, c.tips.total, 'l')}</th>
                                <th scope="col">{tip(c.cols.cagr, c.tips.cagr)}</th>
                                <th scope="col">{tip(c.cols.sharpe, c.tips.sharpe)}</th>
                                <th scope="col">{tip(c.cols.maxdd, c.tips.maxdd)}</th>
                                <th scope="col">{tip(c.cols.calmar, c.tips.calmar, 'r')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="tm-record-v4">
                                <th scope="row">{c.v4Name}</th>
                                <td>{c.v4.total}</td>
                                <td>{c.v4.cagr}</td>
                                <td>{c.v4.sharpe}</td>
                                <td>{c.v4.maxdd}</td>
                                <td>{c.v4.calmar}</td>
                            </tr>
                            <tr className="tm-record-qqq">
                                <th scope="row">{c.qqqName}</th>
                                <td>{c.qqq.total}</td>
                                <td>{c.qqq.cagr}</td>
                                <td>{c.qqq.sharpe}</td>
                                <td>{c.qqq.maxdd}</td>
                                <td>{c.qqq.calmar}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p className="tm-record-foot">{c.footnote}</p>
                <p className="tm-record-callout">{c.callout}</p>
                <p className="tm-record-cap">{c.caption}</p>
            </div>
        </section>
    );
}
