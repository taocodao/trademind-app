/**
 * Discover Whop Channel IDs
 * ==========================
 * Run ONCE to find the channel IDs for your Whop community.
 * Copy the output into your Vercel environment variables.
 *
 * Usage:
 *   npx tsx scripts/get-whop-channels.ts
 *
 * Requires: WHOP_API_KEY in .env.local
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import Whop from '@whop/sdk';

const whop = new Whop({
    apiKey: process.env.WHOP_API_KEY!,
});

async function main() {
    if (!process.env.WHOP_API_KEY) {
        console.error('❌ WHOP_API_KEY not set in .env.local');
        process.exit(1);
    }

    const companyId = process.env.WHOP_COMPANY_ID;
    if (!companyId) {
        console.error('❌ WHOP_COMPANY_ID is required. Add it to .env.local and re-run.');
        process.exit(1);
    }

    console.log('\n🔍 Discovering Whop channels...\n');

    try {
        const channels = whop.chatChannels.list({ company_id: companyId });

        const found: Array<{ id: string; title: string }> = [];

        for await (const channel of channels) {
            found.push({
                id:    channel.id,
                title: (channel as any).title ?? '(no title)',
            });
            console.log(`  ${channel.id}  |  ${(channel as any).title ?? '(no title)'}`);
        }

        if (!found.length) {
            console.log('  No channels found. Make sure your WHOP_API_KEY has the correct permissions.');
        } else {
            console.log(`\n📋 Add these to your Vercel environment variables:\n`);
            console.log(`# Find the channel you use for announcements/signals:`);
            found.forEach(c => {
                console.log(`# ${c.title}`);
                console.log(`WHOP_ANNOUNCEMENTS_CHANNEL_ID=${c.id}   # if this is announcements`);
                console.log(`WHOP_CHAT_BOT_CHANNEL_ID=${c.id}   # if this is general chat`);
                console.log('');
            });
        }
    } catch (err: any) {
        console.error('❌ Error:', err.message ?? err);
        process.exit(1);
    }
}

main();
