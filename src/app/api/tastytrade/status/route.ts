import { NextRequest, NextResponse } from "next/server";
import { getTastytradeTokens, isTastytradeLinked } from "@/lib/redis";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
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
                console.warn("Could not decode Privy token");
            }
        }

        // Check if linked
        const linked = await isTastytradeLinked(userId);

        if (linked) {
            const tokens = await getTastytradeTokens(userId);
            return NextResponse.json({
                linked: true,
                accountNumber: tokens?.accountNumber,
                username: tokens?.username,
                linkedAt: tokens?.linkedAt,
            });
        }

        return NextResponse.json({
            linked: false,
        });

    } catch (error) {
        console.error("Status check error:", error);
        return NextResponse.json(
            { error: "Failed to check status", linked: false },
            { status: 500 }
        );
    }
}
