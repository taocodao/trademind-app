# TradeMind Composio Social Referral — Full Implementation Plan

**Stack:** Next.js 14+ (App Router) · TypeScript · Supabase · Stripe · Composio v3 · OpenAI GPT-4o-mini  
**Integration Scope:** LinkedIn · X/Twitter · Facebook · Instagram · TikTok  
**Built On:** TradeMind TikTok-First Viral Referral System (existing referral guide)

---

## Executive Summary

This plan layers a **Composio-powered AI social posting engine** directly on top of TradeMind's existing referral system. Users visit `/refer`, see their promo code and referral link, click **"Share on [Platform]"**, watch AI generate a platform-optimized post in 2 seconds, review/edit it, and post — all without leaving TradeMind.

**Two-mode architecture by tier:**

| Tier | Social Posting Mode | Platforms |
|---|---|---|
| All users (Bronze → Gold) | **Intent URL mode** — browser popup pre-filled with AI copy | LinkedIn, X, Facebook |
| All users (mobile) | **Web Share API** — native share sheet | All platforms |
| Diamond + Creator tier | **Composio direct post** — one-click, no browser redirect | LinkedIn, X, Facebook, Instagram |
| TikTok (all tiers) | **Clipboard copy** — TikTok is video-only; copy caption script | TikTok |

> **Why two modes?** Composio requires each user to complete a one-time OAuth flow per platform. For Bronze–Gold users, this friction is not worth it. For Diamond/Creator users who post multiple times per week, the one-click Composio flow is a meaningful upgrade worth gating behind the tier.

---

## Architecture Overview

```
/refer page (React Client Component)
│
├── Step 1: GET /api/referrals/my-code → fetch user's promo code + referral link
│
├── Step 2: User clicks "Share on [Platform]"
│           │
│           ├── Check: is user Diamond/Creator AND platform connected?
│           │           │
│           │           ├── YES → Composio Direct Post Flow
│           │           │         POST /api/social/generate (OpenAI)
│           │           │         POST /api/social/post (Composio execute tool)
│           │           │
│           │           └── NO  → Intent URL / Web Share / Clipboard Flow
│           │                     POST /api/social/generate (OpenAI)
│           │                     window.open(intentUrl) OR navigator.share() OR copy
│
└── Settings Panel: /settings/social-connections
            POST /api/composio/connect?platform=linkedin → returns redirectUrl
            GET  /api/composio/status?platform=linkedin  → returns connection status
```

---

## Phase 1: Supabase Schema Extensions

> These extend the migrations already defined in the TradeMind referral guide.

### 1.1 New Table: `social_connections`

```sql
-- Track which Composio connected account maps to each user+platform
CREATE TABLE IF NOT EXISTS social_connections (
  id                   SERIAL PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES user_settings(user_id) ON DELETE CASCADE,
  platform             TEXT NOT NULL CHECK (platform IN ('linkedin','twitter','facebook','instagram','tiktok')),
  composio_account_id  TEXT,                          -- Composio ca_ nano ID
  status               TEXT DEFAULT 'disconnected',   -- 'disconnected' | 'initiated' | 'active' | 'expired'
  connected_at         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_social_connections_user_id ON social_connections(user_id);

-- Track AI-generated post history for analytics
CREATE TABLE IF NOT EXISTS social_posts (
  id              SERIAL PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES user_settings(user_id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,
  post_content    TEXT NOT NULL,
  promo_code      TEXT NOT NULL,
  referral_link   TEXT NOT NULL,
  posted_via      TEXT NOT NULL CHECK (posted_via IN ('composio','intent_url','clipboard','web_share')),
  posted_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON social_posts(user_id);
```

---

## Phase 2: Environment Variables

Add these to your `.env.local` and Vercel project settings:

```bash
# Composio
COMPOSIO_API_KEY=your_composio_api_key_here

# Composio Auth Config IDs (create one per platform in dashboard.composio.dev)
# Auth Configs → Create Auth Config → Select platform → Copy nano ID (ac_XXXX)
COMPOSIO_AUTH_CONFIG_LINKEDIN=ac_xxxxxxxx
COMPOSIO_AUTH_CONFIG_TWITTER=ac_xxxxxxxx
COMPOSIO_AUTH_CONFIG_FACEBOOK=ac_xxxxxxxx
COMPOSIO_AUTH_CONFIG_INSTAGRAM=ac_xxxxxxxx

# OpenAI (already present — reuse existing key)
OPENAI_API_KEY=your_openai_api_key_here

# App
NEXT_PUBLIC_APP_URL=https://trademind.bot
```

---

## Phase 3: Composio Dashboard Setup

Before writing any code, complete this one-time setup in [dashboard.composio.dev](https://dashboard.composio.dev):

### 3.1 Create Auth Configs (one per platform)

1. Navigate to **Auth Configs → Create Auth Config**
2. For each platform, create a config and copy the `ac_XXXX` nano ID into your `.env`:

| Platform | Toolkit Slug | Auth Method | Required Scopes |
|---|---|---|---|
| LinkedIn | `linkedin` | OAuth2 | `w_member_social`, `r_liteprofile` |
| X/Twitter | `twitter` | OAuth2 | `tweet.write`, `users.read` |
| Facebook | `facebook` | OAuth2 | `pages_manage_posts`, `publish_pages` |
| Instagram | `instagram` | OAuth2 | `instagram_basic`, `instagram_content_publish` |

> **Composio Managed Auth (Recommended for Launch):** For testing and early production, use Composio's managed OAuth credentials. You do NOT need your own developer app for LinkedIn, X, or Facebook initially. Switch to your own OAuth apps before scaling past 1,000 users to enable white-labeling.

> **TikTok Note:** TikTok is a **video platform**. The Composio TikTok toolkit supports uploading video files (`TIKTOK_UPLOAD_VIDEO`) and photo carousels (`TIKTOK_POST_PHOTO`) — not text-only posts. For the TradeMind use case, TikTok sharing always uses the **clipboard copy** approach: AI generates a spoken-word caption script, and the user copies it to use in their TikTok recording. No Composio auth config needed for TikTok.

### 3.2 Set Callback URL

For all OAuth-based auth configs, Composio automatically uses:
```
https://backend.composio.dev/api/v3/toolkits/auth/callback
```
After auth completes, Composio redirects to your specified `redirectUrl` with `?status=success&connectedAccountId=ca_XXXX`.

---

## Phase 4: Composio SDK Library (`lib/composio.ts`)

```typescript
// lib/composio.ts
import { Composio } from '@composio/core';

// Singleton — reuse across requests
let composioClient: Composio | null = null;

export function getComposioClient(): Composio {
  if (!composioClient) {
    if (!process.env.COMPOSIO_API_KEY) {
      throw new Error('COMPOSIO_API_KEY is not set');
    }
    composioClient = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY,
    });
  }
  return composioClient;
}

// Platform → Composio auth config ID mapping
export const COMPOSIO_AUTH_CONFIGS: Record<string, string> = {
  linkedin:  process.env.COMPOSIO_AUTH_CONFIG_LINKEDIN  ?? '',
  twitter:   process.env.COMPOSIO_AUTH_CONFIG_TWITTER   ?? '',
  facebook:  process.env.COMPOSIO_AUTH_CONFIG_FACEBOOK  ?? '',
  instagram: process.env.COMPOSIO_AUTH_CONFIG_INSTAGRAM ?? '',
};

// Platform → Composio tool slug mapping
export const PLATFORM_TOOL_SLUGS: Record<string, string> = {
  linkedin:  'LINKEDIN_CREATE_LINKEDIN_POST',
  twitter:   'TWITTER_CREATE_TWEET',
  facebook:  'FACEBOOK_CREATE_POST',
  instagram: 'INSTAGRAM_CREATE_POST',
};

// Platform → character limits and constraints
export const PLATFORM_CONSTRAINTS = {
  linkedin:  { maxChars: 3000, supportsLinks: true,  supportsHashtags: true },
  twitter:   { maxChars: 280,  supportsLinks: true,  supportsHashtags: true },
  facebook:  { maxChars: 63206, supportsLinks: true, supportsHashtags: true },
  instagram: { maxChars: 2200, supportsLinks: false, supportsHashtags: true },
  tiktok:    { maxChars: 2200, supportsLinks: false, supportsHashtags: true },
} as const;

export type SocialPlatform = 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'tiktok';
```

---

## Phase 5: API Routes

### 5.1 Initiate Platform Connection

**`app/api/composio/connect/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getComposioClient, COMPOSIO_AUTH_CONFIGS } from '@/lib/composio';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { platform } = await req.json();
    const validPlatforms = ['linkedin', 'twitter', 'facebook', 'instagram'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    const authConfigId = COMPOSIO_AUTH_CONFIGS[platform];
    if (!authConfigId) {
      return NextResponse.json(
        { error: `Auth config not configured for ${platform}` },
        { status: 500 }
      );
    }

    const composio = getComposioClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    // Initiate the OAuth connection — returns a redirect URL for the user
    const connectionRequest = await composio.connectedAccounts.initiate(
      user.id,   // Composio userId = Supabase user.id (consistent scoping)
      authConfigId,
      {
        redirectUrl: `${appUrl}/settings/social-connections?platform=${platform}&status=callback`,
      }
    );

    // Persist "initiated" state to Supabase
    await supabase
      .from('social_connections')
      .upsert({
        user_id: user.id,
        platform,
        status: 'initiated',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,platform' });

    return NextResponse.json({
      redirectUrl: connectionRequest.redirectUrl,
    });

  } catch (error) {
    console.error('[composio/connect] Error:', error);
    return NextResponse.json({ error: 'Failed to initiate connection' }, { status: 500 });
  }
}
```

---

### 5.2 OAuth Callback Handler

**`app/api/composio/callback/route.ts`**

This route is called by your redirect URL after Composio completes OAuth. Store the `connectedAccountId`.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getComposioClient } from '@/lib/composio';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const searchParams = req.nextUrl.searchParams;
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const connectedAccountId = searchParams.get('connectedAccountId'); // ca_XXXX from Composio

    if (status !== 'success' || !connectedAccountId || !platform) {
      return NextResponse.redirect(
        new URL(`/settings/social-connections?error=auth_failed&platform=${platform}`, req.url)
      );
    }

    // Verify the connection is actually ACTIVE via Composio API
    const composio = getComposioClient();
    const account = await composio.connectedAccounts.get(connectedAccountId);

    if (account.status !== 'ACTIVE') {
      return NextResponse.redirect(
        new URL(`/settings/social-connections?error=not_active&platform=${platform}`, req.url)
      );
    }

    // Persist ACTIVE connection with Composio account ID
    await supabase
      .from('social_connections')
      .upsert({
        user_id: user.id,
        platform,
        composio_account_id: connectedAccountId,
        status: 'active',
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,platform' });

    return NextResponse.redirect(
      new URL(`/settings/social-connections?success=true&platform=${platform}`, req.url)
    );

  } catch (error) {
    console.error('[composio/callback] Error:', error);
    return NextResponse.redirect(new URL('/settings/social-connections?error=server_error', req.url));
  }
}
```

---

### 5.3 Check Connection Status

**`app/api/composio/status/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getComposioClient } from '@/lib/composio';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const platform = req.nextUrl.searchParams.get('platform');

    // Fetch all platform connections for this user
    const query = supabase
      .from('social_connections')
      .select('platform, composio_account_id, status, connected_at')
      .eq('user_id', user.id);

    if (platform) query.eq('platform', platform);

    const { data: connections, error } = await query;
    if (error) throw error;

    // For ACTIVE connections, verify with Composio in real-time (re-check token status)
    const composio = getComposioClient();
    const statusMap: Record<string, { status: string; connectedAt: string | null }> = {};

    for (const conn of connections ?? []) {
      if (conn.status === 'active' && conn.composio_account_id) {
        try {
          const account = await composio.connectedAccounts.get(conn.composio_account_id);
          const liveStatus = account.status === 'ACTIVE' ? 'active' : 'expired';

          // Sync back to DB if status changed
          if (liveStatus !== conn.status) {
            await supabase
              .from('social_connections')
              .update({ status: liveStatus, updated_at: new Date().toISOString() })
              .eq('user_id', user.id)
              .eq('platform', conn.platform);
          }

          statusMap[conn.platform] = { status: liveStatus, connectedAt: conn.connected_at };
        } catch {
          statusMap[conn.platform] = { status: 'expired', connectedAt: conn.connected_at };
        }
      } else {
        statusMap[conn.platform] = { status: conn.status, connectedAt: conn.connected_at };
      }
    }

    return NextResponse.json({ connections: statusMap });

  } catch (error) {
    console.error('[composio/status] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch connection status' }, { status: 500 });
  }
}
```

---

### 5.4 Disconnect Platform

**`app/api/composio/disconnect/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getComposioClient } from '@/lib/composio';

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { platform } = await req.json();

    // Get the composio_account_id from DB
    const { data: conn } = await supabase
      .from('social_connections')
      .select('composio_account_id')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .single();

    if (conn?.composio_account_id) {
      const composio = getComposioClient();
      try {
        await composio.connectedAccounts.delete(conn.composio_account_id);
      } catch {
        // Continue even if Composio delete fails — clean up DB regardless
      }
    }

    await supabase
      .from('social_connections')
      .update({
        status: 'disconnected',
        composio_account_id: null,
        connected_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('platform', platform);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[composio/disconnect] Error:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
```

---

### 5.5 AI Post Generation

**`app/api/social/generate/route.ts`**

This is the most important route — it calls OpenAI to craft platform-specific promotional copy that naturally includes the user's promo code and referral link.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { SocialPlatform, PLATFORM_CONSTRAINTS } from '@/lib/composio';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Platform-specific system prompts
const PLATFORM_SYSTEM_PROMPTS: Record<SocialPlatform, string> = {
  linkedin: `You are a professional LinkedIn content writer specializing in fintech and trading.
Write a LinkedIn post for a user promoting TradeMind.bot, an AI-powered options trading signal platform.
The post should:
- Start with a strong, curiosity-driven hook about trading results or insights
- Share 2-3 specific value points about TradeMind's features (AI signals, options strategies, real-time alerts)
- Include the referral link and promo code naturally in the body
- End with a professional CTA to sign up
- Use 2-4 relevant hashtags: #OptionsTrading #Fintech #TradeMind #AITrading
- Be 200-400 words, formatted with line breaks for readability
- Tone: professional but approachable, first-person experience
- IMPORTANT: Always include the disclaimer "Not financial advice." at the end`,

  twitter: `You are a punchy Twitter/X copywriter for fintech content.
Write a tweet promoting TradeMind.bot (AI options trading signals). 
Rules:
- MUST be under 250 characters (leave room for the link)
- Start with a hook: a surprising stat, bold claim, or relatable pain point
- Include the promo code inline, e.g. "Use code ALPHA49 for 14 days free"
- Max 2 hashtags: #OptionsTrading #TradeMind
- Casual, Gen Z-friendly tone
- End with the referral link
- Add: "Not financial advice."
Keep it punchy — cut every word that isn't earning its place.`,

  facebook: `You are a conversational Facebook post writer for a fintech trading app.
Write a Facebook post promoting TradeMind.bot (AI-powered options trading signals).
The post should:
- Open like a story or personal update ("I've been using this for 3 months...")
- Describe how TradeMind helped with trading decisions
- Include the referral link and mention the promo code clearly
- Be friendly, human, slightly casual — like a post from a friend
- 150-300 words
- Include 2-3 emojis naturally placed
- End with a clear CTA and the promo code
- Add: "Not financial advice." at the end`,

  instagram: `You are an Instagram caption writer for a fintech trading brand.
Write an Instagram caption promoting TradeMind.bot (AI options trading signals).
Rules:
- Note: Instagram captions don't support clickable links — instead say "Link in bio" and mention the promo code
- Start with a single strong hook line (the first line is critical on IG)
- Use emojis throughout to break up text
- 5-8 relevant hashtags at the END of the caption: #OptionsTrading #Fintech #TradeMind #StockMarket #TradingSignals #AITrading #InvestSmart
- 100-200 words of caption body
- Clear CTA: "Sign up at the link in bio — use code [PROMO CODE] for free days!"
- Add: "Not financial advice." near the end`,

  tiktok: `You are a TikTok script writer for fintech content targeting Gen Z.
Write a TikTok video caption/script for promoting TradeMind.bot (AI options trading signals).
Format: Write TWO things:
1. SPOKEN SCRIPT (3-5 sentences) — What the creator says on camera. 
   Use TikTok speech patterns: "POV:", "Not gonna lie...", "Here's the thing...", "If you're into trading..."
   Include the promo code naturally: "Go to trademind.bot and use code [PROMO CODE]"
2. CAPTION (under 150 chars) — The actual TikTok post caption with hashtags
   Include: #FinTok #TradingTips #OptionsTrading #TradeMind #StockTok
Label them clearly as "SPOKEN SCRIPT:" and "CAPTION:"
Tone: raw, authentic, direct — like a Gen Z creator talking to camera, not an ad.
Add: "Not financial advice." to the spoken script.`,
};

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { platform, customContext } = await req.json() as {
      platform: SocialPlatform;
      customContext?: string; // Optional: user adds context ("I made 3 winning trades this week")
    };

    // Fetch user's referral code and referral link
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('referral_code, referral_tier')
      .eq('user_id', user.id)
      .single();

    if (!userSettings?.referral_code) {
      return NextResponse.json({ error: 'No referral code found' }, { status: 400 });
    }

    const promoCode = userSettings.referral_code;
    const referralLink = `${process.env.NEXT_PUBLIC_APP_URL}/?ref=${promoCode}&utm_source=${platform}&utm_medium=social&utm_campaign=referral`;
    const constraints = PLATFORM_CONSTRAINTS[platform];

    const userMessage = `
Generate a ${platform} post for me (a TradeMind user) to share on my social media.

My referral/promo code: ${promoCode}
My referral link: ${referralLink}
${customContext ? `Additional context to include: ${customContext}` : ''}

Character limit: ${constraints.maxChars} characters
${!constraints.supportsLinks ? 'NOTE: This platform does not support clickable links in posts — say "link in bio" or just mention the URL as text.' : ''}

Make the post authentic, like it's coming from a real user who genuinely uses and likes TradeMind.
`.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-efficient for high-frequency generation
      messages: [
        { role: 'system', content: PLATFORM_SYSTEM_PROMPTS[platform] },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 600,
      temperature: 0.8, // Some creativity variation each time
    });

    const generatedPost = completion.choices[0].message.content?.trim() ?? '';

    // Log to social_posts table for analytics
    await supabase.from('social_posts').insert({
      user_id: user.id,
      platform,
      post_content: generatedPost,
      promo_code: promoCode,
      referral_link: referralLink,
      posted_via: 'generated', // Updated to 'composio' or 'intent_url' when actually posted
    });

    return NextResponse.json({
      post: generatedPost,
      promoCode,
      referralLink,
      platform,
      charCount: generatedPost.length,
      maxChars: constraints.maxChars,
    });

  } catch (error) {
    console.error('[social/generate] Error:', error);
    return NextResponse.json({ error: 'Failed to generate post' }, { status: 500 });
  }
}
```

---

### 5.6 Composio Direct Post Execution (Diamond/Creator Tier)

**`app/api/social/post/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getComposioClient, PLATFORM_TOOL_SLUGS, SocialPlatform } from '@/lib/composio';

// Map platform → tool parameters builder
function buildToolParams(platform: SocialPlatform, postContent: string, authorId?: string) {
  switch (platform) {
    case 'linkedin':
      return {
        text: postContent,
        visibility: 'PUBLIC',
        // author (authorId) is injected by Composio from the connected account
      };
    case 'twitter':
      return {
        text: postContent,
      };
    case 'facebook':
      return {
        message: postContent,
      };
    case 'instagram':
      return {
        caption: postContent,
        // Instagram requires a media container first — text-only not supported
        // This route handles caption posting only; image upload is a separate flow
        media_type: 'IMAGE',
      };
    default:
      throw new Error(`Platform ${platform} not supported for direct posting`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check user tier — only Diamond and Creator can use Composio direct posting
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('referral_tier, is_creator')
      .eq('user_id', user.id)
      .single();

    const isDiamond = userSettings?.referral_tier === 'diamond';
    const isCreator = userSettings?.is_creator === true;

    if (!isDiamond && !isCreator) {
      return NextResponse.json(
        { error: 'Direct posting requires Diamond tier or Creator status', upgradeRequired: true },
        { status: 403 }
      );
    }

    const { platform, postContent, promoCode, referralLink } = await req.json() as {
      platform: SocialPlatform;
      postContent: string;
      promoCode: string;
      referralLink: string;
    };

    if (platform === 'tiktok') {
      return NextResponse.json(
        { error: 'TikTok direct posting not supported — use clipboard copy instead' },
        { status: 400 }
      );
    }

    // Check that this user has an ACTIVE Composio connection for this platform
    const { data: connection } = await supabase
      .from('social_connections')
      .select('composio_account_id, status')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .single();

    if (!connection || connection.status !== 'active' || !connection.composio_account_id) {
      return NextResponse.json(
        {
          error: 'Platform not connected',
          needsConnection: true,
          platform,
        },
        { status: 402 }
      );
    }

    const composio = getComposioClient();
    const toolSlug = PLATFORM_TOOL_SLUGS[platform];
    const toolParams = buildToolParams(platform, postContent);

    // Execute the Composio tool — posts directly to the user's social account
    const result = await composio.tools.execute(
      toolSlug,
      user.id,             // Composio userId (matches user.id used during OAuth)
      toolParams,
      {
        connectedAccountId: connection.composio_account_id, // Explicit account scoping
      }
    );

    // Update social_posts record to mark as actually posted
    await supabase
      .from('social_posts')
      .insert({
        user_id: user.id,
        platform,
        post_content: postContent,
        promo_code: promoCode,
        referral_link: referralLink,
        posted_via: 'composio',
        posted_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      result,
      message: `Successfully posted to ${platform}`,
    });

  } catch (error: any) {
    console.error('[social/post] Error:', error);

    // Handle Composio-specific errors
    if (error?.message?.includes('EXPIRED') || error?.status === 401) {
      return NextResponse.json(
        { error: 'Connection expired — please reconnect your account', reconnectRequired: true },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: 'Failed to post to social media' }, { status: 500 });
  }
}
```

---

## Phase 6: Frontend — `ShareModal` React Component

**`components/referral/ShareModal.tsx`**

This is the primary UI that users see on `/refer` when they click "Share on [Platform]".

```tsx
'use client';

import { useState, useCallback } from 'react';
import { SocialPlatform } from '@/lib/composio';

interface ShareModalProps {
  promoCode: string;
  referralLink: string;
  userTier: 'bronze' | 'silver' | 'gold' | 'diamond';
  isCreator: boolean;
  connectedPlatforms: Record<string, { status: string }>;
  onClose: () => void;
}

const PLATFORM_CONFIG = {
  linkedin:  { label: 'LinkedIn',  emoji: '💼', color: '#0A66C2', supportsDirectPost: true  },
  twitter:   { label: 'X/Twitter', emoji: '🐦', color: '#000000', supportsDirectPost: true  },
  facebook:  { label: 'Facebook',  emoji: '📘', color: '#1877F2', supportsDirectPost: true  },
  instagram: { label: 'Instagram', emoji: '📸', color: '#E1306C', supportsDirectPost: true  },
  tiktok:    { label: 'TikTok',    emoji: '🎵', color: '#000000', supportsDirectPost: false },
} as const;

// Build platform intent URLs with pre-filled text
function buildIntentUrl(platform: SocialPlatform, postContent: string, referralLink: string): string {
  const encoded = encodeURIComponent(postContent);
  const encodedUrl = encodeURIComponent(referralLink);
  switch (platform) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encoded}`;
    case 'linkedin':
      return `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&summary=${encoded}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encoded}`;
    case 'instagram':
      return ''; // Instagram has no web intent URL — use clipboard
    case 'tiktok':
      return ''; // TikTok has no web intent URL — use clipboard
    default:
      return '';
  }
}

export function ShareModal({
  promoCode, referralLink, userTier, isCreator, connectedPlatforms, onClose
}: ShareModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);
  const [generatedPost, setGeneratedPost] = useState('');
  const [editedPost, setEditedPost] = useState('');
  const [customContext, setCustomContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [error, setError] = useState('');

  const canUseDirectPost = userTier === 'diamond' || isCreator;

  const isPlatformConnected = (platform: SocialPlatform) =>
    connectedPlatforms[platform]?.status === 'active';

  const handleSelectPlatform = useCallback(async (platform: SocialPlatform) => {
    setSelectedPlatform(platform);
    setGeneratedPost('');
    setEditedPost('');
    setError('');
    setPostSuccess(false);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedPlatform) return;
    setIsGenerating(true);
    setError('');

    try {
      const res = await fetch('/api/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: selectedPlatform, customContext }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGeneratedPost(data.post);
      setEditedPost(data.post);
    } catch (err: any) {
      setError(err.message || 'Failed to generate post');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedPlatform, customContext]);

  const handleDirectPost = useCallback(async () => {
    if (!selectedPlatform || !editedPost) return;
    setIsPosting(true);
    setError('');

    try {
      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          postContent: editedPost,
          promoCode,
          referralLink,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsConnection) {
          setError(`Connect your ${selectedPlatform} account first in Settings → Social Connections`);
          return;
        }
        throw new Error(data.error);
      }
      setPostSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to post');
    } finally {
      setIsPosting(false);
    }
  }, [selectedPlatform, editedPost, promoCode, referralLink]);

  const handleIntentUrlPost = useCallback(() => {
    if (!selectedPlatform || !editedPost) return;
    const url = buildIntentUrl(selectedPlatform, editedPost, referralLink);
    if (url) {
      window.open(url, '_blank', 'width=600,height=500,noopener,noreferrer');
    }
  }, [selectedPlatform, editedPost, referralLink]);

  const handleWebShare = useCallback(async () => {
    if (!editedPost) return;
    try {
      await navigator.share({ text: editedPost, url: referralLink });
    } catch {
      // User cancelled or API not available — fall back to clipboard
      handleCopy();
    }
  }, [editedPost, referralLink]);

  const handleCopy = useCallback(async () => {
    if (!editedPost) return;
    await navigator.clipboard.writeText(editedPost);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  }, [editedPost]);

  // Determine CTA based on platform and user tier
  const getPostCTA = () => {
    if (!selectedPlatform) return null;
    const platform = selectedPlatform;
    const isConnected = isPlatformConnected(platform);
    const config = PLATFORM_CONFIG[platform];

    if (platform === 'tiktok') {
      return (
        <button onClick={handleCopy} className="btn-primary">
          {copySuccess ? '✅ Copied!' : '📋 Copy Caption Script'}
        </button>
      );
    }

    if (platform === 'instagram') {
      return (
        <div className="cta-group">
          {canUseDirectPost && isConnected ? (
            <button onClick={handleDirectPost} disabled={isPosting} className="btn-primary">
              {isPosting ? 'Posting...' : '🚀 Post to Instagram'}
            </button>
          ) : null}
          <button onClick={handleCopy} className="btn-secondary">
            {copySuccess ? '✅ Copied!' : '📋 Copy Caption'}
          </button>
          <p className="hint">Paste into your Instagram app and add a photo</p>
        </div>
      );
    }

    // LinkedIn, Twitter, Facebook
    if (canUseDirectPost && isConnected) {
      return (
        <div className="cta-group">
          <button onClick={handleDirectPost} disabled={isPosting} className="btn-primary">
            {isPosting ? 'Posting...' : `🚀 Post to ${config.label}`}
          </button>
          <button onClick={handleIntentUrlPost} className="btn-secondary">
            ↗ Open in {config.label}
          </button>
        </div>
      );
    }

    return (
      <div className="cta-group">
        <button onClick={handleIntentUrlPost} className="btn-primary">
          ↗ Share on {config.label}
        </button>
        {canUseDirectPost && !isConnected && (
          <p className="upgrade-hint">
            <a href="/settings/social-connections">Connect your {config.label} account</a> for one-click posting
          </p>
        )}
        {!canUseDirectPost && (
          <p className="upgrade-hint">
            Reach Diamond tier to unlock one-click posting 💎
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Share Your Referral Code</h2>
          <p>Your code: <strong>{promoCode}</strong> · Earn rewards for every signup!</p>
          <button onClick={onClose} aria-label="Close" className="modal-close">✕</button>
        </div>

        {/* Step 1: Platform Selection */}
        <div className="platform-grid">
          {(Object.keys(PLATFORM_CONFIG) as SocialPlatform[]).map((platform) => {
            const config = PLATFORM_CONFIG[platform];
            const isConnected = isPlatformConnected(platform);
            return (
              <button
                key={platform}
                onClick={() => handleSelectPlatform(platform)}
                className={`platform-btn ${selectedPlatform === platform ? 'selected' : ''}`}
                style={{ borderColor: selectedPlatform === platform ? config.color : undefined }}
              >
                <span className="platform-emoji">{config.emoji}</span>
                <span className="platform-label">{config.label}</span>
                {canUseDirectPost && isConnected && platform !== 'tiktok' && (
                  <span className="connected-badge">⚡</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Step 2: Optional Context + Generate */}
        {selectedPlatform && !generatedPost && (
          <div className="generate-section">
            <label htmlFor="customContext">
              Add personal context (optional):
            </label>
            <input
              id="customContext"
              type="text"
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder='e.g. "I made 3 winning trades last week using TradeMind signals"'
              className="context-input"
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-generate"
            >
              {isGenerating
                ? '✨ Generating...'
                : `✨ Generate ${PLATFORM_CONFIG[selectedPlatform].label} Post`}
            </button>
          </div>
        )}

        {/* Step 3: Review & Edit */}
        {generatedPost && (
          <div className="post-editor">
            <div className="editor-header">
              <label htmlFor="postEditor">Review & edit your post:</label>
              <button onClick={handleGenerate} className="regenerate-btn" disabled={isGenerating}>
                {isGenerating ? '...' : '🔄 Regenerate'}
              </button>
            </div>
            <textarea
              id="postEditor"
              value={editedPost}
              onChange={(e) => setEditedPost(e.target.value)}
              rows={8}
              className="post-textarea"
            />
            <div className="char-count">
              {editedPost.length} / {PLATFORM_CONFIG[selectedPlatform!]?.label === 'X/Twitter' ? 280 : '∞'} chars
            </div>
          </div>
        )}

        {/* Error / Success States */}
        {error && <div className="error-banner" role="alert">{error}</div>}
        {postSuccess && (
          <div className="success-banner" role="status">
            ✅ Posted successfully! Watch your referrals grow.
          </div>
        )}

        {/* Step 4: Post CTA */}
        {generatedPost && !postSuccess && (
          <div className="modal-footer">
            {getPostCTA()}
            <div className="secondary-actions">
              <button onClick={handleCopy} className="btn-ghost">
                {copySuccess ? '✅ Copied!' : '📋 Copy Text'}
              </button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button onClick={handleWebShare} className="btn-ghost">
                  📤 Share...
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Phase 7: Social Connections Settings Page

**`app/settings/social-connections/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server';
import { SocialConnectionsClient } from './SocialConnectionsClient';

export default async function SocialConnectionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: connections } = await supabase
    .from('social_connections')
    .select('platform, status, connected_at')
    .eq('user_id', user.id);

  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('referral_tier, is_creator')
    .eq('user_id', user.id)
    .single();

  const connectionMap = Object.fromEntries(
    (connections ?? []).map((c) => [c.platform, c])
  );

  return (
    <SocialConnectionsClient
      initialConnections={connectionMap}
      userTier={userSettings?.referral_tier ?? 'bronze'}
      isCreator={userSettings?.is_creator ?? false}
    />
  );
}
```

**`app/settings/social-connections/SocialConnectionsClient.tsx`**

```tsx
'use client';

import { useState } from 'react';

const PLATFORMS = [
  { id: 'linkedin',  label: 'LinkedIn',  emoji: '💼', note: 'Post professional trading insights' },
  { id: 'twitter',   label: 'X/Twitter', emoji: '🐦', note: 'Share quick trading tips & signals' },
  { id: 'facebook',  label: 'Facebook',  emoji: '📘', note: 'Reach your wider social network' },
  { id: 'instagram', label: 'Instagram', emoji: '📸', note: 'Share visual content with captions' },
  { id: 'tiktok',    label: 'TikTok',    emoji: '🎵', note: 'Script generator only (clipboard)' },
];

export function SocialConnectionsClient({ initialConnections, userTier, isCreator }: {
  initialConnections: Record<string, { status: string; connected_at: string | null }>;
  userTier: string;
  isCreator: boolean;
}) {
  const [connections, setConnections] = useState(initialConnections);
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);

  const canConnect = userTier === 'diamond' || isCreator;

  const handleConnect = async (platform: string) => {
    if (platform === 'tiktok') return; // TikTok is clipboard-only
    setLoadingPlatform(platform);
    try {
      const res = await fetch('/api/composio/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      const { redirectUrl, error } = await res.json();
      if (error) throw new Error(error);
      // Redirect to Composio OAuth page
      window.location.href = redirectUrl;
    } catch (err: any) {
      alert(`Failed to connect: ${err.message}`);
    } finally {
      setLoadingPlatform(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!confirm(`Disconnect your ${platform} account?`)) return;
    setLoadingPlatform(platform);
    try {
      await fetch('/api/composio/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      setConnections((prev) => ({
        ...prev,
        [platform]: { status: 'disconnected', connected_at: null },
      }));
    } catch (err: any) {
      alert(`Failed to disconnect: ${err.message}`);
    } finally {
      setLoadingPlatform(null);
    }
  };

  return (
    <div className="settings-page">
      <h1>Social Media Connections</h1>
      <p className="subtitle">
        Connect your accounts for one-click referral posting.
        {!canConnect && (
          <span className="tier-gate">
            {' '}Reach Diamond tier (15 referrals) to unlock one-click posting. 💎
          </span>
        )}
      </p>

      <div className="connections-list">
        {PLATFORMS.map(({ id, label, emoji, note }) => {
          const conn = connections[id];
          const isActive = conn?.status === 'active';
          const isLoading = loadingPlatform === id;
          const isTikTok = id === 'tiktok';

          return (
            <div key={id} className={`connection-card ${isActive ? 'connected' : ''}`}>
              <div className="platform-info">
                <span className="platform-icon">{emoji}</span>
                <div>
                  <h3>{label}</h3>
                  <p className="platform-note">{note}</p>
                  {isActive && conn?.connected_at && (
                    <p className="connected-since">
                      Connected {new Date(conn.connected_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="connection-action">
                {isTikTok ? (
                  <span className="badge-info">Clipboard Only</span>
                ) : isActive ? (
                  <button
                    onClick={() => handleDisconnect(id)}
                    disabled={isLoading}
                    className="btn-disconnect"
                  >
                    {isLoading ? 'Disconnecting...' : '✓ Connected · Disconnect'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(id)}
                    disabled={isLoading || !canConnect}
                    className="btn-connect"
                    title={!canConnect ? 'Reach Diamond tier to unlock' : ''}
                  >
                    {isLoading ? 'Connecting...' : `Connect ${label}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Phase 8: Integration with Existing `/refer` Dashboard

Extend the existing `/refer` page to include the **ShareModal** and a "Share Your Code" section directly above the tier progress bar.

**`app/refer/page.tsx`** — Add to your existing page:

```tsx
import { ShareSection } from '@/components/referral/ShareSection';

// Inside your existing refer page, add:
<ShareSection
  promoCode={userSettings.referral_code}
  referralLink={`${process.env.NEXT_PUBLIC_APP_URL}/?ref=${userSettings.referral_code}`}
  userTier={userSettings.referral_tier}
  isCreator={userSettings.is_creator}
/>
```

**`components/referral/ShareSection.tsx`**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { ShareModal } from './ShareModal';

export function ShareSection({ promoCode, referralLink, userTier, isCreator }: {
  promoCode: string;
  referralLink: string;
  userTier: string;
  isCreator: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, any>>({});
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    // Fetch connection status on mount
    fetch('/api/composio/status')
      .then((r) => r.json())
      .then((data) => setConnectedPlatforms(data.connections ?? {}))
      .catch(console.error);
  }, []);

  const copyCode = async () => {
    await navigator.clipboard.writeText(promoCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  return (
    <div className="share-section">
      <div className="promo-code-display">
        <span className="code-label">Your Promo Code</span>
        <div className="code-row">
          <span className="code-value">{promoCode}</span>
          <button onClick={copyCode} className="copy-btn">
            {copiedCode ? '✅ Copied!' : '📋 Copy'}
          </button>
        </div>
        <p className="code-hint">
          Share this code anywhere — even in TikTok videos without a link!
        </p>
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="share-cta-btn"
      >
        ✨ Create AI-Generated Social Post
      </button>

      {showModal && (
        <ShareModal
          promoCode={promoCode}
          referralLink={referralLink}
          userTier={userTier as any}
          isCreator={isCreator}
          connectedPlatforms={connectedPlatforms}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
```

---

## Phase 9: Full Package Dependencies

```json
{
  "dependencies": {
    "@composio/core": "^0.5.4",
    "openai": "^4.0.0",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.0.0",
    "next": "^14.0.0",
    "react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

Install:
```bash
npm install @composio/core openai
```

---

## Phase 10: Platform-Specific Implementation Notes

### LinkedIn
- Composio tool: `LINKEDIN_CREATE_LINKEDIN_POST`
- Required param: `text` (string, max 3000 chars)
- Author ID is auto-resolved from the connected account
- Professional tone; posts with links get deprioritized in algorithm — put link in first comment for better reach

### X / Twitter
- Composio tool: `TWITTER_CREATE_TWEET`
- Required param: `text` (string, max 280 chars)
- The AI generation prompt hard-caps output at 250 chars to leave room for the link
- For media tweets, pass `media_ids` array

### Facebook
- Composio tool: `FACEBOOK_CREATE_POST`
- Required param: `message` (string)
- Note: Composio's Facebook integration posts to a **Facebook Page**, not a personal profile, due to Meta API restrictions. Users must have a Facebook Page to use direct posting.

### Instagram
- Composio tool: `INSTAGRAM_CREATE_POST`
- Instagram API requires a **media container** before publishing — text-only posts are not supported
- For text + image posts: first call `INSTAGRAM_CREATE_MEDIA_CONTAINER` with image URL, then `INSTAGRAM_CREATE_POST` with the container ID
- For clipboard-only flow (no Composio): AI generates caption → user copies → pastes into Instagram app

### TikTok
- Composio tool: `TIKTOK_UPLOAD_VIDEO` (video files only)
- **Text-only posts are not supported** on TikTok via any API
- Implementation: AI generates a **spoken word script** + caption. User copies the script, records their video, pastes the caption in the TikTok app
- This is the correct attribution flow per the existing referral guide: user says "go to trademind.bot and use code ALPHA49" on camera

---

## Phase 11: Implementation Roadmap

### Week 1 — Foundation
- [ ] Run Supabase migrations (Phase 1)
- [ ] Add environment variables to `.env.local` and Vercel
- [ ] Create `lib/composio.ts` singleton
- [ ] Create Composio auth configs in dashboard for LinkedIn, X, Facebook, Instagram
- [ ] Copy `ac_XXXX` IDs into `.env`

### Week 2 — API Routes
- [ ] `POST /api/composio/connect`
- [ ] `GET /api/composio/callback`
- [ ] `GET /api/composio/status`
- [ ] `DELETE /api/composio/disconnect`
- [ ] `POST /api/social/generate` (AI generation)
- [ ] `POST /api/social/post` (Composio execute)

### Week 3 — Frontend
- [ ] `ShareModal` component (platform select + generate + edit + post)
- [ ] `ShareSection` integration into `/refer` page
- [ ] `/settings/social-connections` page
- [ ] Test full OAuth flow end-to-end for LinkedIn (most common)

### Week 4 — Polish & Testing
- [ ] Test all 4 platforms (LinkedIn, X, Facebook, Instagram)
- [ ] Validate AI output quality for all 5 platforms
- [ ] Handle error states (expired tokens, platform API limits)
- [ ] Add analytics: track posts per platform in `social_posts` table
- [ ] Test TikTok clipboard copy flow
- [ ] Verify tier gating (Diamond/Creator only for Composio direct post)

---

## Phase 12: Security & Compliance Checklist

- [ ] **FINRA compliance**: All AI-generated posts include "Not financial advice." — enforced in system prompts
- [ ] **SEC Rule 17a-4**: Log all social posts in `social_posts` table with timestamp
- [ ] **Rate limiting**: Add `api/social/generate` rate limit — max 10 generations per user per hour (use Upstash Redis or Vercel KV)
- [ ] **OAuth token security**: Composio handles OAuth token storage encrypted at rest — never store tokens in your own DB
- [ ] **Composio API key**: Store only in server-side env vars, never expose to client
- [ ] **User consent**: Display terms on social connection screen — "TradeMind will post on your behalf only when you click Post"
- [ ] **Content review**: Diamond/Creator tier users should see a disclaimer that they are responsible for the accuracy of posts

---

## Appendix: Composio Toolkit Action Reference

| Platform | Action Slug | Key Parameters |
|---|---|---|
| LinkedIn | `LINKEDIN_CREATE_LINKEDIN_POST` | `text`, `visibility` |
| LinkedIn | `LINKEDIN_GET_MY_INFO` | _(none)_ |
| X/Twitter | `TWITTER_CREATE_TWEET` | `text`, `media_ids[]` |
| Facebook | `FACEBOOK_CREATE_POST` | `message`, `link` |
| Instagram | `INSTAGRAM_CREATE_MEDIA_CONTAINER` | `image_url`, `caption`, `media_type` |
| Instagram | `INSTAGRAM_CREATE_POST` | `creation_id` |
| TikTok | `TIKTOK_UPLOAD_VIDEO` | `video_url`, `title`, `privacy_level` |
| TikTok | `TIKTOK_POST_PHOTO` | `photo_images[]`, `title` |

> **Finding exact parameters:** In the Composio dashboard → Auth Configs → [Your Toolkit] → Tools & Triggers → [Select Tool]. The parameter schema is shown with required vs. optional fields.

---

*Generated April 2026 for TradeMind.bot | Composio SDK v0.5.4 | Next.js 14 App Router*
