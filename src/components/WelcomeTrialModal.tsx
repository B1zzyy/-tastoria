'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Star, Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTrial } from '@/hooks/useTrial'

interface WelcomeTrialModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function WelcomeTrialModal({ isOpen, onClose }: WelcomeTrialModalProps) {
  const { user } = useAuth()
  const { daysRemaining } = useTrial()

  if (!isOpen || !user) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-gradient-to-br from-card via-card to-card/95 border border-border/50 rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent">
                      Welcome to Tastoria!
                    </h2>
                    <p className="text-muted-foreground">You&apos;re starting your free trial</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 pt-4">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-lg font-semibold text-primary">FREE TRIAL ACTIVE</span>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    You have <span className="font-semibold text-foreground">{daysRemaining} days</span> to explore all of Tastoria&apos;s premium features at no cost.
                  </p>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">What&apos;s included in your trial:</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      'Unlimited recipe parsing',
                      'Unlimited saved recipes', 
                      'Create custom collections',
                      'AI-powered recipe chat',
                      'Priority support'
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trial info */}
                <div className="bg-background/30 border border-border/30 rounded-xl p-4 mb-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Trial ends in</p>
                    <p className="text-2xl font-bold text-foreground">{daysRemaining} days</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      After your trial, continue with Tastoria Premium for $6.99/month
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 h-12 px-6 bg-background/50 hover:bg-background/70 border border-border/50 rounded-xl text-foreground transition-all duration-200 font-medium"
                  >
                    Start Exploring
                  </button>
                  <button
                    onClick={() => {
                      // Close the welcome modal first
                      onClose()
                      
                      // Then scroll to the premium section after a short delay
                      setTimeout(() => {
                        const premiumSection = document.querySelector('[data-premium-section]')
                        if (premiumSection) {
                          premiumSection.scrollIntoView({ 
                            behavior: 'smooth',
                            block: 'start'
                          })
                        }
                      }, 300)
                    }}
                    className="flex-1 h-12 px-6 bg-gradient-to-r from-primary to-primary/90 text-black rounded-xl hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
                  >
                    Upgrade Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
