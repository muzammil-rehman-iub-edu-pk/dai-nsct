// supabase/functions/create-user/index.ts
// Supabase Edge Function — creates an auth user + profile + role record
// Runs with SERVICE_ROLE key so it can call auth.admin.createUser
//
// Deploy:  supabase functions deploy create-user
// Or via:  Supabase Dashboard → Edge Functions → New Function

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify the calling user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Admin client (service role) — has full auth.admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller is authenticated and is an admin
    const callerToken = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(callerToken)
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Parse request body
    const { email, password, role, displayName, extraData } = await req.json()

    if (!email || !password || !role || !displayName) {
      return new Response(JSON.stringify({ error: 'email, password, role and displayName are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!['teacher', 'student'].includes(role)) {
      return new Response(JSON.stringify({ error: 'role must be teacher or student' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Create the auth user (email auto-confirmed, must change password on first login)
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,   // skip email verification
    })

    if (authErr) {
      return new Response(JSON.stringify({ error: authErr.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = authData.user.id

    // 4. Insert user_profiles row
    const { error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        role,
        display_name: displayName,
        is_active: true,
        must_change_password: true,
      })

    if (profileErr) {
      // Rollback: delete the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(JSON.stringify({ error: profileErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Insert teacher or student record if extraData provided
    if (extraData && role === 'teacher') {
      const { error: tErr } = await supabaseAdmin.from('teachers').insert({
        user_id: userId,
        teacher_name: displayName,
        designation: extraData.designation || null,
        expertise: extraData.expertise || null,
        email,
        is_active: true,
      })
      if (tErr) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
        await supabaseAdmin.from('user_profiles').delete().eq('id', userId)
        return new Response(JSON.stringify({ error: tErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    if (extraData && role === 'student') {
      const { error: sErr } = await supabaseAdmin.from('students').insert({
        user_id: userId,
        reg_number: extraData.reg_number,
        student_name: displayName,
        father_name: extraData.father_name,
        section_id: extraData.section_id,
        email,
        is_active: true,
      })
      if (sErr) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
        await supabaseAdmin.from('user_profiles').delete().eq('id', userId)
        return new Response(JSON.stringify({ error: sErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response(JSON.stringify({ userId, success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
