
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.EC2_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
    try {
        const res = await fetch(`${API_URL}/api/dvo/positions`, {
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
        console.error("DVO Positions API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch positions" },
            { status: 500 }
        );
    }
}
