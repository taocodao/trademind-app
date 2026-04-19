import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
    title: "TradeMind Demo — Interactive Feature Tour",
    description: "Explore TradeMind's AI-powered trading signals, TurboCore portfolio automation, and smart options strategies — no account required.",
};

export default function DemoLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Deliberately isolated — no Privy, no SignalProvider, no BottomNav.
    // This ensures /demo never redirects to login.
    return (
        <html lang="en" className="dark">
            <body className="font-sans antialiased min-h-screen bg-[#0A0A0F] text-white">
                {children}
            </body>
        </html>
    );
}
