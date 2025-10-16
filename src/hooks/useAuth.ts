import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { TrialService } from '@/lib/trialService'
import { 
  associateUserWithDevice, 
  getAssociatedUserId, 
  clearDeviceAssociation 
} from '@/lib/deviceFingerprint'
import type { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  name: string
  created_at: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Cache for user profiles to prevent repeated database calls
  const profileCache = useRef(new Map<string, { data: AuthUser; timestamp: number }>())
  const PROFILE_CACHE_DURATION = 300000 // 5 minutes

  // Fetch user profile function
  const fetchUserProfile = useCallback(async (authUser: User) => {
    try {
      // Check cache first
      const cached = profileCache.current.get(authUser.id)
      if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
        // console.log('📦 Using cached user profile for:', authUser.id)
        setUser(cached.data)
        return
      }
      
        // console.log('🔄 Fetching fresh user profile for:', authUser.id)
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error) {
        console.warn('Profile not found, using auth user data')
        // Fallback to auth user data if profile doesn't exist
        const fallbackUser = {
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          created_at: authUser.created_at || new Date().toISOString()
        };
        setUser(fallbackUser);
        // Cache the fallback data
        profileCache.current.set(authUser.id, { data: fallbackUser, timestamp: Date.now() })
        return
      }

      if (profile) {
        const userData = {
          id: profile.id,
          email: profile.email || authUser.email || '',
          name: profile.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          created_at: profile.created_at || authUser.created_at || new Date().toISOString()
        };
        setUser(userData);
        // Cache the fresh data
        profileCache.current.set(authUser.id, { data: userData, timestamp: Date.now() })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // Fallback to auth user data on error
      const fallbackUser = {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        created_at: authUser.created_at || new Date().toISOString()
      };
      console.log('✅ useAuth: Using fallback user data:', fallbackUser);
      setUser(fallbackUser);
    }
  }, [])

  // Session recovery mechanism
  const attemptSessionRecovery = useCallback(async () => {
    try {
      console.log('🔄 Attempting session recovery...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Session recovery failed:', error)
        return false
      }
      
      if (session?.user) {
        console.log('✅ Session recovered for:', session.user.email)
        await fetchUserProfile(session.user)
        // Associate user with device for future recovery
        associateUserWithDevice(session.user.id)
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Session recovery error:', error)
      return false
    }
  }, [fetchUserProfile])

  // Device-based session recovery
  const attemptDeviceBasedRecovery = useCallback(async () => {
    try {
      console.log('🔍 Attempting device-based session recovery...')
      const associatedUserId = getAssociatedUserId()
      
      if (!associatedUserId) {
        console.log('ℹ️ No device association found')
        return false
      }
      
      console.log('🔍 Found device association for user:', associatedUserId)
      
      // Try to refresh the session
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('❌ Device-based session refresh failed:', error)
        return false
      }
      
      if (session?.user && session.user.id === associatedUserId) {
        console.log('✅ Device-based session recovery successful for:', session.user.email)
        await fetchUserProfile(session.user)
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Device-based recovery error:', error)
      return false
    }
  }, [fetchUserProfile])

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        // console.log('🔍 Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting session:', error)
          setLoading(false)
          return
        }
        
        if (session?.user) {
          // console.log('✅ Found existing session for:', session.user.email)
          await fetchUserProfile(session.user)
          // Associate user with device for future recovery
          associateUserWithDevice(session.user.id)
          // Initialize trial for new users (don't wait for this to complete)
          TrialService.initializeTrial(
            session.user.id, 
            session.user.email || undefined, 
            session.user.user_metadata?.name || undefined
          ).catch(err => console.warn('Trial initialization failed:', err))
        } else {
          console.log('ℹ️ No existing session found, trying device-based recovery...')
          // Try device-based recovery as fallback
          const deviceRecoverySuccess = await attemptDeviceBasedRecovery()
          if (!deviceRecoverySuccess) {
            console.log('ℹ️ Device-based recovery also failed')
          }
        }
      } catch (error) {
        console.error('❌ Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // console.log('🔄 Auth state change:', event, session?.user?.email || 'no user');
      
      if (event === 'SIGNED_IN' && session?.user) {
        // console.log('✅ User signed in:', session.user.email);
        await fetchUserProfile(session.user)
        // Associate user with device for persistent login
        associateUserWithDevice(session.user.id)
        // Initialize trial for new users (don't wait for this to complete)
        TrialService.initializeTrial(
          session.user.id, 
          session.user.email || undefined, 
          session.user.user_metadata?.name || undefined
        ).catch(err => console.warn('Trial initialization failed:', err))
      } else if (event === 'SIGNED_OUT') {
        // console.log('👋 User signed out');
        setUser(null)
        // Clear device association on logout
        clearDeviceAssociation()
        setLoading(false)
        return
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // console.log('🔄 Token refreshed for:', session.user.email);
        // Don't clear user on token refresh - just update if needed
        if (!user || user.id !== session.user.id) {
          await fetchUserProfile(session.user)
        }
        // Update device association to refresh last seen
        associateUserWithDevice(session.user.id)
      } else if (session?.user) {
        // Handle other events with valid session
        await fetchUserProfile(session.user)
      } else if ((event as string) === 'SIGNED_OUT') {
        // Only clear user on explicit sign out
        setUser(null)
      }
      // Don't clear user on other events like token refresh failures
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchUserProfile, user, attemptDeviceBasedRecovery])
  
  // Periodic session check to ensure user stays logged in
  useEffect(() => {
    if (!user) return
    
    const sessionCheckInterval = setInterval(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.warn('⚠️ Session check failed:', error)
          return
        }
        
        if (!session?.user) {
          console.log('🔄 Session lost, attempting recovery...')
          const recovered = await attemptSessionRecovery()
          if (!recovered) {
            console.log('❌ Session recovery failed, user will need to log in again')
            // Don't immediately clear user - let the auth state change handler deal with it
          }
        } else {
          console.log('✅ Session is valid for:', session.user.email)
        }
      } catch (error) {
        console.error('❌ Session check error:', error)
      }
    }, 60000) // Check every minute
    
    return () => clearInterval(sessionCheckInterval)
  }, [user, attemptSessionRecovery])


  const signUp = async (email: string, password: string, name: string) => {
    try {
      // Add timeout to prevent hanging
      const signUpPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign up timeout after 15 seconds')), 15000)
      );

      const { data, error } = await Promise.race([signUpPromise, timeoutPromise]) as { data: { user: { id: string; email: string | null; identities: { id: string; user_id: string; identity_data: Record<string, unknown>; provider: string; created_at: string; updated_at: string }[] } } | null; error: { message: string } | null };
      return { data, error }
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error: { message: error instanceof Error ? error.message : 'Sign up failed' } }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      // Add timeout to prevent hanging
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign in timeout after 15 seconds')), 15000)
      );

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]) as { data: { user: { id: string; email: string | null } } | null; error: { message: string } | null };
      return { data, error }
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error: { message: error instanceof Error ? error.message : 'Sign in failed' } }
    }
  }

  const signOut = async () => {
    try {
      // Clear user state immediately
      setUser(null)
      // Clear profile cache on sign out
      profileCache.current.clear()
      
      // Try to sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.warn('Signout error (but user state cleared):', error)
        // Even if signout fails, we've already cleared the local state
        return { error }
      }
      
      return { error: null }
    } catch (error) {
      console.error('Signout error:', error)
      // User state is already cleared
      return { error }
    }
  }

  const updateProfile = async (updates: { name?: string }) => {
    if (!user) {
      throw new Error('No user logged in')
    }

    try {
      
      // Add timeout to prevent hanging
      const updatePromise = supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile update timeout after 10 seconds')), 10000)
      );

      const { error } = await Promise.race([updatePromise, timeoutPromise]) as { error: Error | null };

      if (error) {
        console.error('Profile update error:', error);
        throw error
      }


      // Update local user state - force re-render
      setUser(prev => {
        if (!prev) return null;
        const newUser = { ...prev, ...updates };
        // Ensure created_at is preserved
        if (!newUser.created_at) {
          newUser.created_at = prev.created_at;
        }
        // Force a new object reference to ensure React detects the change
        return { ...newUser };
      })

      // Force a complete re-fetch to ensure all components get the updated data
      setTimeout(async () => {
        try {
          // Add timeout to session fetch
          const sessionPromise = supabase.auth.getSession();
          const sessionTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
          );

          const { data: { session } } = await Promise.race([sessionPromise, sessionTimeoutPromise]) as { data: { session: { user: { id: string; email: string | null; user_metadata?: { name?: string } } } | null } };
          
          if (session?.user) {
            
            // Add timeout to profile fetch
            const profilePromise = supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            const profileTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
            );

            const { data: profile } = await Promise.race([profilePromise, profileTimeoutPromise]) as { data: { name: string; email: string } | null };
            
            if (profile) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: profile.name || session.user.user_metadata?.name || 'User',
                created_at: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
      }, 100);
      
      return { error: null }
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  }

  // Manual session refresh function
  const refreshSession = useCallback(async () => {
    try {
      console.log('🔄 Manually refreshing session...')
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('❌ Manual session refresh failed:', error)
        return false
      }
      
      if (session?.user) {
        console.log('✅ Manual session refresh successful for:', session.user.email)
        await fetchUserProfile(session.user)
        associateUserWithDevice(session.user.id)
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Manual session refresh error:', error)
      return false
    }
  }, [fetchUserProfile])

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    attemptSessionRecovery,
    refreshSession,
    attemptDeviceBasedRecovery
  }
}
