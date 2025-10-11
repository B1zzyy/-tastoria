import { supabase } from './supabase'

export interface TrialStatus {
  isTrialActive: boolean
  daysRemaining: number
  trialStartDate: string
  isPaidUser: boolean
}

export interface UserProfile {
  id: string
  email: string
  name: string
  trial_start_date?: string
  subscription_status?: 'trial' | 'paid' | 'expired'
  subscription_end_date?: string
  created_at: string
}

export class TrialService {
  private static readonly TRIAL_DURATION_DAYS = 10 // Change to 0.001 for testing (1 minute)
  private static cache = new Map<string, { data: TrialStatus; timestamp: number }>();
  private static readonly CACHE_DURATION = 60000; // 1 minute cache

  /**
   * Get trial status for a user
   */
  static async getTrialStatus(userId: string): Promise<TrialStatus> {
    // Check cache first
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    
    try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
      
        // Profile fetched successfully

        if (error) {
          console.error('❌ Error fetching trial status:', error)
          console.error('❌ This suggests a Supabase connection issue!')
          // Return default trial status instead of assuming paid
          return this.getDefaultTrialStatus()
        }

        if (!profile) {
          return this.getDefaultTrialStatus()
        }

        // Check if user is a paid subscriber
        if ((profile as { subscription_status: string }).subscription_status === 'paid') {
          
          // If no end date, assume active subscription
          if (!(profile as { subscription_end_date: string | null }).subscription_end_date) {
            const result = {
              isTrialActive: false,
              daysRemaining: 0,
              trialStartDate: (profile as { trial_start_date: string }).trial_start_date || new Date().toISOString(),
              isPaidUser: true
            };
            this.cache.set(userId, { data: result, timestamp: Date.now() });
            return result;
          }
          
          const subscriptionEnd = new Date((profile as { subscription_end_date: string }).subscription_end_date)
          const now = new Date()
          
          if (subscriptionEnd > now) {
            const paidResult = {
              isTrialActive: false,
              daysRemaining: 0,
              trialStartDate: (profile as { trial_start_date: string }).trial_start_date || new Date().toISOString(),
              isPaidUser: true
            };
            // Cache the paid result
            this.cache.set(userId, { data: paidResult, timestamp: Date.now() });
            return paidResult;
          } else {
            // Subscription has expired
          }
        }

        // Check trial status
        const trialStartDate = (profile as { trial_start_date: string }).trial_start_date || new Date().toISOString()
        const trialStart = new Date(trialStartDate)
        const now = new Date()
        const daysSinceStart = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24))
        const daysRemaining = Math.max(0, this.TRIAL_DURATION_DAYS - daysSinceStart)
        const isTrialActive = daysRemaining > 0

        const trialResult = {
          isTrialActive,
          daysRemaining,
          trialStartDate,
          isPaidUser: false
        };

        // Cache the result
        this.cache.set(userId, { data: trialResult, timestamp: Date.now() });
        
        return trialResult;
    } catch (error) {
      console.error('❌ Network/connection error getting trial status:', error)
      return this.getDefaultTrialStatus()
    }
  }

  /**
   * Initialize trial for a new user
   */
  static async initializeTrial(userId: string, userEmail?: string, userName?: string): Promise<void> {
    try {
      // First check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, trial_start_date')
        .eq('id', userId)
        .single()

      // Only initialize if profile doesn't exist or doesn't have trial_start_date
      if (!existingProfile || !existingProfile.trial_start_date) {
        const profileData: {
          id: string;
          trial_start_date: string;
          subscription_status: string;
          email: string;
          name: string;
        } = {
          id: userId,
          trial_start_date: new Date().toISOString(),
          subscription_status: 'trial',
          email: userEmail || 'user@example.com',
          name: userName || 'User'
        }

        const { error } = await supabase
          .from('profiles')
          .upsert(profileData)

        if (error) {
          console.error('Error initializing trial:', error)
        }
      }
    } catch (error) {
      console.error('Error initializing trial:', error)
    }
  }

  /**
   * Check if user can access a feature
   */
  static async canAccessFeature(userId: string): Promise<boolean> {
    const trialStatus = await this.getTrialStatus(userId)
    
    // Paid users can access everything
    if (trialStatus.isPaidUser) {
      return true
    }

    // Trial users can access everything during trial
    if (trialStatus.isTrialActive) {
      return true
    }

    // Expired trial users cannot access premium features
    return false
  }

  /**
   * Get trial status for display in UI
   */
  static async getTrialDisplayInfo(userId: string): Promise<{
    status: 'trial' | 'expired' | 'paid'
    daysRemaining: number
    message: string
  }> {
    const trialStatus = await this.getTrialStatus(userId)

    if (trialStatus.isPaidUser) {
      return {
        status: 'paid',
        daysRemaining: 0,
        message: 'Premium User'
      }
    }

    if (trialStatus.isTrialActive) {
      return {
        status: 'trial',
        daysRemaining: trialStatus.daysRemaining,
        message: `${trialStatus.daysRemaining} days left in your free trial`
      }
    }

    return {
      status: 'expired',
      daysRemaining: 0,
      message: 'Your free trial has ended'
    }
  }

  /**
   * Default trial status for error cases
   */
  private static getDefaultTrialStatus(): TrialStatus {
    return {
      isTrialActive: true,
      daysRemaining: 10,
      trialStartDate: new Date().toISOString(),
      isPaidUser: false
    }
  }

  /**
   * Update user subscription status (for payment integration)
   */
  static async updateSubscriptionStatus(
    userId: string, 
    status: 'paid' | 'expired', 
    endDate?: string
  ): Promise<void> {
    try {
      const updateData: {
        subscription_status: string;
        subscription_end_date?: string;
      } = {
        subscription_status: status
      }

      if (endDate) {
        updateData.subscription_end_date = endDate
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

      if (error) {
        console.error('Error updating subscription status:', error)
      }
    } catch (error) {
      console.error('Error updating subscription status:', error)
    }
  }
}
