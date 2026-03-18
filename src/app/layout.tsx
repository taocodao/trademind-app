import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PrivyProvider } from "@/components/providers/PrivyProvider";
import { SignalProvider } from "@/components/providers/SignalProvider";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { StrategyProvider } from "@/components/providers/StrategyContext";
import { BottomNav } from "@/components/layout/BottomNav";
import { MarketingProviders } from "@/components/marketing/MarketingProviders";
import Script from "next/script";

// Fonts migrated to globals.css

export const metadata: Metadata = {
    title: "TradeMind - Smart Trade Signals",
    description: "Membership-based trade signal platform for calendar spreads",
    manifest: "/manifest.json",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#0A0A0F",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <head>
                <Script id="rewardful" strategy="afterInteractive">
                    {`
                        (function(w,r){w._rwq=r;w[r]=w[r]||function(){(w[r].q=w[r].q||[]).push(arguments)}})(window,'rewardful');
                    `}
                </Script>
                <Script async src="https://r.wdfl.co/rw.js" data-rewardful={process.env.NEXT_PUBLIC_REWARDFUL_API_KEY || ""} strategy="afterInteractive" />
            </head>
            <body className={`font-sans antialiased min-h-screen bg-tm-bg`}>
                <MarketingProviders>
                    <PrivyProvider>
                        <SettingsProvider>
                            <SignalProvider>
                                <StrategyProvider>
                                    <div className="pb-16 md:pb-0">
                                        {children}
                                    </div>
                                    <BottomNav />
                                </StrategyProvider>
                            </SignalProvider>
                        </SettingsProvider>
                    </PrivyProvider>
                </MarketingProviders>
            </body>
        </html>
    );
}

