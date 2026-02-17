
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.EC2_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Pass execute params (signal + dry_run flag)
        const dryRun = body.execute ? false : true;

        const res = await fetch(`${API_URL}/api/dvo/order?dry_run=${dryRun}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body.signal),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || `Backend responded with ${res.status}`);
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("DVO Order API Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to execute order" },
            { status: 500 }
        );
    }
}
