/** The email address a Privy user signed in with (email login, or the email on a linked Google account). */
export function loginEmailOf(user: unknown): string | null {
    const u = user as { email?: { address?: string }; google?: { email?: string }; linkedAccounts?: Array<{ type?: string; address?: string; email?: string }> } | null | undefined;
    const direct = u?.email?.address || u?.google?.email;
    if (direct) return direct.trim();
    const linked = u?.linkedAccounts?.find((a) => a.type === 'email' || a.type === 'google_oauth');
    const v = linked?.address || linked?.email;
    return v ? v.trim() : null;
}

export const sameEmail = (a: string | null | undefined, b: string | null | undefined) =>
    !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
