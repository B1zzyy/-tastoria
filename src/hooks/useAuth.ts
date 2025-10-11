import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { TrialService } from '@/lib/trialService'
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
  const profileCache = new Map<string, { data: AuthUser; timestamp: number }>()
  const PROFILE_CACHE_DURATION = 300000 // 5 minutes
  
  // Session recovery mechanism
  const attemptSessionRecovery = async () => {
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
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Session recovery error:', error)
      return false
    }
  }

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
          // Initialize trial for new users (don't wait for this to complete)
          TrialService.initializeTrial(
            session.user.id, 
            session.user.email || undefined, 
            session.user.user_metadata?.name || undefined
          ).catch(err => console.warn('Trial initialization failed:', err))
        } else {
          console.log('ℹ️ No existing session found')
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
        // Initialize trial for new users (don't wait for this to complete)
        TrialService.initializeTrial(
          session.user.id, 
          session.user.email || undefined, 
          session.user.user_metadata?.name || undefined
        ).catch(err => console.warn('Trial initialization failed:', err))
      } else if (event === 'SIGNED_OUT') {
        // console.log('👋 User signed out');
        setUser(null)
        setLoading(false)
        return
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // console.log('🔄 Token refreshed for:', session.user.email);
        // Don't clear user on token refresh - just update if needed
        if (!user || user.id !== session.user.id) {
          await fetchUserProfile(session.user)
        }
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
  }, [])
  
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
  }, [user])

  const fetchUserProfile = async (authUser: User) => {
    try {
      // Check cache first
      const cached = profileCache.get(authUser.id)
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
        profileCache.set(authUser.id, { data: fallbackUser, timestamp: Date.now() })
        return
      }

      if (profile && typeof profile === 'object' && profile !== null) {
        const profileData = profile as { id: string; email: string; name: string; created_at: string };
        const userData = {
          id: profileData.id,
          email: profileData.email,
          name: profileData.name,
          created_at: profileData.created_at || authUser.created_at || new Date().toISOString()
        }
        setUser(userData)
        // Cache the profile data
        profileCache.set(authUser.id, { data: userData, timestamp: Date.now() })
      } else {
        // Fallback if profile is null
        const fallbackUser = {
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          created_at: authUser.created_at || new Date().toISOString()
        }
        setUser(fallbackUser)
        // Cache the fallback data
        profileCache.set(authUser.id, { data: fallbackUser, timestamp: Date.now() })
      }
    } catch (error) {
      console.error('❌ useAuth: Network/connection error fetching profile:', error)
      // Fallback to auth user data on any error
      const fallbackUser = {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        created_at: authUser.created_at || new Date().toISOString()
      };
      console.log('✅ useAuth: Using fallback user data:', fallbackUser);
      setUser(fallbackUser);
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  const signOut = async () => {
    try {
      // Clear user state immediately
      setUser(null)
      // Clear profile cache on sign out
      profileCache.clear()
      
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

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    attemptSessionRecovery
  }
}
