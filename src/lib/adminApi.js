/**
 * adminApi.js
 * Calls Supabase Edge Functions that require service-role permissions.
 *
 * IMPORTANT — two headers are required by the Supabase Edge Function gateway:
 *   Authorization: Bearer <user-jwt>   — identifies WHO is calling
 *   apikey: <anon-key>                 — identifies WHICH project (gateway requirement)
 *
 * The Edge Function must be deployed with --no-verify-jwt so the gateway
 * doesn't block the request before our code runs. The function verifies
 * the JWT itself using supabaseAdmin.auth.getUser(token).
 */

import { supabase } from './supabase'

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
const ANON_KEY      =  import.meta.env.VITE_SUPABASE_ANON_KEY

async function callFunction(name, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated — please log in again')

  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      // Both headers required: apikey for the gateway, Authorization for our auth check
      'apikey':        ANON_KEY,
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { error: text } }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`)
  }
  return data
}

export async function createTeacherUser({ email, password, teacher_name, designation, expertise }) {
  return callFunction('create-user', {
    email,
    password,
    role:        'teacher',
    displayName: teacher_name,
    extraData:   { designation, expertise },
  })
}

export async function createStudentUser({ email, password, student_name, father_name, reg_number, section_id }) {
  return callFunction('create-user', {
    email,
    password,
    role:        'student',
    displayName: student_name,
    extraData:   { father_name, reg_number, section_id },
  })
}

/**
 * Set (reset) a user's password.
 * Admin: can reset any user.
 * Teacher: can only reset students in their assigned sections (enforced server-side).
 */
export async function setUserPassword({ userId, newPassword }) {
  return callFunction('admin-set-password', { userId, newPassword })
}
