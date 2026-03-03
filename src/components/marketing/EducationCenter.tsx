'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, ChevronDown, Check, BookOpen } from 'lucide-react';

const DOCUMENTS = [
    {
        id: 'csv-5k',
        title: '$5,000 Portfolio - All Simulation Trades (CSV)',
        description: 'Download the comprehensive CSV containing 1,078 raw backtested signals, position sizing, and profit/loss data from 2019 to 2025 scaled to a $5,000 base.',
        url: '/files/turbobounce_options_5k_all_trades.csv',
        icon: <FileText className="w-5 h-5 text-tm-purple" />,
        type: 'CSV Data'
    },
    {
        id: 'csv-25k',
        title: '$25,000 Portfolio - All Simulation Trades (CSV)',
        description: 'Download the comprehensive CSV containing the raw execution details, position sizing, and profit/loss data scaled to a larger $25,000 base portfolio.',
        url: '/files/turbobounce_options_25k_all_trades.csv',
        icon: <FileText className="w-5 h-5 text-tm-purple" />,
        type: 'CSV Data'
    },
    {
        id: 'analysis',
        title: 'Strategy Deep-Dive & Architecture',
        description: 'Read the foundational document detailing the machine-learning VIX predictor, IV-crush mitigation, and our 3-layer unified trading logic.',
        url: '/files/turbobounce_strategy_report.md',
        icon: <BookOpen className="w-5 h-5 text-tm-blue" />,
        type: 'Research Report'
    }
];

export function EducationCenter() {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(DOCUMENTS[0].id);

    const selectedDoc = DOCUMENTS.find(d => d.id === selectedId) || DOCUMENTS[0];

    const handleDownload = () => {
        // In reality this might be a router.push() or an <a> download trigger.
        window.open(selectedDoc.url, '_blank');
    };

    return (
        <div className="w-full glass-card p-6 border-l-4 border-tm-blue bg-tm-card/40">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        Education Center & Verifiable Data
                    </h2>
                    <p className="text-sm text-tm-muted mt-1">Review our foundational architecture and raw simulation data.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                {/* Custom Selective Dropdown */}
                <div className="relative w-full">
                    <label className="text-xs uppercase tracking-widest text-tm-muted font-bold mb-2 block">Select Resource</label>
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
                        onClick={handleDownload}
                        className="btn-secondary w-full justify-center flex items-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-bold transition-all shadow-sm shadow-black/50 hover:shadow-tm-blue/20"
                    >
                        <Download className="w-5 h-5 text-tm-blue" />
                        Download / View File
                    </button>
                </div>
            </div>
        </div>
    );
}
