/**
 * Lead list import API
 *
 * Accepts a CSV export in the zip-10024-1010-records template shape.
 * The `leads` table keeps the exact source column names (quoted identifiers).
 * Columns that are entirely empty or entirely "Not Available" in the file
 * are dropped from the table. Email (stored lowercase) is the primary key:
 * re-importing a file upserts every row, so re-runs are safe.
 *
 * Import batch naming: the form "title" field wins; otherwise the uploaded
 * file's name (minus extension) is used, matching how the source file is
 * named (e.g. zip-10024-1010-records).
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { resolveAdmin } from '@/lib/admin-gate';
import { LEAD_COLUMNS, TEMPLATE_SKIPPED_COLUMNS } from '@/lib/leads-columns';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Gate: full server-side verification (token signature + Privy email). */
async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
    const admin = await resolveAdmin(req);
    if (admin.status === 200) return null;
    return NextResponse.json({ error: admin.error ?? 'Forbidden' }, { status: admin.status });
}

const EMAIL_HEADER = 'Email';
const CONCURRENCY = 8; // stay under the pg pool max (10)

// ── Ensure table ─────────────────────────────────────────────────────────────
let tableReady = false;
async function ensureTable() {
    if (tableReady) return;
    const cols = LEAD_COLUMNS
        .map((c) => (c === EMAIL_HEADER ? '"Email" TEXT NOT NULL' : `"${c}" TEXT`))
        .join(',\n            ');
    await query(`
        CREATE TABLE IF NOT EXISTS leads (
            ${cols},
            import_batch TEXT,
            imported_at  TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY ("Email")
        )
    `);
    tableReady = true;
}

// ── Minimal RFC-4180 CSV parser (handles quotes, commas, newlines) ───────────
function parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    if (text.charCodeAt(0) === 0xfeff) i = 1; // strip BOM
    for (; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else field += ch;
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            row.push(field); field = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(field); field = '';
            if (row.length > 1 || row[0] !== '') rows.push(row);
            row = [];
        } else field += ch;
    }
    if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
    return rows;
}

function empty(v: string | undefined): boolean {
    return !v || !v.trim();
}
function notAvailable(v: string): boolean {
    return v.trim().toLowerCase().startsWith('not available');
}

export async function POST(req: NextRequest) {
    try {
        const denied = await requireAdmin(req);
        if (denied) return denied;

        const form = await req.formData();
        const file = form.get('file') as File | null;
        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

        const batch =
            ((form.get('title') as string | null) ?? '').trim() ||
            file.name.replace(/\.[^.]+$/, '');

        const text = await file.text();
        const parsed = parseCSV(text);
        if (parsed.length < 2) {
            return NextResponse.json({ error: 'CSV has a header but no data rows' }, { status: 400 });
        }

        const headers = parsed[0].map((h) => h.trim());
        if (!headers.includes(EMAIL_HEADER)) {
            return NextResponse.json({ error: 'CSV is missing the "Email" column' }, { status: 400 });
        }
        const idx = new Map(headers.map((h, i) => [h, i]));

        // Only import columns the table actually has (template columns that
        // were skipped at table creation are ignored, unknown ones too).
        const importable = LEAD_COLUMNS.filter((c) => idx.has(c));
        const dataRows = parsed.slice(1);

        // Drop columns that are all empty or all "Not Available" in THIS file
        // (only relevant for the table's first creation; rows store nulls).
        const active = importable.filter((c) => {
            const i = idx.get(c)!;
            return dataRows.some((r) => !empty(r[i]) && !notAvailable(r[i]));
        });
        const skippedHere = importable.filter((c) => !active.includes(c));

        await ensureTable();

        let inserted = 0;
        let updated = 0;
        const skippedRows: { line: number; reason: string }[] = [];
        const seen = new Set<string>();

        const colList = active.map((c) => `"${c}"`).join(', ');
        const updateList = active
            .filter((c) => c !== EMAIL_HEADER)
            .map((c) => `"${c}" = EXCLUDED."${c}"`)
            .join(', ');
        const insertSQL = `
            INSERT INTO leads (${colList}, import_batch)
            VALUES (${active.map((_, j) => `$${j + 1}`).join(', ')}, $${active.length + 1})
            ON CONFLICT ("Email") DO UPDATE SET ${updateList}, import_batch = EXCLUDED.import_batch, imported_at = NOW()
            RETURNING (xmax = 0) AS inserted_flag
        `;

        // Build the upsert jobs first (dedupe + validate), then run them
        // CONCURRENCY at a time so a 1k-row file fits the function timeout.
        const jobs: { line: number; values: (string | null)[] }[] = [];
        for (let k = 0; k < dataRows.length; k++) {
            const r = dataRows[k];
            const line = k + 2; // 1-based, +1 for header
            const rawEmail = r[idx.get(EMAIL_HEADER)!];
            if (empty(rawEmail)) {
                skippedRows.push({ line, reason: 'missing email' });
                continue;
            }
            const email = rawEmail.trim().toLowerCase();
            if (seen.has(email)) {
                skippedRows.push({ line, reason: 'duplicate email in file' });
                continue;
            }
            seen.add(email);
            const values = active.map((c) => {
                const v = (r[idx.get(c)!] ?? '').trim();
                if (c === EMAIL_HEADER) return email;
                if (v === '' || notAvailable(v)) return null;
                return v;
            });
            jobs.push({ line, values });
        }
        for (let start = 0; start < jobs.length; start += CONCURRENCY) {
            const results = await Promise.all(
                jobs.slice(start, start + CONCURRENCY).map((j) => query(insertSQL, [...j.values, batch]))
            );
            for (const res of results) {
                if (res.rows[0]?.inserted_flag) inserted++;
                else updated++;
            }
        }

        return NextResponse.json({
            batch,
            totalRows: dataRows.length,
            inserted,
            updated,
            skippedRows,
            columnsImported: active.length,
            columnsSkippedThisFile: skippedHere,
            templateSkippedColumns: TEMPLATE_SKIPPED_COLUMNS,
        });
    } catch (err) {
        console.error('[leads/import POST]', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Import failed' },
            { status: 500 }
        );
    }
}

/** GET /api/leads/import — quick stats for the admin import page */
export async function GET(req: NextRequest) {
    try {
        const denied = await requireAdmin(req);
        if (denied) return denied;

        await ensureTable();
        const [total, batches] = await Promise.all([
            query(`SELECT COUNT(*)::int AS n FROM leads`),
            query(`
                SELECT import_batch AS batch, COUNT(*)::int AS n, MAX(imported_at) AS last_import
                FROM leads GROUP BY import_batch ORDER BY last_import DESC LIMIT 20
            `),
        ]);
        return NextResponse.json({ total: total.rows[0].n, batches: batches.rows });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load stats' },
            { status: 500 }
        );
    }
}
