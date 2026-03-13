/**
 * auth.js — Authentication helper utilities
 * Wraps Supabase auth operations with role-aware logic.
 */

import { supabase } from './supabase'

/**
 * Sign in and return both the auth user and their profile.
 */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (profileErr) throw new Error('Profile not found. Contact administrator.')
  if (!profile.is_active) throw new Error('Your account has been deactivated. Contact administrator.')

  return { user: data.user, profile, session: data.session }
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Get current session (non-reactive, one-shot).
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/**
 * Update password for the currently authenticated user.
 * Enforces minimum complexity rules before calling Supabase.
 */
export async function updatePassword(newPassword) {
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.')
  if (!/[A-Z]/.test(newPassword)) throw new Error('Password must contain at least one uppercase letter.')
  if (!/[0-9]/.test(newPassword)) throw new Error('Password must contain at least one number.')

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error

  // Mark must_change_password as false
  const { data: { user } } = await supabase.auth.getUser()
  await supabase
    .from('user_profiles')
    .update({ must_change_password: false, updated_at: new Date().toISOString() })
    .eq('id', user.id)
}

/**
 * Create a new user via Supabase Admin API.
 * NOTE: Requires service_role key — only call from a trusted backend/Edge Function.
 * This is a placeholder showing the expected call shape.
 *
 * In production, implement as a Supabase Edge Function:
 *   supabase functions new create-user
 *
 * @param {string} email
 * @param {string} password
 * @param {string} role - 'teacher' | 'student'
 * @param {string} displayName
 * @returns {Promise<string>} new user UUID
 */
export async function adminCreateUser(email, password, role, displayName) {
  // Call your Edge Function endpoint
  const session = await getSession()
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ email, password, role, displayName }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Failed to create user')
  }
  const { userId } = await res.json()
  return userId
}

/**
 * Redirect path based on role.
 */
export function roleHomePath(role) {
  switch (role) {
    case 'admin':   return '/admin'
    case 'teacher': return '/teacher'
    case 'student': return '/student'
    default:        return '/login'
  }
}
