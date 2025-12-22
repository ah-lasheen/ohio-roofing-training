import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Function to fetch and update user profile (including role and name)
  const fetchUserProfile = async (userId) => {
    if (!userId) {
      setUserRole(null)
      setUserProfile(null)
      return null
    }

    try {
      // Fetch profile with shorter timeout for faster response
      const profilePromise = supabase
        .from('user_profiles')
        .select('role, first_name, last_name, email')
        .eq('id', userId)
        .maybeSingle()
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
      })

      const result = await Promise.race([profilePromise, timeoutPromise])
      const { data, error } = result
      
      if (error) {
        console.error('Error fetching user profile from database:', error)
        // Only default to trainee if it's a NOT FOUND error (handle multiple error codes)
        if (error.code === 'PGRST116' || error.code === 'NOT_FOUND' || error.status === 404) {
          console.warn('User profile not found, defaulting to trainee')
          setUserRole('trainee')
          setUserProfile(null)
          return { role: 'trainee', first_name: null, last_name: null }
        }
        // For other errors, default to trainee to keep app functional
        setUserRole('trainee')
        setUserProfile(null)
        return { role: 'trainee', first_name: null, last_name: null }
      }
      
      if (data) {
        setUserRole(data.role || 'trainee')
        setUserProfile({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
        })
        return data
      } else {
        console.warn('No profile data returned, defaulting to trainee')
        setUserRole('trainee')
        setUserProfile(null)
        return { role: 'trainee', first_name: null, last_name: null }
      }
    } catch (err) {
      console.error('Exception fetching user profile (may be timeout):', err)
      // Always set a role even on error/timeout to prevent stuck state
      setUserRole('trainee')
      setUserProfile(null)
      return { role: 'trainee', first_name: null, last_name: null }
    }
  }

  // Keep fetchUserRole for backward compatibility, but it now uses fetchUserProfile
  const fetchUserRole = async (userId) => {
    const profile = await fetchUserProfile(userId)
    return profile?.role || 'trainee'
  }

  useEffect(() => {
    let mounted = true

    // Get initial session with timeout protection
    const initSession = async () => {
      let timeoutId
      try {
        // Add a timeout to prevent hanging - set loading to false after timeout
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('Session check timed out, assuming no session')
            setSession(null)
            setUser(null)
            setUserRole(null)
            setLoading(false)
          }
        }, 8000) // 8 second timeout

        const { data: { session }, error } = await supabase.auth.getSession()
        
        // Clear timeout if we got a response
        if (timeoutId) clearTimeout(timeoutId)
        
        if (!mounted) return

        if (error) {
          console.error('Error getting session:', error)
          setSession(null)
          setUser(null)
          setUserRole(null)
          setLoading(false)
          return
        }

        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Fetch profile (including role and name) - don't block loading
          fetchUserProfile(session.user.id).catch((err) => {
            console.error('Error in profile fetch:', err)
          })
        } else {
          setUserRole(null)
          setUserProfile(null)
        }
        
        // Set loading to false after a short delay to allow role to start fetching
        // But don't wait for it to complete
        setTimeout(() => {
          if (mounted) {
            setLoading(false)
          }
        }, 100)
      } catch (err) {
        // Clear timeout on error
        if (timeoutId) clearTimeout(timeoutId)
        
        console.error('Error getting initial session:', err)
        if (mounted) {
          // On error, assume no session and stop loading
          setSession(null)
          setUser(null)
          setUserRole(null)
          setUserProfile(null)
          setLoading(false)
        }
      }
    }

    initSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        // Fetch profile (including role and name) but don't await - let it update in background
        fetchUserProfile(session.user.id).catch((err) => {
          console.error('Error fetching profile on auth change:', err)
        })
      } else {
        setUserRole(null)
        setUserProfile(null)
      }
      // Set loading to false quickly
      setTimeout(() => {
        if (mounted) {
          setLoading(false)
        }
      }, 100)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email, password, userMetadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userMetadata,
      },
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (data?.user) {
      await fetchUserProfile(data.user.id)
    }
    return { data, error }
  }

  const signOut = async () => {
    try {
      // Clear state and loading immediately to prevent stuck loading screen
      setUser(null)
      setSession(null)
      setUserRole(null)
      setUserProfile(null)
      setLoading(false)
      
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (err) {
      console.error('Error signing out:', err)
      // Ensure state is cleared even if there's an error
      setUser(null)
      setSession(null)
      setUserRole(null)
      setUserProfile(null)
      setLoading(false)
      return { error: err }
    }
  }

  // Helper function to get display name
  const getDisplayName = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`
    }
    if (userProfile?.first_name) {
      return userProfile.first_name
    }
    if (user?.email) {
      return user.email
    }
    return 'User'
  }

  const value = {
    user,
    session,
    userRole,
    userProfile,
    getDisplayName,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

