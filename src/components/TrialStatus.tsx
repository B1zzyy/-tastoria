import React from 'react'
import { useTrial } from '@/hooks/useTrial'
import { Clock } from 'lucide-react'
import { motion } from 'framer-motion'

interface TrialStatusProps {
  onClick?: () => void
}

export function TrialStatus({ onClick }: TrialStatusProps) {
  const { trialDisplayInfo, loading, isTrialActive, daysRemaining } = useTrial()

  // Show loading state briefly
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="w-3 h-3 animate-pulse" />
        <span>Loading...</span>
      </div>
    )
  }

  // Show trial status if we have it, or fallback to default
  const shouldShowTrial = trialDisplayInfo?.status === 'trial' || (isTrialActive && daysRemaining > 0)
  
  if (!shouldShowTrial) {
    return null
  }

  const displayDays = trialDisplayInfo?.daysRemaining || daysRemaining || 7

  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 rounded-full hover:bg-accent/50 transition-colors duration-200 cursor-pointer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Clock className="w-3 h-3" />
      <span>{displayDays} days left</span>
    </motion.button>
  )
}
