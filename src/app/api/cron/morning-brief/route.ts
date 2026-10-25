import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Retired. This route used to store a morning brief built from placeholder values (a fixed regime and
 * confidence), not from the real model. Briefings will come from the locked facts record in the new
 * daily briefing engine, so this route now does nothing.
 */
export async function GET() {
  return NextResponse.json({ error: 'Retired: briefings now come from the facts record.' }, { status: 410 });
}
