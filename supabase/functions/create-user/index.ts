// supabase/functions/create-user/index.ts
//
// ══════════════════════════════════════════════════════
// DEPLOY COMMAND (must use --no-verify-jwt):
//   supabase functions deploy create-user --no-verify-jwt
//
// OR in Supabase Dashboard:
//   Edge Functions → create-user → Settings
//   → turn OFF "Verify JWT" toggle → Save
// ══════════════════════════════════════════════════════
//
// Why --no-verify-jwt?
// By default Supabase verifies the JWT *at the gateway* before your code runs.
// We disable that so our code can do its own verification using the service role
// client (which correctly validates user JWTs). This lets us return proper error
// messages instead of a raw 401 from the gateway.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Build the service-role admin client ──────────────────────────────
    const supabaseUrl      = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── 2. Verify the caller's JWT ──────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const token      = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!token) return json({ error: 'Missing Authorization header' }, 401)

    const { data: { user: caller }, error: jwtErr } = await adminClient.auth.getUser(token)
    if (jwtErr || !caller) {
      console.error('JWT verification failed:', jwtErr?.message)
      return json({ error: 'Invalid or expired session — please log in again' }, 401)
    }

    // ── 3. Confirm caller is an admin ───────────────────────────────────────
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (profileErr || callerProfile?.role !== 'admin') {
      return json({ error: 'Forbidden — admin role required' }, 403)
    }

    // ── 4. Parse + validate request body ───────────────────────────────────
    let body: {
      email: string
      password: string
      role: string
      displayName: string
      extraData?: Record<string, string>
    }

    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    const { email, password, role, displayName, extraData } = body

    if (!email || !password || !role || !displayName) {
      return json({ error: 'email, password, role and displayName are required' }, 400)
    }
    if (!['teacher', 'student'].includes(role)) {
      return json({ error: 'role must be "teacher" or "student"' }, 400)
    }
    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters' }, 400)
    }

    // ── 5. Create the Supabase Auth user ────────────────────────────────────
    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email:         email.trim().toLowerCase(),
      password,
      email_confirm: true,   // skip email verification flow
    })

    if (authErr) {
      console.error('auth.admin.createUser error:', authErr.message)
      return json({ error: authErr.message }, 400)
    }

    const userId = authData.user.id

    // ── 6. Insert user_profiles row ─────────────────────────────────────────
    const { error: profileInsertErr } = await adminClient
      .from('user_profiles')
      .insert({
        id:                   userId,
        role,
        display_name:         displayName,
        is_active:            true,
        must_change_password: true,
      })

    if (profileInsertErr) {
      console.error('user_profiles insert error:', profileInsertErr.message)
      await adminClient.auth.admin.deleteUser(userId)
      return json({ error: profileInsertErr.message }, 500)
    }

    // ── 7. Insert teacher record ────────────────────────────────────────────
    if (role === 'teacher') {
      const { error: tErr } = await adminClient.from('teachers').insert({
        user_id:      userId,
        teacher_name: displayName,
        designation:  extraData?.designation  || null,
        expertise:    extraData?.expertise    || null,
        email:        email.trim().toLowerCase(),
        is_active:    true,
      })
      if (tErr) {
        console.error('teachers insert error:', tErr.message)
        await adminClient.auth.admin.deleteUser(userId)
        await adminClient.from('user_profiles').delete().eq('id', userId)
        return json({ error: tErr.message }, 500)
      }
    }

    // ── 8. Insert student record ────────────────────────────────────────────
    if (role === 'student') {
      if (!extraData?.reg_number || !extraData?.section_id || !extraData?.father_name) {
        await adminClient.auth.admin.deleteUser(userId)
        await adminClient.from('user_profiles').delete().eq('id', userId)
        return json({ error: 'reg_number, section_id and father_name are required for students' }, 400)
      }

      const { error: sErr } = await adminClient.from('students').insert({
        user_id:      userId,
        reg_number:   extraData.reg_number,
        student_name: displayName,
        father_name:  extraData.father_name,
        section_id:   extraData.section_id,
        email:        email.trim().toLowerCase(),
        is_active:    true,
      })
      if (sErr) {
        console.error('students insert error:', sErr.message)
        await adminClient.auth.admin.deleteUser(userId)
        await adminClient.from('user_profiles').delete().eq('id', userId)
        return json({ error: sErr.message }, 500)
      }
    }

    return json({ userId, success: true })

  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: err instanceof Error ? err.message : 'Internal server error' }, 500)
  }
})
