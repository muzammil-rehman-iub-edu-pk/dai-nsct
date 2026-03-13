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

  async function completePasswordChange(newPassword) {
    // Step 1 — update auth password
    const { error: authErr } = await supabase.auth.updateUser({ password: newPassword })
    if (authErr) throw authErr

    // Step 2 — get current user id
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    // Step 3 — update DB flag (plain update, no .select() to avoid RLS PGRST116)
    const { error: dbErr } = await supabase
      .from('user_profiles')
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id)
    if (dbErr) throw dbErr

    // Step 4 — fetch the fresh profile in a separate SELECT (RLS allows own row read)
    const { data: updatedProfile, error: fetchErr } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single()
    if (fetchErr) throw fetchErr

    // Step 5 — patch in-memory state directly so navigate() sees the new value instantly
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
