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

    // Determine subscription status
    let subscriptionStatus: string
    let subscriptionEndDate: string | null = null

    if (subscription.status === 'active') {
      subscriptionStatus = 'paid'
      subscriptionEndDate = new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()
    } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      // Check if subscription is still in grace period
      const currentPeriodEnd = new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000)
      const now = new Date()
      
      if (now < currentPeriodEnd) {
        // Still in grace period - keep as paid until period ends
        subscriptionStatus = 'paid'
        subscriptionEndDate = currentPeriodEnd.toISOString()
      } else {
        // Grace period ended - mark as expired
        subscriptionStatus = 'expired'
        subscriptionEndDate = currentPeriodEnd.toISOString()
      }
    } else {
      subscriptionStatus = 'expired'
      subscriptionEndDate = new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()
    }

    // Update user's subscription status in Supabase
    const { error: updateError } = await supabaseServer
      .from('profiles')
      .update({
        subscription_status: subscriptionStatus,
        subscription_end_date: subscriptionEndDate,
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