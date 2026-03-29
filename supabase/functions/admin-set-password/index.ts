// supabase/functions/admin-set-password/index.ts
//
// Deploy: supabase functions deploy admin-set-password --no-verify-jwt
//
// Sets a user's password via service_role key.
// Caller must be authenticated as admin.

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify caller JWT
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
    if (!token) return json({ error: 'Missing Authorization header' }, 401)

    const { data: { user: caller }, error: jwtErr } = await adminClient.auth.getUser(token)
    if (jwtErr || !caller) return json({ error: 'Invalid or expired session' }, 401)

    // Confirm caller is admin
    const { data: callerProfile } = await adminClient
      .from('user_profiles').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') return json({ error: 'Forbidden — admin role required' }, 403)

    // Parse body
    let body: { userId: string; newPassword: string }
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

    const { userId, newPassword } = body
    if (!userId || !newPassword) return json({ error: 'userId and newPassword are required' }, 400)
    if (newPassword.length < 8)  return json({ error: 'Password must be at least 8 characters' }, 400)
    if (!/[A-Z]/.test(newPassword)) return json({ error: 'Password must contain at least one uppercase letter' }, 400)
    if (!/[0-9]/.test(newPassword)) return json({ error: 'Password must contain at least one number' }, 400)

    // Update password
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    })
    if (updateErr) return json({ error: updateErr.message }, 400)

    // Also clear must_change_password flag since admin is explicitly setting it
    await adminClient.from('user_profiles')
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq('id', userId)

    return json({ success: true })

  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: err instanceof Error ? err.message : 'Internal server error' }, 500)
  }
})
