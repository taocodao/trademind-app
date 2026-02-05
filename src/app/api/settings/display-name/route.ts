/**
 * Display Name API
 * GET/PUT /api/settings/display-name
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { setDisplayName, getDisplayName } from '@/lib/gamification';

async function getUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token');

    if (!privyToken) return null;

    const tokenParts = privyToken.value.split('.');
    if (tokenParts.length >= 2) {
        try {
            const payload = JSON.parse(atob(tokenParts[1]));
            return payload.sub || payload.userId || null;
        } catch {
            return privyToken.value.slice(0, 32);
        }
    }
    return null;
}

export async function GET() {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const displayName = await getDisplayName(userId);
        return NextResponse.json({ displayName });
    } catch (error) {
        console.error('❌ Error fetching display name:', error);
        return NextResponse.json(
            { error: 'Failed to fetch display name' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { displayName } = body;

        // Allow empty to clear
        if (displayName === '') {
            await setDisplayName(userId, '');
            return NextResponse.json({ success: true, displayName: '' });
        }

        // Validate
        const sanitized = displayName.trim().slice(0, 20);
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(sanitized)) {
            return NextResponse.json(
                { error: 'Display name must be 3-20 characters, alphanumeric and underscores only' },
                { status: 400 }
            );
        }

        await setDisplayName(userId, sanitized);
        return NextResponse.json({ success: true, displayName: sanitized });
    } catch (error) {
        console.error('❌ Error updating display name:', error);
        return NextResponse.json(
            { error: 'Failed to update display name' },
            { status: 500 }
        );
    }
}
