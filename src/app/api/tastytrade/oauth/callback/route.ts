import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, TASTYTRADE_CONFIG } from "@/lib/tastytrade-oauth";
import { storeTastytradeTokens } from "@/lib/redis";

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

        // Extract user ID from state parameter (encoded by /api/tastytrade/oauth/url)
        // SECURITY: if we can't identify the user, abort — do NOT fall back to a shared key.
        if (!state) {
            console.error("[OAuth Callback] No state parameter — cannot identify user. Aborting.");
            return NextResponse.redirect(
                new URL("/dashboard?error=missing_state", request.url)
            );
        }

        let userId: string;
        try {
            const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
            const resolvedId = stateData.userId;
            if (!resolvedId || resolvedId === "default-user") {
                throw new Error("Invalid userId in state");
            }
            userId = resolvedId;
            console.log("[OAuth Callback] Decoded userId from state:", userId);
        } catch (err) {
            console.error("[OAuth Callback] Could not decode valid userId from state:", err);
            return NextResponse.redirect(
                new URL("/dashboard?error=invalid_state", request.url)
            );
        }


        // Fetch account info and username to store with tokens
        let accountNumber: string | undefined;
        let username: string | undefined;
        try {
            // Get customer info (includes username/email)
            const customerResponse = await fetch(`${TASTYTRADE_CONFIG.apiBaseUrl}/customers/me`, {
                headers: {
                    Authorization: `Bearer ${tokenResponse.access_token}`,
                    'User-Agent': 'trademind/1.0',
                },
            });
            if (customerResponse.ok) {
                const customerData = await customerResponse.json();
                username = customerData.data?.username || customerData.data?.email;
            }

            // Get account number
            const accountResponse = await fetch(`${TASTYTRADE_CONFIG.apiBaseUrl}/customers/me/accounts`, {
                headers: {
                    Authorization: `Bearer ${tokenResponse.access_token}`,
                    'User-Agent': 'trademind/1.0',
                },
            });
            if (accountResponse.ok) {
                const accountData = await accountResponse.json();
                accountNumber = accountData.data?.items?.[0]?.account?.["account-number"];
            }
        } catch (err) {
            console.warn("Could not fetch account info:", err);
        }

        // Store tokens in Redis
        await storeTastytradeTokens(userId, {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
            linkedAt: Date.now(),
            accountNumber,
            username,
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
