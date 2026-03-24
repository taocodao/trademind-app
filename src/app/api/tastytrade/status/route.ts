import { NextRequest, NextResponse } from "next/server";
import { getTastytradeTokens, isTastytradeLinked } from "@/lib/redis";
import { getPrivyUserId } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
    try {
        const userId = await getPrivyUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated', linked: false }, { status: 401 });
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
