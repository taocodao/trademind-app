import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LegalFooter } from '@/components/marketing/LegalFooter';

export function LegalPageLayout({ children, title }: { children: React.ReactNode, title?: string }) {
    return (
        <main className="min-h-screen bg-[#05050A] text-white flex flex-col">
            <header className="px-6 pt-10 pb-6 flex items-center border-b border-white/10 max-w-5xl mx-auto w-full">
                <Link href="/" className="flex items-center gap-2 text-tm-muted hover:text-white transition group font-medium text-sm">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to TradeMind@bot
                </Link>
            </header>
            <div className="flex-1 max-w-3xl mx-auto px-6 py-12 md:py-16 w-full text-white/80 space-y-6 
                [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:text-white [&>h1]:mb-8
                [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-white [&>h2]:mt-12 [&>h2]:mb-4
                [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-white [&>h3]:mt-10 [&>h3]:mb-3
                [&>p]:leading-relaxed [&>p]:mb-4
                [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-2 [&>ul]:mb-6
                [&>li]:leading-relaxed
                [&>hr]:border-white/10 [&>hr]:my-10
                [&>a]:text-tm-purple [&>a]:hover:underline
                [&>blockquote]:border-l-4 [&>blockquote]:border-tm-purple [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-white/60
                [&>strong]:text-white [&>strong]:font-semibold"
            >
                {title && <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-10">{title}</h1>}
                {children}
            </div>
            <LegalFooter />
        </main>
    );
}
