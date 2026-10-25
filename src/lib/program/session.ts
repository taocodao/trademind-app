import type { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { getPrivyUserId } from '@/lib/auth-helpers';
import { verifiedEmailFor } from '@/lib/verified-email';
import { ensureProgramTables } from './db';
import type { ParticipantState } from './rules';

export interface Participant extends ParticipantState {
    id: number; email: string; cohort: number; stripe_customer_id: string | null;
    founding_level: string | null; founding_interval: string | null; left_at: string | null;
}

/** The signed-in, Privy-verified email, or null. The browser cannot supply or change it. */
export async function verifiedEmail(req: NextRequest): Promise<string | null> {
    const did = await getPrivyUserId(req);
    return did ? verifiedEmailFor(did) : null;
}

export async function loadParticipant(email: string): Promise<Participant | null> {
    await ensureProgramTables();
    const { rows } = await pool.query(
        `SELECT p.*, COALESCE((SELECT array_agg(month ORDER BY month) FROM program_activity a WHERE a.participant_id = p.id), '{}') AS months
         FROM program_participant p WHERE p.email_norm = $1`, [email.toLowerCase()]
    );
    const r = rows[0];
    if (!r) return null;
    return {
        id: r.id, email: r.email_norm, cohort: r.cohort, path: r.path,
        started_at: new Date(r.started_at).toISOString(),
        completed_months: r.months ?? [],
        founding_selected_at: r.founding_selected_at ? new Date(r.founding_selected_at).toISOString() : null,
        paid_started_at: r.paid_started_at ? new Date(r.paid_started_at).toISOString() : null,
        stripe_customer_id: r.stripe_customer_id, founding_level: r.founding_level, founding_interval: r.founding_interval,
        left_at: r.left_at ? new Date(r.left_at).toISOString() : null,
    };
}
