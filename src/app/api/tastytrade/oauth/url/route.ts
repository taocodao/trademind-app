import { NextResponse } from "next/server";
import { getTastytradeAuthUrl } from "@/lib/tastytrade-oauth";
import { cookies } from "next/headers";

export async function GET() {
    try {
        // Get user ID from Privy token
        const cookieStore = await cookies();
        const privyToken = cookieStore.get("privy-token")?.value;

        let userId = "default-user";
        if (privyToken) {
            try {
                const payload = privyToken.split(".")[1];
                const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
                userId = decoded.sub || decoded.userId || "default-user";
            } catch {
                console.warn("Could not decode Privy token for OAuth state");
            }
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
