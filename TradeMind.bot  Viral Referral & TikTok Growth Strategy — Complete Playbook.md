# TradeMind.bot: Viral Referral & TikTok Growth Strategy — Complete Playbook

> A four-part deep dive into social referral virality, TikTok technical constraints, Next.js implementation, and gamification mechanics for a fintech SaaS targeting Gen Z — with a step-by-step roadmap for a 2-person engineering team.

***

## Executive Summary

TradeMind.bot sits at the intersection of three powerful forces: a generational shift to "FinTok" financial education, a proven SaaS referral model with documented 3,900%+ growth precedents, and a Gen Z cohort that is 93% active on P2P/fintech platforms but strongly driven by gamification and social proof. The strategy detailed below does not require a large budget — it requires the right mechanics, correctly sequenced, on the right platform.[^1]

The core approach: **use spoken promo codes ("use code ERIC") in short-form TikTok content as the primary acquisition surface, route all traffic to a branded link-in-bio page (Beacons preferred), and attribute conversions via Rewardful's Stripe Promo Code integration on the backend.** Gamified leaderboards and a tiered creator program provide the virality multiplier on top.

***

## Part 1 — Strategy & Platform Selection

### The "FinTok" Landscape in 2025

Finance content on TikTok — known as #FinTok — is not a niche trend. Users who followed financial trends on TikTok in 2024 reported a 44% real-world success rate, and the hashtag #financialfreedom alone has accumulated 23.8 billion combined views. Gen Z as a demographic does not learn from textbooks or long-form webinars; they learn in 15–60 second bursts that are fast, visual, and peer-validated.[^2][^3][^4]

For TradeMind.bot, this means every piece of TikTok content should function simultaneously as financial education and a soft acquisition funnel. The most effective content format for fintech on TikTok is **the micro-tutorial + proof-of-outcome structure**: a 30-60 second video that (1) poses a relatable problem ("I lost $300 panic-selling last week"), (2) shows the product solving it on screen, and (3) ends with a code-based CTA — never a hard sell. Overly polished or brand-centric content underperforms; audiences reward authenticity and raw screen-share demos.[^5][^6]

### Content Formats That Drive Fintech Viral Growth

The highest-performing formats for fintech SaaS on TikTok in 2024–2025:

| Format | Description | Why It Works for TradeMind |
|--------|-------------|---------------------------|
| **"Watch me trade" POV** | Raw screen capture of signal execution + outcome | Social proof + product demonstration in one[^5] |
| **"I made $X using..." testimonial** | User shares P&L outcome tied to signal | High credibility, shareable, FOMO-inducing[^2] |
| **Myth-busting finance** | Corrects common Gen Z investing misconceptions | Algorithm-boosted educational content, positions brand as trusted[^3] |
| **Reaction/Stitch** | React to viral stock news using TradeMind signals | Rides trending topics, high discovery potential[^7] |
| **"Results after 30 days"** | Time-boxed experiment with before/after performance | Clear narrative arc, screenshot-worthy data[^8] |

The key insight from SaaS TikTok growth research: treat TikTok videos as top-of-funnel attention, and engineer the content flow so viewers naturally migrate to your profile, click the bio link, and encounter the referral/signup CTA.[^5]

### How Fintech Apps Used Referrals for Gen Z Acquisition

**Robinhood** is the defining case study. Before launch, they deployed a gamified referral waitlist: users saw their live position in line and could jump the queue by referring friends via social media sharing cards. Results: 10,000 signups on day one, 50,000 in week one, and over 1 million pre-launch waitlist signups within one year — achieved with minimal ad spend. Post-launch, Robinhood reported that the majority of its funded accounts in 2020 and early 2021 came from organic or referral channels. Their referral mechanic — double-sided, instant, tangible reward (free stock ~$10) delivered within 24–72 hours — set the standard. The speed of reward delivery was critical: it removed uncertainty and fueled word-of-mouth.[^9][^10][^11][^12]

**Webull** built a structured referral program where both referrer and referred friend receive bonuses upon completing qualifying transactions. The program's success contributed to Webull growing registered users 17% year-over-year to 25.9 million, with a 97.7% quarterly retention rate.[^13][^14]

**Public.com** operates a straightforward double-sided referral: both parties receive $20 in stock when a referred friend deposits $1,000+. While the deposit threshold is higher than TradeMind's model, the double-sided structure is directly applicable.[^15]

**Acorns** uses time-limited, tiered referral challenges (e.g., invite 5 people in a week to unlock escalating rewards), though their tight timeframes and complex conditions create friction that reduces completion rates — a negative lesson for TradeMind's design.[^16]

### Affiliate vs. Referral Short Codes on TikTok

Given TikTok's link restrictions, **spoken/typed referral short codes dramatically outperform clickable affiliate links** for organic TikTok content. The flow is: creator verbally says "go to trademind.bot and use code ERIC at signup" → viewer types the URL manually → enters code during onboarding. This is now standard practice for DTC brands on TikTok — brands like TIKTOK20 or VIRAL15 are routinely used to track TikTok-origin purchases even when users navigate directly.[^17]

Promotional codes on TikTok function not just as discounts but as **algorithm engagement drivers**: when creators share codes, viewers comment, test, and rewatch the video, which signals to TikTok's algorithm to boost the content further.[^18]

### Incentive Structures That Resonate With Gen Z

Research consistently shows that Gen Z responds more strongly to **immediate, tangible, social rewards** than delayed cash payouts:[^19][^1]

- **Two-sided instant rewards** (both referrer and new user get something immediately) outperform one-sided programs by reframing the referral from "help me get a reward" to "here's a great deal for you too"[^19]
- **Gamified progress visibility** — seeing a referral counter climb, a leaderboard rank, or a progress bar toward the next tier — drives sustained participation in a generation that averages 3+ hours daily gaming[^1]
- **Exclusivity and status** beat cash for Gen Z: early access to features, VIP Discord access, or an "Elite Trader" badge can outperform equivalent cash value[^20]
- **Speed of reward delivery**: Robinhood's mechanic worked specifically because the reward felt real and arrived fast, removing the uncertainty that kills referral momentum[^10]
- For a $29–$69/month SaaS, the optimal incentive is **free subscription credit + account credit** (e.g., "Refer 1 friend: get 30 free days + $10 credit; Refer 3 friends: get 90 days free + $25 credit") — this keeps incentives product-native and economically sustainable

***

## Part 2 — TikTok Technical Constraints & Best Practices

### Link Restrictions: What's Actually Blocked

TikTok does not outright block third-party tracking URLs in bio links, but its access restrictions create a significant barrier. As of 2025:

- **Personal accounts** require a minimum of **1,000 followers** before the clickable "Website" link field appears in the profile editor[^21][^22]
- **Business accounts** bypass this threshold entirely and gain immediate access to the bio link field[^21]
- TikTok does not penalize third-party URLs or UTM-tagged links in bio — but clickable links are only available in bio, **not in video descriptions or captions for most account types**[^23]
- Video descriptions support text but no clickable hyperlinks (except for TikTok Shop product tags and verified accounts in select regions)[^23]

**Recommendation for TradeMind**: Switch to a TikTok **Business Account** immediately to unlock the bio link without the follower threshold. This gives you a clickable link pointing to your Beacons or Linktree landing page from day one.

### Implementing "Use Code ERIC" — the Right Way

The "use code [NAME]" format is TikTok's native workaround for link restrictions, and it works exceptionally well when executed correctly:[^17]

1. **Keep codes to 4–8 characters maximum** — short codes have higher recall when viewers type them manually (e.g., ERIC, BULL5, ALPHA)
2. **Display the code visually on screen** (as overlaid text) AND say it aloud — dual encoding reinforces recall
3. **Make the code feel personal and creator-specific** — "Use code ERIC" (a person's name) significantly outperforms generic codes like "SAVE20" because it creates social identity attachment[^24]
4. **Weave the code into the story naturally** — the best-performing creators present codes as a bonus at the end of the value sequence, not as the opening pitch[^18]
5. **Pin a comment on your video** with the code and a simple call to action: "💡 Use code ERIC at signup on trademind.bot for 30 days free"

A/B testing conducted with TikTok promo codes found that a personalized code (SPRINGFLING20) outperformed a generic code (SAVE20) by 15% in conversion rate — validating the name-based code strategy for creator affiliates.[^24]

### TikTok Shop for SaaS: Not Usable

TikTok Shop's affiliate program is designed exclusively for **physical products** and, in limited cases, digital downloads with immediate delivery. SaaS subscriptions — particularly those in fintech/investing — are **not eligible for TikTok Shop affiliate integration**. TikTok Shop requires products listed in their seller marketplace; an external SaaS subscription does not qualify.[^25][^26][^27]

The correct architecture for TradeMind is:
- **TikTok**: Content + spoken promo code CTA
- **Bio link**: Points to Beacons/Linktree landing page
- **Beacons/Linktree**: Hosts signup link, referral code entry, and social proof
- **TradeMind.bot**: Promo code redeemed at Stripe checkout during signup

### Link-in-Bio Tool Comparison: Beacons vs. Linktree for Fintech

| Feature | Beacons | Linktree |
|---------|---------|----------|
| **Monetization depth** | Full storefront, in-page purchases, affiliate hub[^28] | Basic tipping, affiliate links[^28] |
| **Transaction fees (free plan)** | 9% (same as Linktree free)[^28] | ~9% on lower tiers[^28] |
| **Transaction fees (paid plan)** | 0% on top paid plans[^28] | Takes fees on sales[^28] |
| **Analytics** | Revenue + click tracking in one dashboard[^29] | Traffic and location data, UTM on paid[^29] |
| **Media kit / brand deal tools** | Built-in creator media kit[^28] | Not available |
| **Setup simplicity** | Moderate (more features = more setup) | Very simple[^28] |
| **Best for TradeMind** | ✅ Preferred — revenue-native, creator-friendly | Secondary option for simplicity |

**Recommendation**: Use **Beacons** for the primary TikTok bio link. Build the page to include: (1) the TradeMind signup link with UTM tags, (2) a "Redeem your referral code" field or instructional copy, (3) social proof (user count, testimonials), and (4) links to YouTube/Instagram channels.

For UTMs, use the convention: `utm_source=tiktok&utm_medium=organic&utm_campaign=creator_[NAME]&utm_content=[video_theme]`. TikTok's own Ads Manager offers a URL parameter builder for paid campaigns, and auto-attach UTM is available for ads — but for organic content, manual UTM tagging on the Beacons link is the standard.[^30][^31]

***

## Part 3 — Implementation & Attribution (Next.js + Stripe)

### Tracking Manual Code Entry (The TikTok Dark Social Problem)

When a user watches a TikTok, types "trademind.bot" directly into their browser, and enters code "ERIC" at signup, there is **zero referral URL data** — the traffic appears as direct. This is the core of the dark social attribution problem: research by SparkToro found that 100% of visits originating from TikTok, Slack, Discord, and WhatsApp showed no referrer data.[^32][^33]

The solution is a **dual-layer attribution stack**:

**Layer 1: Promo Code as Primary Attribution Signal**
The promo code itself IS the attribution mechanism. When a user types "ERIC" at checkout, your system ties that Stripe subscription to the affiliate "ERIC" — no URL tracking needed. This is how TikTok-native brands have solved attribution since 2020. Rewardful's Stripe Promo Code integration does exactly this: it assigns each affiliate a unique Stripe promo code, and when any customer redeems it (clicked or typed), Rewardful credits the affiliate and triggers the commission.[^34][^35][^17]

**Layer 2: "How did you hear about us?" (HDYHAU) Survey**
Add a single optional field at signup: "How did you find TradeMind?" with options: TikTok, Instagram, YouTube, Twitter/X, Friend referral, Search, Other. This captures dark social data that no tracker can recover. Store this in your database alongside UTM data for each user.[^36]

**Layer 3: Branded Search Lift Tracking**
Monitor Google Search Console and Google Analytics for spikes in branded search terms ("trademind bot", "trademind trading signals") correlated with TikTok content publication dates. This indirect signal measures dark social influence at scale.[^36]

**Next.js Implementation for Manual Code Attribution:**

```typescript
// On signup page — store UTM params + referral code in localStorage
// on first visit, even before account creation
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref') || params.get('code');
  if (ref) localStorage.setItem('referralCode', ref);
  // Also store UTM params
  ['utm_source','utm_medium','utm_campaign','utm_content'].forEach(k => {
    if (params.get(k)) localStorage.setItem(k, params.get(k)!);
  });
}, []);

// On form submit — read stored code + allow manual entry
// Priority: URL param > localStorage > manual input field
const getCode = () => 
  manualCodeInput || 
  localStorage.getItem('referralCode') || 
  new URLSearchParams(window.location.search).get('ref');
```

This pattern — store referral params in localStorage on first visit, retrieve on eventual signup — ensures attribution survives multi-session conversion paths.[^37]

### UTM Parameter Best Practices Across Platforms

Consistency is the #1 UTM failure point: mixing naming conventions across platforms makes attribution analysis useless. Use this standard taxonomy for TradeMind:[^38][^30]

| Parameter | TikTok Organic | TikTok Paid | Instagram | YouTube | Twitter/X |
|-----------|---------------|-------------|-----------|---------|-----------|
| `utm_source` | `tiktok` | `tiktok` | `instagram` | `youtube` | `twitter` |
| `utm_medium` | `organic_social` | `paid_social` | `organic_social` | `organic_video` | `organic_social` |
| `utm_campaign` | `creator_eric` | `awareness_q2` | `reel_signals` | `tutorial` | `thread` |
| `utm_content` | `theta_sprint_demo` | `ad_1` | `story_1` | `ep12` | `post_1` |

All Beacons bio links should include pre-tagged UTMs. Build a simple internal URL builder (a shared Google Sheet works for a 2-person team) to enforce naming convention.[^38]

### Build Custom vs. Use a Referral SaaS Platform

For a 2-person engineering team at TradeMind's current stage, **use Rewardful with Stripe Promo Codes integration** — do not build custom. Here's the framework for deciding:

| Criteria | Custom Build | Rewardful | FirstPromoter |
|---------|-------------|-----------|---------------|
| **Time to launch** | 2–4 weeks | ~15 minutes[^39] | ~2–3 hours |
| **Stripe sync accuracy** | Depends on implementation | Native 2-way sync[^40] | Good, some discrepancies reported[^41] |
| **Promo code (TikTok-mode) support** | Must build from scratch | ✅ Native feature[^34] | ✅ Supported |
| **Starting price** | Engineering cost | $49/mo[^42] | $49/mo[^43] |
| **Transaction fees** | None | Up to 9% (check plan)[^44] | None on paid plan[^44] |
| **Double-sided rewards** | Must build | ✅ Built-in[^45] | ✅ Built-in |
| **Recommended for TradeMind** | ❌ Too slow | ✅ **Yes** | ✅ Good alternative |

**Rewardful is the recommended pick** due to its "two-scripts and done" setup, native Stripe promo code integration (the exact mechanic needed for TikTok-mode attribution), and double-sided incentive support. Refgrow ($29/mo, 0% fees) is a viable budget alternative worth evaluating.[^39][^44][^45][^34]

### Handling Dark Social Attribution at Scale

Best practices from top SaaS companies:[^46][^33][^36]

1. **Separate measurement from influence**: Accept that you cannot track every TikTok-origin conversion. Measure what you can (promo code redemptions, direct traffic lift, branded search volume), and design programs for what you can't (use HDYHAU surveys, community mentions)
2. **Server-side tracking for owned touchpoints**: Implement server-side event firing (Stripe webhooks → your DB) rather than relying solely on client-side pixel tracking, which is increasingly blocked by ad blockers[^47]
3. **Promo codes as ground truth**: When code "ERIC" is redeemed 47 times, that is 47 verified TikTok conversions attributed to creator Eric, regardless of URL tracking. Build KPI dashboards around code redemption as the primary metric
4. **Cohort analysis by signup week**: If a TikTok video goes live on Monday and you see a 3x spike in direct traffic + branded signups through Wednesday, that cohort is TikTok-origin even without referral data[^36]

***

## Part 4 — Gamification & Virality Mechanics

### Leaderboard Design for Competitive TikTok Sharing

Robinhood's pre-launch mechanic — showing users their exact position in a queue and letting them "jump the line" by referring friends — generated 1 million signups before the product even launched. The mechanism was a **real-time, visible, competitive leaderboard** tied to a meaningful reward (earlier access).[^48][^9]

For TradeMind, replicate this with a **public monthly affiliate leaderboard**:

- **"Top 10 TradeMind Affiliates This Month"** displayed publicly at trademind.bot/leaderboard
- Updated daily, showing username + referral count + earned rewards (not $ amounts — show value like "90 days free earned")
- Winners receive monthly prizes: #1 gets a full year free + "Elite Affiliate" badge; #2–3 get 6 months free; #4–10 get 3 months free
- **TikTok-native virality trigger**: affiliates who reach the top 10 have a built-in content hook — they can post "I ranked #3 on the TradeMind leaderboard this month" videos, creating organic social proof that drives more signups[^49][^50]

The psychological mechanism: leaderboards create social proof and status competition. For Gen Z, public ranking is a form of social currency — 87% of Gen Z are more likely to engage with brands that offer participatory experiences.[^51][^49]

### Tiered Reward Structures: What Works Psychologically

Flat rewards ("give 1, get $10") create one-time referral behavior. Tiered, milestone-based rewards create **sustained advocacy** by exploiting the "what's next?" motivation loop:[^52][^19]

**Recommended 4-Tier Structure for TradeMind:**

| Tier | Name | Referrals Required | Referrer Reward | New User Reward |
|------|------|--------------------|----------------|-----------------|
| 🥉 **Bronze** | Signal Scout | 1 | 30 days free | 14 days free |
| 🥈 **Silver** | Alpha Trader | 3 | 90 days free + $15 credit | 30 days free |
| 🥇 **Gold** | Market Maker | 7 | 6 months free + Discord VIP | 30 days free + $10 |
| 💎 **Diamond** | TradeMind Pro | 15+ | 1 year free + revenue share (20%) | 30 days free + $15 |

**Design principles:**
- The **first tier must be immediately achievable** — a single referral — to give new advocates a quick win and build momentum[^19]
- Each tier jump must feel **meaningfully better**, not just marginally better — the Diamond tier's revenue share option is a category shift that motivates top performers differently from earlier tiers[^20]
- **Display a visual progress bar** in every user's dashboard showing how close they are to the next tier — this visual feedback is one of the most powerful motivators in gamification[^19]
- **Celebrate milestone unlocks** with automated emails and in-app notifications ("🏆 You've reached Silver! Here's your 90 days free...")[^19]

### Creator Program vs. Standard Referral Program

The data strongly suggests treating them as **two parallel programs, not one** — because they attract different user personas with different motivations:[^53][^52]

**Standard Referral Program** (for all paying subscribers):
- Automated, self-serve, Rewardful-managed
- Bronze through Gold tiers
- Designed for casual organic sharing ("I told a friend about this")
- Primary incentive: subscription credit

**TradeMind Creator Program** (for high-volume referrers and active TikTok/YouTube creators):
- Apply-to-join, curated
- Diamond tier benefits + special perks
- Monthly performance calls or Discord with the TradeMind team
- Co-created content opportunities ("Feature in our official TikTok")
- Revenue share (20% recurring commission) instead of subscription credit
- Media kit with pre-formatted graphics, talking points, and demo videos

The SaaS affiliate benchmark data shows that **AI and fintech SaaS programs with established creator networks contribute 15–25% of MRR** once the program matures, with 3–5x affiliate scaling possible within a single quarter. The built-in credibility dynamic — where active users of TradeMind demonstrate real P&L results in their content — is the fintech equivalent of the beehiiv/content creator dynamic where "affiliates are most effective because they demonstrate success with the tool in real-time".[^8]

**Structural difference between the programs:**

| Dimension | Standard Referral | Creator Program |
|-----------|-------------------|-----------------|
| Access | All paying users, automatic | Application + approval |
| Compensation | Subscription credit | Revenue share (20% recurring) |
| Attribution | Promo code + referral link | Promo code (TikTok-first) |
| Content requirements | None | Optional — creative freedom encouraged[^6] |
| Support | Self-serve dashboard | Monthly 1:1, media kit, Discord channel |
| Minimum commitment | None | Suggested 2 posts/month |

### Real Examples of SaaS/Fintech TikTok Creator Programs

**tl;dv** (AI meeting transcription SaaS) built one of the most cited SaaS influencer programs: paying up to $700 per post, offering impression-based bonuses, allowing zero revision mandates (full creative freedom), and supporting creators on TikTok, LinkedIn, Twitter, and Instagram simultaneously. Their model explicitly provides a media kit and example posts — reducing creator effort while maintaining brand consistency.[^53]

**Shopify's affiliate program** for TikTok creators pays up to $2,000 per successful business referral and is explicitly designed for creators in business/e-commerce niches who can demonstrate the platform organically. The structure — high-commission, narrative-focused, no mandatory script — is directly applicable to TradeMind.[^54]

**Public.com** maintains an active TikTok presence (67.7K followers, 219.7K likes as of research date), using a mix of educational content and community-driven investing themes. Their referral structure anchors on double-sided stock rewards, and their TikTok content focuses on relatable retail investor scenarios rather than product demos.[^55]

The broader fintech digital PR data shows that referral programs merged with influencer content consistently outperform standalone digital advertising, with some firms reporting up to **40% lower customer acquisition costs** through this hybrid model.[^56]

***

## Compliance Considerations for Fintech TikTok Marketing

This section is critical for TradeMind. Fintech social media marketing is under active regulatory scrutiny.

- Robinhood paid **$26 million** in 2025 in part due to failure to properly manage social media influencers promoting their products[^57]
- In the UK, 68% of TikTok finfluencer videos were found to breach FCA financial promotion rules[^4]
- In the US, SEC Section 17(b) requires disclosure of all compensation — including referral commissions, affiliate income, and free subscription credits given to creators[^58]
- **FINRA Rule 2210** requires that firms pre-approve, retain, and monitor influencer content promoting investment products[^59][^58]

**Minimum compliance requirements for TradeMind's creator program:**
1. All affiliates and creators must include "#ad" or "Sponsored" disclosures per FTC guidelines
2. Creators must add "not financial advice" disclaimers to all signal-related content
3. TradeMind must maintain records of all influencer agreements and content
4. Referral commissions paid must be disclosed in program terms
5. Any performance claims ("this signal returned 39% CAGR") must be accompanied by appropriate risk disclosures

***

## Step-by-Step Implementation Roadmap (2-Person Team, Next.js + Stripe)

### Phase 1: Foundation (Week 1–2)

**Engineering (1 engineer, ~20 hours):**
- [ ] Switch TikTok account to Business Account (0 hours — 5-minute settings change)[^22]
- [ ] Set up Rewardful ($49/mo) with Stripe Promo Code integration — follow their "15-minute setup" guide[^39][^34]
- [ ] Generate personalized promo codes for your first 5 beta affiliates (e.g., ERIC, SIM, BULL1)
- [ ] Build localStorage-based referral param capture in Next.js signup flow (see code pattern in Part 3)
- [ ] Add "How did you find TradeMind?" dropdown to signup form — store in user DB record
- [ ] Add promo code field to checkout/signup page, wired to Rewardful's Stripe promo code lookup
- [ ] Set up UTM naming convention and tag all Beacons links accordingly

**Marketing (1 founder, ~10 hours):**
- [ ] Create Beacons account — build landing page with: signup CTA, referral code instructions, social proof, channel links
- [ ] Create promo code entry instructions (GIF or short video for the landing page)
- [ ] Film 3 "proof of concept" TikTok videos using the micro-tutorial format — end each with "use code [YOUR CODE] at trademind.bot"

### Phase 2: Referral Infrastructure (Week 3–4)

**Engineering (~15 hours):**
- [ ] Build user referral dashboard in Next.js: show personal promo code, referral count, tier progress bar, next tier reward
- [ ] Implement Stripe webhook handler: on successful subscription creation with promo code, credit referrer account (via Rewardful or manually)
- [ ] Build basic leaderboard page (`/leaderboard`) — shows top 10 referrers by month (username + count + tier)
- [ ] Implement double-sided incentive: auto-apply discount to new user's first month when they use a referral code[^45]

**Marketing (~10 hours):**
- [ ] Write affiliate terms and conditions (include disclosure requirements, FINRA/FTC compliance language)
- [ ] Create tiered reward structure (Bronze/Silver/Gold/Diamond) with visual graphics
- [ ] Design "referral code reveal" moment in-app (post-signup screen: "Your code is ERIC — share it!")
- [ ] Recruit first 10 creator-program affiliates from existing users and personal network

### Phase 3: Creator Program & Gamification (Week 5–8)

**Engineering (~20 hours):**
- [ ] Build creator program application form and internal approval workflow
- [ ] Upgrade leaderboard to real-time daily updates + email notification when a user's rank changes
- [ ] Add milestone unlock celebrations: in-app modal + automated email when user hits Silver/Gold/Diamond
- [ ] Implement basic A/B test framework for signup page (test code field placement, incentive copy)
- [ ] Set up Google Analytics 4 custom events: referral_code_entered, referral_signup_completed, tier_unlocked

**Marketing (~20 hours):**
- [ ] Launch "TradeMind Creator Program" landing page with clear benefits, application form, and media kit download
- [ ] Create media kit: TradeMind brand assets, talking points, demo video clips, risk disclosure language
- [ ] Produce "Top Affiliates This Month" TikTok video (celebrate early leaderboard leaders — creates social proof + FOMO for new creators)
- [ ] Set up Discord channel for creator program members
- [ ] Establish "How We're Tracking This" KPI dashboard: promo code redemptions by creator, direct traffic lift by week, HDYHAU breakdown

### Phase 4: Scale & Optimize (Month 3+)

- [ ] Analyze first cohort: which creator codes converted best? Which content themes drove the most redemptions?
- [ ] Upgrade top-performing creators from Gold to Diamond tier — offer revenue share
- [ ] Run first monthly "Affiliate of the Month" highlight TikTok — showcase the #1 affiliate's story
- [ ] Test platform expansion: replicate the same promo-code strategy for Instagram Reels and YouTube Shorts
- [ ] Consider upgrading from Rewardful Starter to Growth plan as affiliate MRR contribution scales
- [ ] Evaluate whether to add a waitlist gamification loop (Robinhood-style) ahead of any major new feature launch

***

## Key Metrics to Track

| Metric | How to Measure | Target (Month 3) |
|--------|---------------|-----------------|
| Promo code redemption rate | Rewardful dashboard | >5% of signups use a code |
| Viral K-factor | New referrals ÷ existing users | >0.3 |
| Creator-attributed MRR | Rewardful campaign report | >10% of MRR |
| Dark social proxy (branded search) | Google Search Console | Week-over-week lift post-TikTok |
| Time-to-reward (hours) | Stripe webhook timing | <24 hours |
| HDYHAU TikTok share | Signup form responses | >20% cite TikTok |
| Tier progression rate | DB: users reaching Silver+ | >15% of program participants |

---

## References

1. [Gamification Examples | User Retention - StriveCloud](https://www.strivecloud.io/blog/gen-z-fintech-user-retention) - As of 2025, younger people make up the biggest share of both new and existing fintech users, with 93...

2. [Finance got TikTokified and gone viral Fast, Fun, Visual ... - LinkedIn](https://www.linkedin.com/pulse/finance-got-tiktokified-gone-viral-fast-fun-visual-how-gen-z-learning-q3fkf) - Finance got TikTokified and gone viral Fast, Fun, Visual, and Viral. How Gen Z is Learning Money Thr...

3. [FinTok Strategy: How Banks Are Reaching Gen Z Through](https://www.globalbankingandfinance.com/fintok-strategy-how-banks-are-reaching-gen-z-through-social-media/) - On "FinTok"—the finance corner of the app—short-form videos are changing how younger generations lea...

4. [Majority of TikTok 'Finfluencers' Breaking FCA Rules, Analysis Finds](https://ffnews.com/newsarticle/fintech/majority-of-tiktok-finfluencers-breaking-fca-rules-analysis-finds/) - Adclear analysis reveals that 68% of TikTok finfluencer videos reviewed in the UK breach FCA. Novemb...

5. [Full TikTok Marketing Guide For SaaS & Ecom (2025) - YouTube](https://www.youtube.com/watch?v=kO5lJQgBAWQ) - Work with me 1-on-1: https://intro.co/StevenCravotta In this Tiktok Marketing Guide I am going to sh...

6. [TikTok Creators Are Redefining the Future of Affiliate Marketing](https://www.affiliatesummit.com/blogs/tiktok-creators-are-redefining-the-future-of-affiliate-marketing) - TikTok creators are reshaping what affiliate marketing means—blending authenticity, community, and c...

7. [14 Best SaaS Organic TikTok Growth Strategies & Tactics (2025)](https://www.dansiepen.io/growth-checklists/saas-organic-tiktok-growth-strategies-tactics) - Sharing numerous strategies, experiments and tactical initiatives that SaaS brands can test for driv...

8. [SaaS Affiliate Program Benchmarks by Industry (2025 Report)](https://www.rewardful.com/articles/saas-affiliate-program-benchmarks) - Discover 2025 SaaS affiliate benchmarks and trends across industries (AI, B2B, and more) to optimize...

9. [How Did Robinhood Get 1 Million Users Before Launch With Just a ...](https://www.queueform.com/blog/how-did-robinhood-get-1-million-users-before-launch-with-just-a-waitlist) - Results: Over 1 million waitlist signups pre-launch; 6+ million users in 2 years mainly through refe...

10. [Robinhood's $10 Referral Strategy Boosts Growth - LinkedIn](https://www.linkedin.com/posts/charlesmonroe1_how-a-10-referral-turned-robinhood-into-activity-7402854067255119872-PxZZ) - Three metrics to watch: referral conversion rate, time-to-reward (hours), and viral K (how many invi...

11. [Get 1 Million Pre-Launch Users with a Powerful Referral Program](https://www.theflyy.com/blog/use-a-referral-program-to-get-1-million-users-on-the-waitlist-to-try-your-app-even-before-launch) - Acquiring users for an app is hard, but it's even harder when the app doesn't exist yet. This is the...

12. [[PDF] Robinhood 424 - Stifel](https://www.stifel.com/prospectusfiles/PD_4561.pdf) - We are offering 52,375,000 shares of our Class A common stock to be sold in the offering. The sellin...

13. [Webull Referral Program - FAQ Detail](https://www.webull.com/help/faq/10938-Webull-Referral-program) - The Webull Referral program rewards existing clients for introducing new customers. Participants can...

14. [Webull Q3 2025 presentation: Revenue jumps 55% as profitability ...](https://www.investing.com/news/company-news/webull-q3-2025-presentation-revenue-jumps-55-as-profitability-soars-93CH-4371881) - Webull reported total revenues of $156.9 million for Q3 2025, representing a 55% year-over-year incr...

15. [Public Referral Program - Public FAQ - Public Investing](https://help.public.com/en/articles/2711925-public-referral-program) - To qualify, the initial one-time deposit by your friend or family member must be in an amount of $1,...

16. [Acorns referral legit? Or a waste? - Reddit](https://www.reddit.com/r/acorns/comments/1ebc8g1/acorns_referral_legit_or_a_waste/) - For anyone doubting the referral bonuses/promotions · Would you recommend acorns to beginners? · Aco...

17. [The TikTok-First Brand Strategy: Building $100M DTC Without ...](https://maccelerator.la/en/blog/enterprise/tiktok-first-brand-strategy-building-dtc/) - High conversion rates: TikTok-first brands see rates of 2.5%, outperforming traditional methods. Con...

18. [How to use promo codes as a strategic lever on TikTok Shop](https://www.linkedin.com/posts/talha159_on-tiktok-shop-promo-codes-arent-just-activity-7376850470864297985-IOGw) - ⚡ The truth: In 2025, promo codes are more than a sales tactic. Used strategically, they boost conve...

19. [7 Powerful Referral Program Incentives for SaaS in 2025 - Refgrow](https://refgrow.com/blog/referral-program-incentives) - Discover 7 powerful referral program incentives to fuel your SaaS growth. Learn how cash, credits, a...

20. [15 Referral Program Best Practices You're Probably Overlooking in ...](https://viral-loops.com/blog/referral-program-best-practices-in-2025/) - Discover key strategies for a successful Referral Program Best Practices in 2025, focusing on two-si...

21. [TikTok Link in Bio Requirements: Complete 2026 Guide - Stan Store](https://stan.store/blog/tiktok-link-bio-requirements-2026-guide/) - Learn TikTok's link in bio requirements for 2026. Personal accounts need 1000+ followers, but busine...

22. [TikTok Link in Bio: How to Add and Optimize It in 2025 - Bitly](https://bitly.com/blog/tiktok-link-in-bio/) - Learn how to add and optimize your TikTok link in bio in 2025. Use Bitly to drive clicks, track perf...

23. [How To Do Affiliate Marketing on TikTok in 2025 - Mavely](https://www.joinmavely.com/blog/how-to-do-affiliate-marketing-tiktok/) - Single bio links; Comment links. You can test one at a time and track results, or place your affilia...

24. [Boost Sales with TikTok Shop Promotion Codes Today - JoinBrands](https://joinbrands.com/blog/tiktok-shop-promotion-codes/) - Conversion rate is your most important metric. Out of everyone who sees your promotion code, how man...

25. [What You Need to Know before Becoming a TikTok Shop Creator](https://seller-us.tiktok.com/university/essay?knowledge_id=7608640301074219&lang=en) - If you're an Affiliate creator or Marketing creator who applied for affiliate permission, you will b...

26. [Understanding TikTok Shop Affiliate Program Requirements](https://www.advertisepurple.com/understanding-tiktok-shop-affiliate-program-requirements/) - Learn the key TikTok Shop affiliate program requirements, from eligibility and content rules to comm...

27. [Creator Eligibility Policy - TikTok Shop Seller Center](https://seller-us.tiktok.com/university/essay?knowledge_id=6939143037667118&lang=en) - Official Shop Creators can only promote products from the bound TikTok Shop. They do not have access...

28. [Beacons vs Linktree 2026: Which Link-in-Bio Tool Is Best?](https://stackinfluence.com/blog/beacons-vs-linktree-2026-link-bio-tool-is-best) - Beacons provides more robust monetization tools, enabling actual in-page purchases, email capture, a...

29. [Honest Beacons vs Linktree Review for Creators and Brands](https://www.mobilocard.com/post/beacons-vs-linktree) - Both Beacons and Linktree turn a single social media link into multiple destinations, but they diffe...

30. [SEO: UTM Parameters Best Practices | TikTok Ads Manager](https://ads.tiktok.com/help/article/utm-parameters-best-practices) - Setting up UTMs in a URL can be prone to errors, including inconsistent naming, typos, or missing pa...

31. [About UTM Parameters | TikTok Ads Manager](https://ads.tiktok.com/help/article/track-offsite-web-events-with-utm-parameters) - UTM parameters are customizable text snippets added to the URL to track website traffic. They help y...

32. [Dark Social Is Driving 95% of Your Reach — And You're Ignoring It](https://www.viralnation.com/resources/blog/dark-social-is-the-conversation-youre-not-in-and-that-should-scare-every-major-brand) - Dark social is dominating how content is shared—but it's invisible to your analytics. Discover what ...

33. [Dark Social Attribution Problem: Complete Guide 2026 - Cometly](https://www.cometly.com/post/dark-social-attribution-problem) - Discover how the dark social attribution problem hides your best traffic sources in private messages...

34. [How to use promotion codes for referral tracking](https://help.rewardful.com/en/articles/9336630-how-to-use-promotion-codes-for-referral-tracking) - When customers check out using an affiliate's promotion code, Rewardful is able to track it and attr...

35. [Instructions for Promo Codes](https://app.getrewardful.com/instructions/b3b871a2-d024-4eb0-9ae3-56362185723f?platform=stripe_promo_codes) - Set up a discount for one or all of your campaigns. · Rewardful generates a new promo code for every...

36. [Dark Funnel vs. Dark Social: How to Track Hidden Traffic in 2026](https://insights.strategicabm.com/dark-funnel-vs-dark-social-how-to-track-hidden-traffic-in-2026) - This hidden activity is known as the Dark Funnel, and it explains why traditional attribution breaks...

37. [next auth with referral system : r/nextjs - Reddit](https://www.reddit.com/r/nextjs/comments/u4913s/next_auth_with_referral_system/) - I want to implement referral system with next auth. so a user can create a unique link to invite use...

38. [How to Use UTM Parameters to Track Social Media Campaigns](https://utmmanager.com/blog/how-to-use-utm-parameters-to-track-social-media-campaigns/) - Use UTM Manager to enforce naming rules, save templates, bulk-generate links, and share with your te...

39. [Best B2B Referral Software for SaaS (2026): Features, Pricing & Picks](https://cello.so/7-best-b2b-referral-software-2026-guide/) - Rewardful markets itself as the “two-scripts and done” way to bolt referrals onto a SaaS product: co...

40. [The Essential Modern Affiliate Tech Stack Guide - Rewardful](https://www.rewardful.com/articles/modern-affiliate-tech-stack) - A modern affiliate tech stack should be simple: track referrals accurately, automate commissions and...

41. [Best Affiliate Marketing Platforms For SaaS & Startups (Impact vs ...](https://www.youtube.com/watch?v=TeppNwkwlyE) - Best Affiliate Marketing Platforms For SaaS & Startups (Impact vs PartnerStack vs Rewardful vs Dub)....

42. [FirstPromoter vs Rewardful (2026) - Vibe Growth Stack](https://vibegrowthstack.io/compare/firstpromoter-vs-rewardful) - FirstPromoter vs Rewardful for startups — pricing, features, and honest verdict on which deserves yo...

43. [Rewardful vs FirstPromoter: Affiliate Marketing Comparison (2026)](https://efficient.app/compare/rewardful-vs-firstpromoter) - FirstPromoter comparison of Affiliate Marketing tool alternative Rewardful - The best comparison on ...

44. [Rewardful vs FirstPromoter: Which Affiliate Platform for SaaS?](https://refgrow.com/compare-competitors/rewardful-vs-firstpromoter) - Rewardful starts at $49/mo but charges up to 9% transaction fees. FirstPromoter starts at $99/mo wit...

45. [Double-sided incentives: how to apply coupons to referred customers](https://help.rewardful.com/en/articles/3024552-double-sided-incentives-how-to-apply-coupons-to-referred-customers) - Double-sided incentives allow you to automatically apply coupons to referred customers, which can bo...

46. [Dark Social Is Shaping Brand Growth & Visibility - NoGood](https://nogood.io/blog/dark-social/) - Dark social is reshaping how content spreads. Learn how hidden influence and community trust drive b...

47. [Simple (and free) attribution tracking in 200 lines of JavaScript](https://www.definite.app/blog/simple-sign-up-attribution) - This table will tie each user to a signup analytics record, allowing for deeper analysis of activati...

48. [How Robinhood Skyrocketed to 1 Million Users Before Launch](https://perkzilla.com/how-robinhood-skyrocketed-to-1-million-users-before-launch/) - Their solution was elegantly simple: a referral-powered waitlist. The Results Were Explosive: 10,000...

49. [10 Creative Ideas for Referral Programs in 2025 | LinkJolt Blog](https://www.linkjolt.io/blog/ideas-for-referral-programs) - Discover 10 actionable ideas for referral programs to boost your SaaS growth. Learn how to implement...

50. [21 Referral Program Ideas to Drive Viral Growth (2025 Edition)](https://www.queueform.com/blog/21-referral-program-ideas-to-drive-viral-growth-(2025-edition)) - 21 proven ideas include early access waitlists, milestone rewards, free products, discounts, store c...

51. [20 Gamified Brand Event Ideas That Actually Engage Gen Z](https://blog.anyroad.com/post/gamified-brand-gen-z-events) - 1. AR Scavenger Hunts With Real-Time Leaderboards · 2. Phygital Brand Quests With Tiered Rewards · 3...

52. [13 Best SaaS Referral Program Strategies & Optimisations (2025)](https://www.dansiepen.io/growth-checklists/saas-referral-program-strategies-optimisations) - ‍Multi-tiered‍. Progression of rewards - helps with motivating customers to refer more to unlock mor...

53. [The 4 Referral Program Categories for B2B SaaS (2025 Guide + ...](https://cello.so/4-categories-of-referral-programs-for-b2b-saas/) - Partner referrals can be subcategorized by affiliate, influencer, and value-added referral programs ...

54. [Top TikTok Affiliate Programs in 2025 | Boost Your Earnings](https://joinbrands.com/blog/tiktok-affiliate-programs/) - Creators can earn up to $2,000 for each successful referral, making it a potentially lucrative tikto...

55. [Public - TikTok](https://www.tiktok.com/@public) - Public (@public) on TikTok | 219.7K Likes. 67.7K Followers. Multi-asset investing. Industry-leading ...

56. [The Impact of Digital PR on Fintech Growth | 5W PR Agency Blog](https://www.5wpr.com/new/the-impact-of-digital-pr-on-fintech-growth/) - Discover how digital PR drives fintech growth with up to 68% increased brand visibility and 3x highe...

57. [Gen Z's love for 'finfluencers' is creating the perfect storm for brands](https://finance.yahoo.com/news/gen-z-love-finfluencers-creating-140000416.html) - Alongside Robinhood, this year has also seen Public Investing fined $350k by the US regulator FINRA ...

58. [SEC and FINRA Examples & Regulation of Financial Influencers In ...](https://awisee.com/blog/regulation-of-financial-influencers/) - A complete guide to regulation of financial influencers covering SEC rules, FINRA penalties, FINRA e...

59. [When Social Clout Meets Compliance: Finfluencers in FINRA's ...](https://www.sedric.ai/blog/when-social-clout-meets-compliance-finfluencers-in-finras-crosshairs) - Discover how FINRA is cracking down on finfluencers—and how Sedric's AI-powered compliance platform ...

