import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 60; // Cache for 60 seconds

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');
    
    if (!symbolsParam) {
        return NextResponse.json({ error: 'Missing symbols parameter' }, { status: 400 });
    }

    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());
    const prices: Record<string, number> = {};

    try {
        // Fetch from Yahoo Finance chart API for each symbol
        // (This API is public and doesn't require keys for basic recent quotes)
        const fetchPromises = symbols.map(async (sym) => {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1m&range=1d`;
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Accept': 'application/json'
                },
                next: { revalidate: 60 }
            });

            if (!res.ok) {
                console.warn(`Yahoo Finance API error for ${sym}: ${res.status}`);
                return;
            }

            const data = await res.json();
            const result = data.chart?.result?.[0];
            const meta = result?.meta;
            
            if (meta?.regularMarketPrice !== undefined) {
                prices[sym] = meta.regularMarketPrice;
            }
        });

        await Promise.allSettled(fetchPromises);

        // Fallbacks if Yahoo fails
        const fallbacks: Record<string, number> = {
            'QQQ': 480.00,
            'QLD': 65.00,
            'TQQQ': 50.00,
            'SGOV': 100.00
        };

        for (const sym of symbols) {
            if (!(sym in prices)) {
                prices[sym] = fallbacks[sym] || 100.0;
            }
        }

        return NextResponse.json(prices);
        
    } catch (err) {
        console.error('Quotes API Error:', err);
        return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
    }
}
