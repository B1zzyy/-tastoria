import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
})

export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, planType, manualUpdate } = await request.json()

    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Missing user information' }, { status: 400 })
    }

    // Handle manual subscription update for testing
    if (manualUpdate) {
      console.log('Manual subscription update for user:', userId);
      const subscriptionEndDate = new Date()
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1) // 1 month from now
      
      console.log('Attempting to update profile for user:', userId);
      console.log('Update data:', {
        subscription_status: 'paid',
        subscription_end_date: subscriptionEndDate.toISOString(),
      });

      const { data, error } = await supabaseServer
        .from('profiles')
        .update({
          subscription_status: 'paid',
          subscription_end_date: subscriptionEndDate.toISOString(),
        })
        .eq('id', userId)
        .select()

      console.log('Update result - data:', data, 'error:', error);

      if (error) {
        console.error('Error manually updating subscription:', error)
        return NextResponse.json({ error: 'Failed to update subscription', details: error }, { status: 500 })
      }
      
      console.log('Successfully manually updated user subscription to paid:', userId)
      return NextResponse.json({ success: true, message: 'Subscription updated to paid' })
    }

      // Determine pricing based on plan type
      const isYearly = planType === 'yearly'
      const unitAmount = isYearly ? 5988 : 99 // $59.88 or $0.99 in cents
      const interval = isYearly ? 'year' : 'month'

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product: 'prod_TCjqckXPclwsfi', // Your Tastoria Premium product
              unit_amount: unitAmount,
              recurring: {
                interval: interval,
              },
            },
            quantity: 1,
          },
        ],
      mode: 'subscription',
      success_url: `${request.nextUrl.origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/?payment=cancelled`,
      customer_email: userEmail,
      metadata: {
        userId: userId,
        planType: planType || 'monthly',
      },
    })

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ 
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Handle successful payment
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')
    
    if (!sessionId) {
      return NextResponse.json({ error: 'No session ID provided' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    if (session.payment_status === 'paid' && session.metadata?.userId) {
      // Update user subscription status directly in Supabase
      const subscriptionEndDate = new Date()
      const planType = session.metadata?.planType || 'monthly'
      
      if (planType === 'yearly') {
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1) // 1 year from now
      } else {
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1) // 1 month from now
      }
      
      const { error } = await supabaseServer
        .from('profiles')
        .update({
          subscription_status: 'paid',
          subscription_end_date: subscriptionEndDate.toISOString(),
        })
        .eq('id', session.metadata.userId)

      if (error) {
        console.error('Error updating subscription status:', error)
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
      }
      
      console.log('Successfully updated user subscription to paid:', session.metadata.userId)
      return NextResponse.json({ success: true, subscriptionEndDate })
    }

    return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
