import { loadStripe } from '@stripe/stripe-js'

// Initialize Stripe with your publishable key
export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Stripe configuration
export const STRIPE_CONFIG = {
  productId: 'prod_TCjqckXPclwsfi', // Your Tastoria Premium product
  amount: 699, // $6.99 in cents
  currency: 'usd',
  interval: 'month' as const,
}
