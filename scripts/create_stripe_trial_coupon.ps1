# ============================================================
# create_stripe_trial_coupon.ps1
# Creates the TRIALBACK15 coupon + promo code in Stripe.
# Run once.  Safe to re-run — Stripe will error on duplicate
# coupon ID (not create a second one).
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$StripeSecretKey   # Pass as: -StripeSecretKey "sk_live_..."
)

$headers = @{
    Authorization  = "Bearer $StripeSecretKey"
    "Content-Type" = "application/x-www-form-urlencoded"
}

Write-Host "`n[1/2] Creating Stripe coupon 'TRIALBACK15-COUPON'..." -ForegroundColor Cyan

# Step 1 — Create the underlying coupon
# duration=once   → applies only to the first invoice
# amount_off=1500 → $15.00 in cents
# currency=usd
$couponBody = "id=TRIALBACK15-COUPON&name=Whop+Trial+Credit&amount_off=1500&currency=usd&duration=once"

try {
    $couponResp = Invoke-RestMethod `
        -Uri     "https://api.stripe.com/v1/coupons" `
        -Method  POST `
        -Headers $headers `
        -Body    $couponBody

    Write-Host "  ✅ Coupon created: $($couponResp.id) | $($couponResp.amount_off / 100) USD off | duration: $($couponResp.duration)" -ForegroundColor Green
} catch {
    $msg = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($msg.error.code -eq "resource_already_exists") {
        Write-Host "  ⚠️  Coupon TRIALBACK15-COUPON already exists — skipping creation." -ForegroundColor Yellow
    } else {
        Write-Host "  ❌ Coupon creation failed: $($_.ErrorDetails.Message)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n[2/2] Creating promo code 'TRIALBACK15'..." -ForegroundColor Cyan

# Step 2 — Create the customer-facing promo code on top of the coupon
# max_redemptions is per-customer enforced at the promo code level
# first_time_transaction=true → only usable on first Stripe payment
$promoBody  = "coupon=TRIALBACK15-COUPON"
$promoBody += "&code=TRIALBACK15"
$promoBody += "&restrictions[first_time_transaction]=true"

try {
    $promoResp = Invoke-RestMethod `
        -Uri     "https://api.stripe.com/v1/promotion_codes" `
        -Method  POST `
        -Headers $headers `
        -Body    $promoBody

    Write-Host "  ✅ Promo code created: $($promoResp.code) | active: $($promoResp.active)" -ForegroundColor Green
    Write-Host "`n  Promo code ID (save this): $($promoResp.id)" -ForegroundColor White
} catch {
    $msg = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($msg.error.message -like "*already*") {
        Write-Host "  ⚠️  Promo code TRIALBACK15 already exists — skipping creation." -ForegroundColor Yellow
    } else {
        Write-Host "  ❌ Promo code creation failed: $($_.ErrorDetails.Message)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n✅ Done. TRIALBACK15 is now live in Stripe." -ForegroundColor Green
Write-Host "   Users who enter TRIALBACK15 at checkout get `$15 off their first payment.`n" -ForegroundColor Gray
