/**
 * Broker-neutral order instructions.
 *
 * TradeMind provides the values needed to enter an order, but never connects
 * to or submits an order to a customer's brokerage.
 */

export interface OptionContractDetails {
    underlying: string;
    strike: number;
    expiry: string;
    right: 'call' | 'put';
}

export interface UniversalOrderInput {
    accountName?: string;
    action: string;
    symbol: string;
    quantity: number;
    instrumentType?: 'Stock/ETF' | 'Equity Option' | 'Equity';
    referencePrice?: number | null;
    priceEffect?: 'Debit' | 'Credit';
    option?: OptionContractDetails;
}

export interface UniversalOrderInstruction {
    text: string;
    html: string;
}

/**
 * Produces one complete order-entry instruction in text and email-safe HTML.
 * The result deliberately uses no brokerage names or brokerage-specific steps.
 */
export function buildUniversalOrderInstruction(order: UniversalOrderInput): UniversalOrderInstruction {
    const option = order.option || parseOptionContract(order.symbol);
    const isOption = order.instrumentType === 'Equity Option' || !!option;
    const instrument = isOption ? 'Equity Option' : 'Stock/ETF';
    const action = normalizeAction(order.action, isOption);
    const quantity = Math.max(0, Number(order.quantity) || 0);
    const quantityLabel = `${formatQuantity(quantity)} ${isOption ? (quantity === 1 ? 'contract' : 'contracts') : (quantity === 1 ? 'share' : 'shares')}`;
    const referencePrice = isUsablePrice(order.referencePrice) ? formatCurrency(order.referencePrice!) : 'Unavailable';
    const effect = order.priceEffect || (action.toLowerCase().startsWith('sell') ? 'Credit' : 'Debit');
    const estimatedAmount = isUsablePrice(order.referencePrice)
        ? formatCurrency(order.referencePrice! * quantity * (isOption ? 100 : 1))
        : 'Unavailable';
    const contract = option
        ? `${option.underlying} $${formatNumber(option.strike)} ${option.right === 'call' ? 'Call' : 'Put'} exp ${formatExpiry(option.expiry)}`
        : order.symbol.toUpperCase();
    const accountName = order.accountName?.trim() || 'This TradeMind account';

    const fields: Array<[string, string]> = [
        ['Account', accountName],
        ['Instrument', instrument],
        ['Action', action],
        [isOption ? 'Contract' : 'Symbol', contract],
        ['Quantity', quantityLabel],
        ['Order type', 'Limit at mid'],
        ['Reference price', referencePrice],
        [`Estimated ${effect.toLowerCase()}`, estimatedAmount],
    ];

    const text = [
        'Enter this order at your brokerage.',
        ...fields.map(([label, value]) => `${label}: ${value}`),
    ].join('\n');

    const htmlRows = fields.map(([label, value]) => `
            <tr>
                <td style="padding:4px 12px 4px 0;color:#6b7280;font-size:12px;vertical-align:top">${escapeHtml(label)}</td>
                <td style="padding:4px 0;color:#111827;font-size:13px;font-weight:600;vertical-align:top">${escapeHtml(value)}</td>
            </tr>`).join('');

    const html = `
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px 16px;margin:6px 0 14px">
            <p style="margin:0 0 9px;color:#111827;font-size:13px;font-weight:700">Enter this order at your brokerage.</p>
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">
                <tbody>${htmlRows}</tbody>
            </table>
        </div>`;

    return { text, html };
}

function normalizeAction(action: string, isOption: boolean): string {
    const normalized = action.trim().replace(/\s+/g, ' ').toLowerCase();
    if (normalized === 'buy to open') return 'Buy to Open';
    if (normalized === 'sell to close') return 'Sell to Close';
    if (normalized === 'buy to close') return 'Buy to Close';
    if (normalized === 'sell to open') return 'Sell to Open';
    if (normalized === 'sell') return 'Sell';
    if (normalized === 'buy') return isOption ? 'Buy to Open' : 'Buy';
    return action.trim() || (isOption ? 'Buy to Open' : 'Buy');
}

export function parseOptionContract(symbol: string): OptionContractDetails | null {
    const compact = /^([A-Z.]+)_(\d{4})(\d{2})(\d{2})([CP])(\d+(?:\.\d+)?)$/i.exec(symbol);
    if (compact) {
        return {
            underlying: compact[1].toUpperCase(),
            expiry: `${compact[2]}-${compact[3]}-${compact[4]}`,
            strike: Number(compact[6]),
            right: compact[5].toUpperCase() === 'C' ? 'call' : 'put',
        };
    }

    const occ = /^([A-Z.]{1,6})\s*(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/i.exec(symbol);
    if (occ) {
        return {
            underlying: occ[1].toUpperCase(),
            expiry: `20${occ[2]}-${occ[3]}-${occ[4]}`,
            strike: Number(occ[6]) / 1000,
            right: occ[5].toUpperCase() === 'C' ? 'call' : 'put',
        };
    }

    return null;
}

function isUsablePrice(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function formatQuantity(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function formatNumber(value: number): string {
    return value.toLocaleString('en-US', { maximumFractionDigits: 3 });
}

function formatCurrency(value: number): string {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatExpiry(value: string): string {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
