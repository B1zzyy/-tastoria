import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('🔔 Webhook received:', event.type, event.id)

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        console.log('📝 Processing subscription change:', event.type)
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break
      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  try {
    // Get customer email from Stripe
    const customer = await stripe.customers.retrieve(subscription.customer as string)
    
    if (!customer || customer.deleted) {
      console.error('Customer not found or deleted')
      return
    }

    const customerEmail = (customer as Stripe.Customer).email
    if (!customerEmail) {
      console.error('Customer email not found')
      return
    }

    // Find user in Supabase by email
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('id')
      .eq('email', customerEmail)
      .single()

    if (profileError || !profile) {
      console.error('User not found in database:', customerEmail)
      return
    }

  // Check if subscription is cancelled (has cancel_at date)
  const isCancelled = subscription.cancel_at !== null
  
  console.log(`Processing subscription ${subscription.id}`)
  console.log(`- Status: ${subscription.status}`)
  console.log(`- Cancel at: ${subscription.cancel_at}`)
  console.log(`- Is cancelled: ${isCancelled}`)
  
  // Logic: if cancelled OR not active = expired, otherwise = paid
  let subscriptionStatus: string
  if (isCancelled || subscription.status !== 'active') {
    subscriptionStatus = 'expired'
    console.log('Setting subscription to EXPIRED (cancelled or inactive)')
  } else {
    subscriptionStatus = 'paid'
    console.log('Setting subscription to PAID (active and not cancelled)')
  }

    // Update user's subscription status in Supabase
    const { error: updateError } = await supabaseServer
      .from('profiles')
      .update({
        subscription_status: subscriptionStatus,
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Error updating subscription status:', updateError)
    } else {
      console.log(`Updated subscription for user ${profile.id}: ${subscriptionStatus}`)
    }
  } catch (error) {
    console.error('Error handling subscription change:', error)
  }
}