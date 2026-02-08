"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { RiskAnalysisReport } from "@/components/settings/RiskAnalysisReport";

export default function RiskAnalysisPage() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();

    useEffect(() => {
        if (ready && !authenticated) {
            router.push("/");
        }
    }, [ready, authenticated, router]);

    if (!ready || !authenticated) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-tm-purple/30" />
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen pb-6">
            <header className="px-6 pt-12 pb-6 flex items-center gap-4">
                <Link href="/settings" className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Risk Analysis Reference</h1>
                    <p className="text-sm text-tm-muted">Research-backed strategy insights</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-tm-purple/20 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-tm-purple" />
                </div>
            </header>

            <div className="px-6">
                <RiskAnalysisReport />
            </div>
        </main>
    );
}
