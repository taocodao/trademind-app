
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.EC2_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const res = await fetch(`${API_URL}/api/dvo/scan`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body.symbols || []),
        });

        if (!res.ok) {
            throw new Error(`Backend responded with ${res.status}`);
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("DVO Scan API Error:", error);
        return NextResponse.json(
            { error: "Failed to run scan" },
            { status: 500 }
        );
    }
}
