import { Whop } from '@whop/sdk'; const w = new Whop({ apiKey: 'test' }); console.log(Object.keys(w.webhooks)); console.log(typeof w.webhooks.unwrap);
