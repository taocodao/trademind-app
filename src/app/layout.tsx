import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PrivyProvider } from "@/components/providers/PrivyProvider";
import { SignalProvider } from "@/components/providers/SignalProvider";
import { SettingsProvider } from "@/components/providers/SettingsProvider";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
});

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
            <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-tm-bg`}>
                <PrivyProvider>
                    <SettingsProvider>
                        <SignalProvider>
                            {children}
                        </SignalProvider>
                    </SettingsProvider>
                </PrivyProvider>
            </body>
        </html>
    );
}

