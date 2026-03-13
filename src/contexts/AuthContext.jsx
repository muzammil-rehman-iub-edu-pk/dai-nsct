import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  // Prevent the initial getSession + onAuthStateChange SIGNED_IN from double-loading
  const initialised = useRef(false)

  async function loadProfile(authUser) {
    if (!authUser) {
      setUser(null)
      setProfile(null)
      setLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
      if (error) throw error
      // Set user + profile atomically — never clear profile mid-reload
      setUser(authUser)
      setProfile(data)
    } catch (err) {
      console.error('loadProfile error:', err.message)
      // Keep whatever user/profile we had rather than clearing on transient error
      setUser(authUser)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 1. Load existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      initialised.current = true
      loadProfile(session?.user ?? null)
    })

    // 2. Listen for future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip the SIGNED_IN that fires immediately after getSession on page load
      // to avoid a redundant profile fetch that races with the one above
      if (!initialised.current) return

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED — reload profile
      // For USER_UPDATED (password change) this ensures must_change_password
      // is fresh when the modal navigates to the dashboard
      loadProfile(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // onAuthStateChange SIGNED_IN will call loadProfile and set loading/profile
    return data
  }

  async function signOut() {
    setLoading(true)
    await supabase.auth.signOut()
    // onAuthStateChange SIGNED_OUT will clear state
  }

  async function refreshProfile() {
    const currentUser = user
    if (!currentUser) return
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single()
    setProfile(data)
  }

  const value = { user, profile, loading, signIn, signOut, refreshProfile }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
