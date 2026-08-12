import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/broker-guide?broker=fidelity&symbol=QQQ&action=buy&quantity=25
 *
 * Renders the annotated broker-ticket guide as an SVG: the broker's ticket
 * screenshot with numbered pointers over each field and the exact value to type.
 * Pure SVG (no native deps), so it runs on Vercel's Node runtime.
 *
 * The base ticket image is served from /broker-guides/fidelity-stocks.jpg and
 * referenced by absolute URL so it renders both in-app and in emails.
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trademind.bot';

// Cropped Fidelity Stocks/ETFs ticket template dimensions (1270x564).
const TICKET_W = 1270;
const TICKET_H = 564;
const GUTTER = 400; // left gutter for value cards
const W = TICKET_W + GUTTER;
const H = TICKET_H;

// Field pointer positions as fractions of the TICKET (not the full canvas).
const FIELDS: Record<string, [number, number]> = {
    symbol:    [0.155, 0.310],
    action:    [0.133, 0.470],
    quantity:  [0.265, 0.470],
    orderType: [0.485, 0.470],
    tif:       [0.098, 0.560],
};

const ACCENT = '#10a34a';
const DARK = '#111827';
const MUTED = '#6b7280';

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    const broker = (sp.get('broker') || 'fidelity').toLowerCase();
    const symbol = (sp.get('symbol') || '').toUpperCase();
    const action = (sp.get('action') || 'buy').toLowerCase() === 'sell' ? 'sell' : 'buy';
    const quantity = Math.max(1, Math.floor(Number(sp.get('quantity')) || 1));

    if (!symbol) return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    if (broker !== 'fidelity') return NextResponse.json({ error: `Unsupported broker: ${broker}` }, { status: 400 });

    const values: Array<[string, string, string, [number, number]]> = [
        ['1', 'Symbol', symbol, FIELDS.symbol],
        ['2', 'Action', action === 'buy' ? 'Buy' : 'Sell', FIELDS.action],
        ['3', 'Quantity', String(quantity), FIELDS.quantity],
        ['4', 'Order type', 'Market', FIELDS.orderType],
        ['5', 'Time in force', 'Day', FIELDS.tif],
    ];

    const imgHref = `${BASE_URL}/broker-guides/fidelity-stocks.jpg`;

    // Value-card stack geometry
    const n = values.length;
    const cardH = Math.round(H * 0.16);
    const gap = Math.round(H * 0.04);
    const top = Math.round((H - (n * cardH + (n - 1) * gap)) / 2);
    const cardX = Math.round(GUTTER * 0.07);
    const cardW = Math.round(GUTTER * 0.86);
    const badgeR = Math.round(H * 0.040);

    let overlay = '';
    values.forEach(([num, label, value, [fx, fy]], i) => {
        const cx = GUTTER + Math.round(fx * TICKET_W);
        const cy = Math.round(fy * TICKET_H);
        const cardY = top + i * (cardH + gap);
        const cardMid = cardY + Math.round(cardH / 2);

        // pointer line from card to field
        overlay += `<line x1="${cardX + cardW}" y1="${cardMid}" x2="${cx}" y2="${cy}" stroke="${ACCENT}" stroke-width="3"/>`;
        // numbered badge on the field
        overlay += `<circle cx="${cx}" cy="${cy}" r="${badgeR}" fill="${ACCENT}" stroke="#ffffff" stroke-width="3"/>`;
        overlay += `<text x="${cx}" y="${cy + Math.round(badgeR * 0.36)}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${Math.round(badgeR * 1.1)}" font-weight="700" fill="#ffffff">${num}</text>`;
        // value card
        overlay += `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="10" fill="#ffffff" stroke="${ACCENT}" stroke-width="2"/>`;
        overlay += `<text x="${cardX + 16}" y="${cardY + Math.round(cardH * 0.32)}" font-family="Arial,Helvetica,sans-serif" font-size="${Math.round(H * 0.032)}" fill="${MUTED}">${num}. ${esc(label)}</text>`;
        overlay += `<text x="${cardX + 16}" y="${cardY + Math.round(cardH * 0.74)}" font-family="Arial,Helvetica,sans-serif" font-size="${Math.round(H * 0.046)}" font-weight="700" fill="${DARK}">${esc(value)}</text>`;
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f5f5f5"/>
  <image x="${GUTTER}" y="0" width="${TICKET_W}" height="${TICKET_H}" href="${imgHref}" xlink:href="${imgHref}"/>
  ${overlay}
</svg>`;

    return new NextResponse(svg, {
        status: 200,
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
    });
}
