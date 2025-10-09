import { stripePromise } from './stripe'

export interface PaymentResult {
  success: boolean
  error?: string
  sessionId?: string
}

export class PaymentService {
  /**
   * Create a checkout session for subscription
   */
  static async createCheckoutSession(userId: string, userEmail: string): Promise<PaymentResult> {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userEmail,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to create checkout session',
        }
      }

      return {
        success: true,
        sessionId: data.sessionId,
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      return {
        success: false,
        error: 'Network error. Please try again.',
      }
    }
  }

  /**
   * Redirect to Stripe checkout
   */
  static async redirectToCheckout(sessionId: string): Promise<PaymentResult> {
    try {
      // Use window.location for redirect instead of deprecated stripe.redirectToCheckout
      const stripe = await stripePromise
      
      if (!stripe) {
        return {
          success: false,
          error: 'Stripe not loaded. Please refresh and try again.',
        }
      }

      // Get the checkout URL from the session
      const response = await fetch(`/api/get-checkout-url?session_id=${sessionId}`)
      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to get checkout URL',
        }
      }

      // Redirect to Stripe checkout
      window.location.href = data.url
      return { success: true }
    } catch (error) {
      console.error('Error redirecting to checkout:', error)
      return {
        success: false,
        error: 'Failed to redirect to checkout',
      }
    }
  }

  /**
   * Verify payment and update subscription
   */
  static async verifyPayment(sessionId: string): Promise<PaymentResult> {
    try {
      console.log('Verifying payment for session:', sessionId);
      const response = await fetch(`/api/create-checkout-session?session_id=${sessionId}`)
      const data = await response.json()

      console.log('Payment verification response:', response.status, data);

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to verify payment',
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      console.error('Error verifying payment:', error)
      return {
        success: false,
        error: 'Failed to verify payment',
      }
    }
  }
}
