"use client";

import { useState } from "react";
import { Share2, X, Twitter, Instagram, Copy, Check, Download } from "lucide-react";

interface ShareData {
    type: 'trade' | 'streak' | 'badge';
    title: string;
    amount?: number;
    symbol?: string;
    returnPercent?: number;
    streak?: number;
    badgeName?: string;
    badgeIcon?: string;
}

interface ShareButtonProps {
    data: ShareData;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'icon' | 'button';
}

export function ShareButton({ data, size = 'md', variant = 'icon' }: ShareButtonProps) {
    const [showModal, setShowModal] = useState(false);

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12'
    };

    const iconSizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    };

    if (variant === 'button') {
        return (
            <>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-tm-purple/20 text-tm-purple hover:bg-tm-purple/30 transition-colors"
                >
                    <Share2 className={iconSizes[size]} />
                    <span>Share Win</span>
                </button>
                {showModal && <ShareModal data={data} onClose={() => setShowModal(false)} />}
            </>
        );
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className={`${sizeClasses[size]} rounded-full bg-tm-surface/80 hover:bg-tm-purple/20 flex items-center justify-center transition-colors`}
            >
                <Share2 className={iconSizes[size]} />
            </button>
            {showModal && <ShareModal data={data} onClose={() => setShowModal(false)} />}
        </>
    );
}

interface ShareModalProps {
    data: ShareData;
    onClose: () => void;
}

function ShareModal({ data, onClose }: ShareModalProps) {
    const [copied, setCopied] = useState(false);
    const [generating, setGenerating] = useState(false);

    const generateCaption = (): string => {
        switch (data.type) {
            case 'trade':
                return `Just made $${data.amount?.toFixed(0)} on ${data.symbol} with TradeMind AI! 🤖📈\n\n${data.returnPercent}% return while I was busy doing other things.\n\nAI trading hits different.\n\n#AITrading #ThetaGang #PassiveIncome`;
            case 'streak':
                return `🔥 ${data.streak} winning weeks in a row!\n\nTradeMind AI is on a hot streak. No trading experience needed.\n\nCheck it out 👉 trademind.bot\n\n#AITrading #WinningStreak #TradeMind`;
            case 'badge':
                return `${data.badgeIcon} Just earned the "${data.badgeName}" badge on TradeMind!\n\nLeveling up my trading game with AI.\n\n#TradeMind #Achievement #AITrading`;
            default:
                return 'Trading with AI on TradeMind.bot 🤖📈';
        }
    };

    const caption = generateCaption();
    const shareUrl = 'https://trademind.bot/join';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(`${caption}\n\n${shareUrl}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            console.error('Failed to copy');
        }
    };

    const handleTwitter = () => {
        const text = encodeURIComponent(`${caption}\n\n${shareUrl}`);
        window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    };

    const handleDownload = async () => {
        setGenerating(true);
        try {
            // Generate share image via API
            const response = await fetch('/api/share/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `trademind-${data.type}-${Date.now()}.png`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to generate image:', error);
        } finally {
            setGenerating(false);
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: data.title,
                    text: caption,
                    url: shareUrl
                });
            } catch {
                // User cancelled or error
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="glass-card w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-tm-surface flex items-center justify-center"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <h2 className="text-xl font-bold mb-4">Share Your Win 🎉</h2>

                {/* Preview Card */}
                <div className="bg-gradient-to-br from-tm-purple/30 via-tm-surface to-tm-green/20 rounded-2xl p-6 mb-6 border border-white/10">
                    <div className="text-center">
                        <p className="text-sm text-tm-muted mb-2">TradeMind.bot</p>

                        {data.type === 'trade' && (
                            <>
                                <p className="text-4xl font-bold text-tm-green mb-1">
                                    +${data.amount?.toLocaleString()}
                                </p>
                                <p className="text-lg">{data.symbol}</p>
                                <p className="text-sm text-tm-muted">
                                    {data.returnPercent}% return
                                </p>
                            </>
                        )}

                        {data.type === 'streak' && (
                            <>
                                <p className="text-5xl mb-2">🔥</p>
                                <p className="text-3xl font-bold">{data.streak} Week Streak!</p>
                            </>
                        )}

                        {data.type === 'badge' && (
                            <>
                                <p className="text-5xl mb-2">{data.badgeIcon}</p>
                                <p className="text-2xl font-bold">{data.badgeName}</p>
                                <p className="text-sm text-tm-muted">Badge Unlocked!</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Caption */}
                <div className="bg-tm-surface rounded-xl p-4 mb-6">
                    <p className="text-sm whitespace-pre-line">{caption}</p>
                </div>

                {/* Share Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleTwitter}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1DA1F2] hover:bg-[#1a8cd8] transition-colors"
                    >
                        <Twitter className="w-5 h-5" />
                        <span>Twitter</span>
                    </button>

                    <button
                        onClick={handleCopy}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-tm-surface hover:bg-tm-surface/80 transition-colors"
                    >
                        {copied ? (
                            <>
                                <Check className="w-5 h-5 text-tm-green" />
                                <span className="text-tm-green">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-5 h-5" />
                                <span>Copy</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleDownload}
                        disabled={generating}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-tm-purple hover:bg-tm-purple/80 transition-colors disabled:opacity-50"
                    >
                        <Download className={`w-5 h-5 ${generating ? 'animate-pulse' : ''}`} />
                        <span>{generating ? 'Generating...' : 'Download'}</span>
                    </button>

                    {'share' in navigator && (
                        <button
                            onClick={handleNativeShare}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-tm-green hover:bg-tm-green/80 transition-colors"
                        >
                            <Share2 className="w-5 h-5" />
                            <span>Share</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
