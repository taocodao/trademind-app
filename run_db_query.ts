import { query } from './src/lib/db';
query("SELECT email, subscription_tier, email_signal_alerts FROM user_settings").then(r => {
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
