/**
 * The email Privy has on file for a login, asked of Privy's server API with the app secret.
 * Returns null when the secret is not configured or Privy has no email. There is deliberately no fallback to
 * an email supplied by the browser: anything tied to an email address (offers, program access) needs this.
 */
export async function verifiedEmailFor(did: string): Promise<string | null> {
    const secret = process.env.PRIVY_APP_SECRET;
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    if (!secret || !appId) return null;
    try {
        const res = await fetch(`https://auth.privy.io/api/v1/users/${encodeURIComponent(did)}`, {
            headers: { Authorization: `Basic ${Buffer.from(`${appId}:${secret}`).toString('base64')}`, 'privy-app-id': appId },
        });
        if (!res.ok) return null;
        const u = (await res.json()) as { linked_accounts?: Array<{ type?: string; address?: string; email?: string }> };
        const a = u.linked_accounts?.find((x) => x.type === 'email' || x.type === 'google_oauth');
        return (a?.address || a?.email || null)?.toLowerCase() ?? null;
    } catch {
        return null;
    }
}
