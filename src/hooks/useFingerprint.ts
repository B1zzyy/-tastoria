import { useState, useEffect } from 'react'
import { FingerprintService, type FingerprintData } from '@/lib/fingerprintService'

export interface FingerprintResult {
  fingerprint: string
  isEligible: boolean
  reason?: string
  loading: boolean
  error?: string
}

export function useFingerprint() {
  const [result, setResult] = useState<FingerprintResult>({
    fingerprint: '',
    isEligible: true,
    loading: true
  })

  const checkEligibility = async () => {
    try {
      setResult(prev => ({ ...prev, loading: true, error: undefined }))

      // Get client fingerprint data
      const fingerprintData = FingerprintService.getClientFingerprint()

      // Check eligibility with server
      const response = await fetch('/api/check-trial-eligibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fingerprintData })
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          fingerprint: data.fingerprint,
          isEligible: data.isEligible,
          reason: data.reason,
          loading: false
        })
      } else {
        setResult({
          fingerprint: '',
          isEligible: true, // Fail open
          loading: false,
          error: data.error
        })
      }
    } catch (error) {
      console.error('Error checking fingerprint eligibility:', error)
      setResult({
        fingerprint: '',
        isEligible: true, // Fail open
        loading: false,
        error: 'Failed to check eligibility'
      })
    }
  }

  const recordTrialUsage = async () => {
    try {
      const fingerprintData = FingerprintService.getClientFingerprint()

      const response = await fetch('/api/record-trial-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fingerprintData })
      })

      const data = await response.json()
      return data.success
    } catch (error) {
      console.error('Error recording trial usage:', error)
      return false
    }
  }

  useEffect(() => {
    checkEligibility()
  }, [])

  return {
    ...result,
    checkEligibility,
    recordTrialUsage
  }
}
