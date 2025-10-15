/**
 * Session Keep-Alive Service
 * Periodically refreshes the session to prevent expiration
 */

import { supabase } from './supabase'
import { associateUserWithDevice } from './deviceFingerprint'

class SessionKeepAliveService {
  private intervalId: NodeJS.Timeout | null = null
  private isActive = false
  private readonly REFRESH_INTERVAL = 15 * 60 * 1000 // 15 minutes
  private readonly MAX_RETRIES = 3
  private retryCount = 0

  /**
   * Start the keep-alive service
   */
  start() {
    if (this.isActive) {
      console.log('🔄 Session keep-alive already active')
      return
    }

    console.log('🚀 Starting session keep-alive service')
    this.isActive = true
    this.retryCount = 0

    // Initial check
    this.refreshSession()

    // Set up periodic refresh
    this.intervalId = setInterval(() => {
      this.refreshSession()
    }, this.REFRESH_INTERVAL)
  }

  /**
   * Stop the keep-alive service
   */
  stop() {
    if (!this.isActive) {
      return
    }

    console.log('⏹️ Stopping session keep-alive service')
    this.isActive = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Refresh the session
   */
  private async refreshSession() {
    try {
      // Check if user is logged in
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.warn('⚠️ Session check failed:', error)
        this.handleRetry()
        return
      }

      if (!session?.user) {
        console.log('ℹ️ No active session, stopping keep-alive')
        this.stop()
        return
      }

      // Check if session is close to expiring (within 5 minutes)
      const expiresAt = session.expires_at
      if (expiresAt) {
        const timeUntilExpiry = expiresAt * 1000 - Date.now()
        const fiveMinutes = 5 * 60 * 1000

        if (timeUntilExpiry > fiveMinutes) {
          console.log('✅ Session still valid, no refresh needed')
          this.retryCount = 0 // Reset retry count on success
          return
        }
      }

      console.log('🔄 Refreshing session...')
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError) {
        console.warn('⚠️ Session refresh failed:', refreshError)
        this.handleRetry()
        return
      }

      if (refreshData.session?.user) {
        console.log('✅ Session refreshed successfully for:', refreshData.session.user.email)
        // Update device association
        associateUserWithDevice(refreshData.session.user.id)
        this.retryCount = 0 // Reset retry count on success
      }

    } catch (error) {
      console.error('❌ Session keep-alive error:', error)
      this.handleRetry()
    }
  }

  /**
   * Handle retry logic
   */
  private handleRetry() {
    this.retryCount++
    
    if (this.retryCount >= this.MAX_RETRIES) {
      console.error('❌ Max retries reached, stopping keep-alive service')
      this.stop()
    } else {
      console.log(`🔄 Retry ${this.retryCount}/${this.MAX_RETRIES} in 2 minutes...`)
      // Wait 2 minutes before retrying
      setTimeout(() => {
        if (this.isActive) {
          this.refreshSession()
        }
      }, 2 * 60 * 1000)
    }
  }

  /**
   * Check if service is active
   */
  isRunning(): boolean {
    return this.isActive
  }

  /**
   * Force a session refresh
   */
  async forceRefresh(): Promise<boolean> {
    try {
      console.log('🔄 Force refreshing session...')
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('❌ Force refresh failed:', error)
        return false
      }

      if (session?.user) {
        console.log('✅ Force refresh successful for:', session.user.email)
        associateUserWithDevice(session.user.id)
        this.retryCount = 0
        return true
      }

      return false
    } catch (error) {
      console.error('❌ Force refresh error:', error)
      return false
    }
  }
}

// Export singleton instance
export const sessionKeepAlive = new SessionKeepAliveService()

// Auto-start when user is authenticated
if (typeof window !== 'undefined') {
  // Check for existing session on page load
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      console.log('🚀 Auto-starting session keep-alive for existing session')
      sessionKeepAlive.start()
    }
  })

  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      console.log('🚀 Starting session keep-alive for signed-in user')
      sessionKeepAlive.start()
    } else if (event === 'SIGNED_OUT') {
      console.log('⏹️ Stopping session keep-alive for signed-out user')
      sessionKeepAlive.stop()
    }
  })
}
