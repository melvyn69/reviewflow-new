
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

    const { action, code, offerId, email } = await req.json()

    // 1. CREATE COUPON
    if (action === 'create') {
        if (!offerId) throw new Error("Offer ID required")
        
        // Generate unique code
        const uniqueCode = (Deno.env.get('COUPON_PREFIX') || 'GIFT') + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        
        const { data: offer } = await supabase.from('offers').select('*').eq('id', offerId).single();
        if (!offer) throw new Error("Offer not found");

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (offer.expiry_days || 30));

        const { data, error } = await supabase.from('coupons').insert({
            code: uniqueCode,
            offer_id: offerId,
            customer_email: email,
            status: 'active',
            expires_at: expiresAt.toISOString(),
            offer_title: offer.title,
            discount_detail: offer.description
        }).select().single();

        if (error) throw error;

        // Update stats
        await supabase.rpc('increment_offer_stat', { row_id: offerId, field: 'distributed' });

        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. VALIDATE COUPON
    if (action === 'validate') {
        if (!code) throw new Error("Code required")

        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*, offer:offers(title, description)')
            .eq('code', code.toUpperCase())
            .single();

        if (error || !coupon) {
            return new Response(JSON.stringify({ valid: false, reason: "Code introuvable" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (coupon.status === 'redeemed') {
            return new Response(JSON.stringify({ valid: false, reason: "Déjà utilisé" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (new Date(coupon.expires_at) < new Date()) {
            return new Response(JSON.stringify({ valid: false, reason: "Expiré" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        return new Response(JSON.stringify({ 
            valid: true, 
            discount: coupon.offer_title + " - " + coupon.discount_detail,
            coupon 
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. REDEEM COUPON
    if (action === 'redeem') {
        if (!code) throw new Error("Code required")

        // Check first
        const { data: coupon } = await supabase.from('coupons').select('status, offer_id').eq('code', code.toUpperCase()).single();
        if (!coupon || coupon.status !== 'active') {
            throw new Error("Coupon invalide ou déjà utilisé");
        }

        const { data, error } = await supabase
            .from('coupons')
            .update({ status: 'redeemed', redeemed_at: new Date().toISOString() })
            .eq('code', code.toUpperCase())
            .select()
            .single();

        if (error) throw error;

        // Update stats
        if (coupon.offer_id) {
            await supabase.rpc('increment_offer_stat', { row_id: coupon.offer_id, field: 'redeemed' });
        }

        return new Response(JSON.stringify({ success: true, coupon: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    throw new Error("Invalid action")

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
