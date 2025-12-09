
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
        throw new Error('Server Config Error: Missing keys (Supabase or Resend)')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const resend = new Resend(resendApiKey)

    // 1. Verify Requesting User (Must be Admin/Owner)
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) throw new Error('Unauthorized')

    // Parse Body
    const { email, role, firstName, lastName } = await req.json()
    if (!email) throw new Error('Email required')

    // 2. Get Inviter's Info
    const { data: inviterProfile } = await supabase.from('users').select('organization_id, name').eq('id', user.id).single()
    if (!inviterProfile?.organization_id) throw new Error('No organization found for inviter')

    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Collaborateur';

    // 3. Generate Invite Link (No email sent by Supabase)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                full_name: fullName,
                organization_id: inviterProfile.organization_id,
                role: role || 'editor',
                invited_by: user.id
            },
            redirectTo: 'https://reviewflow.vercel.app/#/login?mode=setup' 
        }
    })

    if (linkError) throw linkError

    const inviteLink = linkData.properties.action_link;

    // 4. Send Custom Email via Resend
    const { error: emailError } = await resend.emails.send({
        from: 'Reviewflow <onboarding@resend.dev>',
        to: email,
        subject: `Invitation à rejoindre ${inviterProfile.name || 'l\'équipe'} sur Reviewflow`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4f46e5;">Invitation Collaborateur</h2>
                <p>Bonjour ${firstName || 'futur collaborateur'},</p>
                <p><strong>${inviterProfile.name}</strong> vous invite à rejoindre son espace de travail sur Reviewflow.</p>
                <p>En acceptant cette invitation, vous aurez accès au tableau de bord avec le rôle : <strong>${role || 'editor'}</strong>.</p>
                <br/>
                <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accepter l'invitation</a>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">Ce lien est unique et expirera dans 24 heures.</p>
            </div>
        `
    })

    if (emailError) {
        console.error("Resend Error:", emailError)
        throw new Error("Failed to send invitation email")
    }

    return new Response(
      JSON.stringify({ success: true, message: `Invitation sent to ${email}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Invite Error:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
