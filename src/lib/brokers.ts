/**
 * Broker Registry — guided order-entry mapping per brokerage.
 *
 * Fidelity (and most retail brokers) expose no public order-entry API, so a
 * virtual-account order cannot be pushed to the broker programmatically.
 * Instead we give the user a guided, field-by-field card that maps each order
 * to the broker's trade ticket, plus an optional autofill script (bookmarklet /
 * console paste) that fills the live form in the user's own browser session.
 *
 * To add a brokerage: append a BrokerSpec with its ticket field labels and an
 * autofill() that targets that broker's DOM. Nothing else changes.
 */

/** Option contract details — present for option orders (e.g. QQQ LEAPS). */
export interface OptionSpec {
    expiry: string;              // e.g. '2027-01-15'
    strike: number;              // e.g. 650
    right: 'call' | 'put';
    openClose: 'open' | 'close'; // open = establish, close = exit
}

export interface BrokerOrder {
    symbol: string;
    action: 'buy' | 'sell';
    quantity: number;
    /** Reference price (signal fill or live). Shown for reference only. */
    price?: number | null;
    option?: OptionSpec;
}

export function isOptionOrder(o: BrokerOrder): boolean {
    return !!o.option;
}

export interface TicketField {
    /** The label as it appears on the broker's ticket. */
    label: string;
    /** The exact value the user should enter/select. */
    value: string;
    /** Optional hint. */
    hint?: string;
}

export interface BrokerSpec {
    key: string;
    name: string;
    /** URL of the broker's trade ticket. */
    tradeUrl: string;
    /** Trade-ticket category, e.g. "Stocks/ETFs". */
    tradeType: string;
    /** Build the ordered list of ticket fields for an order. */
    buildFields: (o: BrokerOrder) => TicketField[];
    /** Bookmarklet/console script that autofills the live ticket. */
    autofill: (o: BrokerOrder) => string;
}

// Format an ISO date (YYYY-MM-DD) as MM/DD/YYYY for the ticket.
function fmtExpiry(iso: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
}

// ─── Fidelity ────────────────────────────────────────────────────────────────
// Ticket: digital.fidelity.com/ftgw/digital/trade-equity (Stocks/ETFs)
// Fields: Symbol, Action (Buy/Sell), Quantity (Shares), Order type, Time in force.
// We always recommend a MARKET order, DAY time-in-force to mirror the signal fill.

const FIDELITY: BrokerSpec = {
    key: 'fidelity',
    name: 'Fidelity',
    tradeUrl: 'https://digital.fidelity.com/ftgw/digital/trade-equity',
    // Stocks/ETFs ticket; Options ticket at trade-options; Conditional at
    // trade-conditional (Limit/Stop/Trailing — not used by signals, which are Market).
    tradeType: 'Stocks/ETFs',
    buildFields: (o) => {
        if (o.option) {
            const opt = o.option;
            const action =
                opt.openClose === 'open'
                    ? (o.action === 'buy' ? 'Buy To Open' : 'Sell To Open')
                    : (o.action === 'buy' ? 'Buy To Close' : 'Sell To Close');
            const fields: TicketField[] = [
                { label: 'Trade', value: 'Options', hint: 'Ticket category' },
                { label: 'Symbol', value: o.symbol.toUpperCase() },
                { label: 'Action', value: action },
                { label: 'Quantity', value: String(o.quantity), hint: 'Contracts' },
                { label: 'Expiration', value: fmtExpiry(opt.expiry) },
                { label: 'Strike', value: String(opt.strike) },
                { label: 'Call/Put', value: opt.right === 'call' ? 'Call' : 'Put' },
                { label: 'Order type', value: 'Market', hint: 'Mirrors the signal fill' },
                { label: 'Time in force', value: 'Day' },
            ];
            if (o.price != null) fields.push({ label: 'Reference price', value: `$${o.price.toFixed(2)}`, hint: 'Signal fill (info only)' });
            return fields;
        }
        return [
            { label: 'Trade', value: 'Stocks/ETFs', hint: 'Ticket category (default)' },
            { label: 'Symbol', value: o.symbol.toUpperCase() },
            { label: 'Action', value: o.action === 'buy' ? 'Buy' : 'Sell' },
            { label: 'Quantity', value: String(o.quantity), hint: 'Shares' },
            { label: 'Order type', value: 'Market', hint: 'Mirrors the signal fill' },
            { label: 'Time in force', value: 'Day' },
        ];
    },
    autofill: (o) => {
        const sym = o.symbol.toUpperCase();
        const qty = String(o.quantity);
        const opt = o.option;
        const action = opt
            ? (opt.openClose === 'open' ? (o.action === 'buy' ? 'Buy To Open' : 'Sell To Open') : (o.action === 'buy' ? 'Buy To Close' : 'Sell To Close'))
            : (o.action === 'buy' ? 'Buy' : 'Sell');
        // Best-effort DOM autofill for the Fidelity ticket. Fidelity renders
        // comboboxes; we set the symbol input and try to choose the dropdowns by
        // their visible labels. The user must still review and press "Preview
        // order" — we never submit.
        const optLines = opt
            ? `  pick('action','${action}');pick('expir','${fmtExpiry(opt.expiry)}');pick('strike','${opt.strike}');pick('call','${opt.right === 'call' ? 'Call' : 'Put'}');pick('order','Market');pick('time','Day');`
            : `  pick('action','${action}');pick('order','Market');pick('time','Day');`;
        return `javascript:(function(){
  function setVal(el,v){if(!el)return;el.focus();el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.blur();}
  var sym=document.querySelector('input[placeholder*="ymbol" i],input[aria-label*="ymbol" i],input[id*="symbol" i]');
  setVal(sym,'${sym}');
  function pick(name,val){var els=document.querySelectorAll('select,[role="combobox"]');for(var i=0;i<els.length;i++){var e=els[i];var lab=(e.getAttribute('aria-label')||e.name||e.id||'').toLowerCase();if(lab.indexOf(name)>-1){try{e.value=val;e.dispatchEvent(new Event('change',{bubbles:true}));}catch(_){}}}}
${optLines}
  var q=document.querySelector('input[aria-label*="uantity" i],input[id*="quantity" i],input[name*="quantity" i]');
  setVal(q,'${qty}');
  alert('TradeMind: attempted to prefill ${sym} ${action} ${qty} (Market/Day). Please REVIEW, then Preview order.');
})();`;
    },
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const BROKERS: BrokerSpec[] = [FIDELITY];

export function getBroker(key: string): BrokerSpec | undefined {
    return BROKERS.find((b) => b.key.toLowerCase() === key.toLowerCase());
}
