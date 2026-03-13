'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, ChevronDown, Check, BookOpen, X, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function EducationCenter() {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const activeLanguage = i18n.language ? i18n.language.split('-')[0] : 'en';

    const ALL_DOCUMENTS = React.useMemo(() => [
        // English
        {
            id: '5k-en',
            title: 'TurboCore 5K Report',
            description: 'Comprehensive 5K account report for the TurboCore strategy.',
            url: '/files/TurboCore_5K_Report_English.md',
            icon: <FileText className="w-5 h-5 text-tm-purple" />,
            type: 'Report',
            lang: 'en'
        },
        {
            id: 'report-en',
            title: 'TurboCore Report',
            description: 'Main research report for the TurboCore strategy covering core metrics.',
            url: '/files/TurboCore_Report_English.md',
            icon: <BookOpen className="w-5 h-5 text-tm-blue" />,
            type: 'Analysis',
            lang: 'en'
        },
        {
            id: 'comp-en',
            title: 'Competitive Analysis 2026',
            description: 'In-depth market and competitor analysis highlighting TurboCore advantages.',
            url: '/files/TurboCore_Competitive_Report_2026-English.md',
            icon: <FileText className="w-5 h-5 text-tm-purple" />,
            type: 'Analysis',
            lang: 'en'
        },
        {
            id: 'pro-5k-en',
            title: 'TurboCore Pro 5K Report',
            description: 'Comprehensive 5K account report for the advanced TurboCore Pro strategy.',
            url: '/pro_files/TurboCore-Pro-5K-Report-English.md',
            icon: <FileText className="w-5 h-5 text-tm-purple" />,
            type: 'Report',
            lang: 'en'
        },
        {
            id: 'pro-report-en',
            title: 'TurboCore Pro Report',
            description: 'Main research report for the advanced TurboCore Pro strategy covering core metrics.',
            url: '/pro_files/TurboCore_Pro_Report_English.md',
            icon: <BookOpen className="w-5 h-5 text-tm-blue" />,
            type: 'Analysis',
            lang: 'en'
        },
        {
            id: 'pro-comp-en',
            title: 'TurboCore Pro Competitive Analysis 2026',
            description: 'In-depth market and competitor analysis highlighting TurboCore Pro advantages.',
            url: '/pro_files/TurboCore-Pro-Competitive-Report-2026-English.md',
            icon: <FileText className="w-5 h-5 text-tm-purple" />,
            type: 'Analysis',
            lang: 'en'
        },
        // Spanish
        {
            id: '5k-es',
            title: 'Informe TurboCore 5K',
            description: 'Informe exhaustivo de cuenta 5K para la estrategia TurboCore.',
            url: '/files/TurboCore_5K_Report_Spanish.md',
            icon: <FileText className="w-5 h-5 text-tm-purple" />,
            type: 'Informe',
            lang: 'es'
        },
        {
            id: 'report-es',
            title: 'Informe TurboCore',
            description: 'Informe principal de investigación para la estrategia TurboCore.',
            url: '/files/TurboCore_Report_Spanish.md',
            icon: <BookOpen className="w-5 h-5 text-tm-blue" />,
            type: 'Análisis',
            lang: 'es'
        },
        {
            id: 'comp-es',
            title: 'Análisis Competitivo 2026',
            description: 'Análisis profundo del mercado y competidores destacando ventajas de TurboCore.',
            url: '/files/TurboCore_Informe_Competitivo_2026_ES.md',
            icon: <FileText className="w-5 h-5 text-tm-purple" />,
            type: 'Análisis',
            lang: 'es'
        },
        {
            id: 'pro-5k-es',
            title: 'Informe TurboCore Pro 5K',
            description: 'Informe exhaustivo de cuenta 5K para la estrategia avanzada TurboCore Pro.',
            url: '/pro_files/TurboCore-Pro-5K-Report-Spanish.md',
            icon: <FileText className="w-5 h-5 text-tm-purple" />,
            type: 'Informe',
            lang: 'es'
        },
        {
            id: 'pro-report-es',
            title: 'Informe TurboCore Pro',
            description: 'Informe principal de investigación para la estrategia avanzada TurboCore Pro.',
            url: '/pro_files/TurboCore_Pro_Reporte_Espanol.md',
            icon: <BookOpen className="w-5 h-5 text-tm-blue" />,
            type: 'Análisis',
            lang: 'es'
        },
        {
            id: 'pro-comp-es',
            title: 'Análisis Competitivo TurboCore Pro 2026',
            description: 'Análisis profundo del mercado y competidores destacando ventajas de TurboCore Pro.',
            url: '/pro_files/TurboCore-Pro-Informe-Competitivo-2026-Spanish.md',
            icon: <FileText className="w-5 h-5 text-tm-purple" />,
            type: 'Análisis',
            lang: 'es'
        },
        // Chinese
        {
            id: '5k-zh',
            title: 'TurboCore 5K 报告',
            description: 'TurboCore 策略的全面 5K 账户报告。',
            url: '/files/TurboCore_5K_Report_Chinese.md',
            icon: <FileText className="w-5 h-5 text-tm-purple" />,
            type: '报告',
            lang: 'zh'
        },
        {
            id: 'report-zh',
            title: 'TurboCore 主要报告',
            description: '涵盖核心指标的 TurboCore 策略主要研究报告。',
            url: '/files/TurboCore_Report_Chinese.md',
            icon: <BookOpen className="w-5 h-5 text-tm-blue" />,
            type: '分析',
            lang: 'zh'
        },
        {
            id: 'comp-zh',
            title: '2026 竞争分析报告',
            description: '深入的市场和竞争对手分析，突出 TurboCore 的优势。',
            url: '/files/TurboCore_竞争分析报告_2026_CN.md',
            icon: <FileText className="w-5 h-5 text-tm-purple" />,
            type: '分析',
            lang: 'zh'
        },
        {
            id: 'pro-5k-zh',
            title: 'TurboCore Pro 5K 报告',
            description: '高级 TurboCore Pro 策略的全面 5K 账户报告。',
            url: '/pro_files/TurboCore-Pro-5K-Report-Chinese.md',
            icon: <FileText className="w-5 h-5 text-tm-purple" />,
            type: '报告',
            lang: 'zh'
        },
        {
            id: 'pro-report-zh',
            title: 'TurboCore Pro 主要报告',
            description: '涵盖核心指标的高级 TurboCore Pro 策略主要研究报告。',
            url: '/pro_files/TurboCore_Pro_报告_中文.md',
            icon: <BookOpen className="w-5 h-5 text-tm-blue" />,
            type: '分析',
            lang: 'zh'
        },
        {
            id: 'pro-comp-zh',
            title: 'TurboCore Pro 2026 竞争分析报告',
            description: '深入的市场和竞争对手分析，突出 TurboCore Pro 的优势。',
            url: '/pro_files/TurboCore-Pro-竞争报告-2026-Chinese.md',
            icon: <FileText className="w-5 h-5 text-tm-purple" />,
            type: '分析',
            lang: 'zh'
        }
    ], []);

    const filteredDocs = React.useMemo(() => {
        return ALL_DOCUMENTS.filter(doc => doc.lang === activeLanguage);
    }, [ALL_DOCUMENTS, activeLanguage]);

    const DOCUMENTS = filteredDocs.length > 0 ? filteredDocs : ALL_DOCUMENTS.filter(doc => doc.lang === 'en');

    const [selectedId, setSelectedId] = useState(DOCUMENTS[0]?.id);

    // Ensure selectedId is valid when language changes
    React.useEffect(() => {
        if (!DOCUMENTS.find(d => d.id === selectedId) && DOCUMENTS.length > 0) {
            setSelectedId(DOCUMENTS[0].id);
        }
    }, [DOCUMENTS, selectedId]);

    const selectedDoc = DOCUMENTS.find(d => d.id === selectedId) || DOCUMENTS[0];

    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [fileContent, setFileContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    // Lock body scroll when modal is open
    React.useEffect(() => {
        if (isViewerOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isViewerOpen]);

    const handleViewFile = async () => {
        if (!selectedDoc) return;
        setIsLoading(true);
        try {
            const res = await fetch(selectedDoc.url);
            if (res.ok) {
                const text = await res.text();
                setFileContent(text);
                setIsViewerOpen(true);
            } else {
                console.error("Failed to fetch file");
                window.open(selectedDoc.url, '_blank');
            }
        } catch (error) {
            console.error("Error reading file", error);
            window.open(selectedDoc.url, '_blank');
        } finally {
            setIsLoading(false);
        }
    };

    if (isViewerOpen) {
        return (
            <div className="w-full glass-card p-6 border-l-4 border-tm-blue bg-tm-card/40 animate-in fade-in duration-200">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 md:p-6 mb-4 border-b border-white/10 bg-black/20 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        {selectedDoc?.icon}
                        <h3 className="font-bold text-white text-xl">{selectedDoc?.title}</h3>
                    </div>
                    <button
                        onClick={() => setIsViewerOpen(false)}
                        className="px-4 py-2 border border-white/20 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-white hover:text-white flex gap-2 items-center font-semibold"
                    >
                        <X className="w-5 h-5" /> Close and Go Back
                    </button>
                </div>

                {/* Body - Document Text */}
                <div className="w-full overflow-y-auto p-4 md:p-8 bg-[#0D0D12]/50 rounded-b-xl max-h-[70vh]">
                    <div className="max-w-4xl mx-auto prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-a:text-tm-blue prose-strong:text-white prose-code:text-tm-purple prose-th:text-white prose-td:text-gray-300 prose-blockquote:border-l-tm-purple prose-blockquote:text-gray-400 max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {fileContent}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full glass-card p-6 border-l-4 border-tm-blue bg-tm-card/40">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        {t('education.title')}
                    </h2>
                    <p className="text-sm text-tm-muted mt-1">{t('education.subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                {/* Custom Selective Dropdown */}
                <div className="relative w-full">
                    <label className="text-xs uppercase tracking-widest text-tm-muted font-bold mb-2 block">{t('education.select')}</label>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-full flex items-center justify-between bg-tm-bg/50 border border-white/10 hover:border-white/20 p-4 rounded-xl text-left transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            {selectedDoc.icon}
                            <span className="font-semibold text-white">{selectedDoc.title}</span>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-tm-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A24] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                            {DOCUMENTS.map(doc => (
                                <button
                                    key={doc.id}
                                    onClick={() => {
                                        setSelectedId(doc.id);
                                        setIsOpen(false);
                                    }}
                                    className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left ${selectedId === doc.id ? 'bg-tm-purple/10 border-l-2 border-tm-purple' : 'border-l-2 border-transparent'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        {doc.icon}
                                        <div>
                                            <p className={`font-semibold ${selectedId === doc.id ? 'text-white' : 'text-gray-300'}`}>{doc.title}</p>
                                            <p className="text-xs text-tm-muted">{doc.type}</p>
                                        </div>
                                    </div>
                                    {selectedId === doc.id && <Check className="w-5 h-5 text-tm-purple" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Resource Display Card */}
                <div className="bg-tm-bg/30 border border-white/5 p-6 rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-tm-blue/5 blur-3xl rounded-full pointer-events-none group-hover:bg-tm-blue/10 transition-all"></div>

                    <div className="flex items-center gap-2 mb-3">
                        <span className="bg-tm-blue/10 text-tm-blue text-xs font-bold uppercase tracking-wider px-2 py-1 rounded">
                            {selectedDoc.type}
                        </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{selectedDoc.title}</h3>
                    <p className="text-sm text-tm-muted leading-relaxed mb-6">
                        {selectedDoc.description}
                    </p>

                    <button
                        onClick={handleViewFile}
                        disabled={isLoading}
                        className="btn-secondary w-full justify-center flex items-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-bold transition-all shadow-sm shadow-black/50 hover:shadow-tm-blue/20 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 text-tm-blue animate-spin" /> : <Download className="w-5 h-5 text-tm-blue" />}
                        Download / View File
                    </button>
                </div>
            </div>
        </div>
    );
}
