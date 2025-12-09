

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

    // 1. Auth Check
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) throw new Error('Unauthorized')

    // 2. Get Org ID
    const { data: userProfile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
    if (!userProfile?.organization_id) throw new Error('No organization linked')

    // 3. Fetch Invoices from Supabase DB (Replicated via Webhook)
    const { data: invoices, error } = await supabase
        .from('billing_invoices')
        .select('*')
        .eq('organization_id', userProfile.organization_id)
        .order('date', { ascending: false });

    if (error) throw error;

    // 4. Format for Frontend (Ensure consistent shape with old API)
    const formattedInvoices = (invoices || []).map((inv: any) => ({
        id: inv.id,
        date: new Date(inv.date).toLocaleDateString(),
        amount: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: inv.currency || 'eur' }).format(inv.amount / 100),
        status: inv.status,
        pdf_url: inv.pdf_url,
        number: inv.number
    }));

    return new Response(
      JSON.stringify({ invoices: formattedInvoices }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Get Invoices Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})