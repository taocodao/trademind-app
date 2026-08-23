"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyAccountRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/accounts");
    }, [router]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-tm-bg text-tm-muted">
            Opening accounts...
        </main>
    );
}
