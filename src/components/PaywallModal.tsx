import React, { useState } from 'react'
import { X, Crown, Check, Sparkles, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PaymentService } from '@/lib/paymentService'
import { useAuth } from '@/hooks/useAuth'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  feature?: string
}

export function PaywallModal({ isOpen, onClose, feature }: PaywallModalProps) {
  const { user } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const features = [
    'Unlimited recipe parsing',
    'Unlimited saved recipes',
    'Collections & organization',
    'AI recipe chat assistant',
    'Custom recipe previews',
    'Advanced sharing options',
    'Priority support'
  ]

  const handleUpgrade = async () => {
    if (!user) {
      setError('Please log in to upgrade')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to start payment process')
        setIsProcessing(false)
        return
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('Failed to get checkout URL')
        setIsProcessing(false)
      }

      // If we get here, user is being redirected to Stripe
      // The modal will close when they return from successful payment
    } catch (error) {
      console.error('Payment error:', error)
      setError('An unexpected error occurred. Please try again.')
      setIsProcessing(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-card border border-border rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl relative"
        >
        {/* No close button - paywall is non-dismissible */}
        
        <div className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Upgrade to Premium
          </h2>
          <p className="text-muted-foreground mb-6">
            {feature ? `Unlock ${feature} and more with Premium` : 'Unlock all features with Premium'}
          </p>
        </div>

        {/* Pricing */}
        <div className="px-6 pb-4">
          <div className="bg-accent/50 border border-border rounded-xl p-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-3xl font-bold text-foreground">$6.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Cancel anytime • No additional fees
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="px-6 pb-6">
          <h3 className="font-semibold text-foreground mb-3">What's included:</h3>
          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="px-6 pb-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}
          
          <button
            onClick={handleUpgrade}
            disabled={isProcessing}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Start Premium Subscription
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Your free trial has ended. Upgrade to continue using all features.
          </p>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}