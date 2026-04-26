/**
 * Seed Whop Courses
 * ==================
 * Run ONCE to create TradeMind's initial course library in Whop.
 *
 * Usage:
 *   npx tsx scripts/seed-whop-courses.ts
 *
 * Requires env vars:
 *   WHOP_API_KEY, WHOP_CORE_EXPERIENCE_ID, WHOP_PRO_EXPERIENCE_ID
 *
 * Safe to re-run — will create new courses each time (no dedup built in,
 * so check your Whop dashboard before re-running).
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Inline SDK init (not importing from @/lib/whop to avoid Next.js deps)
import Whop from '@whop/sdk';

const whop = new Whop({
    apiKey: process.env.WHOP_API_KEY!,
});

const EXPERIENCES = {
    core:   process.env.WHOP_CORE_EXPERIENCE_ID!,
    pro:    process.env.WHOP_PRO_EXPERIENCE_ID!,
    bundle: process.env.WHOP_BUNDLE_EXPERIENCE_ID ?? process.env.WHOP_PRO_EXPERIENCE_ID!,
};

const COURSE_STRUCTURE = [
    {
        title:            'TurboCore 101: Start Here',
        tagline:          'Learn the signal, execute in 2 minutes, compound for life',
        targetExperience: EXPERIENCES.core,
        sequential:       true,
        chapters: [
            {
                title:   'Module 1: What is TurboCore?',
                lessons: [
                    {
                        title:   'The problem: why most retail investors underperform the index',
                        content: 'Most retail investors underperform the S&P 500 due to emotional trading — selling in panic and buying at peaks. TurboCore removes emotion from the equation using four layers of machine learning to detect whether the market is in a Bull, Sideways, or Bear regime — then allocates accordingly between QQQ, QLD, TQQQ, and SGOV.\n\n**The 2022 proof:** When TQQQ dropped -83%, TurboCore\'s regime detection rotated capital to SGOV (T-bills) early. Result: TurboCore -5.1% vs TQQQ -83%.',
                    },
                    {
                        title:   'The TurboCore strategy: 4 layers of ML explained simply',
                        content: 'TurboCore uses four independent models that vote on the current market regime:\n\n1. **EMA Trend Detector** — Is price above or below its 200-day moving average?\n2. **HMM Regime Model** — Hidden Markov Model trained on 15 years of data detects regime transitions\n3. **VIX Positioning** — Dynamic position sizing based on implied volatility\n4. **SMA200 Gate** — Hard circuit breaker: if QQQ is below its 200-day SMA, maximum defensive allocation\n\nWhen 3+ models agree on a regime, the signal fires. When models disagree, the system defaults to defensive posture.',
                    },
                    {
                        title:   'The 2022 proof: TurboCore -5.1% vs TQQQ -83%',
                        content: '2022 was the definitive stress test.\n\n**TQQQ** (3x leveraged QQQ): Peaked at $91 in November 2021. By December 2022: $18. A -83% drawdown.\n\n**TurboCore:** The HMM regime model detected the regime shift to BEAR in early January 2022. The system rotated capital to SGOV (short-term T-bills, which yielded 4%+ as the Fed raised rates). Full-year 2022 return: **-5.1%**.\n\nThis is why drawdown protection matters more than chasing upside. A -83% drawdown requires a +488% gain just to break even. A -5.1% drawdown requires a +5.4% gain.',
                    },
                ],
            },
            {
                title:   'Module 2: Reading Your Daily Signal',
                lessons: [
                    {
                        title:   'BULL regime: what it means and what to do',
                        content: 'A BULL regime signal means TurboCore\'s models have detected a sustained uptrend with low volatility risk.\n\n**Typical allocation:** QLD 40%, TQQQ 60%, QQQ 0%, SGOV 0%\n\nThis is the aggressive posture — 2x and 3x leveraged ETFs. The assumption is that the trend has momentum and the models have high confidence (80%+).\n\n**What to do:** Execute the allocation within 2 hours of the signal (before close). Don\'t overthink it — that\'s the whole point.',
                    },
                    {
                        title:   'SIDEWAYS regime: the 70% QQQ defensive posture',
                        content: 'A SIDEWAYS signal means the models detect uncertainty — no clear trend direction. This is the most common signal during consolidation periods.\n\n**Typical allocation:** QQQ 70%, QLD 30%, TQQQ 0%, SGOV 0%\n\nThis reduces leverage exposure while staying invested in the underlying. If the market resolves upward, you participate. If it resolves downward, your drawdown is limited.\n\n**Key insight:** Many traders lose money trying to trade SIDEWAYS markets aggressively. TurboCore\'s approach is to step down, wait, and not force the trade.',
                    },
                    {
                        title:   'BEAR regime: rotating to SGOV (T-bills) to protect capital',
                        content: 'A BEAR signal means the models have detected deteriorating conditions — regime shift probability is high.\n\n**Typical allocation:** SGOV 100%, all others 0%\n\nSGOV is iShares 0-3 Month Treasury Bond ETF — essentially cash earning T-bill yield. In 2022 when the Fed raised rates to 5%, this yielded 4-5% annually while TQQQ fell 83%.\n\n**What to do:** Sell all leveraged positions and buy SGOV. It feels wrong — it always does at the time. Execute it anyway.',
                    },
                ],
            },
            {
                title:   'Module 3: Execution',
                lessons: [
                    {
                        title:   'Manual execution: any brokerage, under 2 minutes',
                        content: 'When the 3 PM signal drops:\n\n1. Open your brokerage app\n2. Check your current holdings vs the signal allocation\n3. Sell what needs to be reduced (e.g., if signal says 0% TQQQ and you hold TQQQ, sell it all)\n4. Buy what needs to be added (e.g., if signal says 60% TQQQ and you hold 0%, buy)\n5. Use market orders during market hours for immediate execution\n\n**Sizing:** Allocate the signal % to your total TurboCore position size. If you have $10,000 in TurboCore and the signal says TQQQ 60%, buy $6,000 of TQQQ.\n\n**Fractional shares:** Most brokerages support fractional shares for QQQ, QLD, TQQQ, SGOV.',
                    },
                    {
                        title:   'Auto-execution: connecting Tastytrade for one-tap approval',
                        content: 'TradeMind integrates directly with Tastytrade for semi-automatic execution.\n\n**Setup:**\n1. Go to trademind.bot/dashboard → Settings → Tastytrade\n2. Enter your Tastytrade credentials\n3. Set your TurboCore position size\n4. Enable "Auto-Approve Signals"\n\n**How it works:** When the signal fires, TradeMind calculates the exact trades needed to rebalance to the new allocation. These trades are submitted to Tastytrade automatically (if Auto-Approve is on) or queued for one-tap approval.\n\n**Note:** Auto-execution is optional. Many users prefer to review the signal first.',
                    },
                    {
                        title:   'Position sizing: fractional shares, starting with $25',
                        content: 'You don\'t need a large account to follow TurboCore signals.\n\n**Minimum position:** $25 (fractional shares on all 4 ETFs are supported)\n\n**Recommended approach:**\n- Decide your total TurboCore allocation (e.g., 20% of your portfolio)\n- Apply signal percentages to that allocation\n- Never put 100% of your net worth in a leveraged ETF strategy\n\n**Position sizing formula:**\n```\nTurboCore_allocation = Total_Portfolio × 0.20  (or your chosen %)\nTQQQ_position = Turbocore_allocation × Signal_TQQQ_percent\n```\n\n**Example:** $50,000 portfolio, 20% TurboCore = $10,000. BULL signal: TQQQ 60% = $6,000 TQQQ, QLD 40% = $4,000 QLD.',
                    },
                ],
            },
        ],
    },
    {
        title:            'Options 101 for Gen Z',
        tagline:          'From zero to first options trade, demystified',
        targetExperience: EXPERIENCES.pro,
        sequential:       true,
        chapters: [
            {
                title:   'Module 1: Options Basics',
                lessons: [
                    {
                        title:   'What is an options contract?',
                        content: 'An options contract gives you the **right, but not the obligation**, to buy or sell 100 shares of a stock at a specific price (the strike price) by a specific date (expiration).\n\n**Two types:**\n- **Call option:** Right to BUY 100 shares at the strike price\n- **Put option:** Right to SELL 100 shares at the strike price\n\n**Why options?** For TurboCore Pro users, we use LEAPS (Long-term Equity Anticipation Securities) on QQQ — options with 1-2 year expiries — to get leveraged upside exposure with defined risk and no margin calls.\n\n**Key vocabulary:**\n- Strike price: The price at which you can buy/sell the underlying\n- Expiration: The date the option expires worthless if not exercised\n- Premium: What you pay for the option contract\n- ITM/OTM: In-the-money / Out-of-the-money',
                    },
                    {
                        title:   'Calls vs. puts explained simply',
                        content: '**Calls = Bullish**\nYou buy a call when you think the stock will go UP. If you buy a $450 strike call on QQQ and QQQ goes to $500, your call is worth $50 × 100 shares = $5,000 (minus premium paid).\n\n**Puts = Bearish**\nYou buy a put when you think the stock will go DOWN. If you buy a $450 put on QQQ and QQQ falls to $400, your put is worth $50 × 100 = $5,000.\n\n**Why TurboCore Pro uses LEAPS calls:**\n- QQQ LEAPS (1-2 year expirations) give upside exposure like owning shares\n- You can\'t lose more than the premium paid\n- No margin calls (unlike leveraged ETFs that can theoretically go to zero)\n- Deep ITM calls (delta ~0.80) behave like owning 80 shares with less capital\n\n**Practical example:** Instead of buying $45,000 of QQQ, buy a 1-year $400 strike call on QQQ for $6,000 premium. If QQQ goes from $450 to $500 (+11%), your call gains approximately $50 × 100 = $5,000 on a $6,000 investment (+83%).',
                    },
                    {
                        title:   'Why we use LEAPS instead of TQQQ in Pro tier',
                        content: 'TurboCore Base uses TQQQ — a 3x leveraged ETF. TQQQ has volatility decay: in sideways/choppy markets, it loses value even if the underlying stays flat.\n\n**The LEAPS advantage:**\n1. **Defined risk:** Maximum loss = premium paid. TQQQ can theoretically go to zero during extended drawdowns.\n2. **No volatility decay:** LEAPS don\'t suffer from daily rebalancing drag\n3. **Capital efficiency:** Control 100 shares with less capital upfront\n4. **Tax efficiency:** Long-term capital gains if held >1 year\n\n**The tradeoff:** LEAPS have time decay (theta) — they lose a small amount of value every day even if the stock is flat. For this reason, TurboCore Pro uses deep ITM LEAPS (delta >0.80) to minimize time decay\'s impact.\n\n**Typical LEAPS setup:** QQQ 2-year expiry, delta 0.80, 10-15% ITM strike.',
                    },
                ],
            },
            {
                title:   'Module 2: Using the Options Strategy Builder',
                lessons: [
                    {
                        title:   'How to use TradeMind\'s AI Options Strategy Builder',
                        content: 'The Options Strategy Builder is in the AI tab → "Options Strategy".\n\n**How to use it:**\n1. Enter a ticker (e.g., QQQ, AAPL, SPY)\n2. Describe your thesis in plain English (e.g., "Bullish, think QQQ will reach $500 in 6 months, willing to risk $2,000")\n3. The AI generates 3 ranked strategies with:\n   - Specific legs (exact strike prices and expiries to use)\n   - Cost to enter\n   - Maximum loss\n   - Profit at target\n   - Estimated win probability\n   - Risk/reward ratio\n\n**Best practices:**\n- Be specific about your timeframe and risk tolerance\n- Include any catalysts you\'re trading around (earnings, Fed meetings)\n- Specify your account size so the AI can suggest appropriate position sizing',
                    },
                    {
                        title:   'Understanding the 3 strategy recommendations: legs, costs, breakeven',
                        content: 'The Strategy Builder outputs 3 strategies ordered by risk/reward:\n\n**Strategy 1: Conservative**\nTypically a vertical spread (bull call spread or put spread). Limited upside, limited downside. Best for uncertain environments.\n\n*Example: Buy QQQ $450 call, sell QQQ $470 call. Cost: $800. Max profit: $1,200 if QQQ > $470 at expiry.*\n\n**Strategy 2: Moderate (Most Common)**\nTypically a LEAPS call or ATM call. Defined risk with uncapped upside above breakeven.\n\n*Example: Buy QQQ $440 call, 6-month expiry. Cost: $2,200. Breakeven: $462. Max profit: Unlimited above $462.*\n\n**Strategy 3: Aggressive**\nOTM calls with higher probability of total loss but higher leverage. Only for capital you can afford to lose entirely.\n\n*Example: Buy QQQ $480 call, 3-month expiry. Cost: $400. Requires QQQ to reach $484 to break even.*\n\n**Which to choose?** Start with Strategy 1 or 2. Only use Strategy 3 if you fully understand that the most likely outcome is losing the entire premium.',
                    },
                    {
                        title:   'Risk management: the 1% rule and position sizing for beginners',
                        content: '**The 1% Rule:** Never risk more than 1% of your total portfolio on a single options trade.\n\n*Example: $10,000 portfolio → max options risk per trade = $100*\n\nThis sounds conservative — it is, intentionally. Options can expire worthless. At 1% risk, you can be wrong 50 times in a row and still have half your portfolio.\n\n**Position sizing formula:**\n```\nMax_risk = Portfolio_size × 0.01\nContracts = Max_risk ÷ Premium_per_contract\n```\n\n*Example: $20,000 portfolio, $400 premium per contract → buy 0.5 contracts (round down to 0, wait until you have more capital, or increase risk tolerance slightly)*\n\n**For TurboCore Pro LEAPS specifically:**\n- LEAPS are longer-dated so time decay is slower\n- We recommend 2-5% of portfolio per LEAPS position (higher than speculative short-term options)\n- Treat LEAPS as a stock substitute, not a lottery ticket\n\n**Never bet the whole account on options.** Even experienced options traders lose on individual trades. The edge comes from correct sizing and doing many trades over time.',
                    },
                ],
            },
        ],
    },
];

async function seedCourses() {
    console.log('\n🚀 Starting Whop course seeding...\n');

    for (const courseData of COURSE_STRUCTURE) {
        if (!courseData.targetExperience) {
            console.warn(`⚠️  Skipping "${courseData.title}" — missing experience ID`);
            continue;
        }

        console.log(`📚 Creating course: ${courseData.title}...`);

        let course: any;
        try {
            course = await whop.courses.create({
                experience_id:                        courseData.targetExperience,
                title:                                courseData.title,
                tagline:                              courseData.tagline,
                require_completing_lessons_in_order:  courseData.sequential,
                certificate_after_completion_enabled: true,
                visibility:                           'visible',
            });
            console.log(`  ✅ Course created: ${course.id}`);
        } catch (err) {
            console.error(`  ❌ Failed to create course "${courseData.title}":`, err);
            continue;
        }

        for (const chapterData of courseData.chapters) {
            let chapter: any;
            try {
                chapter = await whop.courseChapters.create({
                    course_id: course.id,
                    title:     chapterData.title,
                });
                console.log(`    📖 Chapter: ${chapter.id} — ${chapterData.title}`);
            } catch (err) {
                console.error(`    ❌ Failed chapter "${chapterData.title}":`, err);
                continue;
            }

            for (const lessonData of chapterData.lessons) {
                try {
                    const lesson = await whop.courseLessons.create({
                        chapter_id:  chapter.id,
                        lesson_type: 'text',
                        title:       lessonData.title,
                        content:     lessonData.content,
                    });
                    console.log(`      ✏️  Lesson: ${lesson.id} — ${lessonData.title}`);
                } catch (err) {
                    console.error(`      ❌ Failed lesson "${lessonData.title}":`, err);
                }
            }
        }
    }

    console.log('\n✅ Course seeding complete.\n');
}

seedCourses().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
