/**
 * Tastytrade Transactions API Route
 * Fetches recent order fills/transactions from the live Tastytrade account.
 * GET /api/tastytrade/transactions?accountNumber=XXX&startDate=YYYY-MM-DD
 */
import { NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { TASTYTRADE_CONFIG, refreshAccessToken } from '@/lib/tastytrade-oauth';
import { cookies } from 'next/headers';

function getUserIdFromCookie(privyToken: string | undefined): string {
    if (!privyToken) return 'default-user';
    try {
        const payload = privyToken.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
        return decoded.sub || decoded.userId || 'default-user';
    } catch {
        return 'default-user';
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const accountNumber = searchParams.get('accountNumber');
        // Default: last 30 days
        const startDate = searchParams.get('startDate') ||
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        if (!accountNumber) {
            return NextResponse.json({ error: 'accountNumber is required' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const privyToken = cookieStore.get('privy-token')?.value;
        const userId = getUserIdFromCookie(privyToken);

        const tokens = await getTastytradeTokens(userId);
        if (!tokens?.accessToken) {
            return NextResponse.json({ error: 'Not connected to Tastytrade' }, { status: 401 });
        }

        const apiUrl = `${TASTYTRADE_CONFIG.apiBaseUrl}/accounts/${accountNumber}/transactions?start-date=${startDate}&per-page=50`;

        const doFetch = (accessToken: string) =>
            fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json',
                },
            });

        let response = await doFetch(tokens.accessToken);

        // Auto-refresh if 401
        if (response.status === 401 && tokens.refreshToken) {
            try {
                const newTokens = await refreshAccessToken(tokens.refreshToken);
                await storeTastytradeTokens(userId, {
                    ...tokens,
                    accessToken: newTokens.access_token,
                    refreshToken: newTokens.refresh_token || tokens.refreshToken,
                    expiresAt: Date.now() + newTokens.expires_in * 1000,
                });
                response = await doFetch(newTokens.access_token);
            } catch {
                return NextResponse.json({ error: 'Session expired' }, { status: 401 });
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Transactions API] Error:', response.status, errorText);
            return NextResponse.json(
                { error: `Tastytrade API error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        const items = data?.data?.items || [];

        // Normalize to a clean shape for the Activity page
        const transactions = items
            .filter((t: any) => t['transaction-type'] === 'Trade')
            .map((t: any) => ({
                id: String(t.id),
                source: 'tastytrade',
                symbol: t['underlying-symbol'] || t.symbol || 'UNKNOWN',
                description: t.description || '',
                action: t.action || '',
                quantity: t.quantity || 0,
                price: t.price || 0,
                value: t.value || 0,
                executed_at: t['executed-at'] || t['transaction-date'],
                order_id: String(t['order-id'] || ''),
                strategy: inferStrategy(t),
            }));

        return NextResponse.json({ transactions });
    } catch (err: any) {
        console.error('[Transactions API] Unexpected error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch transactions', details: err.message },
            { status: 500 }
        );
    }
}

function inferStrategy(t: any): string {
    const sym: string = t['underlying-symbol'] || t.symbol || '';
    const desc: string = (t.description || '').toLowerCase();
    if (sym === 'TQQQ') return 'diagonal';
    if (desc.includes('calendar')) return 'calendar';
    if (desc.includes('put')) return 'theta';
    return 'manual';
}
