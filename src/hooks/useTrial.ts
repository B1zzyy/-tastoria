import { useState, useEffect } from 'react'
import { TrialService, type TrialStatus } from '@/lib/trialService'
import { useAuth } from './useAuth'

export interface TrialDisplayInfo {
  status: 'trial' | 'expired' | 'paid'
  daysRemaining: number
  message: string
}

export function useTrial() {
  const { user } = useAuth()
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [trialDisplayInfo, setTrialDisplayInfo] = useState<TrialDisplayInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setTrialStatus(null)
      setTrialDisplayInfo(null)
      setLoading(false)
      return
    }

    const loadTrialStatus = async () => {
      try {
        setLoading(true)
        
        // Initialize trial if it doesn't exist (don't wait for this)
        TrialService.initializeTrial(
          user.id, 
          user.email, 
          user.name
        ).catch(err => 
          console.warn('Trial initialization failed:', err)
        )
        
        // Get trial status
        const status = await TrialService.getTrialStatus(user.id)
        setTrialStatus(status)
        
        // Get display info
        const displayInfo = await TrialService.getTrialDisplayInfo(user.id)
        setTrialDisplayInfo(displayInfo)
      } catch (error) {
        console.warn('Error loading trial status, using defaults:', error)
        // Set default trial status even on error
        const defaultStatus = {
          isTrialActive: true,
          daysRemaining: 10,
          trialStartDate: new Date().toISOString(),
          isPaidUser: false
        }
        setTrialStatus(defaultStatus)
        setTrialDisplayInfo({
          status: 'trial',
          daysRemaining: 10,
          message: '10 days left in your free trial'
        })
      } finally {
        setLoading(false)
      }
    }

    loadTrialStatus()
  }, [user])

  const canAccessFeature = async (): Promise<boolean> => {
    if (!user) return false
    return await TrialService.canAccessFeature(user.id)
  }

  const refreshTrialStatus = async () => {
    if (!user) return
    
    try {
      const status = await TrialService.getTrialStatus(user.id)
      setTrialStatus(status)
      
      const displayInfo = await TrialService.getTrialDisplayInfo(user.id)
      setTrialDisplayInfo(displayInfo)
    } catch (error) {
      console.error('Error refreshing trial status:', error)
    }
  }

  return {
    trialStatus,
    trialDisplayInfo,
    loading,
    canAccessFeature,
    refreshTrialStatus,
    isTrialActive: trialStatus?.isTrialActive ?? false,
    isPaidUser: trialStatus?.isPaidUser ?? false,
    daysRemaining: trialStatus?.daysRemaining ?? 0
  }
}
