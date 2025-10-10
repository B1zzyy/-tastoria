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

    console.log(`Processing subscription ${subscription.id} with status: ${subscription.status}`)
    
    // Check if subscription is cancelled (even if still active until period end)
    const isCancelled = (subscription as unknown as { cancel_at_period_end: boolean }).cancel_at_period_end
    console.log(`Subscription cancel_at_period_end: ${isCancelled}`)

    if (subscription.status === 'active' && !isCancelled) {
      subscriptionStatus = 'paid'
      const periodEnd = (subscription as unknown as { current_period_end: number | null }).current_period_end
      if (periodEnd) {
        subscriptionEndDate = new Date(periodEnd * 1000).toISOString()
        console.log(`Setting subscription to PAID with end date: ${subscriptionEndDate}`)
      } else {
        console.log(`Setting subscription to PAID with no end date`)
      }
    } else if (subscription.status === 'active' && isCancelled) {
      // Subscription is active but cancelled at period end
      console.log(`Subscription is active but cancelled at period end, marking as expired`)
      subscriptionStatus = 'expired'
      const periodEnd = (subscription as unknown as { current_period_end: number | null }).current_period_end
      if (periodEnd) {
        subscriptionEndDate = new Date(periodEnd * 1000).toISOString()
        console.log(`Setting end date to: ${subscriptionEndDate}`)
      } else {
        subscriptionEndDate = null
        console.log('No period end date found')
      }
    } else if (subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'past_due') {
      // For cancelled subscriptions, always mark as expired
      console.log(`Subscription is ${subscription.status}, marking as expired`)
      subscriptionStatus = 'expired'
      
      const periodEnd = (subscription as unknown as { current_period_end: number | null }).current_period_end
      if (periodEnd) {
        subscriptionEndDate = new Date(periodEnd * 1000).toISOString()
        console.log(`Setting end date to: ${subscriptionEndDate}`)
      } else {
        subscriptionEndDate = null
        console.log('No period end date found')
      }
    } else {
      subscriptionStatus = 'expired'
      const periodEnd = (subscription as unknown as { current_period_end: number | null }).current_period_end
      if (periodEnd) {
        subscriptionEndDate = new Date(periodEnd * 1000).toISOString()
      } else {
        subscriptionEndDate = null
      }
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
      console.log(`Subscription end date set to: ${subscriptionEndDate}`)
    }
  } catch (error) {
    console.error('Error handling subscription change:', error)
  }
}