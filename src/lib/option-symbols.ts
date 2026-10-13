/**
 * Virtual option contract symbols: UNDERLYING_YYYYMMDD{C|P}{strike, 5 digits}
 * e.g. QQQ_20280121C00760. Pure helpers shared by the ledger, lots and executor.
 */

export interface ParsedOptionSymbol {
    underlying: string;
    expiry: string; // YYYY-MM-DD
    right: 'C' | 'P';
    strike: number;
}

export function buildOptionSymbol(underlying: string, expiry: string, right: 'C' | 'P', strike: number): string {
    const ymd = expiry.replace(/-/g, '');
    const strikeInt = Math.round(strike);
    return `${underlying}_${ymd}${right}${String(strikeInt).padStart(5, '0')}`;
}

export function parseOptionSymbol(symbol: string | null | undefined): ParsedOptionSymbol | null {
    if (!symbol) return null;
    const m = /^([A-Z.]+)_(\d{4})(\d{2})(\d{2})([CP])(\d+)$/.exec(symbol);
    if (!m) return null;
    return {
        underlying: m[1],
        expiry: `${m[2]}-${m[3]}-${m[4]}`,
        right: m[5] as 'C' | 'P',
        strike: parseInt(m[6], 10),
    };
}

/** Option rows are recognized by their contract-style symbol. */
export function isOptionSymbol(symbol: string | null | undefined): boolean {
    if (!symbol) return false;
    return /^[A-Z.]+_\d{8}[CP]\d/.test(symbol) || /^[A-Z.]+_?\d{4}-\d{2}-\d{2}[CP]\d/.test(symbol);
}

/** A long call on the given underlying (the instrument the lot engine manages). */
export function isCallSymbol(symbol: string | null | undefined, underlying = 'QQQ'): boolean {
    const p = parseOptionSymbol(symbol);
    return !!p && p.right === 'C' && p.underlying === underlying;
}
