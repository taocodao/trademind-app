/** Invitation copy v6 (spintax), supplied by Eric Oct 17 2026. Key: template_branch_stage. Branch A = first email, C = clicked, N = no click.
 * Single-brace groups with a pipe are spintax; single-brace names are placeholders. Plain text only. */
export const COPY_V6: Record<string, { subject: string; body: string }> = {
 "T1_A_FIRST": {
  "subject": "{system or watchlist|watchlist question|quick watchlist question}",
  "body": "{Hi|Hey|} {first_name},\n\n{Most investors I talk to|Most people I meet|A lot of investors I know} have a watchlist, not a process. {That's normal.|Totally normal.|Most do.}\n\n{But|The catch:|Problem is,} a watchlist tells you what to buy, not when to {step aside|sit out|pull back}.\n\nI write a free weekly brief that {reads|explains} the market regime in plain English and {ends with|closes on} what could go wrong.\n\n{Want me to send this week's issue?|Should I send you this week's?|Worth a look?} Just reply \"yes.\"\n\nOr subscribe free: {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T1_N_FU1": {
  "subject": "re: {original_subject}",
  "body": "{first_name}, the reason I asked: most people never get a clear answer on knowing when to step aside, not just what to buy. A recent issue covered it in a {4-minute|short} read. Want it? Just reply \"yes.\"\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T1_N_FU2": {
  "subject": "{one issue|a sample issue}",
  "body": "{first_name}, no sign-up needed. Here's one past issue to skim: {preview_link}. If it's useful, you'll know where to find the rest.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T1_N_FU3": {
  "subject": "{quick note|small note}",
  "body": "{first_name}, worth saying: the brief is free, there's no card, and you can leave or snooze for 90 days anytime. Subscribe here if you'd like: {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T1_N_FINAL": {
  "subject": "{last one|closing the loop}",
  "body": "{first_name}, I'll stop here so I don't clutter your inbox. If the timing changes, the brief lives at trademind.bot/newsletter. All the best.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T1_C_FU1": {
  "subject": "re: {original_subject}",
  "body": "{first_name}, in case the preview was useful, signing up free is one tap. Your email is already filled in: {subscribe_link}. If something was missing, tell me what.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T1_C_FU2": {
  "subject": "{most-read issue|our most-read issue}",
  "body": "{first_name}, here's our most-read issue if you'd like a second sample: {preview_link}. Takes about 4 minutes.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T1_C_FU3": {
  "subject": "{quick note|small note}",
  "body": "{first_name}, it's free, no card, and you can snooze anytime. Subscribers also get 30% off a yearly TradeMind Strategy plan for 90 days. {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T1_C_FINAL": {
  "subject": "{last one|closing the loop}",
  "body": "{first_name}, I'll stop here. If you ever want the brief, it's one tap: {subscribe_link}. Thanks for taking a look.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T2_A_FIRST": {
  "subject": "{drawdown question|growth question|quick drawdown thought}",
  "body": "{Hi|Hey|} {first_name},\n\n{Picture|Imagine} your portfolio {still growing|still compounding} ten years from now, without one big drawdown {wiping out|erasing|undoing} years of gains.\n\n{In peak earning years|At this stage}, most people {manage risk by gut feel|handle risk on instinct}. {Totally normal.|That's normal.|Most do.}\n\nMy free weekly brief {starts with|opens on} the market regime and {ends with|closes on} a \"what could go wrong\" test.\n\n{Worth a look, or am I off base?|Worth a look?|Should I send the latest issue?}\n\nOr subscribe free: {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T2_N_FU1": {
  "subject": "re: {original_subject}",
  "body": "{first_name}, the reason I asked: most people never get a clear answer on growing without one big drawdown. A recent issue covered it in a {4-minute|short} read. Want it? Just reply \"yes.\"\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T2_N_FU2": {
  "subject": "{one issue|a sample issue}",
  "body": "{first_name}, no sign-up needed. Here's one past issue to skim: {preview_link}. If it's useful, you'll know where to find the rest.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T2_N_FU3": {
  "subject": "{quick note|small note}",
  "body": "{first_name}, worth saying: the brief is free, there's no card, and you can leave or snooze for 90 days anytime. Subscribe here if you'd like: {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T2_N_FINAL": {
  "subject": "{last one|closing the loop}",
  "body": "{first_name}, I'll stop here so I don't clutter your inbox. If the timing changes, the brief lives at trademind.bot/newsletter. All the best.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T2_C_FU1": {
  "subject": "re: {original_subject}",
  "body": "{first_name}, in case the preview was useful, signing up free is one tap. Your email is already filled in: {subscribe_link}. If something was missing, tell me what.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T2_C_FU2": {
  "subject": "{most-read issue|our most-read issue}",
  "body": "{first_name}, here's our most-read issue if you'd like a second sample: {preview_link}. Takes about 4 minutes.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T2_C_FU3": {
  "subject": "{quick note|small note}",
  "body": "{first_name}, it's free, no card, and you can snooze anytime. Subscribers also get 30% off a yearly TradeMind Strategy plan for 90 days. {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T2_C_FINAL": {
  "subject": "{last one|closing the loop}",
  "body": "{first_name}, I'll stop here. If you ever want the brief, it's one tap: {subscribe_link}. Thanks for taking a look.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T3_A_FIRST": {
  "subject": "{retirement risk question|risk question|quick retirement question}",
  "body": "{Hi|Hey|} {first_name},\n\n{Not sure this fits you, but|This may not fit you, but|Could be off here, but} close to retirement the question changes. It's less \"how much can I make?\" and more \"how much can I afford to lose on the way?\"\n\n{Each week|Every week} I send a free, plain-English brief on market risk. {No stock tips.|No tips, no hype.}\n\n{Would that be useful, or am I totally off base?|Useful, or off base?}\n\nOr subscribe free: {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T3_N_FU1": {
  "subject": "re: {original_subject}",
  "body": "{first_name}, the reason I asked: most people never get a clear answer on how much you can afford to lose on the way. A recent issue covered it in a {4-minute|short} read. Want it? Just reply \"yes.\"\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T3_N_FU2": {
  "subject": "{one issue|a sample issue}",
  "body": "{first_name}, no sign-up needed. Here's one past issue to skim: {preview_link}. If it's useful, you'll know where to find the rest.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T3_N_FU3": {
  "subject": "{quick note|small note}",
  "body": "{first_name}, worth saying: the brief is free, there's no card, and you can leave or snooze for 90 days anytime. Subscribe here if you'd like: {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T3_N_FINAL": {
  "subject": "{last one|closing the loop}",
  "body": "{first_name}, I'll stop here so I don't clutter your inbox. If the timing changes, the brief lives at trademind.bot/newsletter. All the best.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T3_C_FU1": {
  "subject": "re: {original_subject}",
  "body": "{first_name}, in case the preview was useful, signing up free is one tap. Your email is already filled in: {subscribe_link}. If something was missing, tell me what.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T3_C_FU2": {
  "subject": "{most-read issue|our most-read issue}",
  "body": "{first_name}, here's our most-read issue if you'd like a second sample: {preview_link}. Takes about 4 minutes.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T3_C_FU3": {
  "subject": "{quick note|small note}",
  "body": "{first_name}, it's free, no card, and you can snooze anytime. Subscribers also get 30% off a yearly TradeMind Strategy plan for 90 days. {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T3_C_FINAL": {
  "subject": "{last one|closing the loop}",
  "body": "{first_name}, I'll stop here. If you ever want the brief, it's one tap: {subscribe_link}. Thanks for taking a look.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T4_A_FIRST": {
  "subject": "{plain-english risk brief|risk brief|weekly risk note}",
  "body": "{Hi|Hello|} {first_name},\n\nMarket headlines are {loud|noisy} and rarely explain the risk.\n\nI write a {short|brief}, free weekly note that does, in plain English. Education only, no hype, nothing to buy.\n\n{Rather than ask you to sign up blind|Instead of asking you to sign up blind}, can I send you one issue to judge for yourself? Just reply \"send it.\"\n\nOr subscribe free: {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T4_N_FU1": {
  "subject": "re: {original_subject}",
  "body": "{first_name}, the reason I asked: most people never get a clear answer on what the headlines don't explain about risk. A recent issue covered it in a {4-minute|short} read. Want it? Just reply \"yes.\"\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T4_N_FU2": {
  "subject": "{one issue|a sample issue}",
  "body": "{first_name}, no sign-up needed. Here's one past issue to skim: {preview_link}. If it's useful, you'll know where to find the rest.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T4_N_FU3": {
  "subject": "{quick note|small note}",
  "body": "{first_name}, worth saying: the brief is free, there's no card, and you can leave or snooze for 90 days anytime. Subscribe here if you'd like: {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T4_N_FINAL": {
  "subject": "{last one|closing the loop}",
  "body": "{first_name}, I'll stop here so I don't clutter your inbox. If the timing changes, the brief lives at trademind.bot/newsletter. All the best.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T4_C_FU1": {
  "subject": "re: {original_subject}",
  "body": "{first_name}, in case the preview was useful, signing up free is one tap. Your email is already filled in: {subscribe_link}. If something was missing, tell me what.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T4_C_FU2": {
  "subject": "{most-read issue|our most-read issue}",
  "body": "{first_name}, here's our most-read issue if you'd like a second sample: {preview_link}. Takes about 4 minutes.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T4_C_FU3": {
  "subject": "{quick note|small note}",
  "body": "{first_name}, it's free, no card, and you can snooze anytime. Subscribers also get 30% off a yearly TradeMind Strategy plan for 90 days. {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T4_C_FINAL": {
  "subject": "{last one|closing the loop}",
  "body": "{first_name}, I'll stop here. If you ever want the brief, it's one tap: {subscribe_link}. Thanks for taking a look.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T5_A_FIRST": {
  "subject": "{fellow new yorker|queens question|nyc market brief}",
  "body": "{first_name}, {not trying to sell you anything.|this isn't a sales pitch.}\n\nI'm building TradeMind {out of|in} Queens and write a free weekly market brief for investors {around here|in the area}. No stock tips, just what the market is doing and what could go wrong.\n\n{Worth a read, or should I not bother you?|Worth a read, or not for you?} Either reply helps.\n\nOr subscribe free: {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T5_N_FU1": {
  "subject": "re: {original_subject}",
  "body": "{first_name}, the reason I asked: most people never get a clear answer on a market brief with no stock tips. A recent issue covered it in a {4-minute|short} read. Want it? Just reply \"yes.\"\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T5_N_FU2": {
  "subject": "{one issue|a sample issue}",
  "body": "{first_name}, no sign-up needed. Here's one past issue to skim: {preview_link}. If it's useful, you'll know where to find the rest.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T5_N_FU3": {
  "subject": "{quick note|small note}",
  "body": "{first_name}, worth saying: the brief is free, there's no card, and you can leave or snooze for 90 days anytime. Subscribe here if you'd like: {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T5_N_FINAL": {
  "subject": "{last one|closing the loop}",
  "body": "{first_name}, I'll stop here so I don't clutter your inbox. If the timing changes, the brief lives at trademind.bot/newsletter. All the best.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T5_C_FU1": {
  "subject": "re: {original_subject}",
  "body": "{first_name}, in case the preview was useful, signing up free is one tap. Your email is already filled in: {subscribe_link}. If something was missing, tell me what.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T5_C_FU2": {
  "subject": "{most-read issue|our most-read issue}",
  "body": "{first_name}, here's our most-read issue if you'd like a second sample: {preview_link}. Takes about 4 minutes.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T5_C_FU3": {
  "subject": "{quick note|small note}",
  "body": "{first_name}, it's free, no card, and you can snooze anytime. Subscribers also get 30% off a yearly TradeMind Strategy plan for 90 days. {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T5_C_FINAL": {
  "subject": "{last one|closing the loop}",
  "body": "{first_name}, I'll stop here. If you ever want the brief, it's one tap: {subscribe_link}. Thanks for taking a look.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T6_A_FIRST": {
  "subject": "{ml question|machine learning question|quick ml question}",
  "body": "{first_name}, in tech you see what machine learning can do. In investing, the {better|more useful} question is what it can't.\n\nMy free weekly brief {explains|breaks down} one ML signal in plain English, then stress-tests it.\n\nWhich would you rather read first: (1) what ML can and can't do, or (2) why most backtests break? Reply 1 or 2.\n\nOr subscribe free: {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T6_N_FU1": {
  "subject": "re: {original_subject}",
  "body": "{first_name}, the reason I asked: most people never get a clear answer on what machine learning can't do in investing. A recent issue covered it in a {4-minute|short} read. Want it? Just reply \"yes.\"\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T6_N_FU2": {
  "subject": "{one issue|a sample issue}",
  "body": "{first_name}, no sign-up needed. Here's one past issue to skim: {preview_link}. If it's useful, you'll know where to find the rest.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T6_N_FU3": {
  "subject": "{quick note|small note}",
  "body": "{first_name}, worth saying: the brief is free, there's no card, and you can leave or snooze for 90 days anytime. Subscribe here if you'd like: {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T6_N_FINAL": {
  "subject": "{last one|closing the loop}",
  "body": "{first_name}, I'll stop here so I don't clutter your inbox. If the timing changes, the brief lives at trademind.bot/newsletter. All the best.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T6_C_FU1": {
  "subject": "re: {original_subject}",
  "body": "{first_name}, in case the preview was useful, signing up free is one tap. Your email is already filled in: {subscribe_link}. If something was missing, tell me what.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T6_C_FU2": {
  "subject": "{most-read issue|our most-read issue}",
  "body": "{first_name}, here's our most-read issue if you'd like a second sample: {preview_link}. Takes about 4 minutes.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T6_C_FU3": {
  "subject": "{quick note|small note}",
  "body": "{first_name}, it's free, no card, and you can snooze anytime. Subscribers also get 30% off a yearly TradeMind Strategy plan for 90 days. {subscribe_link}\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 },
 "T6_C_FINAL": {
  "subject": "{last one|closing the loop}",
  "body": "{first_name}, I'll stop here. If you ever want the brief, it's one tap: {subscribe_link}. Thanks for taking a look.\n\n{Eric|Best, Eric|Thanks, Eric}\n\n{{sig_sep}}\nYou're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: {unsubscribe_link}\nAI Investor Copilot by TradeMind, {mailing_address}\nEducation only, not investment advice. Investing involves risk, including loss."
 }
};
