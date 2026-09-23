/**
 * Returns the signature-verified Privy account id (DID) of the current
 * session and whether it currently has admin access. Used once to
 * provision ADMIN_PRIVY_DID. A DID is an identifier, not a credential:
 * knowing it grants nothing, so this is safe to answer for any session.
 */
import { NextRequest, NextResponse } from 'next/server';
import { resolveAdmin } from '@/lib/admin-gate';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const admin = await resolveAdmin(req);
    if (!admin.did) {
        return NextResponse.json({ error: admin.error ?? 'Not signed in' }, { status: admin.status });
    }
    return NextResponse.json({ did: admin.did, isAdmin: admin.isAdmin });
}
