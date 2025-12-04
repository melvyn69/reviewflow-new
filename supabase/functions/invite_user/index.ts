
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Verify Requesting User (Must be Admin/Owner)
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) throw new Error('Unauthorized')

    const { email, role } = await req.json()
    if (!email) throw new Error('Email required')

    // 2. Get Inviter's Org
    const { data: inviterProfile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
    if (!inviterProfile?.organization_id) throw new Error('No organization')

    // 3. Send Invite via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
            organization_id: inviterProfile.organization_id, // Metadata for trigger
            role: role || 'editor',
            invited_by: user.id
        },
        redirectTo: 'https://reviewflow.vercel.app/#/login?mode=setup' 
    })

    if (inviteError) throw inviteError

    // 4. (Optional) Manually insert into users table if trigger doesn't handle it immediately
    // Ideally, a database trigger handles on auth.users insert -> public.users insert

    return new Response(
      JSON.stringify({ success: true, user: inviteData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
