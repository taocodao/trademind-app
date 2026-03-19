import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Only fetch users on 'pro' or 'bundle' tier
    const subscribers = await query(
      `SELECT user_id, subscription_tier 
       FROM user_settings
       WHERE subscription_tier IN ('pro', 'bundle')`
    );

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday of current week
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Mock Signal Context (could calculate from historical DB)
    const signalHistory = { weekReturn: 3.8 };

    for (const user of subscribers.rows) {
      // In production, we'd fetch \`\${process.env.EC2_INTERNAL_API}/user/\${user.user_id}/weekly-trades\` 
      // Mocking user trade stats for demonstration:
      const weekData = {
        totalPnl: '+$420',
        totalPnlPct: 4.2,
        entriesCount: 5,
        alignmentPct: 80,
        patterns: ['Held positions through minor dip correctly']
      };

      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{
            role: 'system',
            content: 'You are an elite TradeMind performance coach.'
          }, {
            role: 'user',
            content: `Generate a weekly trading debrief for week starting ${weekStartStr}.
User stats:
- PnL: ${weekData.totalPnl} (${weekData.totalPnlPct}%)
- TurboCore Signal Return: ${signalHistory.weekReturn}%
- Alignment: ${weekData.alignmentPct}%
- Patterns: ${weekData.patterns.join(', ')}

Return strict JSON ONLY:
{
  "headline": "1 line (< 60 chars)",
  "beatSignal": boolean,
  "userReturn": ${weekData.totalPnlPct},
  "signalReturn": ${signalHistory.weekReturn},  
  "wentRight": "1-2 sentences on best decision",
  "watchOut": "1 behavioral pattern to watch",
  "weeklyTip": "1 actionable educational tip for next week"
}`
          }],
          max_tokens: 400
        })
      });

      if (!res.ok) continue;

      const data = await res.json();
      let debrief;
      try {
          const rawContent = data.choices[0].message.content;
          const match = rawContent.match(/\{[\s\S]*\}/);
          debrief = JSON.parse(match ? match[0] : rawContent);
      } catch (e) {
          console.error("Debrief Parse Error:", data.choices[0].message.content);
          continue;
      }

      await query(
        `INSERT INTO ai_debriefs (privy_did, week_start, content) 
         VALUES ($1, $2, $3)
         ON CONFLICT (privy_did, week_start) DO UPDATE SET content = $3`,
        [user.user_id, weekStartStr, debrief]
      );
    }
    
    return NextResponse.json({ success: true, generated: subscribers.rows.length });

  } catch (error: any) {
    console.error('AI Cron Debrief Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
