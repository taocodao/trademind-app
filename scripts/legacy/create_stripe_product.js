require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
    console.error("FATAL: STRIPE_SECRET_KEY not found in .env.local");
    process.exit(1);
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function main() {
  try {
    console.log("Creating TradeMind AI Feature Add-on Product...");
    const product = await stripe.products.create({
      name: 'TradeMind AI Feature Add-on',
      description: '$5/mo per unlocked AI feature (Screenshot Analyzer, Deep Dive, etc.)',
    });
    
    console.log("Creating $5/mo Recurring Price...");
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 500, // $5.00
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    
    console.log('\n======================================================');
    console.log('✅ STRIPE PRODUCT CREATED SUCCESSFULLY');
    console.log('======================================================');
    console.log('Product ID: ', product.id);
    console.log('Price ID:   ', price.id);
    console.log('\nACTION REQUIRED:');
    console.log(`Add this to your Vercel Environment Variables:`);
    console.log(`Key:   STRIPE_AI_ADDON_PRICE_ID`);
    console.log(`Value: ${price.id}`);
    console.log('======================================================\n');
  } catch(e) {
    console.error("Stripe API Error:", e.message);
  }
}

main();
