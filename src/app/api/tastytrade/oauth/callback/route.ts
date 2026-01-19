import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, TASTYTRADE_CONFIG } from "@/lib/tastytrade-oauth";
import { storeTastytradeTokens } from "@/lib/redis";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        // Handle OAuth errors
        if (error) {
            console.error("OAuth error:", error);
            return NextResponse.redirect(
                new URL(`/dashboard?error=${encodeURIComponent(error)}`, request.url)
            );
        }

        // Validate code
        if (!code) {
            return NextResponse.redirect(
                new URL("/dashboard?error=missing_code", request.url)
            );
        }

        // Exchange code for tokens
        const tokenResponse = await exchangeCodeForTokens(code);

        // Get user ID from Privy cookie/session
        // For now, we'll use a placeholder - in production, extract from Privy JWT
        const cookieStore = await cookies();
        const privyToken = cookieStore.get("privy-token")?.value;

        // Decode Privy token to get user ID (simplified - use proper JWT verification in production)
        let userId = "default-user";
        if (privyToken) {
            try {
                // Basic JWT decode (payload is base64 encoded)
                const payload = privyToken.split(".")[1];
                const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
                userId = decoded.sub || decoded.userId || "default-user";
            } catch {
                console.warn("Could not decode Privy token, using default user");
            }
        }

        // Fetch account info to store with tokens
        let accountNumber: string | undefined;
        try {
            const accountResponse = await fetch(`${TASTYTRADE_CONFIG.apiBaseUrl}/customers/me/accounts`, {
                headers: {
                    Authorization: `Bearer ${tokenResponse.access_token}`,
                },
            });
            if (accountResponse.ok) {
                const accountData = await accountResponse.json();
                accountNumber = accountData.data?.items?.[0]?.account?.["account-number"];
            }
        } catch (err) {
            console.warn("Could not fetch account number:", err);
        }

        // Store tokens in Redis
        await storeTastytradeTokens(userId, {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
            linkedAt: Date.now(),
            accountNumber,
        });

        console.log(`Tastytrade linked for user ${userId}, account: ${accountNumber || "unknown"}`);

        // Redirect to dashboard with success
        return NextResponse.redirect(
            new URL("/dashboard?linked=true", request.url)
        );

    } catch (error) {
        console.error("OAuth callback error:", error);
        return NextResponse.redirect(
            new URL(`/dashboard?error=${encodeURIComponent("Failed to complete authentication")}`, request.url)
        );
    }
}
