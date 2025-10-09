import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })
    }

    // Get user's email from Supabase
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create or retrieve Stripe customer
    let customer
    const existingCustomers = await stripe.customers.list({
      email: profile.email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
    } else {
      // For existing paid users without Stripe customer record, we need to create one
      // This handles the case where users were manually set to 'paid' status
      customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          userId: userId,
        },
      })
      
      console.log('Created new Stripe customer for existing paid user:', profile.email)
    }

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${request.nextUrl.origin}/?portal=return`,
    })

    return NextResponse.json({ 
      url: portalSession.url 
    })
  } catch (error) {
    console.error('Error creating portal session:', error)
    return NextResponse.json({ 
      error: 'Failed to create portal session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
