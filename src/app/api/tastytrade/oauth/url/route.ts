import { NextResponse } from "next/server";
import { getTastytradeAuthUrl } from "@/lib/tastytrade-oauth";
import { getPrivyUserId } from "@/lib/auth-helpers";

export async function GET() {
    try {
        const userId = await getPrivyUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        console.log("[OAuth URL] Generating auth URL for userId:", userId);

        // Encode user ID in state parameter (base64 encoded JSON)
        // This survives the cross-origin redirect from Tastytrade
        const stateData = {
            userId,
            nonce: Math.random().toString(36).substring(2, 15),
            timestamp: Date.now()
        };
        const state = Buffer.from(JSON.stringify(stateData)).toString("base64url");

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
