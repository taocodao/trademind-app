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

            {/* Fullscreen Document Viewer Modal */}
            {isViewerOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#13131A] w-full h-full flex flex-col overflow-hidden shadow-2xl relative opacity-100 scale-100">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10 bg-white/5">
                            <div className="flex items-center gap-3">
                                {selectedDoc?.icon}
                                <h3 className="font-bold text-white text-lg">{selectedDoc?.title}</h3>
                            </div>
                            <button
                                onClick={() => setIsViewerOpen(false)}
                                className="p-2 bg-black/20 hover:bg-white/10 rounded-lg transition-colors text-tm-muted hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body - Document Text */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0D0D12]">
                            <div className="max-w-3xl mx-auto prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-a:text-tm-blue prose-strong:text-white prose-code:text-tm-purple prose-th:text-white prose-td:text-gray-300 prose-blockquote:border-l-tm-purple prose-blockquote:text-gray-400 max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {fileContent}
                                </ReactMarkdown>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 md:p-6 border-t border-white/10 bg-white/5 flex justify-end">
                            <button
                                onClick={() => window.open(selectedDoc?.url, '_blank')}
                                className="flex items-center gap-2 px-4 py-2 bg-tm-blue/10 border border-tm-blue/20 text-tm-blue hover:bg-tm-blue/20 rounded-lg font-bold transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Download File
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
