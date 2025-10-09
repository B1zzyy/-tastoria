# Stripe Subscription Cancellation Setup

## Overview
This setup allows paid users to manage their subscriptions through Stripe's Customer Portal, including cancellation with proper grace periods.

## What Users Can Do
- **Cancel subscription** - Access continues until current period ends
- **Update payment methods** - Change credit cards, etc.
- **View billing history** - See all past invoices
- **Download receipts** - Get PDF invoices
- **Reactivate** - Restart subscription if canceled

## Setup Steps

### 1. Enable Customer Portal in Stripe Dashboard
1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Settings → Billing → Customer Portal
2. Click "Activate test link" (for test mode) or "Activate link" (for live mode)
3. Configure the portal settings:
   - **Business information**: Add your business name and support email
   - **Features**: Enable "Subscription cancellation" and "Payment method updates"
   - **Cancellation reasons**: Add options like "Too expensive", "Not using enough", etc.

### 2. Set Up Webhook Endpoint
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. **Endpoint URL**: `https://yourdomain.com/api/stripe-webhook`
4. **Events to send**:
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Webhook signing secret** (starts with `whsec_`)

### 3. Add Environment Variables
Add to your `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 4. Test the Flow
1. **Create a test subscription** using your app
2. **Go to user profile** → TRIAL dropdown → "Manage Subscription"
3. **Should redirect** to Stripe Customer Portal
4. **Cancel subscription** in the portal
5. **Check your database** - subscription should remain 'paid' until period ends

## How It Works

### For Monthly Subscribers
- **Cancel on day 5** → Access continues until day 30
- **Cancel on day 25** → Access continues until day 30
- **After day 30** → Status changes to 'expired'

### For Yearly Subscribers  
- **Cancel in month 2** → Access continues until month 12
- **Cancel in month 10** → Access continues until month 12
- **After month 12** → Status changes to 'expired'

### Database Updates
The webhook automatically updates your Supabase `profiles` table:
- `subscription_status`: 'paid' → 'expired' (when period ends)
- `subscription_end_date`: Set to the actual end date

## Security Benefits
- ✅ **No payment data** stored in your app
- ✅ **Stripe handles** all PCI compliance
- ✅ **Secure cancellation** process
- ✅ **Automatic updates** via webhooks
- ✅ **Grace period** handling built-in

## User Experience
1. **Click "Manage Subscription"** → Opens Stripe portal
2. **Cancel subscription** → Confirmation shown
3. **Access continues** → Until current period ends
4. **Automatic expiration** → When period ends, status updates

This provides a professional, secure, and user-friendly subscription management experience!
