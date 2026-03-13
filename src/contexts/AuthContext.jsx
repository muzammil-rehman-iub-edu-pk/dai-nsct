import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const initialised           = useRef(false)

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
      setUser(authUser)
      setProfile(data)
    } catch (err) {
      console.error('loadProfile error:', err.message)
      setUser(authUser)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      initialised.current = true
      loadProfile(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!initialised.current) return
      if (event === 'SIGNED_OUT') {
        setUser(null); setProfile(null); setLoading(false)
        return
      }
      // Skip USER_UPDATED — completePasswordChange handles state directly
      if (event === 'USER_UPDATED') return
      loadProfile(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (!user) return
    const { data } = await supabase
      .from('user_profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }

  /**
   * completePasswordChange
   * Called by PasswordChangeModal on first-login force-change.
   * Steps (all awaited in sequence — no timers, no races):
   *   1. Update password in Supabase Auth
   *   2. Update must_change_password=false in user_profiles
   *   3. Patch the in-memory profile so React re-renders with the new value
   * Returns the updated profile so the caller can navigate immediately.
   */
  async function completePasswordChange(newPassword) {
    // Step 1 — update auth password
    const { error: authErr } = await supabase.auth.updateUser({ password: newPassword })
    if (authErr) throw authErr

    // Step 2 — update DB flag, await the confirmed write
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data: updatedProfile, error: dbErr } = await supabase
      .from('user_profiles')
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id)
      .select('*')   // return the updated row
      .single()
    if (dbErr) throw dbErr

    // Step 3 — set in-memory profile to the confirmed DB row
    // This is the single source of truth — no re-fetch needed
    setProfile(updatedProfile)

    return updatedProfile
  }

  const value = { user, profile, loading, signIn, signOut, refreshProfile, completePasswordChange }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
