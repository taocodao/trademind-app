const baseUrl = "https://trademind.bot";

async function testWebhooks() {
    console.log("🚀 Testing Production Webhooks on", baseUrl);

    // 1. Test Activation Webhook
    console.log("\n1️⃣ Firing membership.activated...");
    const actRes = await fetch(`${baseUrl}/api/whop/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type: "membership.activated",
            data: {
                id: "mem_test001",
                status: "active",
                joined_at: new Date().toISOString(),
                renewal_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
                plan_id: "plan_WLvO78Qzg6Rc8", // from .env.local
                user: {
                    id: "user_whoptest001",
                    username: "testtrader",
                    name: "Test Trader",
                    email: "testtrader@example.com"
                },
                member: { id: "mber_test001" }
            }
        })
    });
    console.log(`Response: ${actRes.status} ${await actRes.text()}`);

    // Wait a sec
    await new Promise(r => setTimeout(r, 2000));

    // 2. Test Deactivation Webhook
    console.log("\n2️⃣ Firing membership.deactivated...");
    const deactRes = await fetch(`${baseUrl}/api/whop/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type: "membership.deactivated",
            data: {
                id: "mem_test001",
                status: "expired",
                user: {
                    id: "user_whoptest001",
                    email: "testtrader@example.com",
                    name: "Test Trader"
                }
            }
        })
    });
    console.log(`Response: ${deactRes.status} ${await deactRes.text()}`);
    
    console.log("\n✅ Webhooks fired successfully!");
    console.log("Check the database for scheduled_messages and migration_tokens.");
}

testWebhooks();
