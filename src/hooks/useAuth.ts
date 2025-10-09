import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { TrialService } from '@/lib/trialService'
import type { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  name: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchUserProfile(session.user)
        // Initialize trial for new users
        await TrialService.initializeTrial(
          session.user.id, 
          session.user.email || undefined, 
          session.user.user_metadata?.name || undefined
        )
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ User signed in:', session.user.email);
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
      }
      
      // Handle sign out events specifically
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
        return
      }
      
      if (session?.user) {
        await fetchUserProfile(session.user)
        // Initialize trial for new users
        await TrialService.initializeTrial(
          session.user.id, 
          session.user.email || undefined, 
          session.user.user_metadata?.name || undefined
        )
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (authUser: User) => {
    try {
      
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
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User'
        };
        setUser(fallbackUser);
        return
      }

      if (profile && typeof profile === 'object' && profile !== null) {
        const profileData = profile as { id: string; email: string; name: string };
        setUser({
          id: profileData.id,
          email: profileData.email,
          name: profileData.name
        })
      } else {
        // Fallback if profile is null
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User'
        })
      }
    } catch (error) {
      console.error('❌ useAuth: Network/connection error fetching profile:', error)
      // Fallback to auth user data on any error
      const fallbackUser = {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User'
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

      const { error } = await Promise.race([updatePromise, timeoutPromise]) as any;

      if (error) {
        console.error('Profile update error:', error);
        throw error
      }


      // Update local user state - force re-render
      setUser(prev => {
        if (!prev) return null;
        const newUser = { ...prev, ...updates };
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

          const { data: { session } } = await Promise.race([sessionPromise, sessionTimeoutPromise]) as any;
          
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

            const { data: profile } = await Promise.race([profilePromise, profileTimeoutPromise]) as any;
            
            if (profile) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: profile.name || session.user.user_metadata?.name || 'User'
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
    updateProfile
  }
}
