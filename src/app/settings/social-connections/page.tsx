import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { SocialConnectionsClient } from './SocialConnectionsClient';

export const dynamic = 'force-dynamic';

export default async function SocialConnectionsPage({
    searchParams,
}: {
    searchParams: { success?: string; error?: string; platform?: string };
}) {
    // Auth check via privy-token cookie
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token')?.value;
    if (!privyToken) redirect('/');

    let privyDid: string;
    try {
        const payload = privyToken.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
        privyDid = decoded.sub || decoded.privy_did;
        if (!privyDid) throw new Error('No DID');
    } catch {
        redirect('/');
    }

    // Fetch connections and user tier in parallel
    const [connResult, settingsResult] = await Promise.all([
        query(
            `SELECT platform, status, connected_at FROM social_connections WHERE user_id = $1`,
            [privyDid]
        ),
        query(
            `SELECT referral_tier, is_creator FROM user_settings WHERE user_id = $1`,
            [privyDid]
        ),
    ]);

    const connectionMap = Object.fromEntries(
        connResult.rows.map((c: any) => [c.platform, { status: c.status, connected_at: c.connected_at }])
    );
    const userTier: string = settingsResult.rows[0]?.referral_tier ?? 'bronze';
    const isCreator: boolean = settingsResult.rows[0]?.is_creator === true;

    return (
        <SocialConnectionsClient
            initialConnections={connectionMap}
            userTier={userTier}
            isCreator={isCreator}
            successPlatform={searchParams.success === 'true' ? (searchParams.platform ?? null) : null}
            errorType={searchParams.error ?? null}
        />
    );
}
