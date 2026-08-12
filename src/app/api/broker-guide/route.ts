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

// Cropped Fidelity ticket template dimensions.
const STOCKS = { w: 1270, h: 564, img: 'fidelity-stocks.jpg' };
const OPTIONS = { w: 1243, h: 502, img: 'fidelity-options.jpg' };
const GUTTER = 400; // left gutter for value cards

// Field pointer positions as fractions of the TICKET (not the full canvas).
const STOCKS_FIELDS: Record<string, [number, number]> = {
    symbol:    [0.155, 0.310],
    action:    [0.133, 0.470],
    quantity:  [0.265, 0.470],
    orderType: [0.485, 0.470],
    tif:       [0.098, 0.560],
};
const OPTIONS_FIELDS: Record<string, [number, number]> = {
    trade:     [0.060, 0.082],   // "Trade" dropdown (Options)
    account:   [0.192, 0.082],   // "Account" dropdown
    underlying:[0.052, 0.193],   // "Symbol" input
    action:    [0.060, 0.496],
    quantity:  [0.145, 0.496],
    expiration:[0.235, 0.496],
    strike:    [0.335, 0.496],
    callput:   [0.422, 0.496],
    orderType: [0.076, 0.631],
    tif:       [0.216, 0.631],
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
    const actionRaw = (sp.get('action') || 'buy').toLowerCase();
    const quantity = Math.max(1, Math.floor(Number(sp.get('quantity')) || 1));

    // Option contract params (present => render the Options ticket)
    const expiry = sp.get('expiry') || '';        // YYYY-MM-DD
    const strike = sp.get('strike') || '';        // e.g. '470'
    const right = (sp.get('right') || 'call').toLowerCase();   // call|put
    const openClose = (sp.get('openclose') || 'open').toLowerCase(); // open|close
    const isOption = !!(expiry && strike);

    if (!symbol) return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    if (broker !== 'fidelity') return NextResponse.json({ error: `Unsupported broker: ${broker}` }, { status: 400 });

    const fmtExpiry = (iso: string) => {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
        return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
    };

    let ticket = STOCKS;
    let values: Array<[string, string, string, [number, number]]>;

    if (isOption) {
        ticket = OPTIONS;
        const isBuy = actionRaw !== 'sell';
        const action = openClose === 'close'
            ? (isBuy ? 'Buy To Close' : 'Sell To Close')
            : (isBuy ? 'Buy To Open' : 'Sell To Open');
        values = [
            ['1', 'Trade', 'Options', OPTIONS_FIELDS.trade],
            ['2', 'Account', 'Your account', OPTIONS_FIELDS.account],
            ['3', 'Underlying', symbol, OPTIONS_FIELDS.underlying],
            ['4', 'Action', action, OPTIONS_FIELDS.action],
            ['5', 'Quantity', `${quantity} contract${quantity !== 1 ? 's' : ''}`, OPTIONS_FIELDS.quantity],
            ['6', 'Expiration', fmtExpiry(expiry), OPTIONS_FIELDS.expiration],
            ['7', 'Strike', `$${strike}`, OPTIONS_FIELDS.strike],
            ['8', 'Call/Put', right === 'put' ? 'Put' : 'Call', OPTIONS_FIELDS.callput],
            ['9', 'Order type', 'Market', OPTIONS_FIELDS.orderType],
            ['10', 'Time in force', 'Day', OPTIONS_FIELDS.tif],
        ];
    } else {
        const action = actionRaw === 'sell' ? 'Sell' : 'Buy';
        values = [
            ['1', 'Symbol', symbol, STOCKS_FIELDS.symbol],
            ['2', 'Action', action, STOCKS_FIELDS.action],
            ['3', 'Quantity', String(quantity), STOCKS_FIELDS.quantity],
            ['4', 'Order type', 'Market', STOCKS_FIELDS.orderType],
            ['5', 'Time in force', 'Day', STOCKS_FIELDS.tif],
        ];
    }

    const TICKET_W = ticket.w;
    const TICKET_H = ticket.h;
    const W = TICKET_W + GUTTER;
    const H = TICKET_H;
    const imgHref = `${BASE_URL}/broker-guides/${ticket.img}`;

    // Value-card stack geometry (adaptive so 8 option fields fit the shorter ticket)
    const n = values.length;
    const gap = Math.max(6, Math.round(H * 0.02));
    const cardH = Math.min(Math.round(H * 0.16), Math.round((H - (n - 1) * gap - 20) / n));
    const top = Math.round((H - (n * cardH + (n - 1) * gap)) / 2);
    const cardX = Math.round(GUTTER * 0.07);
    const cardW = Math.round(GUTTER * 0.86);
    const badgeR = Math.round(H * (isOption ? 0.032 : 0.040));

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
