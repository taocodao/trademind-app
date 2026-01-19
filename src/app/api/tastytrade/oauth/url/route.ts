import { NextResponse } from "next/server";
import { getTastytradeAuthUrl } from "@/lib/tastytrade-oauth";

export async function GET() {
    try {
        // Generate a random state for CSRF protection
        const state = Math.random().toString(36).substring(2, 15);

        // Get the OAuth authorization URL
        const url = getTastytradeAuthUrl(state);

        return NextResponse.json({
            url,
            state
        });
    } catch (error) {
        console.error("Error generating OAuth URL:", error);
        return NextResponse.json(
            { error: "Failed to generate authorization URL" },
            { status: 500 }
        );
    }
}
