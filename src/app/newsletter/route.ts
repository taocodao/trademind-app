import { NextRequest } from 'next/server';
import { ISSUES } from '@/lib/newsletter/issues';
import { libraryPage } from '@/lib/newsletter/library-page';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The newsletter home: the current issue in the new format, shown as a sample with a free weekly subscribe. */
export async function GET(req: NextRequest) {
    return libraryPage(req, ISSUES[ISSUES.length - 1], { sample: true });
}
