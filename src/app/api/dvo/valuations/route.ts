
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.EC2_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const symbol = searchParams.get("symbol");

        let url = `${API_URL}/api/dvo/valuations`;
        if (symbol) {
            url += `?symbol=${symbol}`;
        }

        const res = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        if (!res.ok) {
            throw new Error(`Backend responded with ${res.status}`);
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("DVO Valuations API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch valuations" },
            { status: 500 }
        );
    }
}
