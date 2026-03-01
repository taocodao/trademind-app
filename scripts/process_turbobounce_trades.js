const fs = require('fs');
const readline = require('readline');

const CSV_FILE = '../tastywork-trading-1/turbobounce_options_5k_all_trades.csv'; // Relative to trademind-app
const OUTPUT_FILE = './public/turbobounce_5k_curve.json';
const TOTAL_DURATION_SEC = 180.0; // 3-minute voice narration
const STARTING_CAPITAL = 5000.0;

async function processTrades() {
    console.log(`Processing trades from ${CSV_FILE}...`);

    if (!fs.existsSync(CSV_FILE)) {
        console.error(`ERROR: CSV file not found at ${CSV_FILE}`);
        process.exit(1);
    }

    const fileStream = fs.createReadStream(CSV_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const trades = [];
    let isHeader = true;

    // Symbol,Strategy,Direction,Exit,Entry Date,Exit Date,Days Held,Entry $,Exit $,PnL $,PnL %
    for await (const line of rl) {
        if (isHeader) {
            isHeader = false;
            continue;
        }

        const parts = line.split(',');
        if (parts.length < 11) continue;

        const symbol = parts[0];
        const strategy = parts[1];
        const direction = parts[2];
        const entryDate = parts[4];
        const exitDate = parts[5];
        const pnl = parseFloat(parts[9]);
        const pnlPercent = parseFloat(parts[10]);

        if (isNaN(pnl) || !exitDate) continue;

        trades.push({
            symbol,
            strategy,
            direction,
            entryDate,
            exitDate,
            pnl,
            pnlPercent
        });
    }

    // 1. Sort all 1,078 trades by Exit Date chronologically
    trades.sort((a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime());

    console.log(`Parsed ${trades.length} valid trades.`);

    if (trades.length === 0) {
        console.warn("No trades found to process.");
        return;
    }

    // 2. Compute cumulative PnL
    let runningCapital = STARTING_CAPITAL;
    const timelineData = [];

    // Push starting point
    const firstDate = new Date(trades[0].exitDate);
    firstDate.setDate(firstDate.getDate() - 1); // just before first trade

    timelineData.push({
        date: firstDate.toISOString().split('T')[0],
        value: runningCapital,
        pnl: 0,
        trade: null,
        progress: 0.0,
        timelineSec: 0.0
    });

    const totalTrades = trades.length;

    trades.forEach((trade, index) => {
        runningCapital += trade.pnl;

        // 3. Map each trade to normalized timestamp (0.0 -> 1.0)
        // Ensure the last trade hits exactly 1.0
        const progress = (index + 1) / totalTrades;
        const timelineSec = progress * TOTAL_DURATION_SEC;

        timelineData.push({
            date: trade.exitDate,
            value: parseFloat(runningCapital.toFixed(2)),
            pnl: trade.pnl,
            trade: {
                symbol: trade.symbol,
                strategy: trade.strategy,
                direction: trade.direction,
                entryDate: trade.entryDate,
                pnlPercent: trade.pnlPercent
            },
            progress: parseFloat(progress.toFixed(4)),
            timelineSec: parseFloat(timelineSec.toFixed(2))
        });
    });

    console.log(`Final Account Value Computed: $${runningCapital.toFixed(2)}`);
    console.log(`Writing output to ${OUTPUT_FILE}...`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(timelineData, null, 2));
    console.log(`Success! Wrote ${timelineData.length} data points mapped to ${TOTAL_DURATION_SEC} seconds.`);
}

processTrades().catch(console.error);
