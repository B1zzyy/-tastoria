import { supabase } from './supabase'

export interface FingerprintData {
  userAgent: string
  screenResolution: string
  timezone: string
  language: string
  platform: string
  cookieEnabled: boolean
  doNotTrack: string
  ipAddress?: string
}

export interface FingerprintResult {
  fingerprint: string
  isEligible: boolean
  reason?: string
}

export class FingerprintService {
  /**
   * Generate a unique fingerprint from browser data
   */
  static generateFingerprint(data: FingerprintData): string {
    // Create a string from all the fingerprint data
    const fingerprintString = [
      data.userAgent,
      data.screenResolution,
      data.timezone,
      data.language,
      data.platform,
      data.cookieEnabled.toString(),
      data.doNotTrack,
      data.ipAddress || ''
    ].join('|')

    // Create a hash-like string (simple but effective)
    let hash = 0
    for (let i = 0; i < fingerprintString.length; i++) {
      const char = fingerprintString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Convert to positive hex string
    const fingerprint = Math.abs(hash).toString(16).padStart(8, '0')
    
    // Debug logging
    console.log('🔍 Fingerprint Debug:', {
      fingerprintString: fingerprintString.substring(0, 100) + '...',
      fingerprint,
      data: {
        userAgent: data.userAgent.substring(0, 50) + '...',
        screenResolution: data.screenResolution,
        timezone: data.timezone,
        ipAddress: data.ipAddress
      }
    })
    
    return fingerprint
  }

  /**
   * Check if a fingerprint is eligible for a trial
   */
  static async checkTrialEligibility(
    fingerprint: string, 
    ipAddress: string
  ): Promise<FingerprintResult> {
    try {
      // Check if this fingerprint has already used a trial
      const { data: fingerprintData } = await supabase
        .from('trial_fingerprints')
        .select('*')
        .eq('fingerprint_hash', fingerprint)
        .eq('trial_used', true)
        .single()

      if (fingerprintData) {
        return {
          fingerprint,
          isEligible: false,
          reason: 'Fingerprint already used for trial'
        }
      }

      // Check if this IP address has already used a trial
      const { data: ipData } = await supabase
        .from('trial_fingerprints')
        .select('*')
        .eq('ip_address', ipAddress)
        .eq('trial_used', true)
        .single()

      if (ipData) {
        return {
          fingerprint,
          isEligible: false,
          reason: 'IP address already used for trial'
        }
      }

      return {
        fingerprint,
        isEligible: true
      }

    } catch (error) {
      console.error('Error checking trial eligibility:', error)
      // If there's an error, allow the trial (fail open)
      return {
        fingerprint,
        isEligible: true
      }
    }
  }

  /**
   * Record a fingerprint as having used a trial
   */
  static async recordTrialUsage(
    fingerprint: string,
    ipAddress: string,
    userId: string,
    userAgent: string,
    screenResolution: string,
    timezone: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('trial_fingerprints')
        .insert({
          fingerprint_hash: fingerprint,
          ip_address: ipAddress,
          user_id: userId,
          user_agent: userAgent,
          screen_resolution: screenResolution,
          timezone: timezone,
          trial_used: true,
          trial_start_date: new Date().toISOString(),
          trial_end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
        })

      if (error) {
        console.error('Error recording trial usage:', error)
      }
    } catch (error) {
      console.error('Error recording trial usage:', error)
    }
  }

  /**
   * Get client-side fingerprint data
   */
  static getClientFingerprint(): FingerprintData {
    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack || 'unspecified'
    }
  }
}
