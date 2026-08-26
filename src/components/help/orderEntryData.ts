/**
 * Broker order-entry walkthrough data for the help section.
 *
 * Sources: docs/broker-help-research.md (approval levels from the Aug 2026
 * deep-research pass; verbatim UI labels fetched from each broker's official
 * help pages Aug 25, 2026). Broker UIs change often: re-verify labels
 * quarterly against the official source URL listed per flow.
 */

export type OrderTypeKey = 'leaps' | 'pmcc' | 'roll' | 'etf';

export interface OrderTypeInfo {
    key: OrderTypeKey;
    label: string;
    example: string;
    strategies: string;
}

export const ORDER_TYPES: OrderTypeInfo[] = [
    {
        key: 'leaps',
        label: 'LEAPS entry',
        example: 'Buy to open 1 QQQ Jan 21 2028 700 Call, limit $52.40',
        strategies: 'QQQ LEAPS',
    },
    {
        key: 'pmcc',
        label: 'PMCC overlay',
        example: 'Sell to open 1 QQQ Sep 30 2026 780 Call, limit $5.40',
        strategies: 'QQQ LEAPS',
    },
    {
        key: 'roll',
        label: 'Rolling the short call',
        example: 'Buy to close 1 QQQ Sep 30 780 Call, then sell to open 1 QQQ Oct 30 790 Call',
        strategies: 'QQQ LEAPS',
    },
    {
        key: 'etf',
        label: 'ETF rebalance',
        example: 'Buy 35 shares of QQQ, limit $707.50',
        strategies: 'QQQ Basic',
    },
];

export interface BrokerChecklist {
    approval: string;
    account: string;
    ira: string;
}

export interface BrokerInfo {
    key: string;
    name: string;
    friction: 'smooth' | 'moderate' | 'high';
    frictionNote: string;
    checklist: Record<OrderTypeKey, BrokerChecklist>;
    officialLinks: { label: string; url: string }[];
}

export const BROKERS: BrokerInfo[] = [
    {
        key: 'schwab',
        name: 'Charles Schwab',
        friction: 'smooth',
        frictionNote:
            'The PMCC is approved at Level 2 (Spreads), the second-lowest tier, and Level 2 is available inside IRAs. The smoothest path for the QQQ LEAPS strategy.',
        checklist: {
            leaps: {
                approval: 'Options Level 1 (Long)',
                account: 'Cash or margin',
                ira: 'Works in an IRA',
            },
            pmcc: {
                approval: 'Options Level 2 (Spreads). The short call against your LEAPS is treated as a diagonal spread.',
                account: 'Cash or margin',
                ira: 'Works in an IRA (only Level 3 is blocked there)',
            },
            roll: {
                approval: 'Options Level 2 (Spreads)',
                account: 'Cash or margin',
                ira: 'Works in an IRA',
            },
            etf: {
                approval: 'No options approval needed',
                account: 'Any account',
                ira: 'Works in an IRA',
            },
        },
        officialLinks: [
            { label: 'Schwab: how to place an options trade', url: 'https://www.schwab.com/content/how-to-place-an-options-trade' },
            { label: 'Schwab: options chain and Trade Builder', url: 'https://www.schwab.com/content/how-to-use-options-chain-and-trade-builder' },
        ],
    },
    {
        key: 'tastytrade',
        name: 'tastytrade',
        friction: 'smooth',
        frictionNote:
            'The whole PMCC can be entered as one diagonal spread order with a single net price. IRAs are margin-provisioned by default, so defined-risk spreads work without extra applications.',
        checklist: {
            leaps: {
                approval: 'Basic options tier',
                account: 'Cash or margin',
                ira: 'Works in an IRA',
            },
            pmcc: {
                approval: 'Basic tier with a margin account',
                account: 'Margin account',
                ira: 'Works in an IRA (margin-provisioned by default)',
            },
            roll: {
                approval: 'Basic tier with a margin account',
                account: 'Margin account',
                ira: 'Works in an IRA',
            },
            etf: {
                approval: 'No options approval needed',
                account: 'Any account',
                ira: 'Works in an IRA',
            },
        },
        officialLinks: [
            { label: 'tastytrade: long call diagonal spread walkthrough', url: 'https://tastytrade.com/learn/trading-products/options/long-call-diagonal-spread/' },
            { label: 'tastytrade: trading permissions', url: 'https://tastytrade.com/learn/accounts/account-resources/trading-permissions/' },
        ],
    },
    {
        key: 'fidelity',
        name: 'Fidelity',
        friction: 'moderate',
        frictionNote:
            'The PMCC needs Tier 2 plus the margin feature, and Fidelity\u2019s collateral check can misfire: if it does not recognize your LEAPS as coverage, it may reject the short call as naked. The fix is below.',
        checklist: {
            leaps: {
                approval: 'Options Level 1',
                account: 'Cash or margin',
                ira: 'Works in an IRA',
            },
            pmcc: {
                approval: 'Tier 2 options plus the margin feature enabled',
                account: 'Margin feature required (IRAs: apply for limited margin)',
                ira: 'Works in an IRA via limited margin',
            },
            roll: {
                approval: 'Tier 2 options plus the margin feature',
                account: 'Margin feature required',
                ira: 'Works in an IRA via limited margin',
            },
            etf: {
                approval: 'No options approval needed',
                account: 'Any account',
                ira: 'Works in an IRA',
            },
        },
        officialLinks: [
            { label: 'Fidelity: how to trade options in Trader+ Web', url: 'https://www.fidelity.com/learning-center/trading-investing/trading-platforms/how-to-trade-options-trader-plus-web' },
            { label: 'Fidelity: trading options help', url: 'https://www.fidelity.com/webcontent/ap002390-mlo-content/18.04/help/learn_trading_options.shtml' },
        ],
    },
    {
        key: 'robinhood',
        name: 'Robinhood',
        friction: 'moderate',
        frictionNote:
            'The PMCC requires a margin account plus Level 3 options. On a cash account the short call is rejected unless you hold 100 actual shares of QQQ.',
        checklist: {
            leaps: {
                approval: 'Options Level 2',
                account: 'Cash or margin',
                ira: 'Check current IRA options support in the app',
            },
            pmcc: {
                approval: 'Options Level 3',
                account: 'Margin account required (cash accounts need 100 real shares of QQQ instead)',
                ira: 'Not confirmed; verify in the app before relying on it',
            },
            roll: {
                approval: 'Options Level 3',
                account: 'Margin account required',
                ira: 'Not confirmed; verify in the app',
            },
            etf: {
                approval: 'No options approval needed',
                account: 'Any account',
                ira: 'Works in an IRA',
            },
        },
        officialLinks: [
            { label: 'Robinhood: placing an options trade', url: 'https://robinhood.com/us/en/support/articles/placing-an-options-trade/' },
            { label: 'Robinhood: options strategy builder', url: 'https://robinhood.com/us/en/support/articles/about-the-options-strategy-builder/' },
        ],
    },
    {
        key: 'ibkr',
        name: 'Interactive Brokers',
        friction: 'high',
        frictionNote:
            'IBKR classifies the PMCC as a diagonal spread where the long leg expires first, which requires Level 4, its highest options tier. If you already trade at Level 4 it is fine; otherwise Schwab or tastytrade is far less friction for this strategy.',
        checklist: {
            leaps: {
                approval: 'Options Level 2 (Long Call)',
                account: 'Cash or margin',
                ira: 'Works in an IRA',
            },
            pmcc: {
                approval: 'Options Level 4 (diagonal spread, long leg expires first)',
                account: 'Margin account implied by the Level 4 classification',
                ira: 'Not confirmed; verify with IBKR before relying on it',
            },
            roll: {
                approval: 'Options Level 4',
                account: 'Margin account',
                ira: 'Not confirmed; verify with IBKR',
            },
            etf: {
                approval: 'No options approval needed',
                account: 'Any account',
                ira: 'Works in an IRA',
            },
        },
        officialLinks: [
            { label: 'IBKR: Client Portal options trading', url: 'https://www.interactivebrokers.com/campus/trading-lessons/portal-options-trading/' },
            { label: 'IBKR: options on IBKR Mobile', url: 'https://www.interactivebrokers.com/campus/trading-lessons/options-on-the-iphone/' },
        ],
    },
];

export interface FlowStep {
    title: string;
    detail: string;
    chips?: string[];
    note?: string;
}

export interface BrokerFlow {
    brokerKey: string;
    orderType: OrderTypeKey;
    platform: string;
    source: string;
    steps: FlowStep[];
}

export const FLOWS: BrokerFlow[] = [
    // ─── Charles Schwab ────────────────────────────────────────────────
    {
        brokerKey: 'schwab',
        orderType: 'leaps',
        platform: 'Schwab.com (web)',
        source: 'https://www.schwab.com/content/how-to-place-an-options-trade',
        steps: [
            { title: 'Open the options ticket', detail: 'Click Trade in the top menu, then select Options.', chips: ['Trade', 'Options'] },
            { title: 'Look up QQQ', detail: 'Enter QQQ as the underlying, then open the Strategy drop-down and select Call.', chips: ['QQQ', 'Strategy', 'Call'] },
            { title: 'Pick the expiration', detail: 'Click the chains icon and choose the expiration from your signal email. LEAPS expirations are in January, more than a year out.', chips: ['Chains', 'Jan 21, 2028'] },
            { title: 'Find the strike', detail: 'Strike prices run down the center column, with Calls on the left and Puts on the right. Stay on the Calls side.', chips: ['Calls', 'Strike 700'] },
            { title: 'Select the contract', detail: 'Click in the bid or ask area of your strike row. This loads the contract into the order ticket.' },
            { title: 'Fill the ticket', detail: 'Set Action to Buy to Open, Quantity to the contract count from your email, Order Type to Limit, and enter the limit price from the email. Set Timing to Day.', chips: ['Buy to Open', 'Qty 1', 'Limit', '$52.40', 'Day'] },
            { title: 'Review and place', detail: 'Click Review Order, check that the action, strike, expiration, and price match your email, then click Place Order.', chips: ['Review Order', 'Place Order'] },
        ],
    },
    {
        brokerKey: 'schwab',
        orderType: 'pmcc',
        platform: 'Schwab.com (web)',
        source: 'https://www.schwab.com/content/how-to-place-a-covered-call-trade',
        steps: [
            { title: 'Before you start', detail: 'This order sells a nearer-term call against the LEAPS you already hold. Schwab treats the pair as a diagonal spread, which needs Level 2 (Spreads) approval.', note: 'If the single-leg order below is rejected, use the two-leg path in the Rolling tab instead: click the Bid of the short call and the Ask of your LEAPS in the chain to build the spread.' },
            { title: 'Open the All-In-One Trade Ticket', detail: 'Click Trade, then select All-In-One Trade Ticket.', chips: ['Trade', 'All-In-One Trade Ticket'] },
            { title: 'Enter QQQ and the strategy', detail: 'Enter QQQ as the symbol. Under Strategy, select Call.', chips: ['QQQ', 'Strategy', 'Call'] },
            { title: 'Set the action', detail: 'Under Action, select Sell to Open.', chips: ['Sell to Open'] },
            { title: 'Choose the contract', detail: 'Select the strike and expiration from your signal email. The PMCC short call has a nearer expiration and a higher strike than your LEAPS.', chips: ['Sep 30, 2026', 'Strike 780'] },
            { title: 'Price and timing', detail: 'Set Order Type to Limit, enter the limit price from your email, and set Timing to Day.', chips: ['Limit', '$5.40', 'Day'] },
            { title: 'Review and place', detail: 'Click Review Order, confirm the details, then Place Order.', chips: ['Review Order', 'Place Order'] },
        ],
    },
    {
        brokerKey: 'schwab',
        orderType: 'roll',
        platform: 'Schwab.com (web)',
        source: 'https://help.streetsmart.schwab.com/SSCentral/1.0/Content/Placing%20Option%20Orders%20Multi%20Leg.htm',
        steps: [
            { title: 'What a roll is', detail: 'One order that buys back the expiring short call and sells a new one further out. Entering both legs together gets you a single net price.' },
            { title: 'Open the All-In-One Trade Ticket', detail: 'Click Trade, then All-In-One Trade Ticket, and enter QQQ.', chips: ['Trade', 'All-In-One Trade Ticket', 'QQQ'] },
            { title: 'Add leg 1: buy back the old call', detail: 'Set Action to Buy to Close and select the short call you currently hold (the expiration and strike from your email).', chips: ['Buy to Close', 'Sep 30, 2026', '780 Call'] },
            { title: 'Add leg 2: sell the new call', detail: 'Use the Add A Leg drop-down. Set Action to Sell to Open and select the new expiration and strike from your email.', chips: ['Add A Leg', 'Sell to Open', 'Oct 30, 2026', '790 Call'] },
            { title: 'Set a net limit price', detail: 'Choose Limit as the order type and enter the net credit from your email (new call premium minus the cost to buy back the old one). Set Timing to Day.', chips: ['Limit', 'Net credit', 'Day'] },
            { title: 'Review and place', detail: 'Click Review Order, verify both legs, then Place Order.', chips: ['Review Order', 'Place Order'] },
        ],
    },
    {
        brokerKey: 'schwab',
        orderType: 'etf',
        platform: 'Schwab.com (web)',
        source: 'https://www.schwab.com/content/how-to-place-an-options-trade',
        steps: [
            { title: 'Open the trade ticket', detail: 'Click Trade, then select Stocks & ETFs (the All-In-One Trade Ticket also works).', chips: ['Trade', 'Stocks & ETFs'] },
            { title: 'Enter the order', detail: 'Symbol QQQ, Action Buy, Quantity from your email, Order Type Limit, limit price from your email, Timing Day.', chips: ['QQQ', 'Buy', '35 shares', 'Limit', '$707.50'] },
            { title: 'Review and place', detail: 'Click Review Order, confirm, then Place Order. To sell SGOV in the same rebalance, repeat with Action Sell.', chips: ['Review Order', 'Place Order'] },
        ],
    },

    // ─── tastytrade ────────────────────────────────────────────────────
    {
        brokerKey: 'tastytrade',
        orderType: 'leaps',
        platform: 'tastytrade web/desktop',
        source: 'https://tastytrade.com/learn/trading-products/options/long-put/',
        steps: [
            { title: 'Enter the symbol', detail: 'Type QQQ into the symbol box at the top of the platform.', chips: ['QQQ'] },
            { title: 'Open the chain in Table mode', detail: 'Go to the Trade tab and switch to Table mode to see expirations and strikes.', chips: ['Trade', 'Table'] },
            { title: 'Expand the expiration', detail: 'Click the expiration from your signal email to expand it. LEAPS live in the far-dated January cycles.', chips: ['Jan 21, 2028'] },
            { title: 'Click the Ask of your call', detail: 'Find your strike in the Calls section and click its Ask price. Clicking Ask loads a buy order for that contract.', chips: ['Strike 700', 'Ask'] },
            { title: 'Set the ticket', detail: 'In the order ticket along the bottom, set quantity, choose a limit order, and enter the limit price from your email. Set time-in-force to Day.', chips: ['Qty 1', 'Limit', '$52.40', 'Day'] },
            { title: 'Review and send', detail: 'Click Review & Send, check the contract and price, then send the order.', chips: ['Review & Send'] },
        ],
    },
    {
        brokerKey: 'tastytrade',
        orderType: 'pmcc',
        platform: 'tastytrade web/desktop',
        source: 'https://tastytrade.com/learn/trading-products/options/long-call-diagonal-spread/',
        steps: [
            { title: 'The cleanest PMCC path of any broker', detail: 'tastytrade lets you enter the short call together with your LEAPS as one diagonal spread order with a single net price. If your LEAPS is already open, you can also sell the short call by itself: click the Bid of the short call in the chain.', note: 'Margin account required. tastytrade IRAs are margin-provisioned by default, so this works in an IRA without extra applications.' },
            { title: 'Enter QQQ and open Table mode', detail: 'Type QQQ in the symbol box, go to the Trade tab, and switch to Table mode.', chips: ['QQQ', 'Trade', 'Table'] },
            { title: 'Click the Bid of the short call', detail: 'Expand the nearer expiration from your email and click the Bid price of the short-call strike. A red bar marks the short leg; drag it up or down to adjust the strike.', chips: ['Sep 30, 2026', 'Strike 780', 'Bid'] },
            { title: 'Click the Ask of the LEAPS (if opening both)', detail: 'Expand the further-dated expiration and click the Ask price of your LEAPS strike. Both legs now show in the order ticket as one diagonal.', chips: ['Jan 21, 2028', 'Strike 700', 'Ask'] },
            { title: 'Set the net price', detail: 'In the order ticket, set quantity, choose a limit order, and enter the net price from your email. Set time-in-force to Day.', chips: ['Qty 1', 'Limit', 'Day'] },
            { title: 'Review and send', detail: 'Click Review & Send, review the legs and fees, then send.', chips: ['Review & Send'] },
        ],
    },
    {
        brokerKey: 'tastytrade',
        orderType: 'roll',
        platform: 'tastytrade web/desktop',
        source: 'https://tastytrade.com/learn/trading-products/options/long-call-diagonal-spread/',
        steps: [
            { title: 'Open the chain for QQQ', detail: 'Enter QQQ, go to the Trade tab, Table mode.', chips: ['QQQ', 'Trade', 'Table'] },
            { title: 'Leg 1: buy back the old short call', detail: 'Expand the expiring expiration and click the Ask of the short call you hold. Clicking Ask loads a buy-to-close for a contract you are short.', chips: ['Buy to Close', 'Sep 30, 2026', '780 Call'] },
            { title: 'Leg 2: sell the new short call', detail: 'Expand the new expiration and click the Bid of the new strike from your email.', chips: ['Sell to Open', 'Oct 30, 2026', '790 Call'] },
            { title: 'Set the net credit', detail: 'The ticket shows both legs as one order. Choose a limit order and enter the net credit from your email.', chips: ['Limit', 'Net credit', 'Day'] },
            { title: 'Review and send', detail: 'Click Review & Send, verify both legs, then send.', chips: ['Review & Send'] },
        ],
    },
    {
        brokerKey: 'tastytrade',
        orderType: 'etf',
        platform: 'tastytrade web/desktop',
        source: 'https://tastytrade.com/learn/trading-products/options/what-are-options/',
        steps: [
            { title: 'Enter the symbol', detail: 'Type QQQ in the symbol box and open the Trade tab.', chips: ['QQQ', 'Trade'] },
            { title: 'Build the stock order', detail: 'Choose shares, set the quantity from your email, pick a limit order, and enter the limit price.', chips: ['Buy', '35 shares', 'Limit', '$707.50'] },
            { title: 'Review and send', detail: 'Click Review & Send, confirm, and send. Repeat with a sell order for SGOV if your email includes one.', chips: ['Review & Send'] },
        ],
    },

    // ─── Fidelity ──────────────────────────────────────────────────────
    {
        brokerKey: 'fidelity',
        orderType: 'leaps',
        platform: 'Fidelity Trader+ Web',
        source: 'https://www.fidelity.com/learning-center/trading-investing/trading-platforms/how-to-trade-options-trader-plus-web',
        steps: [
            { title: 'Open Trader+ Web', detail: 'Log in, then from Accounts & Trade select Fidelity Trader+ Web. (On classic Fidelity.com, use Accounts & Trade, then Trade.)', chips: ['Accounts & Trade', 'Fidelity Trader+ Web'] },
            { title: 'Enter QQQ', detail: 'Type QQQ in the symbol field.', chips: ['QQQ'] },
            { title: 'Open the Option Chain panel', detail: 'Select the Option Chain tool panel, which lists calls and puts by expiration and strike.', chips: ['Option Chain'] },
            { title: 'Choose the expiration', detail: 'Pick the expiration from your signal email. LEAPS are the far-dated January expirations.', chips: ['Jan 21, 2028'] },
            { title: 'Select the strike', detail: 'Check the box next to your strike on the Calls side and choose Buy to Open as the action.', chips: ['Strike 700', 'Buy to Open'] },
            { title: 'Preview in the trade ticket', detail: 'Select Preview order in trade ticket. Set quantity, choose a Limit order, and enter the limit price from your email.', chips: ['Qty 1', 'Limit', '$52.40'] },
            { title: 'Place the order', detail: 'Select Place Order. Track status in the Orders panel.', chips: ['Place Order'] },
        ],
    },
    {
        brokerKey: 'fidelity',
        orderType: 'pmcc',
        platform: 'Fidelity Trader+ Web',
        source: 'https://www.fidelity.com/webcontent/ap002390-mlo-content/18.04/help/learn_trading_options.shtml',
        steps: [
            { title: 'Before you start', detail: 'The PMCC needs Tier 2 options plus the margin feature (IRAs: apply for limited margin first). Fidelity treats the short call against your LEAPS as a spread, not a covered call.', note: 'Known issue: Fidelity\u2019s collateral check can misfire and reject the sell-to-open as if it were naked, demanding Tier 3. If that happens, enter it as a two-leg diagonal spread (long LEAPS leg plus short call leg) or call Fidelity and ask them to recognize the LEAPS as coverage.' },
            { title: 'Open the options ticket', detail: 'From Accounts & Trade, open Fidelity Trader+ Web, enter QQQ, and open the Option Chain panel.', chips: ['QQQ', 'Option Chain'] },
            { title: 'Choose the short call', detail: 'Pick the nearer expiration from your email, find the strike on the Calls side, and choose Sell to Open.', chips: ['Sep 30, 2026', 'Strike 780', 'Sell to Open'] },
            { title: 'Set the ticket', detail: 'Quantity from your email, Order Type Limit, limit price from your email. Spread orders at Fidelity are limit orders, day only.', chips: ['Qty 1', 'Limit', '$5.40', 'Day'] },
            { title: 'Preview and place', detail: 'Preview the order, verify the contract and price, then Place Order.', chips: ['Preview', 'Place Order'] },
        ],
    },
    {
        brokerKey: 'fidelity',
        orderType: 'roll',
        platform: 'Fidelity Trader+ Web',
        source: 'https://www.fidelity.com/trading/trader-desktop-user-guide/trading-support',
        steps: [
            { title: 'Open the multi-leg ticket', detail: 'In Trader+ Desktop, open the Tools menu and select Multi-leg Options. In Trader+ Web, build both legs from the Option Chain.', chips: ['Tools', 'Multi-leg Options'] },
            { title: 'Leg 1: buy back the old call', detail: 'Action Buy to Close on the short call you hold (expiration and strike from your email).', chips: ['Buy to Close', 'Sep 30, 2026', '780 Call'] },
            { title: 'Leg 2: sell the new call', detail: 'Action Sell to Open on the new expiration and strike from your email.', chips: ['Sell to Open', 'Oct 30, 2026', '790 Call'] },
            { title: 'Set a net limit price', detail: 'Enter the net credit from your email as a limit price. Multi-leg orders are limit, day only.', chips: ['Limit', 'Net credit', 'Day'] },
            { title: 'Preview and place', detail: 'Preview, verify both legs, then Place Order.', chips: ['Preview', 'Place Order'] },
        ],
    },
    {
        brokerKey: 'fidelity',
        orderType: 'etf',
        platform: 'Fidelity.com',
        source: 'https://www.fidelity.com/products/atbt/help/ActiveTraderTools_Trade_Help.html',
        steps: [
            { title: 'Open the trade ticket', detail: 'From Accounts & Trade, select Trade.', chips: ['Accounts & Trade', 'Trade'] },
            { title: 'Enter the order', detail: 'Symbol QQQ, Action Buy, Quantity from your email, Order Type Limit, limit price from your email, Time in force Day.', chips: ['QQQ', 'Buy', '35 shares', 'Limit', '$707.50', 'Day'] },
            { title: 'Preview and place', detail: 'Select Preview, verify, then Place Order. Repeat with Sell for SGOV if your email includes it.', chips: ['Preview', 'Place Order'] },
        ],
    },

    // ─── Robinhood ─────────────────────────────────────────────────────
    {
        brokerKey: 'robinhood',
        orderType: 'leaps',
        platform: 'Robinhood app (mobile)',
        source: 'https://robinhood.com/us/en/support/articles/placing-an-options-trade/',
        steps: [
            { title: 'Search QQQ', detail: 'Tap the magnifying glass and search QQQ, then select it.', chips: ['QQQ'] },
            { title: 'Open the options flow', detail: 'Tap Trade, then Trade Options.', chips: ['Trade', 'Trade Options'] },
            { title: 'Pick the expiration', detail: 'Select the expiration from your signal email. LEAPS are the far-dated January dates.', chips: ['Jan 21, 2028'] },
            { title: 'Pick the call', detail: 'Choose your strike on the Calls side.', chips: ['Strike 700', 'Call'] },
            { title: 'Set quantity and price', detail: 'Enter the contract quantity from your email, choose a limit order, and set the limit price from the email.', chips: ['Qty 1', 'Limit', '$52.40'] },
            { title: 'Submit', detail: 'Review the order, then swipe up to submit.', chips: ['Swipe up'] },
        ],
    },
    {
        brokerKey: 'robinhood',
        orderType: 'pmcc',
        platform: 'Robinhood app (mobile)',
        source: 'https://robinhood.com/us/en/support/articles/about-the-options-strategy-builder/',
        steps: [
            { title: 'Before you start', detail: 'The PMCC needs a margin account plus Level 3 options approval. On a cash account the short call is rejected unless you hold 100 actual shares of QQQ.', note: 'Options market orders are only accepted from 9:35 AM to 4:00 PM ET and only for single-leg orders. Use a limit order, which our emails always provide.' },
            { title: 'Open the Strategy Builder', detail: 'Search QQQ, tap Trade, then Trade Options, then Strategy Builder at the top left.', chips: ['Trade', 'Trade Options', 'Strategy Builder'] },
            { title: 'Choose the calendar/diagonal path', detail: 'Select the calendar spread strategy. Set the short-dated leg expiration first, then the long-dated leg.', chips: ['Calendar', 'Short leg first'] },
            { title: 'Set the legs', detail: 'Short leg: the nearer expiration and higher strike from your email (the call you sell). Long leg: your LEAPS expiration and strike.', chips: ['Sell 780 Call Sep 30', 'Long 700 Call Jan 2028'] },
            { title: 'Set price and quantity', detail: 'Select the strategy price, enter quantity, and set the net limit price from your email.', chips: ['Qty 1', 'Limit'] },
            { title: 'Review and submit', detail: 'Tap Review, verify both legs, then submit.', chips: ['Review', 'Submit'] },
        ],
    },
    {
        brokerKey: 'robinhood',
        orderType: 'roll',
        platform: 'Robinhood app (mobile)',
        source: 'https://robinhood.com/us/en/support/articles/placing-an-options-trade/',
        steps: [
            { title: 'Open your short call position', detail: 'Go to your QQQ positions and tap the short call you are rolling.', chips: ['Positions', 'Short 780 Call'] },
            { title: 'Start the close', detail: 'Swipe left on the position (or tap it and choose to close) to start a buy-to-close order.', chips: ['Buy to Close'] },
            { title: 'Add the new short call', detail: 'Add a second leg: sell to open the new expiration and strike from your email. Robinhood supports up to 4 legs in one order.', chips: ['Sell to Open', 'Oct 30, 2026', '790 Call'] },
            { title: 'Set the net price', detail: 'Choose a limit order and enter the net credit from your email.', chips: ['Limit', 'Net credit'] },
            { title: 'Submit', detail: 'Review both legs and swipe up to submit.', chips: ['Swipe up'] },
        ],
    },
    {
        brokerKey: 'robinhood',
        orderType: 'etf',
        platform: 'Robinhood app (mobile)',
        source: 'https://robinhood.com/us/en/support/articles/placing-an-options-trade/',
        steps: [
            { title: 'Search QQQ', detail: 'Tap the magnifying glass, search QQQ, and select it.', chips: ['QQQ'] },
            { title: 'Open the stock order', detail: 'Tap Trade, then Buy.', chips: ['Trade', 'Buy'] },
            { title: 'Enter the order', detail: 'Switch to shares, enter the quantity from your email, choose a limit order, and set the limit price.', chips: ['Shares', '35', 'Limit', '$707.50'] },
            { title: 'Submit', detail: 'Review and swipe up to submit. Repeat with Sell for SGOV if your email includes it.', chips: ['Swipe up'] },
        ],
    },

    // ─── Interactive Brokers ───────────────────────────────────────────
    {
        brokerKey: 'ibkr',
        orderType: 'leaps',
        platform: 'IBKR Client Portal (web)',
        source: 'https://www.interactivebrokers.com/campus/trading-lessons/portal-options-trading/',
        steps: [
            { title: 'Open Option Chains', detail: 'From the Trade menu, select Option Chains and search QQQ.', chips: ['Trade', 'Option Chains', 'QQQ'] },
            { title: 'Select the expiration', detail: 'Choose the expiration from your signal email. LEAPS are the far-dated January expirations.', chips: ['Jan 21, 2028'] },
            { title: 'Click the Ask of your call', detail: 'Scroll the strike list and click the Ask price under Calls (left of the Strike column). A buy order appears in the preview window.', chips: ['Strike 700', 'Ask'] },
            { title: 'Open the Order Ticket', detail: 'Click the blue Order button at the top right.', chips: ['Order'] },
            { title: 'Set the ticket', detail: 'Set quantity, order type Limit, the limit price from your email, and time-in-force Day.', chips: ['Qty 1', 'Limit', '$52.40', 'Day'] },
            { title: 'Submit', detail: 'Click Preview to check the effect on your balances, or Submit Order to send.', chips: ['Preview', 'Submit Order'] },
        ],
    },
    {
        brokerKey: 'ibkr',
        orderType: 'pmcc',
        platform: 'IBKR Client Portal (web)',
        source: 'https://www.interactivebrokers.com/campus/trading-lessons/portal-options-trading/',
        steps: [
            { title: 'Before you start', detail: 'IBKR classifies the PMCC as a diagonal spread with the long leg expiring first, which requires Level 4, its highest options tier. Confirm your permissions before relying on this path.', note: 'If you are not approved for Level 4, the same strategy needs only Level 2 at Schwab or the Basic tier at tastytrade.' },
            { title: 'Open Option Chains for QQQ', detail: 'Trade menu, Option Chains, search QQQ.', chips: ['Trade', 'Option Chains', 'QQQ'] },
            { title: 'Build the combo', detail: 'From the Option Chain page, add the short call leg (click the Bid of the nearer expiration strike) and, if opening together, the long LEAPS leg (click the Ask of the far expiration strike). Up to 4 legs are supported.', chips: ['Bid 780 Call Sep 30', 'Ask 700 Call Jan 2028'] },
            { title: 'Open the Order Ticket', detail: 'Click the blue Order button to load the combo into the Order Ticket.', chips: ['Order'] },
            { title: 'Set the net price', detail: 'Choose a limit order and enter the net price from your email, with quantity and time-in-force.', chips: ['Limit', 'Qty 1', 'Day'] },
            { title: 'Submit', detail: 'Preview or Submit Order.', chips: ['Preview', 'Submit Order'] },
        ],
    },
    {
        brokerKey: 'ibkr',
        orderType: 'roll',
        platform: 'IBKR Mobile',
        source: 'https://www.interactivebrokers.com/campus/trading-lessons/portal-options-trading/',
        steps: [
            { title: 'Tap your short call position twice', detail: 'In IBKR Mobile, double-tap the short call position you are rolling.', chips: ['Positions', 'Short 780 Call'] },
            { title: 'Choose Roll Position', detail: 'Tap Roll Position. (Also available from the More menu under Options Exercise/Rollover.)', chips: ['Roll Position'] },
            { title: 'Select the new contract', detail: 'Pick the new expiration and strike from your signal email.', chips: ['Oct 30, 2026', '790 Call'] },
            { title: 'Set the net price and submit', detail: 'Enter the net credit from your email as a limit price, then submit the order.', chips: ['Limit', 'Net credit', 'Submit'] },
        ],
    },
    {
        brokerKey: 'ibkr',
        orderType: 'etf',
        platform: 'IBKR Client Portal (web)',
        source: 'https://www.interactivebrokers.com/campus/trading-lessons/client-portal-order-entry/',
        steps: [
            { title: 'Open the Order Ticket', detail: 'From the Trade menu, select Order Ticket.', chips: ['Trade', 'Order Ticket'] },
            { title: 'Enter QQQ', detail: 'Search QQQ in the symbol bar, press Enter, and choose the exchange (NASDAQ).', chips: ['QQQ', 'NASDAQ'] },
            { title: 'Set the order', detail: 'Select Buy Order, enter the share quantity from your email, order type Limit, limit price, and time-in-force Day.', chips: ['Buy', '35 shares', 'Limit', '$707.50', 'Day'] },
            { title: 'Submit', detail: 'Click Preview to see post-trade balances, or Submit Order to send. Repeat with Sell Order for SGOV if your email includes it.', chips: ['Preview', 'Submit Order'] },
        ],
    },
];

export function getFlow(brokerKey: string, orderType: OrderTypeKey): BrokerFlow | undefined {
    return FLOWS.find((f) => f.brokerKey === brokerKey && f.orderType === orderType);
}

export function getBroker(brokerKey: string): BrokerInfo | undefined {
    return BROKERS.find((b) => b.key === brokerKey);
}
