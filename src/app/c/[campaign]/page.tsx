import { Metadata, ResolvingMetadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

// Use "force-dynamic" so we can read the ?ref= query strictly without caching
export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ campaign: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Map of available campaigns
const CAMPAIGNS: Record<string, {
    title: string;
    description: string;
    image: string;
    hookHeader: string;
    content: string[];
}> = {
    compounding: {
        title: 'A 19-year-old investing $5k at 39% becomes a millionaire at 41.',
        description: 'No inheritance. No lucky stock pick. Just time doing what time does. Unlock exactly how with TradeMind.',
        image: '/campaigns/compounding.png',
        hookHeader: 'How to build generational wealth starting with $5,000.',
        content: [
            'A 19-year-old investing $5,000 at a 39% annual return becomes a millionaire at 41.',
            'No inheritance. No lucky stock pick. Just time doing what time does.',
            'The problem is nobody teaches Gen Z exactly *how* to get that return. Not Robinhood. Not Reddit. Not a finance influencer selling a course.',
            'TradeMind closes that gap. Every trading day at 3PM, our AI sends a clear signal: BULL, SIDEWAYS, or BEAR. It tells you the exact allocation and gives a plain-English reason why.',
            '7-year backtest: 39% annualized return. 3x the S&P 500. In 2022 when the QQQ lost 33%: our system returned +21.4%.',
            'Takes under 2 minutes to act on.'
        ]
    }
};

// 1. DYNAMIC METADATA — This powers the LinkedIn OpenGraph preview!
export async function generateMetadata(
    { params, searchParams }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const resolvedParams = await params;
    const campaignId = resolvedParams.campaign.toLowerCase();
    const campaign = CAMPAIGNS[campaignId];
    
    // Fallback if bad link
    if (!campaign) {
        return { title: 'TradeMind Campaign Not Found' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';
    
    return {
        title: campaign.title,
        description: campaign.description,
        openGraph: {
            title: campaign.title,
            description: campaign.description,
            // Full absolute URL to the image so LinkedIn can fetch it
            images: [appUrl + campaign.image],
            type: 'website',
            siteName: 'TradeMind',
        },
        twitter: {
            card: 'summary_large_image',
            title: campaign.title,
            description: campaign.description,
            images: [appUrl + campaign.image],
        }
    };
}

// 2. PAGE UI
export default async function CampaignPage({ params, searchParams }: Props) {
    const resolvedParams = await params;
    const campaignId = resolvedParams.campaign.toLowerCase();
    const campaign = CAMPAIGNS[campaignId];

    if (!campaign) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
                <h1 className="text-2xl font-bold text-white mb-2">Campaign Not Found</h1>
                <p className="text-zinc-400 mb-6">This link might have expired or is invalid.</p>
                <Link href="/" className="px-6 py-3 bg-tm-purple rounded-xl text-white font-bold">Go to TradeMind</Link>
            </div>
        );
    }

    // Extract referral code
    const resolvedSearchParams = await searchParams;
    const refCode = typeof resolvedSearchParams.ref === 'string' ? resolvedSearchParams.ref : '';
    // Build the sign up link that carries the referral down the funnel
    const ctaLink = refCode ? '/?ref=' + refCode : '/';

    return (
        <main className="min-h-screen bg-[#07070F] text-zinc-300 antialiased pb-24">
            
            {/* Minimal Header */}
            <header className="px-6 py-6 flex justify-between items-center max-w-5xl mx-auto">
                <Link href="/" className="font-black text-2xl tracking-tighter text-white">TradeMind<span className="text-tm-purple">.bot</span></Link>
                <Link href={ctaLink} className="text-sm font-semibold hover:text-white transition-colors">Sign In</Link>
            </header>

            <div className="max-w-4xl mx-auto px-6 mt-6 md:mt-12 flex flex-col md:flex-row gap-12 lg:gap-20 items-center">
                
                {/* Visual / Infographic Side */}
                <div className="w-full md:w-1/2 relative">
                    <div className="absolute inset-0 bg-tm-purple/20 blur-3xl -z-10 rounded-full" />
                    <div className="bg-black/40 border border-white/10 rounded-3xl p-2 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-tm-purple/50 to-transparent" />
                        <Image 
                            src={campaign.image}
                            alt={campaign.hookHeader}
                            width={1000}
                            height={1000}
                            className="w-full h-auto rounded-2xl object-cover"
                            priority
                        />
                    </div>
                </div>

                {/* Copy / Funnel Side */}
                <div className="w-full md:w-1/2 flex flex-col items-start text-left space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-tm-purple/10 border border-tm-purple/20 text-tm-purple text-xs font-bold uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-tm-purple animate-pulse" /> Live Now
                    </div>

                    <h1 className="text-3xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight">
                        {campaign.hookHeader}
                    </h1>

                    <div className="space-y-4 text-sm lg:text-base text-zinc-400">
                        {campaign.content.map((paragraph, i) => (
                            <p key={i} className="leading-relaxed">{paragraph}</p>
                        ))}
                    </div>

                    <div className="pt-6 w-full flex flex-col gap-3">
                        <Link 
                            href={ctaLink}
                            className="w-full flex justify-center items-center py-4 bg-tm-purple hover:bg-tm-purple/90 text-white font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-[1.02] active:scale-[0.98] text-lg gap-2 tracking-wide"
                        >
                            Claim 30-Day Free Trial
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </Link>
                        {refCode && (
                            <p className="text-center text-[11px] text-zinc-500 font-medium">
                                Referral code <span className="text-emerald-400 font-mono">{refCode}</span> auto-applied.
                            </p>
                        )}
                    </div>
                    
                    {/* Trust Indicators */}
                    <div className="flex items-center gap-6 mt-4 opacity-70">
                        <div className="flex -space-x-2">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#07070F] bg-zinc-800 flex items-center justify-center text-[10px]">👤</div>
                            ))}
                        </div>
                        <div className="text-xs">
                            <strong className="text-white block tracking-wide">120+ Active Traders</strong>
                            <span className="text-zinc-500">Trust the algorithm daily</span>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    );
}
