/**
 * adminApi.js
 * Calls Supabase Edge Functions that require service-role permissions.
 * Each function is authenticated by passing the current user's JWT.
 */

import { supabase } from './supabase'

/**
 * Get the current session's access token to authenticate edge function calls.
 */
async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return session.access_token
}

/**
 * Base URL for edge functions.
 */
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

/**
 * Create a new teacher user account.
 * Calls the create-user Edge Function which uses the service role key.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} params.teacher_name
 * @param {string} params.designation
 * @param {string} params.expertise
 * @returns {Promise<{userId: string}>}
 */
export async function createTeacherUser({ email, password, teacher_name, designation, expertise }) {
  const token = await getToken()

  const res = await fetch(`${FUNCTIONS_URL}/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      email,
      password,
      role: 'teacher',
      displayName: teacher_name,
      extraData: { designation, expertise },
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create teacher')
  return data
}

/**
 * Create a new student user account.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} params.student_name
 * @param {string} params.father_name
 * @param {string} params.reg_number
 * @param {string} params.section_id
 * @returns {Promise<{userId: string}>}
 */
export async function createStudentUser({ email, password, student_name, father_name, reg_number, section_id }) {
  const token = await getToken()

  const res = await fetch(`${FUNCTIONS_URL}/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      email,
      password,
      role: 'student',
      displayName: student_name,
      extraData: { father_name, reg_number, section_id },
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create student')
  return data
}
