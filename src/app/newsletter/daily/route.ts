import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** The daily brief is retired. Old links go to the current weekly issue. */
export async function GET(req: NextRequest) {
    return NextResponse.redirect(new URL(`/newsletter/current${req.nextUrl.search}`, req.nextUrl.origin), 308);
}
